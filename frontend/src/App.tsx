import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { LoadingSpinner } from "./components/shared";
import LoginPage from "./pages/LoginPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import { AuthProvider, useAuth } from "./hooks/useAuth";

// ── Lazy-loaded pages (code splitting) ────────────────────────────
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const NhsuPage = lazy(() => import("./pages/NhsuPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const RevenuePage = lazy(() => import("./pages/RevenuePage"));
const MonthlyServicesPage = lazy(() => import("./pages/MonthlyServicesPage"));
const AiConsultantPage = lazy(() => import("./pages/AiConsultantPage"));
const SharePage = lazy(() => import("./pages/SharePage"));
const OwnerSharePage = lazy(() => import("./pages/OwnerSharePage"));
const AccountantRequestPage = lazy(() => import("./pages/AccountantRequestPage"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
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
            <Route index element={<Dashboard />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="nhsu" element={<NhsuPage />} />
            <Route path="ai-consultant" element={<AiConsultantPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="monthly-services" element={<MonthlyServicesPage />} />
            <Route path="revenue" element={<RevenuePage />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
