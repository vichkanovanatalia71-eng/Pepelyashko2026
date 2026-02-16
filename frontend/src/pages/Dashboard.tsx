import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Receipt } from "lucide-react";
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

  if (loading) {
    return <div className="text-gray-500">Завантаження...</div>;
  }

  const cards = report
    ? [
        {
          label: "Доходи (місяць)",
          value: report.total_income,
          icon: TrendingUp,
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          label: "Витрати (місяць)",
          value: report.total_expenses,
          icon: TrendingDown,
          color: "text-red-600",
          bg: "bg-red-50",
        },
        {
          label: "Чистий прибуток",
          value: report.net_profit,
          icon: DollarSign,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Податки",
          value: report.total_taxes,
          icon: Receipt,
          color: "text-orange-600",
          bg: "bg-orange-50",
        },
      ]
    : [];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Дашборд</h2>

      {!report ? (
        <p className="text-gray-500">Немає даних за поточний місяць</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon size={20} className={color} />
                  </div>
                  <span className="text-sm text-gray-500">{label}</span>
                </div>
                <p className={`text-2xl font-bold ${color}`}>
                  {value.toLocaleString("uk-UA", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  &#8372;
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Зведення за {report.period}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Єдиний податок (5%)</span>
                <span className="font-medium">
                  {report.tax_single.toLocaleString("uk-UA", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  &#8372;
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ЄСВ</span>
                <span className="font-medium">
                  {report.tax_esv.toLocaleString("uk-UA", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  &#8372;
                </span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Дохід після податків</span>
                <span className="text-green-600">
                  {report.income_after_taxes.toLocaleString("uk-UA", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  &#8372;
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
