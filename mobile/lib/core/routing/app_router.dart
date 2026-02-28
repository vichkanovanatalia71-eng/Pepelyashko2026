import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:medflow/features/auth/presentation/login_screen.dart';
import 'package:medflow/features/auth/presentation/register_screen.dart';
import 'package:medflow/features/dashboard/presentation/dashboard_screen.dart';
import 'package:medflow/features/expenses/presentation/expenses_screen.dart';
import 'package:medflow/features/services/presentation/services_screen.dart';
import 'package:medflow/shared/widgets/app_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/expenses',
            builder: (context, state) => const ExpensesScreen(),
          ),
          GoRoute(
            path: '/services',
            builder: (context, state) => const ServicesScreen(),
          ),
        ],
      ),
    ],
  );
});
