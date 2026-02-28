import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:medflow/core/constants/api_endpoints.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final secureStorageProvider = Provider<FlutterSecureStorage>(
  (ref) => const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  ),
);

class ApiClient {
  late final Dio dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Auth interceptor — automatically attach token
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          // Token expired — clear and redirect to login
          _storage.delete(key: 'access_token');
        }
        handler.next(error);
      },
    ));
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'access_token', value: token);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: 'access_token');
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'access_token');
  }

  Future<bool> hasToken() async {
    final token = await _storage.read(key: 'access_token');
    return token != null && token.isNotEmpty;
  }
}
