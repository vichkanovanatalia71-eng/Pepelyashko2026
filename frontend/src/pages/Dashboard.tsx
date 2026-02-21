import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import api from "../api/client";
import type { PeriodReport } from "../types";
import {
  PageHeader,
  MonthNavigator,
  MONTH_NAMES,
  LoadingSpinner,
  EmptyState,
  AlertBanner,
  StatRow,
  KPICard,
  SectionCard,
} from "../components/shared";

const TT_STYLE = {
  background: "#1a1a2e",
  border: "1px solid #ffffff15",
  borderRadius: 6,
  fontSize: 11,
  color: "#e2e8f0",
};

export default function Dashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [sparklines, setSparklines] = useState<
    { income: number; expenses: number; profit: number; taxes: number }[]
  >([]);

  // Load last 6 months for sparklines on mount
  useEffect(() => {
    (async () => {
      const results = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const dateFrom = `${y}-${String(m + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const dateTo = `${y}-${String(m + 1).padStart(2, "0")}-${lastDay}`;
        try {
          const res = await api.get("/reports/period", { params: { date_from: dateFrom, date_to: dateTo } });
          results.push({
            income: res.data.total_income,
            expenses: res.data.total_expenses,
            profit: res.data.net_profit,
            taxes: res.data.total_taxes,
          });
        } catch {
          results.push({ income: 0, expenses: 0, profit: 0, taxes: 0 });
        }
      }
      setSparklines(results);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const cards = report
    ? [
        {
          label: "Доходи",
          value: report.total_income,
          icon: TrendingUp,
          arrow: ArrowUpRight,
          color: "text-emerald-400",
          sparkColor: "#34d399",
          iconBg: "bg-emerald-500/10",
          borderColor: "border-emerald-500/20",
          sparkKey: "income" as const,
        },
        {
          label: "Витрати",
          value: report.total_expenses,
          icon: TrendingDown,
          arrow: ArrowDownRight,
          color: "text-red-400",
          sparkColor: "#f87171",
          iconBg: "bg-red-500/10",
          borderColor: "border-red-500/20",
          sparkKey: "expenses" as const,
        },
        {
          label: "Чистий прибуток",
          value: report.net_profit,
          icon: Wallet,
          arrow: report.net_profit >= 0 ? ArrowUpRight : ArrowDownRight,
          color: report.net_profit >= 0 ? "text-accent-400" : "text-red-400",
          sparkColor: report.net_profit >= 0 ? "#818cf8" : "#f87171",
          iconBg: "bg-accent-500/10",
          borderColor: "border-accent-500/20",
          sparkKey: "profit" as const,
        },
        {
          label: "Податки",
          value: report.total_taxes,
          icon: Receipt,
          arrow: ArrowDownRight,
          color: "text-yellow-400",
          sparkColor: "#fbbf24",
          iconBg: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
          sparkKey: "taxes" as const,
        },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Дашборд"
        subtitle={`Огляд фінансів за ${MONTH_NAMES[month].toLowerCase()} ${year}`}
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
        <div className="space-y-2 mb-6" role="region" aria-label="Нагадування про терміни сплати">
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

      {loading ? (
        <LoadingSpinner />
      ) : !report ? (
        <EmptyState
          title={`Немає даних за ${MONTH_NAMES[month].toLowerCase()} ${year}`}
          description="Додайте перший дохід або витрату"
        />
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-6 lg:mb-8">
            {cards.map(
              ({ label, value, icon: Icon, arrow: Arrow, color, iconBg, borderColor, sparkColor, sparkKey }) => (
                <KPICard
                  key={label}
                  label={label}
                  value={value}
                  color={color}
                  borderColor={borderColor}
                  icon={
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-2 lg:p-2.5 rounded-xl ${iconBg}`}>
                        <Icon size={18} className={color} aria-hidden="true" />
                      </div>
                      <Arrow size={15} className={color} aria-hidden="true" />
                    </div>
                  }
                >
                  {sparklines.length >= 2 && (
                    <div className="mt-3 h-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklines}>
                          <Tooltip
                            contentStyle={TT_STYLE}
                            formatter={(v: number) => [`${v.toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₴`]}
                            labelFormatter={() => ""}
                          />
                          <Line
                            type="monotone"
                            dataKey={sparkKey}
                            stroke={sparkColor}
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </KPICard>
              )
            )}
          </div>

          {/* Tax summary card */}
          <SectionCard
            title={`Зведення за ${report.period}`}
            className="card-3d-hover"
          >
            <div className="space-y-1">
              <StatRow label="Єдиний податок (5%)" value={report.tax_single} dot="bg-accent-400" />
              <StatRow label="ЄСВ" value={report.tax_esv} dot="bg-yellow-400" />
              <StatRow label="Військовий збір (1.5%)" value={report.tax_vz} dot="bg-orange-400" />
              <StatRow label="Всього податків" value={report.total_taxes} dot="bg-red-400" color="text-red-400" borderTop />
              <StatRow label="Дохід після податків" value={report.income_after_taxes} dot="bg-emerald-400" color="text-emerald-400" bold borderTop />
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
