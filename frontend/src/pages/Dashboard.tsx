import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import api from "../api/client";
import type { PeriodReport } from "../types";

export default function Dashboard() {
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

    api
      .get("/reports/period", { params: { date_from: dateFrom, date_to: dateTo } })
      .then((res) => setReport(res.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    n.toLocaleString("uk-UA", { minimumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

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
      <div className="mb-5 lg:mb-8">
        <h2 className="text-2xl font-bold text-white">Дашборд</h2>
        <p className="text-gray-500 text-sm mt-1">
          Огляд фінансів за поточний місяць
        </p>
      </div>

      {!report ? (
        <div className="card-neo p-12 text-center">
          <p className="text-gray-500 text-lg">Немає даних за поточний місяць</p>
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
