import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:medflow/features/auth/data/auth_state.dart';

class AppShell extends ConsumerWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = _calculateSelectedIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) => _onItemTapped(index, context),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Дашборд',
          ),
          NavigationDestination(
            icon: Icon(Icons.payments_outlined),
            selectedIcon: Icon(Icons.payments),
            label: 'Витрати',
          ),
          NavigationDestination(
            icon: Icon(Icons.medical_services_outlined),
            selectedIcon: Icon(Icons.medical_services),
            label: 'Послуги',
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(
                    Icons.medical_services_rounded,
                    size: 40,
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'MedFlow',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Вийти'),
              onTap: () {
                Navigator.pop(context);
                ref.read(authProvider.notifier).logout();
                context.go('/login');
              },
            ),
          ],
        ),
      ),
    );
  }

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location == '/') return 0;
    if (location.startsWith('/expenses')) return 1;
    if (location.startsWith('/services')) return 2;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/');
        break;
      case 1:
        context.go('/expenses');
        break;
      case 2:
        context.go('/services');
        break;
    }
  }
}
