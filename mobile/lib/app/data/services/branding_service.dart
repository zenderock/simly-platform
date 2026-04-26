import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:mobile/app/data/providers/api_provider.dart';

class BrandingService extends GetxService with WidgetsBindingObserver {
  static const _appNameKey = 'branding_app_name';
  static const _logoUrlKey = 'branding_logo_url';
  static const _primaryColorKey = 'branding_primary_color';

  final _api = ApiClient();
  final _storage = GetStorage();

  final appName = 'Simly Gateway'.obs;
  final logoUrl = ''.obs;
  final primaryColor = const Color(0xFF8c52ff).obs;

  Future<BrandingService> init() async {
    WidgetsBinding.instance.addObserver(this);
    _loadFromCache();

    final token = _storage.read('device_token');
    if (token != null) {
      await _syncBranding();
    }
    return this;
  }

  @override
  void onClose() {
    WidgetsBinding.instance.removeObserver(this);
    super.onClose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _storage.read('device_token') != null) {
      _syncBranding();
    }
  }

  Future<void> reloadBranding() => _syncBranding();

  void _loadFromCache() {
    final cachedAppName = _storage.read(_appNameKey);
    if (cachedAppName is String && cachedAppName.isNotEmpty) {
      appName.value = cachedAppName;
    }

    final cachedLogoUrl = _storage.read(_logoUrlKey);
    if (cachedLogoUrl is String) {
      logoUrl.value = cachedLogoUrl;
    }

    final cachedPrimaryColor = _storage.read(_primaryColorKey);
    if (cachedPrimaryColor is String) {
      final parsedColor = _parseHexColor(cachedPrimaryColor);
      if (parsedColor != null) {
        primaryColor.value = parsedColor;
      }
    }
  }

  Future<void> _syncBranding() async {
    try {
      final data = await _api.getBranding();
      final nextAppName = data['app_name']?.toString() ?? 'Simly Gateway';
      final nextLogoUrl = data['logo_url']?.toString() ?? '';
      final nextPrimaryColor = data['primary_color']?.toString() ?? '#8c52ff';

      final unchanged = _storage.read(_appNameKey) == nextAppName &&
          _storage.read(_logoUrlKey) == nextLogoUrl &&
          _storage.read(_primaryColorKey) == nextPrimaryColor;

      if (unchanged) return;

      await _storage.write(_appNameKey, nextAppName);
      await _storage.write(_logoUrlKey, nextLogoUrl);
      await _storage.write(_primaryColorKey, nextPrimaryColor);

      appName.value = nextAppName;
      logoUrl.value = nextLogoUrl;

      final parsedColor = _parseHexColor(nextPrimaryColor);
      if (parsedColor != null) {
        primaryColor.value = parsedColor;
      }
    } catch (e) {
      debugPrint('Failed to sync branding: $e');
    }
  }

  Color? _parseHexColor(String input) {
    final sanitized = input.replaceFirst('#', '').trim();
    if (sanitized.length != 6) {
      return null;
    }

    final value = int.tryParse('FF$sanitized', radix: 16);
    if (value == null) {
      return null;
    }

    return Color(value);
  }
}
