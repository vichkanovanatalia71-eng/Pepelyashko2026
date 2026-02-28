import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:medflow/core/api/api_client.dart';
import 'package:medflow/core/constants/api_endpoints.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

class AuthRepository {
  final ApiClient _apiClient;

  AuthRepository(this._apiClient);

  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String fullName,
    int fopGroup = 3,
    double taxRate = 0.05,
  }) async {
    final response = await _apiClient.dio.post(
      ApiEndpoints.register,
      data: {
        'email': email,
        'password': password,
        'full_name': fullName,
        'fop_group': fopGroup,
        'tax_rate': taxRate,
      },
    );
    return response.data;
  }

  Future<String> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.dio.post(
      ApiEndpoints.login,
      data: {'username': email, 'password': password},
      options: Options(contentType: Headers.formUrlEncodedContentType),
    );
    final token = response.data['access_token'] as String;
    await _apiClient.saveToken(token);
    return token;
  }

  Future<Map<String, dynamic>> getMe() async {
    final response = await _apiClient.dio.get(ApiEndpoints.me);
    return response.data;
  }

  Future<void> logout() async {
    await _apiClient.clearToken();
  }

  Future<bool> isLoggedIn() async {
    return await _apiClient.hasToken();
  }

  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    await _apiClient.dio.put(
      ApiEndpoints.changePassword,
      data: {
        'old_password': oldPassword,
        'new_password': newPassword,
      },
    );
  }
}
