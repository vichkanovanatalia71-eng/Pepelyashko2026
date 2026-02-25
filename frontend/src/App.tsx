import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ExpensesPage from "./pages/ExpensesPage";
import NhsuPage from "./pages/NhsuPage";
import SettingsPage from "./pages/SettingsPage";
import ServicesPage from "./pages/ServicesPage";
import RevenuePage from "./pages/RevenuePage";
import MonthlyServicesPage from "./pages/MonthlyServicesPage";
import AiConsultantPage from "./pages/AiConsultantPage";
import SharePage from "./pages/SharePage";
import OwnerSharePage from "./pages/OwnerSharePage";
import AccountantRequestPage from "./pages/AccountantRequestPage";
import LoginPage from "./pages/LoginPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import { AuthProvider, useAuth } from "./hooks/useAuth";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isReady } = useAuth();
  if (!isReady) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Error boundary to prevent page crashes from killing the entire app
class PageErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[PageErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
          <p className="text-gray-400 text-lg">Сторінку не вдалося завантажити</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-accent-500/20 text-accent-400 rounded-xl hover:bg-accent-500/30 transition"
          >
            Спробувати ще раз
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/owner-share/:token" element={<OwnerSharePage />} />
        <Route path="/accountant/:token" element={<AccountantRequestPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PageErrorBoundary><Dashboard /></PageErrorBoundary>} />
          <Route path="expenses" element={<PageErrorBoundary><ExpensesPage /></PageErrorBoundary>} />
          <Route path="nhsu" element={<PageErrorBoundary><NhsuPage /></PageErrorBoundary>} />
          <Route path="ai-consultant" element={<PageErrorBoundary><AiConsultantPage /></PageErrorBoundary>} />
          <Route path="settings" element={<PageErrorBoundary><SettingsPage /></PageErrorBoundary>} />
          <Route path="services" element={<PageErrorBoundary><ServicesPage /></PageErrorBoundary>} />
          <Route path="monthly-services" element={<PageErrorBoundary><MonthlyServicesPage /></PageErrorBoundary>} />
          <Route path="revenue" element={<PageErrorBoundary><RevenuePage /></PageErrorBoundary>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
