import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:medflow/core/api/api_client.dart';
import 'package:medflow/core/constants/api_endpoints.dart';
import 'package:intl/intl.dart';

final servicesProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get(ApiEndpoints.services);
  return response.data is List ? response.data : [];
});

class ServicesScreen extends ConsumerWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final servicesAsync = ref.watch(servicesProvider);
    final currencyFormat = NumberFormat.currency(locale: 'uk_UA', symbol: '\u20B4');

    return Scaffold(
      appBar: AppBar(title: const Text('Послуги')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(servicesProvider),
        child: servicesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Помилка: $e')),
          data: (services) {
            if (services.isEmpty) {
              return const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.medical_services, size: 64, color: Colors.grey),
                    SizedBox(height: 16),
                    Text('Послуг поки немає',
                        style: TextStyle(fontSize: 18, color: Colors.grey)),
                  ],
                ),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: services.length,
              itemBuilder: (context, index) {
                final service = services[index];
                final name = service['name'] ?? 'Послуга';
                final price = (service['price'] ?? 0).toDouble();

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.local_hospital, color: Colors.blue.shade400),
                    ),
                    title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    trailing: Text(
                      currencyFormat.format(price),
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade600,
                        fontSize: 16,
                      ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
