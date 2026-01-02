import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'package:flutter/foundation.dart';

/// Service to manage app settings including "Always Active" mode
class SettingsService extends GetxService {
  static SettingsService get to => Get.find<SettingsService>();

  final _storage = GetStorage();

  // Settings keys
  static const String _keyAlwaysActive = 'always_active_mode';
  static const String _keyHeartbeatInterval = 'heartbeat_interval_seconds';
  static const String _keyKeepScreenOn = 'keep_screen_on';

  // Observable settings
  final alwaysActiveMode = false.obs;
  final keepScreenOn = false.obs;
  final heartbeatIntervalSeconds = 300.obs; // Default 5 minutes

  @override
  void onInit() {
    super.onInit();
    _loadSettings();
  }

  void _loadSettings() {
    alwaysActiveMode.value = _storage.read(_keyAlwaysActive) ?? false;
    keepScreenOn.value = _storage.read(_keyKeepScreenOn) ?? false;
    heartbeatIntervalSeconds.value =
        _storage.read(_keyHeartbeatInterval) ?? 300;

    // Apply settings on load
    _applyWakeLock();
  }

  /// Toggle "Always Active" mode
  /// When enabled:
  /// - Heartbeat interval is reduced to 1 minute
  /// - Wake lock is enabled (optional)
  /// - Background service priority is increased
  Future<void> setAlwaysActiveMode(bool enabled) async {
    alwaysActiveMode.value = enabled;
    await _storage.write(_keyAlwaysActive, enabled);

    if (enabled) {
      // Reduce heartbeat interval to 1 minute for more reliable online status
      heartbeatIntervalSeconds.value = 60;
      await _storage.write(_keyHeartbeatInterval, 60);
      debugPrint("Always Active Mode ENABLED - Heartbeat interval: 60s");
    } else {
      // Restore default heartbeat interval
      heartbeatIntervalSeconds.value = 300;
      await _storage.write(_keyHeartbeatInterval, 300);
      debugPrint("Always Active Mode DISABLED - Heartbeat interval: 300s");
    }

    _applyWakeLock();
  }

  /// Toggle "Keep Screen On" option
  /// This prevents the screen from turning off, which helps keep the app active
  Future<void> setKeepScreenOn(bool enabled) async {
    keepScreenOn.value = enabled;
    await _storage.write(_keyKeepScreenOn, enabled);
    _applyWakeLock();
  }

  /// Apply wake lock based on current settings
  void _applyWakeLock() {
    if (alwaysActiveMode.value && keepScreenOn.value) {
      WakelockPlus.enable();
      debugPrint("Wake lock ENABLED - Screen will stay on");
    } else {
      WakelockPlus.disable();
      debugPrint("Wake lock DISABLED");
    }
  }

  /// Get current heartbeat interval in Duration
  Duration get heartbeatInterval =>
      Duration(seconds: heartbeatIntervalSeconds.value);

  /// Check if aggressive keep-alive should be used
  bool get shouldUseAggressiveKeepAlive => alwaysActiveMode.value;
}
