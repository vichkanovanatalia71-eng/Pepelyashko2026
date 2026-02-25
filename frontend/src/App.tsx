import { Routes, Route, Navigate } from "react-router-dom";
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
    </AuthProvider>
  );
}
