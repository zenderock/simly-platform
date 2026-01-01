import 'dart:convert';
import 'package:flutter/material.dart';
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

  Future<void> linkDevice(String scannedData) async {
    if (isLoading.value) return;
    isLoading.value = true;

    print("QR Code Scanned: $scannedData");

    try {
      String token = scannedData;
      try {
        final decoded = jsonDecode(scannedData);
        if (decoded is Map && decoded.containsKey('token')) {
          token = decoded['token'];
          print("Decoded token from JSON: $token");
        }
      } catch (e) {
        print("Scanned data is not JSON, using as raw token: $e");
      }

      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;

      final deviceName = "${androidInfo.manufacturer} ${androidInfo.model}";
      final deviceModel = androidInfo.model;

      String? fcmToken;
      try {
        fcmToken = await FirebaseMessaging.instance.getToken();
        print("FCM Token: $fcmToken");
      } catch (e) {
        print("Failed to get FCM token: $e");
      }

      final path = 'devices/link';
      print(
        "Sending link request to: ${_apiProvider.dio.options.baseUrl}$path",
      );
      final response = await _apiProvider.post(path, {
        'token': token,
        'name': deviceName,
        'model': deviceModel,
        'fcm_token': fcmToken ?? 'device_polling_only',
      });

      print("Response status: ${response.statusCode}");
      print("Response data: ${response.data}");

      if (response.statusCode == 201) {
        final data = response.data;
        _authService.login(data['id'], data['token'] ?? data['fcm_token']);
        print("Linking successful! Device ID: ${data['id']}");

        Get.offAllNamed(Routes.HOME);
      } else {
        print("Linking failed with status: ${response.statusCode}");
        Get.snackbar(
          "Error",
          "Failed to link device. Status: ${response.statusCode}",
          backgroundColor: const Color(0xFFEF4444),
          colorText: Colors.white,
          snackPosition: SnackPosition.BOTTOM,
          margin: const EdgeInsets.all(16),
          borderRadius: 8,
        );
      }
    } catch (e) {
      print("Linking exception: $e");
      Get.snackbar(
        "Error",
        "An error occurred during linking: $e",
        backgroundColor: const Color(0xFFEF4444),
        colorText: Colors.white,
        snackPosition: SnackPosition.BOTTOM,
        margin: const EdgeInsets.all(16),
        borderRadius: 8,
      );
    } finally {
      isLoading.value = false;
    }
  }
}
