import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:medflow/core/api/api_client.dart';
import 'package:medflow/core/constants/api_endpoints.dart';
import 'package:intl/intl.dart';

final expensesProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get(ApiEndpoints.expenses);
  return response.data is List ? response.data : [];
});

class ExpensesScreen extends ConsumerWidget {
  const ExpensesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expensesAsync = ref.watch(expensesProvider);
    final currencyFormat = NumberFormat.currency(locale: 'uk_UA', symbol: '\u20B4');

    return Scaffold(
      appBar: AppBar(title: const Text('Витрати')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(expensesProvider),
        child: expensesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Помилка: $e')),
          data: (expenses) {
            if (expenses.isEmpty) {
              return const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.receipt_long, size: 64, color: Colors.grey),
                    SizedBox(height: 16),
                    Text('Витрат поки немає',
                        style: TextStyle(fontSize: 18, color: Colors.grey)),
                  ],
                ),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: expenses.length,
              itemBuilder: (context, index) {
                final expense = expenses[index];
                final amount = (expense['amount'] ?? 0).toDouble();
                final name = expense['name'] ?? expense['category'] ?? 'Витрата';
                final date = expense['date'] ?? '';

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.payments, color: Colors.red.shade400),
                    ),
                    title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(date),
                    trailing: Text(
                      currencyFormat.format(amount),
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.red.shade600,
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
