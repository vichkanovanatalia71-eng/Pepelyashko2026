import { useEffect, useState } from "react";
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Податки</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(year - 1)}
            className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            &larr;
          </button>
          <span className="font-semibold text-lg">{year}</span>
          <button
            onClick={() => setYear(year + 1)}
            className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            &rarr;
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Завантаження...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Квартал
                </th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">
                  Дохід
                </th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">
                  Єдиний податок (5%)
                </th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">ЄСВ</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">
                  Всього податків
                </th>
              </tr>
            </thead>
            <tbody>
              {taxes.map((t) => (
                <tr key={t.quarter} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.quarter}</td>
                  <td className="px-4 py-3 text-right">{fmt(t.income)} &#8372;</td>
                  <td className="px-4 py-3 text-right text-orange-600">
                    {fmt(t.single_tax)} &#8372;
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600">
                    {fmt(t.esv)} &#8372;
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">
                    {fmt(t.total)} &#8372;
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3">Разом за {year}</td>
                <td className="px-4 py-3 text-right">{fmt(totalIncome)} &#8372;</td>
                <td className="px-4 py-3 text-right text-orange-600">
                  {fmt(totalSingleTax)} &#8372;
                </td>
                <td className="px-4 py-3 text-right text-orange-600">
                  {fmt(totalEsv)} &#8372;
                </td>
                <td className="px-4 py-3 text-right text-red-600">
                  {fmt(grandTotal)} &#8372;
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
