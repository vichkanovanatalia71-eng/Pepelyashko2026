/// API endpoint constants matching the FastAPI backend.
class ApiEndpoints {
  // Change this to your Railway backend URL in production
  static const String baseUrl = 'http://10.0.2.2:8000'; // Android emulator → localhost
  // static const String baseUrl = 'http://localhost:8000'; // iOS simulator
  // static const String baseUrl = 'https://your-backend.up.railway.app'; // Production

  // Auth
  static const String register = '/api/auth/register';
  static const String login = '/api/auth/login';
  static const String me = '/api/auth/me';
  static const String profile = '/api/auth/profile';
  static const String changePassword = '/api/auth/change-password';

  // Dashboard / Reports
  static const String reports = '/api/reports';

  // Incomes
  static const String incomes = '/api/incomes';

  // Expenses
  static const String expenses = '/api/expenses';

  // Monthly expenses
  static const String monthlyExpenses = '/api/monthly-expenses';

  // Taxes
  static const String taxes = '/api/taxes';

  // Services
  static const String services = '/api/services';

  // Monthly services
  static const String monthlyServices = '/api/monthly-services';

  // Revenue
  static const String revenue = '/api/revenue';

  // Staff
  static const String staff = '/api/staff';

  // Budget
  static const String budget = '/api/budget';

  // NHSU
  static const String nhsu = '/api/nhsu';

  // AI Consultant
  static const String aiConsultant = '/api/ai-consultant';

  // Health
  static const String health = '/api/health';
}
