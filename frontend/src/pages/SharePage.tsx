import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import {
  TrendingUp,

  Package,
  Landmark,
  Banknote,
  Wallet,
  Clock,
  AlertCircle,
  Trophy,
  BarChart3,
} from "lucide-react";
import MedFlowLogo from "../components/shared/MedFlowLogo";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const MONTHS_UA = [
  "", "Січень", "Лютий", "Березень", "Квітень",
  "Травень", "Червень", "Липень", "Серпень",
  "Вересень", "Жовтень", "Листопад", "Грудень",
];
const PIE_COLORS = ["#60a5fa", "#f97316", "#ef4444"];

const fmt = (v: number) =>
  (v ?? 0).toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ShareData {
  token: string;
  filter_label: string;
  expires_at: string;
  analytics: any;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await api.get(`/monthly-services/share/${token}/view`);
        setData(r.data);
      } catch {
        setError("Посилання не знайдено або термін дії закінчився.");
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-700 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
          <span className="text-sm">Завантаження…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dark-700 flex items-center justify-center">
        <div className="card-neo p-8 text-center max-w-md">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-xl font-bold text-white mb-2">Посилання недійсне</h1>
          <p className="text-gray-400 text-sm">{error || "Термін дії закінчився."}</p>
        </div>
      </div>
    );
  }

  const a = data.analytics;
  const d = a?.dashboard;
  const expiresDate = new Date(data.expires_at).toLocaleDateString("uk-UA");

  const trendChart = (a?.monthly_trend ?? [])
    .filter((r: any) => r.sum > 0)
    .map((r: any) => ({
      label: `${MONTHS_UA[r.month]?.slice(0, 3)} ${r.year}`,
      sum: r.sum,
      doctor_income: r.doctor_income,
    }));

  const expensesPie = d ? [
    { name: "Матеріали", value: d.materials_cost },
    { name: `ЄП (${a.ep_rate}%)`, value: d.ep_amount },
    { name: `ВЗ (${a.vz_rate}%)`, value: d.vz_amount },
  ].filter((x: any) => x.value > 0) : [];

  const topByRevenue = [...(a?.services_table ?? [])]
    .sort((a: any, b: any) => b.sum - a.sum)
    .slice(0, 5);

  const topByQty = [...(a?.services_table ?? [])]
    .sort((a: any, b: any) => b.total_quantity - a.total_quantity)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-dark-700 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="card-neo p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <MedFlowLogo size={26} className="text-accent-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MedFlow · Платні послуги</h1>
              <p className="text-sm text-gray-400">{data.filter_label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
            <Clock size={12} />
            <span>Доступно до {expiresDate}</span>
          </div>
        </div>

        {d && (
          <>
            {/* Дашборд */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-accent-400" /><span className="text-xs text-gray-500">Оборот</span></div>
                <p className="text-xl font-bold text-white tabular-nums">{fmt(d.total_revenue)} <span className="text-xs text-gray-500">грн</span></p>
                <div className="flex gap-4 mt-2 text-xs text-gray-400"><span>К-ть: {d.total_quantity}</span><span>Сер.чек: {fmt(d.avg_check)}</span></div>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><MedFlowLogo size={16} className="text-green-400" /><span className="text-xs text-gray-500">Дохід лікарів</span></div>
                <p className="text-xl font-bold text-green-400 tabular-nums">{fmt(d.doctor_income)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><Package size={16} className="text-orange-400" /><span className="text-xs text-gray-500">Витрати</span></div>
                <p className="text-xl font-bold text-orange-400 tabular-nums">{fmt(d.total_costs)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><Landmark size={16} className="text-blue-400" /><span className="text-xs text-gray-500">Дохід організації</span></div>
                <p className="text-xl font-bold text-blue-400 tabular-nums">{fmt(d.org_income)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><Banknote size={16} className="text-yellow-400" /><span className="text-xs text-gray-500">Готівка в касі</span></div>
                <p className="text-xl font-bold text-yellow-400 tabular-nums">{fmt(d.cash_in_register)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><Wallet size={16} className="text-purple-400" /><span className="text-xs text-gray-500">Кошти на рахунку</span></div>
                <p className="text-xl font-bold text-purple-400 tabular-nums">{fmt(d.bank_amount)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
            </div>

            {/* ТОП послуг */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-neo p-5">
                <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2"><Trophy size={14} className="text-orange-400" />ТОП-5 за оборотом</p>
                <div className="space-y-2">
                  {topByRevenue.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-4">{i + 1}.</span>
                      <span className="text-gray-200 flex-1 truncate">{s.name}</span>
                      <span className="text-accent-400 font-medium tabular-nums">{fmt(s.sum)} грн</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-neo p-5">
                <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2"><Trophy size={14} className="text-orange-400" />ТОП-5 за кількістю</p>
                <div className="space-y-2">
                  {topByQty.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-4">{i + 1}.</span>
                      <span className="text-gray-200 flex-1 truncate">{s.name}</span>
                      <span className="text-accent-400 font-medium tabular-nums">{s.total_quantity} шт</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Витрати (Pie) */}
            {expensesPie.length > 0 && (
              <div className="card-neo p-5">
                <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2"><BarChart3 size={14} className="text-orange-400" />Структура витрат</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expensesPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {expensesPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} formatter={(v: number) => fmt(v) + " грн"} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Тренд */}
            {trendChart.length > 1 && (
              <div className="card-neo p-5">
                <p className="text-sm font-medium text-gray-400 mb-3">Динаміка по місяцях</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trendChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="sum" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Оборот (грн)" />
                    <Bar dataKey="doctor_income" fill="#4ade80" radius={[4, 4, 0, 0]} name="Дохід лікарів (грн)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Таблиця послуг */}
            <div className="card-neo overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-50/10">
                <h3 className="text-sm font-medium text-gray-400">Деталі по послугах</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[900px]">
                  <thead>
                    <tr className="border-b border-dark-50/10 bg-dark-300/50">
                      <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Код</th>
                      <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Назва</th>
                      <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">К-ть</th>
                      <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Сума</th>
                      <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Витрати</th>
                      <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">До розподілу</th>
                      <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Дохід лікаря</th>
                      <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Дохід орг.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(a?.services_table ?? []).map((row: any) => (
                      <tr key={row.service_id} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-accent-400">{row.code}</td>
                        <td className="px-3 py-2.5 text-gray-200">{row.name}</td>
                        <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{row.total_quantity}</td>
                        <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{fmt(row.sum)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{fmt(row.materials)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">{fmt(row.to_split)}</td>
                        <td className="px-3 py-2.5 text-right text-green-400 font-medium tabular-nums">{fmt(row.doctor_income)}</td>
                        <td className="px-3 py-2.5 text-right text-green-400 font-medium tabular-nums">{fmt(row.org_income)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 py-4">
          MedFlow · Фінансовий менеджер ФОП
        </div>
      </div>
    </div>
  );
}
