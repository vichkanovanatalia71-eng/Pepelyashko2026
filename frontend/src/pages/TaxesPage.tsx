import { useEffect, useState } from "react";
import { Check, Receipt } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";
import type { TaxSummary, AnnualReport } from "../types";
import {
  PageHeader,
  MonthNavigator,
  LoadingSpinner,
  StatusBadge,
  TabBar,
} from "../components/shared";
import { fmtUAH } from "../lib/utils";

interface PaymentStatus {
  year: number;
  quarter: number;
  tax_type: string;
  is_paid: boolean;
}

const TAX_TYPES = [
  { key: "single_tax", label: "Єдиний", color: "text-accent-400" },
  { key: "esv", label: "ЄСВ", color: "text-yellow-400" },
  { key: "vz", label: "ВЗ", color: "text-orange-400" },
];

const TABS = [
  { id: "quarterly", label: "Квартали" },
  { id: "annual", label: "Річний звіт" },
];

export default function TaxesPage() {
  const { user } = useAuth();
  const fopGroup = user?.fop_group ?? 3;
  const taxRatePct = ((user?.tax_rate ?? 0.05) * 100).toFixed(0);
  const [taxes, setTaxes] = useState<TaxSummary[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentStatus[]>([]);
  const [tab, setTab] = useState("quarterly");
  const [annual, setAnnual] = useState<AnnualReport | null>(null);

  useEffect(() => {
    setLoading(true);
    const requests: Promise<any>[] = [
      api.get("/taxes/quarterly", { params: { year } }),
      api.get("/taxes/payments", { params: { year } }),
      api.get("/reports/annual", { params: { year } }),
    ];
    Promise.all(requests)
      .then(([taxRes, payRes, annualRes]) => {
        setTaxes(taxRes.data);
        setPayments(payRes.data);
        setAnnual(annualRes.data);
      })
      .catch(() => { setTaxes([]); setPayments([]); setAnnual(null); })
      .finally(() => setLoading(false));
  }, [year]);

  function isPaid(quarter: number, taxType: string): boolean {
    return payments.some(
      p => p.quarter === quarter && p.tax_type === taxType && p.is_paid
    );
  }

  async function togglePayment(quarter: number, taxType: string) {
    const { data } = await api.post("/taxes/payments/toggle", {
      year, quarter, tax_type: taxType,
    });
    setPayments(prev => {
      const filtered = prev.filter(
        p => !(p.quarter === quarter && p.tax_type === taxType)
      );
      return [...filtered, data];
    });
  }

  const totalIncome = taxes.reduce((s, t) => s + t.income, 0);
  const totalSingleTax = taxes.reduce((s, t) => s + t.single_tax, 0);
  const totalEsv = taxes.reduce((s, t) => s + t.esv, 0);
  const totalVz = taxes.reduce((s, t) => s + t.vz, 0);
  const grandTotal = taxes.reduce((s, t) => s + t.total, 0);

  const fmt = (n: number) => fmtUAH(n);

  // Extract quarter number from "Q1 2026" string
  const qNum = (q: string) => parseInt(q.charAt(1));

  return (
    <div>
      <PageHeader
        title="Податки"
        subtitle={`Поквартальний розрахунок для ФОП ${fopGroup} групи`}
        icon={<Receipt size={22} className="text-orange-400" />}
      >
        <MonthNavigator
          year={year}
          month={0}
          onPrev={() => setYear(y => y - 1)}
          onNext={() => setYear(y => y + 1)}
          yearOnly
        />
      </PageHeader>

      <TabBar tabs={TABS} activeTab={tab} onChange={setTab} />

      {loading ? (
        <LoadingSpinner />
      ) : tab === "annual" && annual ? (
        <>
        {/* Annual P&L: mobile cards */}
        <div className="sm:hidden space-y-2">
          {annual.months.map(m => (
            <div key={m.month} className="card-neo p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{m.month_name}</span>
                <span className={`text-sm font-semibold tabular-nums ${m.income_after_taxes >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(m.income_after_taxes)} &#8372;
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Доходи</span><span className="text-emerald-400 tabular-nums">{fmt(m.income)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Витрати</span><span className="text-red-400 tabular-nums">{fmt(m.expenses)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ЄП</span><span className="text-accent-400 tabular-nums">{fmt(m.tax_single)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ЄСВ</span><span className="text-yellow-400 tabular-nums">{fmt(m.tax_esv)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ВЗ</span><span className="text-orange-400 tabular-nums">{fmt(m.tax_vz)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Прибуток</span><span className={`tabular-nums ${m.net_profit >= 0 ? "text-gray-200" : "text-red-400"}`}>{fmt(m.net_profit)}</span></div>
              </div>
            </div>
          ))}
          <div className="card-neo p-3.5 bg-dark-400/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">Разом {year}</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">{fmt(annual.total_income_after_taxes)} &#8372;</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Доходи</span><span className="text-emerald-400 font-semibold tabular-nums">{fmt(annual.total_income)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Витрати</span><span className="text-red-400 font-semibold tabular-nums">{fmt(annual.total_expenses)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">ЄП</span><span className="text-accent-400 font-semibold tabular-nums">{fmt(annual.total_tax_single)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">ЄСВ</span><span className="text-yellow-400 font-semibold tabular-nums">{fmt(annual.total_tax_esv)}</span></div>
            </div>
          </div>
        </div>

        /* Annual P&L: desktop table */
        <div className="card-neo overflow-hidden hidden sm:block">
          <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-dark-50/10 bg-dark-300/50">
                <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Місяць</th>
                <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Доходи</th>
                <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Витрати</th>
                <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Прибуток</th>
                <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{`ЄП (${taxRatePct}%)`}</th>
                <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ЄСВ</th>
                <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ВЗ</th>
                <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Після податків</th>
              </tr>
            </thead>
            <tbody>
              {annual.months.map(m => (
                <tr key={m.month} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{m.month_name}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">{fmt(m.income)}</td>
                  <td className="px-4 py-3 text-right text-red-400 tabular-nums">{fmt(m.expenses)}</td>
                  <td className={`px-4 py-3 text-right font-medium tabular-nums ${m.net_profit >= 0 ? "text-gray-200" : "text-red-400"}`}>{fmt(m.net_profit)}</td>
                  <td className="px-4 py-3 text-right text-accent-400 tabular-nums">{fmt(m.tax_single)}</td>
                  <td className="px-4 py-3 text-right text-yellow-400 tabular-nums">{fmt(m.tax_esv)}</td>
                  <td className="px-4 py-3 text-right text-orange-400 tabular-nums">{fmt(m.tax_vz)}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${m.income_after_taxes >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(m.income_after_taxes)}</td>
                </tr>
              ))}
              <tr className="bg-dark-400/50">
                <td className="px-4 py-3 text-white font-bold">Разом {year}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-bold tabular-nums">{fmt(annual.total_income)}</td>
                <td className="px-4 py-3 text-right text-red-400 font-bold tabular-nums">{fmt(annual.total_expenses)}</td>
                <td className="px-4 py-3 text-right text-white font-bold tabular-nums">{fmt(annual.total_net_profit)}</td>
                <td className="px-4 py-3 text-right text-accent-400 font-bold tabular-nums">{fmt(annual.total_tax_single)}</td>
                <td className="px-4 py-3 text-right text-yellow-400 font-bold tabular-nums">{fmt(annual.total_tax_esv)}</td>
                <td className="px-4 py-3 text-right text-orange-400 font-bold tabular-nums">{fmt(annual.total_tax_vz)}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-bold text-base tabular-nums">{fmt(annual.total_income_after_taxes)}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
        </>
      ) : (
        <>
          {/* Quarter cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-6 lg:mb-8 stagger-enter">
            {taxes.map((t) => {
              const q = qNum(t.quarter);
              const allPaid = TAX_TYPES.every(tt => isPaid(q, tt.key));
              return (
                <div key={t.quarter} className={`card-neo card-tap p-4 sm:p-6 border ${allPaid ? "border-emerald-500/30" : "border-dark-50/20"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-500 font-medium">{t.quarter}</p>
                    {allPaid && (
                      <StatusBadge label="Сплачено" variant="success" />
                    )}
                  </div>
                  <p className="text-lg font-bold text-white mb-4 tabular-nums">
                    {fmt(t.income)} <span className="text-sm font-normal text-gray-500">&#8372;</span>
                  </p>
                  <div className="space-y-2 text-sm">
                    {[
                      { key: "single_tax", label: "Єдиний (5%)", value: t.single_tax, color: "text-accent-400" },
                      { key: "esv", label: "ЄСВ", value: t.esv, color: "text-yellow-400" },
                      { key: "vz", label: "ВЗ (1.5%)", value: t.vz, color: "text-orange-400" },
                    ].map(row => {
                      const paid = isPaid(q, row.key);
                      return (
                        <div key={row.key} className="flex items-center justify-between gap-1">
                          <button
                            onClick={() => togglePayment(q, row.key)}
                            aria-label={`Позначити ${row.label} як ${paid ? "несплачено" : "сплачено"}`}
                            className={`flex items-center gap-1.5 text-left ${paid ? "text-gray-600 line-through" : "text-gray-500"}`}
                          >
                            <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                              paid
                                ? "bg-emerald-500/20 border-emerald-500/40"
                                : "border-dark-50/30 hover:border-gray-500"
                            }`}>
                              {paid && <Check size={10} className="text-emerald-400" />}
                            </span>
                            {row.label}
                          </button>
                          <span className={`${row.color} font-medium tabular-nums ${paid ? "line-through opacity-50" : ""}`}>
                            {fmt(row.value)}
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-t border-dark-50/10 pt-2 flex justify-between">
                      <span className="text-gray-400 font-medium">Всього</span>
                      <span className="text-red-400 font-bold tabular-nums">{fmt(t.total)} &#8372;</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary: mobile cards */}
          <div className="sm:hidden space-y-2">
            <div className="card-neo p-3.5 bg-dark-400/50">
              <p className="text-xs font-bold text-white mb-2">Разом за {year}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Дохід:</span> <span className="text-white font-semibold tabular-nums">{fmt(totalIncome)} &#8372;</span></div>
                <div><span className="text-gray-500">ЄП:</span> <span className="text-accent-400 font-semibold tabular-nums">{fmt(totalSingleTax)} &#8372;</span></div>
                <div><span className="text-gray-500">ЄСВ:</span> <span className="text-yellow-400 font-semibold tabular-nums">{fmt(totalEsv)} &#8372;</span></div>
                <div><span className="text-gray-500">ВЗ:</span> <span className="text-orange-400 font-semibold tabular-nums">{fmt(totalVz)} &#8372;</span></div>
              </div>
              <div className="border-t border-dark-50/10 mt-2 pt-2 flex justify-between">
                <span className="text-xs text-gray-400 font-medium">Всього податків</span>
                <span className="text-sm text-red-400 font-bold tabular-nums">{fmt(grandTotal)} &#8372;</span>
              </div>
            </div>
          </div>

          {/* Summary: desktop table */}
          <div className="card-neo overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-dark-50/10 bg-dark-300/50">
                  <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Квартал</th>
                  <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Дохід</th>
                  <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Єдиний податок</th>
                  <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ЄСВ</th>
                  <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ВЗ</th>
                  <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Всього</th>
                  <th scope="col" className="text-center px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Статус</th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((t) => {
                  const q = qNum(t.quarter);
                  const allPaid = TAX_TYPES.every(tt => isPaid(q, tt.key));
                  return (
                    <tr
                      key={t.quarter}
                      className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-white font-medium">{t.quarter}</td>
                      <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">{fmt(t.income)} &#8372;</td>
                      <td className={`px-5 py-4 text-right text-accent-400 tabular-nums ${isPaid(q, "single_tax") ? "line-through opacity-50" : ""}`}>
                        {fmt(t.single_tax)} &#8372;
                      </td>
                      <td className={`px-5 py-4 text-right text-yellow-400 tabular-nums ${isPaid(q, "esv") ? "line-through opacity-50" : ""}`}>
                        {fmt(t.esv)} &#8372;
                      </td>
                      <td className={`px-5 py-4 text-right text-orange-400 tabular-nums ${isPaid(q, "vz") ? "line-through opacity-50" : ""}`}>
                        {fmt(t.vz)} &#8372;
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-red-400 tabular-nums">
                        {fmt(t.total)} &#8372;
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <StatusBadge
                          label={allPaid ? "Сплачено" : "Очікує"}
                          variant={allPaid ? "success" : "warning"}
                        />
                      </td>
                    </tr>
                  );
                })}

                {/* Total row */}
                <tr className="bg-dark-400/50">
                  <td className="px-3 py-2.5 text-white font-bold">Разом за {year}</td>
                  <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{fmt(totalIncome)} &#8372;</td>
                  <td className="px-3 py-2.5 text-right text-accent-400 font-bold tabular-nums">{fmt(totalSingleTax)} &#8372;</td>
                  <td className="px-3 py-2.5 text-right text-yellow-400 font-bold tabular-nums">{fmt(totalEsv)} &#8372;</td>
                  <td className="px-3 py-2.5 text-right text-orange-400 font-bold tabular-nums">{fmt(totalVz)} &#8372;</td>
                  <td className="px-3 py-2.5 text-right text-red-400 font-bold text-base tabular-nums">{fmt(grandTotal)} &#8372;</td>
                  <td className="px-3 py-2.5"></td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
