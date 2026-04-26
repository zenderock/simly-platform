import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:mobile/app/data/services/branding_service.dart';
import 'package:mobile/app/routes/app_pages.dart';

class SplashController extends GetxController {
  final _branding = Get.find<BrandingService>();
  final _storage = GetStorage();

  final isLoadingBranding = true.obs;

  @override
  void onReady() {
    super.onReady();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final startedAt = DateTime.now();
    final hasDeviceToken = _storage.read('device_token') != null;

    if (hasDeviceToken) {
      await _branding.reloadBranding();
    }

    final elapsed = DateTime.now().difference(startedAt);
    const minLoadingDuration = Duration(milliseconds: 800);
    if (elapsed < minLoadingDuration) {
      await Future.delayed(minLoadingDuration - elapsed);
    }

    isLoadingBranding.value = false;
    await Future.delayed(const Duration(milliseconds: 1400));

    if (Get.currentRoute == Routes.SPLASH) {
      Get.offAllNamed(Routes.HOME);
    }
  }
}
