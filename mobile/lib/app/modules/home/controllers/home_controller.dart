import 'dart:async';
import 'package:battery_plus/battery_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:get/get.dart';
import 'package:mobile/app/data/providers/api_provider.dart';
import 'package:mobile/app/data/services/auth_service.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_signal_strength/flutter_signal_strength.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';

class HomeController extends GetxController {
  static const _channel = MethodChannel('com.simly.gateway/sms');

  final _apiProvider = ApiClient();
  final _authService = Get.find<AuthService>();

  final batteryLevel = 0.obs;
  final connectivityStatus = ConnectivityResult.none.obs;
  final signalStrength = 0.obs; // 0-4
  final isGatewayRunning = false.obs;
  final logs = <Map<String, dynamic>>[].obs;
  final notificationMode = "Polling".obs;
  final lastPushReceivedAt = Rxn<DateTime>();
  final simCards = <Map<String, dynamic>>[].obs;

  RxBool get isAuthenticated => _authService.isAuthenticated;

  StreamSubscription? _connectivitySubscription;
  Timer? _heartbeatTimer;
  Timer? _statTimer;

  @override
  void onInit() {
    super.onInit();
    _initDeviceStats();
    _startHeartbeats();
    _checkServiceStatus();
    _initLogListener();

    // Auto-start service when authentication becomes true (e.g. after linking)
    ever(_authService.isAuthenticated, (bool authed) {
      if (authed) {
        _checkServiceStatus();
      }
    });
  }

  void _initLogListener() {
    FlutterBackgroundService().on('onLog').listen((event) {
      if (event != null) {
        logs.insert(0, event);
        if (logs.length > 50) logs.removeLast();
      }
    });

    FlutterBackgroundService().on('updateNotificationMode').listen((event) {
      if (event != null && event['mode'] != null) {
        notificationMode.value = event['mode'];
      }
    });

    FlutterBackgroundService().on('onPushReceived').listen((event) {
      lastPushReceivedAt.value = DateTime.now();
      notificationMode.value = "Push (FCM)";
    });

    // Listen for SMS send requests from background service
    FlutterBackgroundService().on('sendSms').listen((event) async {
      if (event != null) {
        await _handleSendSms(event);
      }
    });
  }

  Future<void> _handleSendSms(Map<String, dynamic> event) async {
    final String to = event['to'];
    final String body = event['body'];
    final int msgId = event['msgId'];
    final int? simSlot = event['simSlot'];

    try {
      await _channel.invokeMethod('sendSms', {
        'phoneNumber': to,
        'message': body,
        'simSlot': simSlot,
      });

      logs.insert(0, {
        'to': to,
        'status': 'sent',
        'time': DateTime.now().toIso8601String(),
      });
      if (logs.length > 50) logs.removeLast();

      // Update status on backend
      await _apiProvider.post('messages/$msgId/status', {'status': 'sent'});
    } on PlatformException catch (e) {
      logs.insert(0, {
        'to': to,
        'status': 'failed (${e.code})',
        'time': DateTime.now().toIso8601String(),
      });
      if (logs.length > 50) logs.removeLast();

      await _apiProvider.post('messages/$msgId/status', {
        'status': 'failed',
        'error_code': e.code,
        'error_message': e.message,
      });
    } catch (e) {
      logs.insert(0, {
        'to': to,
        'status': 'error',
        'time': DateTime.now().toIso8601String(),
      });
      if (logs.length > 50) logs.removeLast();

      await _apiProvider.post('messages/$msgId/status', {
        'status': 'failed',
        'error_message': e.toString(),
      });
    }
  }

  Future<void> _checkServiceStatus() async {
    final service = FlutterBackgroundService();
    var isRunning = await service.isRunning();

    // Auto-start if authenticated and not running
    if (!isRunning && _authService.isAuthenticated.value) {
      await service.startService();
      isRunning = true;
    }

    isGatewayRunning.value = isRunning;
  }

  @override
  void onClose() {
    _connectivitySubscription?.cancel();
    _heartbeatTimer?.cancel();
    _statTimer?.cancel();
    super.onClose();
  }

  Future<void> _initDeviceStats() async {
    final battery = Battery();
    batteryLevel.value = await battery.batteryLevel;
    battery.onBatteryStateChanged.listen((state) async {
      batteryLevel.value = await battery.batteryLevel;
    });

    final connectivity = Connectivity();
    connectivityStatus.value = await connectivity.checkConnectivity();
    _connectivitySubscription = connectivity.onConnectivityChanged.listen((
      result,
    ) {
      connectivityStatus.value = result;
    });

    // Request permissions for signal strength and SIM detection
    await [Permission.location, Permission.phone].request();

    // Get SIM cards info
    await _updateSimCards();

    // Update stats periodically
    _statTimer = Timer.periodic(const Duration(seconds: 30), (timer) async {
      final battery = Battery();
      batteryLevel.value = await battery.batteryLevel;

      try {
        final signal = await FlutterSignalStrength()
            .getCellularSignalStrength();
        signalStrength.value = signal.toInt();
      } catch (e) {
        debugPrint("Error getting signal strength: $e");
      }

      // Update SIM cards periodically
      await _updateSimCards();
    });
  }

  Future<void> _updateSimCards() async {
    try {
      final result = await _channel.invokeMethod('getSimCards');
      if (result is List) {
        simCards.value = List<Map<String, dynamic>>.from(
          result.map((e) => Map<String, dynamic>.from(e as Map)),
        );
        debugPrint("Updated SIM cards: ${simCards.length} found");
      }
    } catch (e) {
      debugPrint("Failed to get SIM cards: $e");
    }
  }

  void _startHeartbeats() {
    _heartbeatTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      _sendHeartbeat();
    });
    _sendHeartbeat(); // First one immediate
  }

  Future<void> _sendHeartbeat() async {
    if (!_authService.isAuthenticated.value) return;

    try {
      debugPrint("Sending heartbeat with ${simCards.length} SIM cards");

      // Convert SIM cards to proper format
      final simCardsData = simCards
          .map(
            (sim) => {
              'slot_index': sim['slot_index'],
              'phone_number': sim['phone_number'],
              'operator': sim['operator'],
              'is_active': sim['is_active'],
            },
          )
          .toList();

      await _apiProvider.post('devices/${_authService.deviceId}/heartbeat', {
        'battery_level': batteryLevel.value,
        'signal_strength': signalStrength.value,
        'status': 'online',
        'sim_cards': simCardsData,
      });
      debugPrint("Heartbeat sent successfully");
    } catch (e) {
      debugPrint("Heartbeat failed: $e");
    }
  }

  void toggleGateway() async {
    final service = FlutterBackgroundService();
    var isRunning = await service.isRunning();

    if (isRunning) {
      service.invoke("stopService");
      isGatewayRunning.value = false;
    } else {
      service.startService();
      isGatewayRunning.value = true;
    }
  }
}
