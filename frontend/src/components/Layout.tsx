import { useState, useEffect, useCallback } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingDown,
  HeartPulse,
  LogOut,
  Stethoscope,
  Settings,
  BarChart3,
  ClipboardList,
  MoreHorizontal,
  X,
  User,
  BadgeDollarSign,
  Sun,
  Moon,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

// ── Навігаційні пункти ────────────────────────────────────────────
const navItems = [
  { to: "/",                   icon: LayoutDashboard,  label: "Дашборд",        short: "Дашборд"  },
  { to: "/revenue",            icon: BadgeDollarSign,  label: "Доходи",         short: "Доходи"   },
  { to: "/monthly-services",   icon: BarChart3,        label: "Платні послуги", short: "Послуги"  },
  { to: "/nhsu",               icon: HeartPulse,       label: "НСЗУ",           short: "НСЗУ"     },
  { to: "/expenses",           icon: TrendingDown,     label: "Витрати",        short: "Витрати"  },
  { to: "/ai-consultant",      icon: MessageCircle,    label: "AI-Консультант", short: "AI"       },
  { to: "/services",           icon: ClipboardList,    label: "Прайс послуг",   short: "Прайс"    },
  { to: "/settings",           icon: Settings,         label: "Налаштування",   short: "Налашт."  },
  { to: "/profile",            icon: User,             label: "Профіль",        short: "Профіль"  },
];

export default function Layout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toggle, isLight } = useTheme();

  // Close drawer on ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && drawerOpen) setDrawerOpen(false);
  }, [drawerOpen]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-dark-700">

      {/* ══════════════════════════════════════════════
          DESKTOP: бокова панель (lg+)
      ══════════════════════════════════════════════ */}
      <aside className="hidden lg:flex w-72 bg-dark-600 border-r border-dark-50/10 flex-col shrink-0">
        {/* Логотип + перемикач теми */}
        <div className="p-6 border-b border-dark-50/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center shadow-glow-accent">
                <Stethoscope size={22} className="text-accent-500" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Pepelyashko</h1>
                <p className="text-xs text-gray-500">Фінанси ФОП</p>
              </div>
            </div>
            <button
              onClick={toggle}
              aria-label={isLight ? "Увімкнути темну тему" : "Увімкнути світлу тему"}
              className="w-9 h-9 rounded-xl border border-dark-50/20 flex items-center justify-center
                         text-gray-400 hover:text-accent-400 hover:bg-accent-500/10
                         hover:border-accent-500/30 transition-all duration-200"
            >
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>

        {/* Навігація */}
        <nav className="flex-1 p-4 space-y-1" aria-label="Основна навігація">
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
              <Icon size={20} aria-hidden="true" />
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
            <LogOut size={18} aria-hidden="true" />
            Вийти
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          ОСНОВНИЙ КОНТЕНТ
      ══════════════════════════════════════════════ */}
      <main
        className="flex-1 min-w-0 overflow-auto
                   p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))]
                   lg:p-8 lg:pb-8 lg:pt-8"
        id="main-content"
      >
        <Outlet />
      </main>

      {/* ══════════════════════════════════════════════
          MOBILE: нижня навігаційна панель (< lg)
      ══════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40
                   mobile-bottom-nav"
        aria-label="Мобільна навігація"
      >
        <div className="flex items-stretch h-16 overflow-x-auto scrollbar-hide">
          {navItems.map(({ to, icon: Icon, short }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className="min-w-[4.5rem] flex-shrink-0 flex flex-col items-center justify-center gap-0.5 relative tap-target"
              aria-label={short}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="nav-active-pill" aria-hidden="true" />
                  )}
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center
                                  transition-all duration-200 ease-spring
                                  ${isActive ? "bg-accent-500/15 scale-110" : "active:scale-90"}`}>
                    <Icon
                      size={20}
                      aria-hidden="true"
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

          {/* Кнопка «Ще» — відкриває drawer з виходом і темою */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Показати додаткове меню"
            aria-expanded={drawerOpen}
            className="min-w-[4.5rem] flex-shrink-0 flex flex-col items-center justify-center gap-0.5 tap-target relative"
          >
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center
                            transition-all duration-200 ease-spring active:scale-90">
              <MoreHorizontal size={20} aria-hidden="true" className="transition-colors duration-200 text-gray-500" />
            </div>
            <span className="text-[10px] font-medium leading-none transition-colors duration-200 text-gray-600">
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
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Панель */}
          <div
            className="lg:hidden fixed inset-x-0 bottom-0 z-50
                       bg-dark-600 rounded-t-3xl border-t border-dark-50/15
                       shadow-elevation-3 animate-slide-up
                       pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            aria-label="Додаткове меню"
          >

            {/* Ручка */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-dark-50/30 rounded-full" aria-hidden="true" />
            </div>

            {/* Заголовок + закрити */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <p className="text-sm font-semibold text-gray-300">Меню</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggle}
                  aria-label={isLight ? "Увімкнути темну тему" : "Увімкнути світлу тему"}
                  className="w-8 h-8 rounded-xl bg-dark-400 flex items-center justify-center
                             text-gray-400 hover:text-accent-400 active:scale-90
                             transition-all duration-150"
                >
                  {isLight ? <Moon size={15} /> : <Sun size={15} />}
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Закрити меню"
                  className="w-8 h-8 rounded-xl bg-dark-400 flex items-center justify-center
                             text-gray-500 hover:text-white active:scale-90
                             transition-all duration-150"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Інфо та вихід */}
            <div className="px-4 pb-4 space-y-1">
              {user && (
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-dark-400/50 border border-dark-50/5">
                  <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center shrink-0
                                  shadow-sm shadow-accent-500/10">
                    <User size={18} aria-hidden="true" className="text-accent-400" />
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
                           hover:bg-red-500/10 active:bg-red-500/15 active:scale-[0.98]
                           transition-all duration-150 tap-target"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <LogOut size={20} aria-hidden="true" className="text-red-400" />
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
