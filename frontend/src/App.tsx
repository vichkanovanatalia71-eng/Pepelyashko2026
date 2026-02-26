import React, { Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./hooks/useAuth";

// Lazy-load pages to reduce initial bundle size
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const ExpensesPage = React.lazy(() => import("./pages/ExpensesPage"));
const NhsuPage = React.lazy(() => import("./pages/NhsuPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const ServicesPage = React.lazy(() => import("./pages/ServicesPage"));
const RevenuePage = React.lazy(() => import("./pages/RevenuePage"));
const MonthlyServicesPage = React.lazy(() => import("./pages/MonthlyServicesPage"));
const AiConsultantPage = React.lazy(() => import("./pages/AiConsultantPage"));
const SharePage = React.lazy(() => import("./pages/SharePage"));
const OwnerSharePage = React.lazy(() => import("./pages/OwnerSharePage"));
const AccountantRequestPage = React.lazy(() => import("./pages/AccountantRequestPage"));
const VerifyEmailPage = React.lazy(() => import("./pages/VerifyEmailPage"));

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

const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<SuspenseFallback />}>
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
      </Suspense>
    </AuthProvider>
  );
}
