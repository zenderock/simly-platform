import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:get/get.dart';
import 'package:mobile/app/data/providers/api_provider.dart';
import 'package:mobile/app/routes/app_pages.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:mobile/app/data/services/auth_service.dart';
import 'package:mobile/app/data/services/branding_service.dart';

class AuthController extends GetxController {
  final _apiProvider = ApiClient();
  final _authService = Get.find<AuthService>();
  final _brandingService = Get.find<BrandingService>();
  final isLoading = false.obs;

  Future<void> linkDevice(String scannedData) async {
    if (isLoading.value) return;
    isLoading.value = true;

    debugPrint('QR Code scanned');

    try {
      String token = scannedData.trim();
      try {
        final decoded = jsonDecode(scannedData);
        if (decoded is Map && decoded.containsKey('token')) {
          token = decoded['token'].toString().trim();
        }
      } catch (e) {
        debugPrint('Scanned payload is not JSON: $e');
      }

      if (token.isEmpty) {
        throw const FormatException('QR code invalide: token manquant.');
      }
      if (token.startsWith('http://') || token.startsWith('https://')) {
        throw const FormatException(
          'QR code invalide: scanne le code de liaison, pas le QR de telechargement.',
        );
      }

      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;

      final deviceName = "${androidInfo.manufacturer} ${androidInfo.model}";
      final deviceModel = androidInfo.model;

      String? fcmToken;
      try {
        fcmToken = await FirebaseMessaging.instance.getToken();
      } catch (e) {
        debugPrint('Failed to get FCM token: $e');
      }

      final path = 'devices/link';
      final response = await _apiProvider.post(path, {
        'token': token,
        'name': deviceName,
        'model': deviceModel,
        'fcm_token': fcmToken ?? 'device_polling_only',
      });

      if (response.statusCode == 201) {
        final data = response.data;
        if (data is! Map) {
          throw const FormatException('Reponse serveur invalide.');
        }

        final map = Map<String, dynamic>.from(data);
        final rawId = map['id'];
        final rawToken = map['token'];
        final deviceId = rawId is int ? rawId : int.tryParse(rawId.toString());
        final deviceToken = rawToken?.toString().trim() ?? '';

        if (deviceId == null || deviceToken.isEmpty) {
          throw const FormatException(
            'Reponse de liaison incomplete: identifiants manquants.',
          );
        }

        await _authService.login(deviceId, deviceToken);
        await _brandingService.reloadBranding();

        Get.offAllNamed(Routes.SPLASH);
      } else {
        Get.snackbar(
          'Error',
          'Failed to link device. Status: ${response.statusCode}',
          backgroundColor: const Color(0xFFEF4444),
          colorText: Colors.white,
          snackPosition: SnackPosition.BOTTOM,
          margin: const EdgeInsets.all(16),
          borderRadius: 8,
        );
      }
    } catch (e) {
      String errorMessage = 'An error occurred during linking.';
      if (e is DioException) {
        if (e.response != null) {
          // Try to extract message string from backend response body usually "message" or just the body if it's string
          final data = e.response?.data;
          if (data is String) {
            errorMessage = data;
          } else if (data is Map && data.containsKey('message')) {
            errorMessage = data['message'].toString();
          } else {
            errorMessage = 'Server error: ${e.response?.statusCode}';
          }
        } else {
          errorMessage = e.message ?? 'Connection error';
        }
      } else {
        errorMessage = e.toString();
      }

      debugPrint('Linking exception details: $errorMessage');

      Get.snackbar(
        'Linking Failed',
        errorMessage,
        backgroundColor: const Color(0xFFEF4444),
        colorText: Colors.white,
        snackPosition: SnackPosition.BOTTOM,
        margin: const EdgeInsets.all(16),
        borderRadius: 8,
        duration: const Duration(seconds: 5),
      );
    } finally {
      isLoading.value = false;
    }
  }
}
