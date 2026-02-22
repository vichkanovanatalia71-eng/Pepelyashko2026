import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Lightbulb,
  ShieldAlert,
  AlertCircle,
  Info,
  X,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import type { DashboardReport } from "../types";
import { fmtUAH } from "../lib/utils";
import {
  PageHeader,
  MonthNavigator,
  MONTH_NAMES,
  EmptyState,
  AlertBanner,
  StatRow,
  KPICard,
  SectionCard,
} from "../components/shared";

const TT_STYLE = {
  background: "#1a1a2e",
  border: "1px solid #ffffff15",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

// ─── Insight config ──────────────────────────────────────────────────
const INSIGHT_CONFIG: Record<string, { icon: typeof AlertCircle; color: string; bg: string; border: string; label: string }> = {
  risk:        { icon: ShieldAlert, color: "text-red-400",     bg: "bg-red-500/5",     border: "border-red-500/20",     label: "Ризик" },
  warning:     { icon: AlertCircle, color: "text-amber-400",   bg: "bg-amber-500/5",   border: "border-amber-500/20",   label: "Увага" },
  opportunity: { icon: Lightbulb,   color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/20", label: "Можливість" },
  insight:     { icon: Info,        color: "text-blue-400",    bg: "bg-blue-500/5",    border: "border-blue-500/20",    label: "Інсайт" },
};

// ─── Skeleton loader ─────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* KPI skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 stagger-enter">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card-neo p-4 lg:p-5 border border-dark-50/10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl skeleton-shimmer" />
              <div className="w-12 h-4 rounded-lg skeleton-shimmer" />
            </div>
            <div className="w-20 h-3 rounded-lg skeleton-shimmer mb-2" />
            <div className="w-28 h-7 rounded-lg skeleton-shimmer" />
            <div className="w-24 h-3 rounded-lg skeleton-shimmer mt-2" />
          </div>
        ))}
      </div>
      {/* Chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-enter">
        <div className="lg:col-span-2 card-neo p-5">
          <div className="w-40 h-4 rounded-lg skeleton-shimmer mb-4" />
          <div className="w-full h-[200px] rounded-xl skeleton-shimmer" />
        </div>
        <div className="card-neo p-5">
          <div className="w-32 h-4 rounded-lg skeleton-shimmer mb-4" />
          <div className="w-full h-[200px] rounded-xl skeleton-shimmer" />
        </div>
      </div>
      {/* Tax & insights skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-enter">
        <div className="card-neo p-5">
          <div className="w-36 h-4 rounded-lg skeleton-shimmer mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="flex justify-between"><div className="w-28 h-3 rounded-lg skeleton-shimmer" /><div className="w-20 h-3 rounded-lg skeleton-shimmer" /></div>)}
          </div>
        </div>
        <div className="card-neo p-5">
          <div className="w-36 h-4 rounded-lg skeleton-shimmer mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="w-full h-16 rounded-xl skeleton-shimmer" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Drill-down modal ─────────────────────────────────────────────────
function DrillModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:p-4 sm:items-center overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative bg-dark-600 border border-dark-50/10
                      rounded-none sm:rounded-2xl w-full max-w-2xl min-h-full sm:min-h-0
                      shadow-elevation-3 animate-modal-in pb-20 sm:pb-0">
        <div className="flex items-center justify-between p-5 border-b border-dark-50/10 bg-dark-400/20 backdrop-blur-sm">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="p-2 text-gray-500 hover:text-gray-300 rounded-xl hover:bg-dark-300
                       active:scale-90 transition-all duration-150"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────
export default function Dashboard() {
  const now = new Date();
  const navigate = useNavigate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [data, setData] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down state
  const [drillModal, setDrillModal] = useState<null | "income" | "expenses" | "taxes">(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get("/reports/dashboard", { params: { year, month: month + 1 } })
      .then((res) => setData(res.data))
      .catch((err) => {
        setData(null);
        setError(err?.response?.data?.detail || "Не вдалось завантажити дані дашборду");
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  // Tax deadline reminders
  const [dismissedReminders, setDismissedReminders] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_reminders") || "[]"); }
    catch { return []; }
  });

  function dismissReminder(id: string) {
    const updated = [...dismissedReminders, id];
    setDismissedReminders(updated);
    localStorage.setItem("dismissed_reminders", JSON.stringify(updated));
  }

  const reminders = (() => {
    const items: { id: string; text: string; type: "warning" | "info" }[] = [];
    const day = now.getDate();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const taxDeadlines = [
      { quarter: 1, deadlineMonth: 4, deadlineDay: 20 },
      { quarter: 2, deadlineMonth: 7, deadlineDay: 20 },
      { quarter: 3, deadlineMonth: 10, deadlineDay: 20 },
      { quarter: 4, deadlineMonth: 1, deadlineDay: 20 },
    ];

    for (const { quarter, deadlineMonth, deadlineDay } of taxDeadlines) {
      const deadlineYear = quarter === 4 ? curYear + 1 : curYear;
      if (curMonth === deadlineMonth && curYear <= deadlineYear) {
        const daysLeft = deadlineDay - day;
        if (daysLeft > 0 && daysLeft <= 10) {
          items.push({
            id: `tax-q${quarter}-${curYear}`,
            text: `Єдиний податок за Q${quarter}: залишилось ${daysLeft} дн. (до ${deadlineDay}.${String(deadlineMonth).padStart(2, "0")})`,
            type: daysLeft <= 3 ? "warning" : "info",
          });
        }
      }
    }

    if (day <= 19) {
      const daysLeft = 19 - day;
      if (daysLeft <= 7 && daysLeft > 0) {
        items.push({
          id: `esv-${curYear}-${curMonth}`,
          text: `ЄСВ за ${MONTH_NAMES[curMonth === 1 ? 11 : curMonth - 2].toLowerCase()}: залишилось ${daysLeft} дн. (до 19.${String(curMonth).padStart(2, "0")})`,
          type: daysLeft <= 3 ? "warning" : "info",
        });
      }
    }

    return items.filter(r => !dismissedReminders.includes(r.id));
  })();

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Дашборд"
        subtitle={`Фінансовий огляд за ${MONTH_NAMES[month].toLowerCase()} ${year}`}
      >
        <MonthNavigator
          year={year}
          month={month}
          onPrev={prevMonth}
          onNext={nextMonth}
          disableNext={isCurrentMonth}
        />
      </PageHeader>

      {/* Tax deadline reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2" role="region" aria-label="Нагадування про терміни сплати">
          {reminders.map(r => (
            <AlertBanner
              key={r.id}
              variant={r.type === "warning" ? "error" : "warning"}
              onDismiss={() => dismissReminder(r.id)}
            >
              {r.text}
            </AlertBanner>
          ))}
        </div>
      )}

      {/* Loading state: skeleton */}
      {loading && <DashboardSkeleton />}

      {/* Error state */}
      {!loading && error && (
        <div className="card-neo p-8 text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium mb-2">Помилка завантаження</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); api.get("/reports/dashboard", { params: { year, month: month + 1 } }).then(r => setData(r.data)).catch(() => setError("Повторна помилка")).finally(() => setLoading(false)); }}
            className="btn-accent mt-4"
          >
            Спробувати ще раз
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.total_income === 0 && data.total_expenses === 0 && (
        <EmptyState
          title={`Немає даних за ${MONTH_NAMES[month].toLowerCase()} ${year}`}
          description="Додайте перший дохід або витрату, щоб побачити аналітику"
          action={
            <button onClick={() => navigate("/incomes")} className="btn-accent">
              Додати дохід
            </button>
          }
        />
      )}

      {/* ══════════════ Main content ══════════════ */}
      {!loading && !error && data && (data.total_income > 0 || data.total_expenses > 0) && (
        <>
          {/* ── 1. KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 stagger-enter">
            <KPICard
              label="Доходи"
              value={data.total_income}
              color="text-emerald-400"
              borderColor="border-emerald-500/20"
              changePct={data.income_change_pct}
              prevValue={data.prev_income}
              avgValue={data.avg_income_6m}
              tooltip="Загальна сума всіх доходів за місяць. Порівняння з попереднім місяцем та середнім за 6 місяців."
              onClick={() => setDrillModal("income")}
              icon={
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <TrendingUp size={18} className="text-emerald-400" aria-hidden="true" />
                </div>
              }
            />
            <KPICard
              label="Витрати"
              value={data.total_expenses}
              color="text-red-400"
              borderColor="border-red-500/20"
              changePct={data.expenses_change_pct}
              prevValue={data.prev_expenses}
              avgValue={data.avg_expenses_6m}
              tooltip="Загальна сума всіх витрат за місяць. Зростання витрат — сигнал до перевірки."
              onClick={() => setDrillModal("expenses")}
              icon={
                <div className="p-2 rounded-xl bg-red-500/10">
                  <TrendingDown size={18} className="text-red-400" aria-hidden="true" />
                </div>
              }
            />
            <KPICard
              label="Чистий прибуток"
              value={data.net_profit}
              color={data.net_profit >= 0 ? "text-accent-400" : "text-red-400"}
              borderColor={data.net_profit >= 0 ? "border-accent-500/20" : "border-red-500/20"}
              changePct={data.profit_change_pct}
              prevValue={data.prev_profit}
              avgValue={data.avg_profit_6m}
              tooltip="Доходи мінус витрати (до оподаткування). Показує операційну ефективність бізнесу."
              icon={
                <div className={`p-2 rounded-xl ${data.net_profit >= 0 ? "bg-accent-500/10" : "bg-red-500/10"}`}>
                  <Wallet size={18} className={data.net_profit >= 0 ? "text-accent-400" : "text-red-400"} aria-hidden="true" />
                </div>
              }
            />
            <KPICard
              label="Податки"
              value={data.total_taxes}
              color="text-yellow-400"
              borderColor="border-yellow-500/20"
              changePct={data.taxes_change_pct}
              prevValue={data.prev_taxes}
              tooltip="Єдиний податок (5%) + ЄСВ + Військовий збір (1.5%). Розраховується від доходу."
              onClick={() => setDrillModal("taxes")}
              icon={
                <div className="p-2 rounded-xl bg-yellow-500/10">
                  <Receipt size={18} className="text-yellow-400" aria-hidden="true" />
                </div>
              }
            />
          </div>

          {/* ── AI Analytics Block ── */}
          {data.ai_insights && data.ai_insights.length > 0 && (
            <div className="card-neo p-5 border border-blue-500/15 bg-blue-500/5 stagger-enter">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    AI-Асистент / Аналітика системи
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">Аналіз фінансової ситуації та рекомендації</p>
                </div>
              </div>
              <div className="space-y-3">
                {data.ai_insights.map((insight, i) => {
                  const typeConfig: Record<string, { icon: typeof AlertCircle; color: string; label: string }> = {
                    risk: { icon: ShieldAlert, color: "text-red-400", label: "РИЗИК" },
                    warning: { icon: AlertCircle, color: "text-amber-400", label: "УВАГА" },
                    opportunity: { icon: Lightbulb, color: "text-emerald-400", label: "МОЖЛИВІСТЬ" },
                    insight: { icon: Info, color: "text-blue-400", label: "ІНСАЙТ" },
                  };
                  const cfg = typeConfig[insight.type] || typeConfig.insight;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="rounded-lg border border-dark-50/10 bg-dark-300/20 p-4">
                      <div className="flex items-start gap-3">
                        <Icon size={16} className={`${cfg.color} shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-sm font-semibold text-white">{insight.title}</span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed mb-2">{insight.description}</p>
                          {insight.data_basis && (
                            <p className="text-[10px] text-gray-600 italic">Основа: {insight.data_basis}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 2. Trend chart + Income after taxes ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Area trend chart — 6 months */}
            <div className="lg:col-span-2 card-neo p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Динаміка за 6 місяців</h3>
              <p className="text-xs text-gray-600 mb-4">Доходи, витрати та прибуток — тренд</p>
              {data.trend.length > 1 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month_name" tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={TT_STYLE} formatter={(v: number, name: string) => [`${fmtUAH(v)} ₴`, name === "income" ? "Доходи" : name === "expenses" ? "Витрати" : "Прибуток"]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} formatter={(val) => val === "income" ? "Доходи" : val === "expenses" ? "Витрати" : "Прибуток"} />
                    <Area type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#gIncome)" />
                    <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fillOpacity={1} fill="url(#gExpenses)" />
                    <Area type="monotone" dataKey="profit" stroke="#818cf8" strokeWidth={2} strokeDasharray="4 2" fillOpacity={0} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">
                  Недостатньо даних для побудови тренду
                </div>
              )}
            </div>

            {/* Tax summary + income after taxes */}
            <SectionCard
              title="Податки за місяць"
              icon={<Receipt size={16} className="text-yellow-400" />}
              iconBg="bg-yellow-500/10"
              trailing={
                <button onClick={() => navigate("/taxes")} className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-0.5">
                  Детальніше <ChevronRight size={12} />
                </button>
              }
            >
              <div className="space-y-1">
                <StatRow label="Єдиний податок (5%)" value={data.tax_single} dot="bg-accent-400" />
                <StatRow label="ЄСВ" value={data.tax_esv} dot="bg-yellow-400" />
                <StatRow label="Військовий збір (1.5%)" value={data.tax_vz} dot="bg-orange-400" />
                <StatRow label="Всього податків" value={data.total_taxes} dot="bg-red-400" color="text-red-400" borderTop />
                <StatRow label="Дохід після податків" value={data.income_after_taxes} dot="bg-emerald-400" color="text-emerald-400" bold borderTop />
              </div>
            </SectionCard>
          </div>

          {/* ── 3. Structure breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income by category */}
            <div className="card-neo p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Структура доходів</h3>
                  <p className="text-xs text-gray-600 mt-0.5">По категоріях</p>
                </div>
                <button onClick={() => navigate("/incomes")} className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-0.5">
                  Всі доходи <ChevronRight size={12} />
                </button>
              </div>
              {data.income_by_category.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(100, data.income_by_category.length * 36)}>
                    <BarChart
                      data={data.income_by_category.slice(0, 8)}
                      layout="vertical"
                      margin={{ left: 0, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} width={110} />
                      <Tooltip contentStyle={TT_STYLE} formatter={(v: number) => [`${fmtUAH(v)} ₴`]} />
                      <Bar dataKey="amount" fill="#34d399" radius={[0, 4, 4, 0]} name="Сума" />
                    </BarChart>
                  </ResponsiveContainer>
                  {data.income_by_category.length > 8 && (
                    <p className="text-xs text-gray-600 mt-2">+ ще {data.income_by_category.length - 8} категорій</p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
                  Категорії доходів не визначено
                </div>
              )}
            </div>

            {/* Expenses by category */}
            <div className="card-neo p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Структура витрат</h3>
                  <p className="text-xs text-gray-600 mt-0.5">По категоріях</p>
                </div>
                <button onClick={() => navigate("/expenses")} className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-0.5">
                  Всі витрати <ChevronRight size={12} />
                </button>
              </div>
              {data.expense_by_category.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(100, data.expense_by_category.length * 36)}>
                    <BarChart
                      data={data.expense_by_category.slice(0, 8)}
                      layout="vertical"
                      margin={{ left: 0, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} width={110} />
                      <Tooltip contentStyle={TT_STYLE} formatter={(v: number) => [`${fmtUAH(v)} ₴`]} />
                      <Bar dataKey="amount" fill="#f87171" radius={[0, 4, 4, 0]} name="Сума" />
                    </BarChart>
                  </ResponsiveContainer>
                  {data.expense_by_category.length > 8 && (
                    <p className="text-xs text-gray-600 mt-2">+ ще {data.expense_by_category.length - 8} категорій</p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
                  Категорії витрат не визначено
                </div>
              )}
            </div>
          </div>

          {/* ── 4. Insights / Recommendations ── */}
          {data.insights.length > 0 && (
            <SectionCard
              title="Інсайти та рекомендації"
              icon={<Lightbulb size={16} className="text-amber-400" />}
              iconBg="bg-amber-500/10"
            >
              <div className="space-y-3">
                {data.insights.map((insight, i) => {
                  const cfg = INSIGHT_CONFIG[insight.type] ?? INSIGHT_CONFIG.insight;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
                      <div className="flex items-start gap-3">
                        <Icon size={16} className={`${cfg.color} shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-sm font-semibold text-white">{insight.title}</span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ── 5. Quick navigation ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-enter">
            {[
              { label: "Доходи", path: "/incomes", color: "text-emerald-400", border: "border-emerald-500/15" },
              { label: "Витрати", path: "/expenses", color: "text-red-400", border: "border-red-500/15" },
              { label: "Аналітика доходів", path: "/revenue", color: "text-accent-400", border: "border-accent-500/15" },
              { label: "Податки", path: "/taxes", color: "text-yellow-400", border: "border-yellow-500/15" },
            ].map(nav => (
              <button
                key={nav.path}
                onClick={() => navigate(nav.path)}
                className={`card-neo card-tap p-3 lg:p-4 border ${nav.border} text-left
                           hover:bg-dark-300/30 transition-all duration-200 group`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${nav.color}`}>{nav.label}</span>
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ══════════════ DRILL-DOWN MODALS ══════════════ */}

      {/* Income drill-down */}
      {drillModal === "income" && data && (
        <DrillModal title={`Доходи — ${data.period_label}`} onClose={() => setDrillModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-dark-300/50 border border-dark-50/10 p-3">
                <p className="text-xs text-gray-500 mb-1">Поточний</p>
                <p className="text-base font-bold text-emerald-400 font-mono tabular-nums">{fmtUAH(data.total_income)} ₴</p>
              </div>
              <div className="rounded-xl bg-dark-300/50 border border-dark-50/10 p-3">
                <p className="text-xs text-gray-500 mb-1">Попередній</p>
                <p className="text-base font-bold text-gray-300 font-mono tabular-nums">{fmtUAH(data.prev_income)} ₴</p>
              </div>
              <div className="rounded-xl bg-dark-300/50 border border-dark-50/10 p-3">
                <p className="text-xs text-gray-500 mb-1">Середній (6м)</p>
                <p className="text-base font-bold text-gray-300 font-mono tabular-nums">{fmtUAH(data.avg_income_6m)} ₴</p>
              </div>
            </div>
            {data.top_income_sources.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Топ джерел доходу</h4>
                <div className="overflow-x-auto rounded-xl border border-dark-50/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-dark-300/50 border-b border-dark-50/10">
                        <th scope="col" className="text-left px-3 py-2.5 text-gray-500 font-medium">Джерело</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-500 font-medium">Сума</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-500 font-medium">Частка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_income_sources.map((s, i) => (
                        <tr key={i} className="border-b border-dark-50/5">
                          <td className="px-3 py-2.5 text-gray-300">{s.name}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-400 tabular-nums font-medium">{fmtUAH(s.amount)} ₴</td>
                          <td className="px-3 py-2.5 text-right text-gray-500">{s.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {data.income_by_category.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">По категоріях</h4>
                <div className="overflow-x-auto rounded-xl border border-dark-50/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-dark-300/50 border-b border-dark-50/10">
                        <th scope="col" className="text-left px-3 py-2.5 text-gray-500 font-medium">Категорія</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-500 font-medium">Сума</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-500 font-medium">Частка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.income_by_category.map((c, i) => (
                        <tr key={i} className="border-b border-dark-50/5">
                          <td className="px-3 py-2.5 text-gray-300">{c.name}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-400 tabular-nums font-medium">{fmtUAH(c.amount)} ₴</td>
                          <td className="px-3 py-2.5 text-right text-gray-500">{c.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </DrillModal>
      )}

      {/* Expenses drill-down */}
      {drillModal === "expenses" && data && (
        <DrillModal title={`Витрати — ${data.period_label}`} onClose={() => setDrillModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-dark-300/50 border border-dark-50/10 p-3">
                <p className="text-xs text-gray-500 mb-1">Поточний</p>
                <p className="text-base font-bold text-red-400 font-mono tabular-nums">{fmtUAH(data.total_expenses)} ₴</p>
              </div>
              <div className="rounded-xl bg-dark-300/50 border border-dark-50/10 p-3">
                <p className="text-xs text-gray-500 mb-1">Попередній</p>
                <p className="text-base font-bold text-gray-300 font-mono tabular-nums">{fmtUAH(data.prev_expenses)} ₴</p>
              </div>
              <div className="rounded-xl bg-dark-300/50 border border-dark-50/10 p-3">
                <p className="text-xs text-gray-500 mb-1">Середній (6м)</p>
                <p className="text-base font-bold text-gray-300 font-mono tabular-nums">{fmtUAH(data.avg_expenses_6m)} ₴</p>
              </div>
            </div>
            {data.expense_by_category.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">По категоріях</h4>
                <div className="overflow-x-auto rounded-xl border border-dark-50/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-dark-300/50 border-b border-dark-50/10">
                        <th scope="col" className="text-left px-3 py-2.5 text-gray-500 font-medium">Категорія</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-500 font-medium">Сума</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-500 font-medium">Частка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expense_by_category.map((c, i) => (
                        <tr key={i} className="border-b border-dark-50/5">
                          <td className="px-3 py-2.5 text-gray-300">{c.name}</td>
                          <td className="px-3 py-2.5 text-right text-red-400 tabular-nums font-medium">{fmtUAH(c.amount)} ₴</td>
                          <td className="px-3 py-2.5 text-right text-gray-500">{c.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {data.top_expense_items.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Топ статей витрат</h4>
                <div className="overflow-x-auto rounded-xl border border-dark-50/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-dark-300/50 border-b border-dark-50/10">
                        <th scope="col" className="text-left px-3 py-2.5 text-gray-500 font-medium">Стаття</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-500 font-medium">Сума</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-500 font-medium">Частка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_expense_items.map((e, i) => (
                        <tr key={i} className="border-b border-dark-50/5">
                          <td className="px-3 py-2.5 text-gray-300 max-w-[200px] truncate">{e.name}</td>
                          <td className="px-3 py-2.5 text-right text-red-400 tabular-nums font-medium">{fmtUAH(e.amount)} ₴</td>
                          <td className="px-3 py-2.5 text-right text-gray-500">{e.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </DrillModal>
      )}

      {/* Taxes drill-down */}
      {drillModal === "taxes" && data && (
        <DrillModal title={`Податки — ${data.period_label}`} onClose={() => setDrillModal(null)}>
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Розрахунок для ФОП 3 групи, єдиний податок</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-dark-300/50 border border-dark-50/10 p-3">
                <p className="text-xs text-gray-500 mb-1">Дохід (база)</p>
                <p className="text-base font-bold text-emerald-400 font-mono tabular-nums">{fmtUAH(data.total_income)} ₴</p>
              </div>
              <div className="rounded-xl bg-dark-300/50 border border-dark-50/10 p-3">
                <p className="text-xs text-gray-500 mb-1">Всього податків</p>
                <p className="text-base font-bold text-red-400 font-mono tabular-nums">{fmtUAH(data.total_taxes)} ₴</p>
              </div>
            </div>
            <div className="space-y-1">
              <StatRow label="Єдиний податок (5% від доходу)" value={data.tax_single} dot="bg-accent-400" />
              <StatRow label="ЄСВ (фіксована сума)" value={data.tax_esv} dot="bg-yellow-400" />
              <StatRow label="Військовий збір (1.5% від доходу)" value={data.tax_vz} dot="bg-orange-400" />
              <StatRow label="Всього податків" value={data.total_taxes} dot="bg-red-400" color="text-red-400" bold borderTop />
              <StatRow label="Дохід після податків" value={data.income_after_taxes} dot="bg-emerald-400" color="text-emerald-400" bold borderTop />
            </div>
            {data.total_income > 0 && (
              <div className="rounded-xl bg-dark-300/30 border border-dark-50/10 p-3 mt-2">
                <p className="text-xs text-gray-400">
                  Ефективна ставка оподаткування:{" "}
                  <span className="text-white font-bold">{(data.total_taxes / data.total_income * 100).toFixed(1)}%</span>
                  {" "}від загального доходу
                </p>
              </div>
            )}
          </div>
        </DrillModal>
      )}
    </div>
  );
}
