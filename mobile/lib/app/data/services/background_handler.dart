import 'dart:async';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:get_storage/get_storage.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:flutter_signal_strength/flutter_signal_strength.dart';
import 'package:dio/dio.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:mobile/app/data/config.dart';

class BackgroundHandler {
  static const _channel = MethodChannel('com.simly.gateway/sms');

  static Future<void> initializeService() async {
    // Request notification permission on Android 13+
    final notificationStatus = await Permission.notification.request();
    if (notificationStatus.isDenied) {
      debugPrint(
        'Notification permission denied - foreground service may fail',
      );
    }

    final service = FlutterBackgroundService();

    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'simly_gateway_v2',
        initialNotificationTitle: 'Simly Gateway Active',
        initialNotificationContent: 'Ready to send SMS',
        foregroundServiceNotificationId: 999,
        foregroundServiceTypes: [AndroidForegroundType.dataSync],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );
  }

  @pragma('vm:entry-point')
  static Future<bool> onIosBackground(ServiceInstance service) async {
    return true;
  }

  @pragma('vm:entry-point')
  static void onStart(ServiceInstance service) async {
    DartPluginRegistrant.ensureInitialized();

    // IMMEDIATELY set as foreground to prevent ANR/Crash on Android 14+
    if (service is AndroidServiceInstance) {
      service.on('setAsForeground').listen((event) {
        service.setAsForegroundService();
      });
      service.on('setAsBackground').listen((event) {
        service.setAsBackgroundService();
      });
    }

    service.on('stopService').listen((event) {
      service.stopSelf();
    });

    try {
      await Firebase.initializeApp();
    } catch (e) {
      debugPrint("Firebase init failed in background: $e");
    }
    await GetStorage.init();
    final storage = GetStorage();

    final dio = Dio(
      BaseOptions(
        baseUrl: Config.baseUrl,
        connectTimeout: const Duration(seconds: 10),
      ),
    );

    // FCM Integration for real-time triggers
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint("FCM Message received: ${message.data}");
      service.invoke('onPushReceived');
      _pollMessages(dio, storage, service);
    });

    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Polling Logic for SMS & Heartbeat (Fallback)
    Timer.periodic(const Duration(seconds: 30), (timer) async {
      service.invoke('updateNotificationMode', {
        'mode': 'Push (FCM)',
      }); // Re-confirm mode
      _pollMessages(dio, storage, service);
    });

    // Initial mode broadcast
    service.invoke('updateNotificationMode', {'mode': 'Push (FCM)'});
  }

  @pragma('vm:entry-point')
  static Future<void> _firebaseMessagingBackgroundHandler(
    RemoteMessage message,
  ) async {
    // This is called when the app is in the background/terminated
    // We don't need to do much here if the background service is already running
    // as it will pick up the message via onMessage if the service is alive.
    // However, we can use this to wake up or log.
  }

  static Future<void> _pollMessages(
    Dio dio,
    GetStorage storage,
    ServiceInstance service,
  ) async {
    final deviceToken = storage.read('device_token');
    final deviceId = storage.read('device_id');

    if (deviceToken == null || deviceId == null) return;

    try {
      final battery = await Battery().batteryLevel;
      int signal = 0;
      try {
        final s = await FlutterSignalStrength().getCellularSignalStrength();
        signal = s.toInt();
      } catch (_) {}

      // Get SIM cards info
      List<Map<String, dynamic>> simCards = [];
      try {
        final result = await _channel.invokeMethod('getSimCards');
        if (result is List) {
          simCards = result.cast<Map<String, dynamic>>();
        }
      } catch (e) {
        debugPrint("Failed to get SIM cards: $e");
      }

      final response = await dio.post(
        'devices/$deviceId/heartbeat',
        data: {
          'battery_level': battery,
          'signal_strength': signal,
          'status': 'online',
          'sim_cards': simCards,
        },
        options: Options(headers: {'Authorization': 'Bearer $deviceToken'}),
      );

      if (response.statusCode == 200) {
        final List messages = response.data;
        for (var msg in messages) {
          final String to = msg['to'];
          final String body = msg['body'];
          final int msgId = msg['id'];
          final int? simSlot = msg['sim_slot'];

          try {
            await _channel.invokeMethod('sendSms', {
              'phoneNumber': to,
              'message': body,
              'simSlot': simSlot,
            });

            service.invoke('onLog', {
              'to': to,
              'status': 'sent',
              'time': DateTime.now().toIso8601String(),
            });

            await dio.post(
              'messages/$msgId/status',
              data: {'status': 'sent'},
              options: Options(
                headers: {'Authorization': 'Bearer $deviceToken'},
              ),
            );
          } on PlatformException catch (e) {
            service.invoke('onLog', {
              'to': to,
              'status': 'failed (${e.code})',
              'time': DateTime.now().toIso8601String(),
            });

            await dio.post(
              'messages/$msgId/status',
              data: {
                'status': 'failed',
                'error_code': e.code,
                'error_message': e.message,
              },
              options: Options(
                headers: {'Authorization': 'Bearer $deviceToken'},
              ),
            );
          } catch (e) {
            service.invoke('onLog', {
              'to': to,
              'status': 'error',
              'time': DateTime.now().toIso8601String(),
            });

            await dio.post(
              'messages/$msgId/status',
              data: {'status': 'failed', 'error_message': e.toString()},
              options: Options(
                headers: {'Authorization': 'Bearer $deviceToken'},
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint("Poll failed: $e");
    }
  }
}
