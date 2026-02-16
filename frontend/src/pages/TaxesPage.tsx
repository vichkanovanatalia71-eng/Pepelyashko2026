import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../api/client";
import type { TaxSummary } from "../types";

export default function TaxesPage() {
  const [taxes, setTaxes] = useState<TaxSummary[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/taxes/quarterly", { params: { year } })
      .then((res) => setTaxes(res.data))
      .catch(() => setTaxes([]))
      .finally(() => setLoading(false));
  }, [year]);

  const totalIncome = taxes.reduce((s, t) => s + t.income, 0);
  const totalSingleTax = taxes.reduce((s, t) => s + t.single_tax, 0);
  const totalEsv = taxes.reduce((s, t) => s + t.esv, 0);
  const grandTotal = taxes.reduce((s, t) => s + t.total, 0);

  const fmt = (n: number) =>
    n.toLocaleString("uk-UA", { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Податки</h2>
          <p className="text-gray-500 text-sm mt-1">
            Поквартальний розрахунок для ФОП 3 групи
          </p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYear(year - 1)}
            className="p-2 rounded-xl bg-dark-300 border border-dark-50/10 text-gray-400 hover:text-white hover:bg-dark-200 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-5 py-2 rounded-xl bg-dark-300 border border-dark-50/10 text-white font-bold text-lg min-w-[80px] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear(year + 1)}
            className="p-2 rounded-xl bg-dark-300 border border-dark-50/10 text-gray-400 hover:text-white hover:bg-dark-200 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Quarter cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {taxes.map((t) => (
              <div key={t.quarter} className="card-neo p-6">
                <p className="text-sm text-gray-500 mb-3">{t.quarter}</p>
                <p className="text-lg font-bold text-white mb-4">
                  {fmt(t.income)} <span className="text-sm font-normal text-gray-500">&#8372;</span>
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Єдиний (5%)</span>
                    <span className="text-accent-400 font-medium">{fmt(t.single_tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ЄСВ</span>
                    <span className="text-yellow-400 font-medium">{fmt(t.esv)}</span>
                  </div>
                  <div className="border-t border-dark-50/10 pt-2 flex justify-between">
                    <span className="text-gray-400 font-medium">Всього</span>
                    <span className="text-red-400 font-bold">{fmt(t.total)} &#8372;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary table */}
          <div className="card-neo overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-50/10">
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Квартал
                  </th>
                  <th className="text-right px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Дохід
                  </th>
                  <th className="text-right px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Єдиний податок
                  </th>
                  <th className="text-right px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ЄСВ
                  </th>
                  <th className="text-right px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Всього
                  </th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((t) => (
                  <tr
                    key={t.quarter}
                    className="border-b border-dark-50/5 hover:bg-dark-200/50 transition-colors"
                  >
                    <td className="px-5 py-4 text-white font-medium">{t.quarter}</td>
                    <td className="px-5 py-4 text-right text-gray-300">
                      {fmt(t.income)} &#8372;
                    </td>
                    <td className="px-5 py-4 text-right text-accent-400">
                      {fmt(t.single_tax)} &#8372;
                    </td>
                    <td className="px-5 py-4 text-right text-yellow-400">
                      {fmt(t.esv)} &#8372;
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-red-400">
                      {fmt(t.total)} &#8372;
                    </td>
                  </tr>
                ))}

                {/* Total row */}
                <tr className="bg-dark-400/50">
                  <td className="px-5 py-4 text-white font-bold">Разом за {year}</td>
                  <td className="px-5 py-4 text-right text-white font-bold">
                    {fmt(totalIncome)} &#8372;
                  </td>
                  <td className="px-5 py-4 text-right text-accent-400 font-bold">
                    {fmt(totalSingleTax)} &#8372;
                  </td>
                  <td className="px-5 py-4 text-right text-yellow-400 font-bold">
                    {fmt(totalEsv)} &#8372;
                  </td>
                  <td className="px-5 py-4 text-right text-red-400 font-bold text-base">
                    {fmt(grandTotal)} &#8372;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
