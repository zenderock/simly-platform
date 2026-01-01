import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:firebase_core/firebase_core.dart';
import 'app/routes/app_pages.dart';
import 'app/data/services/auth_service.dart';
import 'app/data/services/background_handler.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase (Required for FCM)
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint(
      "Firebase initialization failed: $e. Make sure google-services.json is present.",
    );
  }

  await GetStorage.init();
  await BackgroundHandler.initializeService();

  final authService = Get.put(AuthService());

  runApp(
    GetMaterialApp(
      title: "Simly Gateway",
      initialRoute: AppPages.INITIAL,
      getPages: AppPages.routes,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color.fromARGB(255, 128, 0, 139),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1A1A1A),
          primary: const Color(0xFF1A1A1A),
        ),
      ),
    ),
  );
}
