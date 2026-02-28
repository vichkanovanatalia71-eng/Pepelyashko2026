import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:medflow/features/auth/data/auth_repository.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final String? token;
  final Map<String, dynamic>? user;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.token,
    this.user,
    this.errorMessage,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? token,
    Map<String, dynamic>? user,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      token: token ?? this.token,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AuthState());

  Future<void> checkAuth() async {
    final isLoggedIn = await _repository.isLoggedIn();
    if (isLoggedIn) {
      try {
        final user = await _repository.getMe();
        state = AuthState(
          status: AuthStatus.authenticated,
          user: user,
        );
      } catch (_) {
        await _repository.logout();
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final token = await _repository.login(email: email, password: password);
      final user = await _repository.getMe();
      state = AuthState(
        status: AuthStatus.authenticated,
        token: token,
        user: user,
      );
    } catch (e) {
      String message = 'Помилка входу';
      if (e is Exception) {
        message = e.toString().replaceAll('Exception: ', '');
      }
      state = AuthState(
        status: AuthStatus.error,
        errorMessage: message,
      );
    }
  }

  Future<void> register(String email, String password, String fullName) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      await _repository.register(
        email: email,
        password: password,
        fullName: fullName,
      );
      // Auto-login after registration
      await login(email, password);
    } catch (e) {
      String message = 'Помилка реєстрації';
      if (e is Exception) {
        message = e.toString().replaceAll('Exception: ', '');
      }
      state = AuthState(
        status: AuthStatus.error,
        errorMessage: message,
      );
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});
