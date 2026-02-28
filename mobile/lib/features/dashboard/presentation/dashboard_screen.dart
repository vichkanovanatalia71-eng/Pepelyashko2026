import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:medflow/features/dashboard/data/dashboard_repository.dart';
import 'package:medflow/features/auth/data/auth_state.dart';
import 'package:intl/intl.dart';

final dashboardDataProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(dashboardRepositoryProvider);
  return await repo.getReports();
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardDataProvider);
    final authState = ref.watch(authProvider);
    final currencyFormat = NumberFormat.currency(locale: 'uk_UA', symbol: '\u20B4');

    return Scaffold(
      appBar: AppBar(
        title: const Text('MedFlow'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(dashboardDataProvider),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(dashboardDataProvider),
        child: dashboardAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: Colors.red.shade400),
                  const SizedBox(height: 16),
                  Text(
                    'Помилка завантаження',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    error.toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => ref.invalidate(dashboardDataProvider),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Спробувати знову'),
                  ),
                ],
              ),
            ),
          ),
          data: (data) {
            final totalIncome = (data['total_income'] ?? 0).toDouble();
            final totalExpenses = (data['total_expenses'] ?? 0).toDouble();
            final profit = totalIncome - totalExpenses;

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Greeting
                if (authState.user != null) ...[
                  Text(
                    'Привіт, ${authState.user!['full_name'] ?? 'Користувач'}!',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    DateFormat('d MMMM yyyy', 'uk').format(DateTime.now()),
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 24),
                ],

                // Financial summary cards
                _SummaryCard(
                  title: 'Доходи',
                  value: currencyFormat.format(totalIncome),
                  icon: Icons.trending_up,
                  color: Colors.green,
                ),
                const SizedBox(height: 12),
                _SummaryCard(
                  title: 'Витрати',
                  value: currencyFormat.format(totalExpenses),
                  icon: Icons.trending_down,
                  color: Colors.red,
                ),
                const SizedBox(height: 12),
                _SummaryCard(
                  title: 'Прибуток',
                  value: currencyFormat.format(profit),
                  icon: Icons.account_balance_wallet,
                  color: profit >= 0 ? Colors.blue : Colors.orange,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _SummaryCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
