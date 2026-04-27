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
  static bool _isPolling = false;
  static const Duration _smsSendTimeout = Duration(seconds: 45);

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

    // Restore any message IDs that were sent to the radio before a previous
    // service restart but never ACK'd to the backend.
    _loadPendingAckIds(storage);

    final dio = Dio(
      BaseOptions(
        baseUrl: Config.baseUrl.endsWith('/')
            ? Config.baseUrl
            : '${Config.baseUrl}/',
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
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

  // In-flight guard: messages being processed in the current cycle.
  // Lost on service restart — intentional, it's a short-lived lock.
  static final Set<int> _processingMessages = {};

  // Persistent guard: message IDs whose SMS was already sent to the radio
  // but whose ACK (POST /status) has not yet reached the backend.
  // Survives service restarts so we never send the same SMS twice.
  static const _pendingAckKey = 'sms_pending_ack_ids';
  static Set<int> _pendingAckIds = {};

  static void _loadPendingAckIds(GetStorage storage) {
    final raw = storage.read<List>(_pendingAckKey);
    if (raw != null) {
      _pendingAckIds = raw.whereType<int>().toSet();
    }
  }

  static Future<void> _savePendingAckIds(GetStorage storage) async {
    await storage.write(_pendingAckKey, _pendingAckIds.toList());
  }

  /// Polls pending messages from the backend and sends them directly via the
  /// Pigeon [SmsGatewayHostApi], then reports the real network-level result
  /// back to the backend. No UI isolate dependency.
  static Future<void> _pollAndSendMessages(
    Dio dio,
    GetStorage storage,
    ServiceInstance service,
    SmsGatewayHostApi smsApi,
  ) async {
    if (_isPolling) {
      debugPrint('Skipping poll: previous cycle still running');
      return;
    }

    final deviceToken = storage.read('device_token');
    final deviceId = storage.read('device_id');

    if (deviceToken == null || deviceId == null) return;

    _isPolling = true;

    try {
      // First, retry ACKs for messages already sent to the radio but not yet
      // confirmed to the backend (e.g. network loss between send and ACK).
      await _retryPendingAcks(dio, storage, deviceToken);

      final response = await dio.get(
        'devices/$deviceId/pending-messages',
        options: Options(headers: {'Authorization': 'Bearer $deviceToken'}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final List messages = response.data is List ? response.data : [];
        for (var msg in messages) {
          if (msg is! Map) continue;

          final data = Map<String, dynamic>.from(msg.cast<dynamic, dynamic>());
          final rawId = data['id'];
          final int? msgId = rawId is int
              ? rawId
              : int.tryParse(rawId?.toString() ?? '');
          final String to = data['to']?.toString() ?? '';
          final String body = data['body']?.toString() ?? '';
          final dynamic rawSimSlot = data['sim_slot'];
          final int? simSlot = rawSimSlot is int
              ? rawSimSlot
              : int.tryParse(rawSimSlot?.toString() ?? '');

          if (msgId == null || to.isEmpty || body.isEmpty) {
            debugPrint('Skipping invalid pending message payload: $data');
            continue;
          }

          // Already in-flight this cycle — skip.
          if (_processingMessages.contains(msgId)) {
            debugPrint('Message $msgId already being processed, skipping');
            continue;
          }

          // SMS was already sent to the radio before a service restart but the
          // ACK never reached the backend. Retry the ACK only — do NOT re-send.
          if (_pendingAckIds.contains(msgId)) {
            debugPrint('Message $msgId already sent to radio, retrying ACK only');
            await _ackSent(dio, storage, deviceToken, msgId);
            continue;
          }

          _processingMessages.add(msgId);
          debugPrint('Processing message $msgId to $to');

          try {
            final result = await smsApi
                .sendSms(to, body, simSlot)
                .timeout(_smsSendTimeout);

            if (result.success) {
              debugPrint('SMS sent successfully to $to (confirmed by network)');

              // Persist before the ACK so a restart between send and ACK
              // never causes a re-send.
              _pendingAckIds.add(msgId);
              await _savePendingAckIds(storage);

              service.invoke('onLog', {
                'to': to,
                'status': 'sent',
                'time': DateTime.now().toIso8601String(),
              });

              await _ackSent(dio, storage, deviceToken, msgId);
            } else {
              debugPrint('SMS failed: ${result.errorCode} - ${result.errorMessage}');

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
                debugPrint('Failed to report failure for message $msgId: $e');
              }
            }
          } on TimeoutException catch (_) {
            final timeoutMessage =
                'SMS send timed out after ${_smsSendTimeout.inSeconds}s';
            debugPrint('SMS timeout for message $msgId: $timeoutMessage');
            service.invoke('onLog', {
              'to': to,
              'status': 'timeout',
              'time': DateTime.now().toIso8601String(),
            });
            try {
              await dio.post(
                'messages/$msgId/status',
                data: {
                  'status': 'failed',
                  'error_code': 'SEND_TIMEOUT',
                  'error_message': timeoutMessage,
                },
                options: Options(
                  headers: {'Authorization': 'Bearer $deviceToken'},
                ),
              );
            } catch (e) {
              debugPrint('Failed to report timeout for message $msgId: $e');
            }
          } catch (e) {
            debugPrint('SMS exception for message $msgId: $e');
            service.invoke('onLog', {
              'to': to,
              'status': 'error',
              'time': DateTime.now().toIso8601String(),
            });
            try {
              await dio.post(
                'messages/$msgId/status',
                data: {'status': 'failed', 'error_message': e.toString()},
                options: Options(
                    headers: {'Authorization': 'Bearer $deviceToken'}),
              );
            } catch (e) {
              debugPrint('Failed to report exception for message $msgId: $e');
            }
          } finally {
            _processingMessages.remove(msgId);
          }
        }
      }
    } catch (e) {
      debugPrint('Poll failed: $e');
    } finally {
      _isPolling = false;
    }
  }

  /// Sends the "sent" ACK to the backend and clears the local pending-ack record
  /// on success. Safe to call multiple times — idempotent from the caller's view.
  static Future<void> _ackSent(
    Dio dio,
    GetStorage storage,
    String deviceToken,
    int msgId,
  ) async {
    try {
      await dio.post(
        'messages/$msgId/status',
        data: {'status': 'sent'},
        options: Options(headers: {'Authorization': 'Bearer $deviceToken'}),
      );
      _pendingAckIds.remove(msgId);
      await _savePendingAckIds(storage);
      debugPrint('ACK confirmed for message $msgId');
    } catch (e) {
      // ACK failed — keep in _pendingAckIds so the next poll retries it.
      debugPrint('ACK failed for message $msgId, will retry next poll: $e');
    }
  }

  /// On each poll cycle, retry ACKs for any messages whose SMS was already
  /// delivered to the radio but whose status update is still pending.
  static Future<void> _retryPendingAcks(
    Dio dio,
    GetStorage storage,
    String deviceToken,
  ) async {
    if (_pendingAckIds.isEmpty) return;
    // Copy to avoid concurrent modification during iteration.
    final ids = Set<int>.from(_pendingAckIds);
    for (final msgId in ids) {
      await _ackSent(dio, storage, deviceToken, msgId);
    }
  }
}
