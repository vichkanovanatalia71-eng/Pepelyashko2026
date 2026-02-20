import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Bell,
  X,
} from "lucide-react";
import api from "../api/client";
import type { PeriodReport } from "../types";

const MONTH_NAMES = [
  "Січень", "Лютий", "Березень", "Квітень",
  "Травень", "Червень", "Липень", "Серпень",
  "Вересень", "Жовтень", "Листопад", "Грудень",
];

export default function Dashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [loading, setLoading] = useState(true);

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
    const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

    api
      .get("/reports/period", { params: { date_from: dateFrom, date_to: dateTo } })
      .then((res) => setReport(res.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [year, month]);

  const fmt = (n: number) =>
    n.toLocaleString("uk-UA", { minimumFractionDigits: 2 });

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  // Tax deadline reminders (Ukrainian FOP 3 group calendar)
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
    const curMonth = now.getMonth() + 1; // 1-indexed
    const curYear = now.getFullYear();

    // Єдиний податок: до 20-го числа наступного місяця після кварталу
    // Q1 → до 20 квітня, Q2 → до 20 липня, Q3 → до 20 жовтня, Q4 → до 20 січня
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

    // ЄСВ: до 19-го кожного місяця
    if (day <= 19) {
      const daysLeft = 19 - day;
      if (daysLeft <= 7 && daysLeft > 0) {
        items.push({
          id: `esv-${curYear}-${curMonth}`,
          text: `ЄСВ за ${MONTH_NAMES[curMonth === 1 ? 12 : curMonth - 1].toLowerCase()}: залишилось ${daysLeft} дн. (до 19.${String(curMonth).padStart(2, "0")})`,
          type: daysLeft <= 3 ? "warning" : "info",
        });
      }
    }

    // ВЗ: до 20-го наступного місяця після кварталу (same as single tax)

    return items.filter(r => !dismissedReminders.includes(r.id));
  })();

  const cards = report
    ? [
        {
          label: "Доходи",
          value: report.total_income,
          icon: TrendingUp,
          arrow: ArrowUpRight,
          accent: "text-emerald-400",
          iconBg: "bg-emerald-500/10",
          borderAccent: "border-emerald-500/20",
        },
        {
          label: "Витрати",
          value: report.total_expenses,
          icon: TrendingDown,
          arrow: ArrowDownRight,
          accent: "text-red-400",
          iconBg: "bg-red-500/10",
          borderAccent: "border-red-500/20",
        },
        {
          label: "Чистий прибуток",
          value: report.net_profit,
          icon: Wallet,
          arrow: report.net_profit >= 0 ? ArrowUpRight : ArrowDownRight,
          accent: report.net_profit >= 0 ? "text-accent-400" : "text-red-400",
          iconBg: "bg-accent-500/10",
          borderAccent: "border-accent-500/20",
        },
        {
          label: "Податки",
          value: report.total_taxes,
          icon: Receipt,
          arrow: ArrowDownRight,
          accent: "text-yellow-400",
          iconBg: "bg-yellow-500/10",
          borderAccent: "border-yellow-500/20",
        },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-5 lg:mb-8 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Дашборд</h2>
          <p className="text-gray-500 text-sm mt-1">
            Огляд фінансів за {MONTH_NAMES[month].toLowerCase()} {year}
          </p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-dark-300 border border-dark-50/10 text-gray-400 hover:text-white hover:bg-dark-200 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-3 sm:px-4 py-2 rounded-xl bg-dark-300 border border-dark-50/10 text-white font-bold text-sm sm:text-base min-w-[120px] sm:min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className={`p-2 rounded-xl bg-dark-300 border border-dark-50/10 transition-all ${
              isCurrentMonth
                ? "text-gray-700 cursor-not-allowed"
                : "text-gray-400 hover:text-white hover:bg-dark-200"
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Tax reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2 mb-5">
          {reminders.map(r => (
            <div key={r.id} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
              r.type === "warning"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell size={16} className="shrink-0" />
                <span className="text-sm">{r.text}</span>
              </div>
              <button onClick={() => dismissReminder(r.id)} className="p-1 rounded-lg hover:bg-dark-300/50 transition-all shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : !report ? (
        <div className="card-neo p-12 text-center">
          <p className="text-gray-500 text-lg">Немає даних за {MONTH_NAMES[month].toLowerCase()} {year}</p>
          <p className="text-gray-600 text-sm mt-2">
            Додайте перший дохід або витрату
          </p>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-5 lg:mb-8">
            {cards.map(
              ({ label, value, icon: Icon, arrow: Arrow, accent, iconBg, borderAccent }) => (
                <div
                  key={label}
                  className={`card-neo kpi-3d-hover p-4 lg:p-6 border ${borderAccent}`}
                >
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <div className={`p-2 lg:p-2.5 rounded-xl ${iconBg}`}>
                      <Icon size={18} className={accent} />
                    </div>
                    <Arrow size={15} className={accent} />
                  </div>
                  <p className="text-xs lg:text-sm text-gray-500 mb-1">{label}</p>
                  <p className={`text-lg lg:text-2xl font-bold ${accent}`}>
                    {fmt(value)} <span className="text-sm lg:text-base font-normal">&#8372;</span>
                  </p>
                </div>
              )
            )}
          </div>

          {/* Tax summary card */}
          <div className="card-neo card-3d-hover p-5 lg:p-8">
            <h3 className="text-lg font-semibold text-white mb-6">
              Зведення за {report.period}
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-dark-50/10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-400" />
                  <span className="text-gray-400">Єдиний податок (5%)</span>
                </div>
                <span className="font-semibold text-gray-200">
                  {fmt(report.tax_single)} &#8372;
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-dark-50/10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-gray-400">ЄСВ</span>
                </div>
                <span className="font-semibold text-gray-200">
                  {fmt(report.tax_esv)} &#8372;
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-dark-50/10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-gray-400">Військовий збір (1.5%)</span>
                </div>
                <span className="font-semibold text-gray-200">
                  {fmt(report.tax_vz)} &#8372;
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-dark-50/10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-gray-400">Всього податків</span>
                </div>
                <span className="font-semibold text-red-400">
                  {fmt(report.total_taxes)} &#8372;
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-white font-medium">Дохід після податків</span>
                </div>
                <span className="text-xl font-bold text-emerald-400">
                  {fmt(report.income_after_taxes)} &#8372;
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
