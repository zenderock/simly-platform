import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:mobile/app/data/services/branding_service.dart';

import '../controllers/splash_controller.dart';

class SplashView extends GetView<SplashController> {
  const SplashView({super.key});

  @override
  Widget build(BuildContext context) {
    final branding = Get.find<BrandingService>();

    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFC),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Obx(
              () => AnimatedSwitcher(
                duration: const Duration(milliseconds: 350),
                child: controller.isLoadingBranding.value
                    ? const _LoadingState(key: ValueKey('loading'))
                    : _BrandState(
                        key: const ValueKey('brand'),
                        appName: branding.appName.value,
                        logoUrl: branding.logoUrl.value,
                        color: branding.primaryColor.value,
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.06),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: const Center(
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
          ),
        ),
        const SizedBox(height: 28),
        const Text(
          'Chargement des informations',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Color(0xFF1A1A1A),
            fontSize: 20,
            fontWeight: FontWeight.w800,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Synchronisation de votre espace',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.black.withOpacity(0.42),
            fontSize: 14,
            height: 1.4,
          ),
        ),
      ],
    );
  }
}

class _BrandState extends StatelessWidget {
  const _BrandState({
    super.key,
    required this.appName,
    required this.logoUrl,
    required this.color,
  });

  final String appName;
  final String logoUrl;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 104,
          height: 104,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: color.withOpacity(0.16)),
          ),
          child: Center(
            child: logoUrl.isNotEmpty
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Image.network(
                      logoUrl,
                      key: ValueKey(logoUrl),
                      width: 72,
                      height: 72,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => _BrandInitial(
                        appName: appName,
                        color: color,
                      ),
                    ),
                  )
                : _BrandInitial(appName: appName, color: color),
          ),
        ),
        const SizedBox(height: 28),
        Text(
          appName,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: color,
            fontSize: 28,
            fontWeight: FontWeight.w900,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Gateway prêt',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.black.withOpacity(0.42),
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _BrandInitial extends StatelessWidget {
  const _BrandInitial({required this.appName, required this.color});

  final String appName;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final initial = appName.trim().isEmpty ? 'S' : appName.trim()[0];

    return Text(
      initial.toUpperCase(),
      style: TextStyle(
        color: color,
        fontSize: 42,
        fontWeight: FontWeight.w900,
        letterSpacing: 0,
      ),
    );
  }
}
