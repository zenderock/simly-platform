import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';

class AuthService extends GetxService {
  final _storage = GetStorage();
  final isAuthenticated = false.obs;

  String? get deviceToken => _storage.read('device_token');
  int? get deviceId => _storage.read('device_id');

  @override
  void onInit() {
    super.onInit();
    if (deviceToken != null && deviceId != null) {
      isAuthenticated.value = true;
    }
  }

  Future<void> login(int id, String token) async {
    await _storage.write('device_id', id);
    await _storage.write('device_token', token);
    isAuthenticated.value = true;
  }

  Future<void> logout() async {
    await _storage.remove('device_id');
    await _storage.remove('device_token');
    isAuthenticated.value = false;
  }
}
