import 'package:dio/dio.dart';
import 'package:get_storage/get_storage.dart';
import 'package:mobile/app/data/config.dart';

class ApiClient {
  late Dio dio;
  final storage = GetStorage();

  ApiClient() {
    dio = Dio(
      BaseOptions(
        baseUrl: Config.baseUrl.endsWith('/')
            ? Config.baseUrl
            : '${Config.baseUrl}/',
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = storage.read('device_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (e, handler) {
          // Handle global errors if needed
          return handler.next(e);
        },
      ),
    );
  }

  Future<Response> post(String path, dynamic data) =>
      dio.post(path, data: data);
  Future<Response> get(String path) => dio.get(path);
  Future<Response> put(String path, dynamic data) => dio.put(path, data: data);
}
