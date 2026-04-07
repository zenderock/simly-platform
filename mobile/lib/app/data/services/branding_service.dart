import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:mobile/app/data/providers/api_provider.dart';

class BrandingService extends GetxService {
  final _api = ApiClient();
  final _storage = GetStorage();

  final appName = 'Gateway'.obs;
  final logoUrl = ''.obs;
  final primaryColor = const Color(0xFF8c52ff).obs;

  Future<BrandingService> init() async {
    // Only fetch branding if the device is already linked (has a token).
    // At first launch the device isn't linked yet, so the API call would
    // fail with 401/403 — skip it and keep the defaults.
    final token = _storage.read('device_token');
    if (token != null) {
      await _loadBranding();
    }
    return this;
  }

  Future<void> _loadBranding() async {
    try {
      final data = await _api.getBranding();
      if (data['app_name'] != null) {
        appName.value = data['app_name'] as String;
      }
      if (data['logo_url'] != null) {
        logoUrl.value = data['logo_url'] as String;
      }
      if (data['primary_color'] != null) {
        final hex = (data['primary_color'] as String).replaceFirst('#', '');
        primaryColor.value = Color(int.parse('FF$hex', radix: 16));
      }
    } catch (_) {
      // Fallback to default Simly/Gateway branding — silently ignored
    }
  }
}
