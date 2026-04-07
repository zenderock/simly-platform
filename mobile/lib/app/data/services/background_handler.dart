import 'dart:async';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:get_storage/get_storage.dart';
import 'package:dio/dio.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:mobile/app/data/config.dart';
import 'package:mobile/app/data/pigeon/sms_gateway.g.dart';

@pragma('vm:entry-point')
class BackgroundHandler {
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

    // IMMEDIATELY promote to foreground — must happen within 5s on Android 12+
    // or the OS will kill the service (ANR / ForegroundServiceDidNotStartInTimeException)
    if (service is AndroidServiceInstance) {
      await service.setAsForegroundService();

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

    // Instantiate the Pigeon API for direct native SMS access
    final smsApi = SmsGatewayHostApi();

    // FCM Integration for real-time triggers
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint("FCM Message received: ${message.data}");
      service.invoke('onPushReceived');
      _pollAndSendMessages(dio, storage, service, smsApi);
    });

    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Polling Logic for SMS (fallback if FCM is delayed)
    Timer.periodic(const Duration(seconds: 30), (timer) async {
      service.invoke('updateNotificationMode', {'mode': 'Push (FCM)'});
      _pollAndSendMessages(dio, storage, service, smsApi);
    });

    // Initial mode broadcast
    service.invoke('updateNotificationMode', {'mode': 'Push (FCM)'});

    // Initial poll
    _pollAndSendMessages(dio, storage, service, smsApi);
  }

  @pragma('vm:entry-point')
  static Future<void> _firebaseMessagingBackgroundHandler(
    RemoteMessage message,
  ) async {
    // Handled by the background service if running
  }

  static final Set<int> _processingMessages = {};

  /// Polls pending messages from the backend and sends them directly via the
  /// Pigeon [SmsGatewayHostApi], then reports the real network-level result
  /// back to the backend. No UI isolate dependency.
  static Future<void> _pollAndSendMessages(
    Dio dio,
    GetStorage storage,
    ServiceInstance service,
    SmsGatewayHostApi smsApi,
  ) async {
    final deviceToken = storage.read('device_token');
    final deviceId = storage.read('device_id');

    if (deviceToken == null || deviceId == null) return;

    try {
      final response = await dio.get(
        'devices/$deviceId/pending-messages',
        options: Options(headers: {'Authorization': 'Bearer $deviceToken'}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final List messages = response.data is List ? response.data : [];
        for (var msg in messages) {
          final int msgId = msg['id'];

          // Skip if already processing this message
          if (_processingMessages.contains(msgId)) {
            debugPrint("Message $msgId already being processed, skipping");
            continue;
          }

          final String to = msg['to'];
          final String body = msg['body'];
          final int? simSlot = msg['sim_slot'];

          // Mark as processing locally
          _processingMessages.add(msgId);
          debugPrint("Processing message $msgId to $to");

          // Send SMS directly via Pigeon native API
          try {
            final result = await smsApi.sendSms(to, body, simSlot);

            if (result.success) {
              debugPrint("SMS sent successfully to $to (confirmed by network)");

              // Log to UI
              service.invoke('onLog', {
                'to': to,
                'status': 'sent',
                'time': DateTime.now().toIso8601String(),
              });

              // Update backend status
              try {
                await dio.post(
                  'messages/$msgId/status',
                  data: {'status': 'sent'},
                  options: Options(
                    headers: {'Authorization': 'Bearer $deviceToken'},
                  ),
                );
              } catch (e) {
                debugPrint("Failed to update message status: $e");
              }
            } else {
              debugPrint(
                "SMS failed: ${result.errorCode} - ${result.errorMessage}",
              );

              service.invoke('onLog', {
                'to': to,
                'status': 'failed (${result.errorCode})',
                'time': DateTime.now().toIso8601String(),
              });

              try {
                await dio.post(
                  'messages/$msgId/status',
                  data: {
                    'status': 'failed',
                    'error_code': result.errorCode,
                    'error_message': result.errorMessage,
                  },
                  options: Options(
                    headers: {'Authorization': 'Bearer $deviceToken'},
                  ),
                );
              } catch (e) {
                debugPrint("Failed to update message status: $e");
              }
            }
          } catch (e) {
            debugPrint("SMS exception: $e");
            service.invoke('onLog', {
              'to': to,
              'status': 'error',
              'time': DateTime.now().toIso8601String(),
            });
            try {
              await dio.post(
                'messages/$msgId/status',
                data: {
                  'status': 'failed',
                  'error_message': e.toString(),
                },
                options: Options(
                  headers: {'Authorization': 'Bearer $deviceToken'},
                ),
              );
            } catch (e) {
              debugPrint("Failed to update message status: $e");
            }
          } finally {
            _processingMessages.remove(msgId);
          }
        }
      }
    } catch (e) {
      debugPrint("Poll failed: $e");
    }
  }
}
