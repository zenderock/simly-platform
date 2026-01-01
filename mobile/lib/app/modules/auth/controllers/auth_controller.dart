import 'package:device_info_plus/device_info_plus.dart';
import 'package:get/get.dart';
import 'package:mobile/app/data/providers/api_provider.dart';
import 'package:mobile/app/routes/app_pages.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:mobile/app/data/services/auth_service.dart';

class AuthController extends GetxController {
  final _apiProvider = ApiClient();
  final _authService = Get.find<AuthService>();
  final isLoading = false.obs;

  Future<void> linkDevice(String token) async {
    if (isLoading.value) return;
    isLoading.value = true;

    try {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;

      final deviceName = "${androidInfo.manufacturer} ${androidInfo.model}";
      final deviceModel = androidInfo.model;

      String? fcmToken;
      try {
        fcmToken = await FirebaseMessaging.instance.getToken();
      } catch (e) {
        print("Failed to get FCM token: $e");
      }

      final response = await _apiProvider.post('/devices/link', {
        'token': token,
        'name': deviceName,
        'model': deviceModel,
        'fcm_token': fcmToken ?? 'device_polling_only',
      });

      if (response.statusCode == 201) {
        final data = response.data;
        _authService.login(
          data['id'],
          data['token'] ?? data['fcm_token'],
        ); // Backend returns device info.
        // If the backend returns a new token for the device, we store it.
        // Assuming the backend might return a specific device secret/token.
        // Search for what it returns exactly.

        Get.offAllNamed(Routes.HOME);
      } else {
        Get.snackbar(
          "Error",
          "Failed to link device. Invalid or expired token.",
        );
      }
    } catch (e) {
      Get.snackbar("Error", "An error occurred during linking: $e");
    } finally {
      isLoading.value = false;
    }
  }
}
