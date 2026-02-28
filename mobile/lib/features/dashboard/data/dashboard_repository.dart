import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:medflow/core/api/api_client.dart';
import 'package:medflow/core/constants/api_endpoints.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(ref.watch(apiClientProvider));
});

class DashboardRepository {
  final ApiClient _apiClient;

  DashboardRepository(this._apiClient);

  Future<Map<String, dynamic>> getReports({int? year, int? month}) async {
    final params = <String, dynamic>{};
    if (year != null) params['year'] = year;
    if (month != null) params['month'] = month;

    final response = await _apiClient.dio.get(
      ApiEndpoints.reports,
      queryParameters: params,
    );
    return response.data;
  }

  Future<List<dynamic>> getIncomes({int? year, int? month}) async {
    final params = <String, dynamic>{};
    if (year != null) params['year'] = year;
    if (month != null) params['month'] = month;

    final response = await _apiClient.dio.get(
      ApiEndpoints.incomes,
      queryParameters: params,
    );
    return response.data is List ? response.data : [];
  }

  Future<List<dynamic>> getExpenses({int? year, int? month}) async {
    final params = <String, dynamic>{};
    if (year != null) params['year'] = year;
    if (month != null) params['month'] = month;

    final response = await _apiClient.dio.get(
      ApiEndpoints.expenses,
      queryParameters: params,
    );
    return response.data is List ? response.data : [];
  }
}
