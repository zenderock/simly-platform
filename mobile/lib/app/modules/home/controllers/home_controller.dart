import 'dart:async';
import 'package:battery_plus/battery_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:get/get.dart';
import 'package:mobile/app/data/providers/api_provider.dart';
import 'package:mobile/app/data/services/auth_service.dart';
import 'package:mobile/app/data/services/settings_service.dart';
import 'package:mobile/app/data/pigeon/sms_gateway.g.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_signal_strength/flutter_signal_strength.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/foundation.dart';

class HomeController extends GetxController {
  final _smsApi = SmsGatewayHostApi();

  final _apiProvider = ApiClient();
  final _authService = Get.find<AuthService>();
  final _settingsService = Get.find<SettingsService>();

  final batteryLevel = 0.obs;
  final connectivityStatus = ConnectivityResult.none.obs;
  final signalStrength = 0.obs; // 0-4
  final isGatewayRunning = false.obs;
  final logs = <Map<String, dynamic>>[].obs;
  final notificationMode = "Polling".obs;
  final lastPushReceivedAt = Rxn<DateTime>();
  final simCards = <Map<String, dynamic>>[].obs;

  // Settings observables for UI
  RxBool get alwaysActiveMode => _settingsService.alwaysActiveMode;
  RxBool get keepScreenOn => _settingsService.keepScreenOn;

  RxBool get isAuthenticated => _authService.isAuthenticated;

  StreamSubscription? _connectivitySubscription;
  StreamSubscription? _batterySubscription;
  StreamSubscription<Map<String, dynamic>?>? _logSubscription;
  StreamSubscription<Map<String, dynamic>?>? _notificationModeSubscription;
  StreamSubscription<Map<String, dynamic>?>? _pushSubscription;
  Timer? _heartbeatTimer;
  Timer? _statTimer;
  Worker? _heartbeatIntervalWorker;
  Worker? _authStateWorker;

  @override
  void onInit() {
    super.onInit();
    _initDeviceStats();
    _checkServiceStatus();
    _initLogListener();
    _heartbeatIntervalWorker = ever<int>(
      _settingsService.heartbeatIntervalSeconds,
      (_) {
        debugPrint("Heartbeat interval changed, restarting timer...");
        _startHeartbeats();
      },
    );

    // Auto-start service when authentication becomes true (e.g. after linking)
    _authStateWorker = ever(_authService.isAuthenticated, (bool authed) {
      if (authed) {
        _checkServiceStatus();
      }
    });
  }

  void _initLogListener() {
    _logSubscription = FlutterBackgroundService().on('onLog').listen((event) {
      if (event != null) {
        logs.insert(0, event);
        if (logs.length > 50) logs.removeLast();
      }
    });

    _notificationModeSubscription = FlutterBackgroundService()
        .on('updateNotificationMode')
        .listen((event) {
      if (event != null && event['mode'] != null) {
        notificationMode.value = event['mode'].toString();
      }
    });

    _pushSubscription = FlutterBackgroundService()
        .on('onPushReceived')
        .listen((event) {
      lastPushReceivedAt.value = DateTime.now();
      notificationMode.value = "Push (FCM)";
    });
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
    _batterySubscription?.cancel();
    _logSubscription?.cancel();
    _notificationModeSubscription?.cancel();
    _pushSubscription?.cancel();
    _heartbeatTimer?.cancel();
    _statTimer?.cancel();
    _heartbeatIntervalWorker?.dispose();
    _authStateWorker?.dispose();
    super.onClose();
  }

  Future<void> _initDeviceStats() async {
    final battery = Battery();
    batteryLevel.value = await battery.batteryLevel;
    _batterySubscription = battery.onBatteryStateChanged.listen((state) async {
      batteryLevel.value = await battery.batteryLevel;
    });

    final connectivity = Connectivity();
    connectivityStatus.value = await connectivity.checkConnectivity();
    _connectivitySubscription = connectivity.onConnectivityChanged.listen((
      result,
    ) {
      connectivityStatus.value = result;
    });

    // Request permissions for signal strength, SIM detection, and SMS
    await [Permission.location, Permission.phone, Permission.sms].request();

    // Check if SMS permission was granted
    final smsStatus = await Permission.sms.status;
    debugPrint("SMS permission status: $smsStatus");
    if (!smsStatus.isGranted) {
      debugPrint(
        "WARNING: SMS permission not granted - SMS sending will fail!",
      );
    }

    // Get initial signal strength
    try {
      final signal = await FlutterSignalStrength().getCellularSignalStrength();
      signalStrength.value = signal.toInt();
    } catch (e) {
      debugPrint("Error getting initial signal strength: $e");
    }

    // Get SIM cards info via Pigeon
    await _updateSimCards();

    // Start heartbeats AFTER initial data is loaded
    _startHeartbeats();

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
      final result = await _smsApi.getSimCards();
      simCards.value = result
          .map(
            (sim) => {
              'slot_index': sim.slotIndex,
              'phone_number': sim.phoneNumber,
              'operator': sim.operator_,
              'is_active': sim.isActive,
            },
          )
          .toList();
      debugPrint("Updated SIM cards: ${simCards.length} found");
    } catch (e) {
      debugPrint("Failed to get SIM cards: $e");
    }
  }

  void _startHeartbeats() {
    // Cancel existing timer if any
    _heartbeatTimer?.cancel();

    // Use dynamic interval from settings
    final interval = _settingsService.heartbeatInterval;
    debugPrint(
      "Starting heartbeat timer with interval: ${interval.inSeconds}s (Always Active: ${_settingsService.alwaysActiveMode.value})",
    );

    _heartbeatTimer = Timer.periodic(interval, (timer) {
      _sendHeartbeat();
    });
    _sendHeartbeat(); // First one immediate
  }

  /// Toggle Always Active mode
  void toggleAlwaysActiveMode() {
    _settingsService.setAlwaysActiveMode(
      !_settingsService.alwaysActiveMode.value,
    );
  }

  /// Toggle Keep Screen On option
  void toggleKeepScreenOn() {
    _settingsService.setKeepScreenOn(!_settingsService.keepScreenOn.value);
  }

  Future<void> _sendHeartbeat() async {
    if (!_authService.isAuthenticated.value) return;

    try {
      debugPrint("=== HEARTBEAT DEBUG ===");
      debugPrint("Battery level: ${batteryLevel.value}");
      debugPrint("Signal strength: ${signalStrength.value}");
      debugPrint("SIM cards count: ${simCards.length}");

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

      debugPrint("SIM cards data: $simCardsData");

      final payload = {
        'battery_level': batteryLevel.value,
        'signal_strength': signalStrength.value,
        'status': 'online',
        'sim_cards': simCardsData,
      };
      debugPrint("Heartbeat payload: $payload");

      await _apiProvider.post(
        'devices/${_authService.deviceId}/heartbeat',
        payload,
      );
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
