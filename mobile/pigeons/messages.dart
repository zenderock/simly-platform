import 'package:pigeon/pigeon.dart';

/// Configuration for Pigeon code generation.
@ConfigurePigeon(PigeonOptions(
  dartOut: 'lib/app/data/pigeon/sms_gateway.g.dart',
  kotlinOut:
      'local_plugins/sms_gateway/android/src/main/kotlin/com/simly/gateway/SmsGatewayApi.g.kt',
  kotlinOptions: KotlinOptions(package: 'com.simly.gateway.plugin'),
  dartPackageName: 'mobile',
))

/// Represents a SIM card on the device.
class SimCardInfo {
  final int slotIndex;
  final String phoneNumber;
  final String? operator_;
  final bool isActive;
  final int subscriptionId;
  final String? displayName;

  SimCardInfo({
    required this.slotIndex,
    required this.phoneNumber,
    this.operator_,
    required this.isActive,
    required this.subscriptionId,
    this.displayName,
  });
}

/// Result of an SMS send operation.
class SmsSendResult {
  final bool success;
  final String? errorCode;
  final String? errorMessage;

  SmsSendResult({
    required this.success,
    this.errorCode,
    this.errorMessage,
  });
}

/// Host API: called from Dart → Kotlin (native side).
@HostApi()
abstract class SmsGatewayHostApi {
  /// Send an SMS natively via the Android SmsManager.
  /// Returns the result synchronously after attempting to send.
  @async
  SmsSendResult sendSms(String phoneNumber, String message, int? simSlot);

  /// Retrieve information about all active SIM cards on the device.
  List<SimCardInfo> getSimCards();
}
