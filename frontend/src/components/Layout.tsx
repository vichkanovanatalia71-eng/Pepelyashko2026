import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Receipt,
  HeartPulse,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Дашборд" },
  { to: "/incomes", icon: TrendingUp, label: "Доходи" },
  { to: "/expenses", icon: TrendingDown, label: "Витрати" },
  { to: "/taxes", icon: Receipt, label: "Податки" },
  { to: "/nhsu", icon: HeartPulse, label: "НСЗУ" },
];

export default function Layout() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-dark-700">
      {/* Sidebar */}
      <aside className="w-72 bg-dark-600 border-r border-dark-50/10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-dark-50/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center shadow-glow-accent">
              <Stethoscope size={22} className="text-accent-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Pepelyashko
              </h1>
              <p className="text-xs text-gray-500">Фінанси ФОП</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-accent-500/10 text-accent-400 shadow-neo-sm border border-accent-500/20"
                    : "text-gray-400 hover:bg-dark-300 hover:text-gray-200 border border-transparent"
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-dark-50/10">
          {user && (
            <div className="card-neo-inset px-4 py-3 mb-3">
              <p className="text-sm text-gray-300 font-medium truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-200"
          >
            <LogOut size={18} />
            Вийти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
