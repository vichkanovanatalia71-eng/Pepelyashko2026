import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Receipt,
  HeartPulse,
  LogOut,
  Stethoscope,
  Settings,
  BarChart3,
  MoreHorizontal,
  X,
  ChevronRight,
  User,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

// ── Навігаційні пункти ────────────────────────────────────────────
const navItems = [
  { to: "/",                   icon: LayoutDashboard, label: "Дашборд",       short: "Дашборд"  },
  { to: "/monthly-services",   icon: BarChart3,       label: "Платні послуги",short: "Послуги"  },
  { to: "/nhsu",               icon: HeartPulse,      label: "НСЗУ",          short: "НСЗУ"     },
  { to: "/taxes",              icon: Receipt,         label: "Податки",       short: "Податки"  },
  { to: "/incomes",            icon: TrendingUp,      label: "Доходи",        short: "Доходи"   },
  { to: "/expenses",           icon: TrendingDown,    label: "Витрати",       short: "Витрати"  },
  { to: "/settings",           icon: Settings,        label: "Налаштування",  short: "Налашт."  },
];

// Bottom bar: перші 4 + кнопка «Ще»
const bottomMain  = navItems.slice(0, 4);
const bottomExtra = navItems.slice(4);

export default function Layout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // «Ще» активне, якщо поточний шлях — один із extra-пунктів
  const extraActive = bottomExtra.some(({ to }) => location.pathname.startsWith(to));

  function handleExtraNav(to: string) {
    setDrawerOpen(false);
    navigate(to);
  }

  return (
    <div className="min-h-screen flex bg-dark-700">

      {/* ══════════════════════════════════════════════
          DESKTOP: бокова панель (lg+)
      ══════════════════════════════════════════════ */}
      <aside className="hidden lg:flex w-72 bg-dark-600 border-r border-dark-50/10 flex-col shrink-0">
        {/* Логотип */}
        <div className="p-6 border-b border-dark-50/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center shadow-glow-accent">
              <Stethoscope size={22} className="text-accent-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Pepelyashko</h1>
              <p className="text-xs text-gray-500">Фінанси ФОП</p>
            </div>
          </div>
        </div>

        {/* Навігація */}
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

        {/* Користувач / вихід */}
        <div className="p-4 border-t border-dark-50/10">
          {user && (
            <div className="card-neo-inset px-4 py-3 mb-3">
              <p className="text-sm text-gray-300 font-medium truncate">{user.full_name}</p>
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

      {/* ══════════════════════════════════════════════
          ОСНОВНИЙ КОНТЕНТ
      ══════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 overflow-auto
                       p-4 pb-[calc(5rem+env(safe-area-inset-bottom))]
                       lg:p-8 lg:pb-8">
        <Outlet />
      </main>

      {/* ══════════════════════════════════════════════
          MOBILE: нижня навігаційна панель (< lg)
      ══════════════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40
                      bg-dark-600/96 backdrop-blur-2xl
                      border-t border-dark-50/15
                      mobile-bottom-nav">
        <div className="flex items-stretch h-16">
          {bottomMain.map(({ to, icon: Icon, short }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-target"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent-400 rounded-full" />
                  )}
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200
                                  ${isActive ? "bg-accent-500/15 scale-110" : ""}`}>
                    <Icon
                      size={20}
                      className={`transition-colors duration-200 ${isActive ? "text-accent-400" : "text-gray-500"}`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium leading-none transition-colors duration-200 ${isActive ? "text-accent-400" : "text-gray-600"}`}>
                    {short}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* Кнопка «Ще» */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 tap-target relative"
          >
            {extraActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent-400 rounded-full" />
            )}
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200
                            ${extraActive ? "bg-accent-500/15 scale-110" : ""}`}>
              <MoreHorizontal size={20} className={`transition-colors duration-200 ${extraActive ? "text-accent-400" : "text-gray-500"}`} />
            </div>
            <span className={`text-[10px] font-medium leading-none transition-colors duration-200 ${extraActive ? "text-accent-400" : "text-gray-600"}`}>
              Ще
            </span>
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════
          MOBILE: Drawer «Ще» (slide-up)
      ══════════════════════════════════════════════ */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Панель */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50
                          bg-dark-600 rounded-t-3xl border-t border-dark-50/15
                          shadow-neo-lg animate-slide-up
                          pb-[env(safe-area-inset-bottom)]">

            {/* Ручка */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-dark-50/30 rounded-full" />
            </div>

            {/* Закрити */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <p className="text-sm font-semibold text-gray-300">Меню</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-xl bg-dark-400 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Пункти меню */}
            <div className="px-4 space-y-1 pb-2">
              {bottomExtra.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname.startsWith(to);
                return (
                  <button
                    key={to}
                    onClick={() => handleExtraNav(to)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl
                               text-sm font-medium transition-all tap-target
                               ${isActive
                                 ? "bg-accent-500/10 text-accent-400 border border-accent-500/20"
                                 : "text-gray-300 hover:bg-dark-400 active:bg-dark-300 border border-transparent"
                               }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                    ${isActive ? "bg-accent-500/15" : "bg-dark-400"}`}>
                      <Icon size={20} className={isActive ? "text-accent-400" : "text-accent-400"} />
                    </div>
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronRight size={16} className={isActive ? "text-accent-400/60" : "text-gray-600"} />
                  </button>
                );
              })}
            </div>

            {/* Роздільник */}
            <div className="h-px bg-dark-50/10 mx-4 my-2" />

            {/* Інфо та вихід */}
            <div className="px-4 pb-4 space-y-1">
              {user && (
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-dark-400/50">
                  <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center shrink-0">
                    <User size={18} className="text-accent-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => { setDrawerOpen(false); logout(); }}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl
                           text-sm font-medium text-red-400
                           hover:bg-red-500/10 active:bg-red-500/15 transition-all tap-target"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <LogOut size={20} className="text-red-400" />
                </div>
                <span className="flex-1 text-left">Вийти</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
