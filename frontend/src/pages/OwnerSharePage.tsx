import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  TrendingUp,

  Package,
  Landmark,
  Banknote,
  Wallet,
  Clock,
  AlertCircle,
  Users,
  Building2,
  BadgeDollarSign,
  Calculator,
  FileText,
  CreditCard,
  ClipboardList,
  Layers,
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

const API = "";
const MONTHS_UA = [
  "", "Січень", "Лютий", "Березень", "Квітень",
  "Травень", "Червень", "Липень", "Серпень",
  "Вересень", "Жовтень", "Листопад", "Грудень",
];
const PIE_COLORS = ["#60a5fa", "#f97316", "#ef4444", "#a855f7", "#10b981"];

const fmt = (v: number) =>
  v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ShareData {
  token: string;
  filter_label: string;
  expires_at: string;
  data: {
    nhsu: any;
    paid_services: any;
    formed_income: any;
  };
}

export default function OwnerSharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await axios.get(`${API}/api/monthly-expenses/owner-share/${token}/view`);
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

  const { nhsu, paid_services: paid, formed_income: fi } = data.data;
  const expiresDate = new Date(data.expires_at).toLocaleDateString("uk-UA");

  // ── NHSU dashboards ──
  const nhsuDoctors = nhsu?.doctors ?? [];
  const nhsuAgeGroups = nhsu?.age_group_totals ?? [];

  // ── Paid services dashboards ──
  const paidDash = paid?.dashboard;
  const paidTable = paid?.services_table ?? [];
  const paidTrend = (paid?.monthly_trend ?? [])
    .filter((r: any) => r.sum > 0)
    .map((r: any) => ({
      label: `${MONTHS_UA[r.month]?.slice(0, 3)} ${r.year}`,
      sum: r.sum,
      doctor_income: r.doctor_income,
    }));

  const expensesPie = paidDash ? [
    { name: "Матеріали", value: paidDash.materials_cost },
    { name: `ЄП (${paid.ep_rate}%)`, value: paidDash.ep_amount },
    { name: `ВЗ (${paid.vz_rate}%)`, value: paidDash.vz_amount },
  ].filter((x: any) => x.value > 0) : [];

  // ── Formed income pie ──
  const formedPie = fi ? [
    { name: "Власні декларації", value: fi.own_declarations },
    { name: "Декларації найм. лікаря", value: fi.hired_declarations },
    { name: "Платні послуги", value: fi.paid_services_income },
  ].filter((x: any) => x.value > 0) : [];

  return (
    <div className="min-h-screen bg-dark-700 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="card-neo p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Building2 size={22} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MedFlow · Зведений звіт ФОП</h1>
              <p className="text-sm text-gray-400">{data.filter_label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
            <Clock size={12} />
            <span>Доступно до {expiresDate}</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            СЕКЦІЯ 1: СФОРМОВАНИЙ ДОХІД
        ═══════════════════════════════════════ */}
        {fi && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BadgeDollarSign size={20} className="text-emerald-400" />
              Сформований дохід власника ФОП
            </h2>

            {/* Дашборд сформованого доходу */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-neo p-5">
                <p className="text-xs text-gray-500 mb-2">Власні декларації</p>
                <p className="text-xl font-bold text-emerald-400 tabular-nums">{fmt(fi.own_declarations)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <p className="text-xs text-gray-500 mb-2">Декларації найм. лікаря</p>
                <p className="text-xl font-bold text-blue-400 tabular-nums">{fmt(fi.hired_declarations)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <p className="text-xs text-gray-500 mb-2">Платні послуги</p>
                <p className="text-xl font-bold text-purple-400 tabular-nums">{fmt(fi.paid_services_income)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5 bg-emerald-500/5 border-emerald-500/20">
                <p className="text-xs text-gray-500 mb-2">Разом за місяць</p>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">{fmt(fi.total)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
            </div>

            {/* Діаграма */}
            {formedPie.length > 1 && (
              <div className="card-neo p-5">
                <p className="text-sm font-medium text-gray-400 mb-3">Структура доходу</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={formedPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {formedPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} formatter={(v: number) => fmt(v) + " грн"} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Таблиця розрахунку сформованого доходу */}
            <div className="card-neo overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-50/10">
                <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2"><Calculator size={14} className="text-orange-400" />Розрахунок сформованого доходу</h3>
              </div>
              <div className="divide-y divide-dark-50/5">
                {/* Власні декларації */}
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FileText size={12} className="text-orange-400" />Кошти за власні декларації</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Брутто НСЗУ (власник)</span><span className="text-white font-mono tabular-nums">{fmt(fi.own_nhsu_brutto)} грн</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">÷ 2</span><span className="text-amber-400 font-mono tabular-nums">{fmt(fi.own_nhsu_brutto / 2)} грн</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">ЄП (всі лікарі)</span><span className="text-red-400 font-mono tabular-nums">−{fmt(fi.ep_all)} грн</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">ВЗ (всі лікарі)</span><span className="text-red-400 font-mono tabular-nums">−{fmt(fi.vz_all)} грн</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">ЄСВ власника</span><span className="text-red-400 font-mono tabular-nums">−{fmt(fi.esv_owner)} грн</span></div>
                    <div className="flex justify-between border-t border-dark-50/10 pt-1.5"><span className="text-gray-300 font-semibold">= × 90%</span><span className="text-emerald-400 font-bold font-mono tabular-nums">{fmt(fi.own_declarations)} грн</span></div>
                  </div>
                </div>

                {/* Декларації найманого лікаря */}
                {fi.hired_doctor && (
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Users size={12} className="text-orange-400" />Кошти за декларації найманого лікаря</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">Брутто НСЗУ ({fi.hired_doctor.doctor_name})</span><span className="text-white font-mono tabular-nums">{fmt(fi.hired_doctor.nhsu_brutto)} грн</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Витрати (ЄП, ВЗ, ЗП лікаря та сестри)</span><span className="text-red-400 font-mono tabular-nums">−{fmt(fi.hired_doctor.total_expenses)} грн</span></div>
                      <div className="flex justify-between border-t border-dark-50/10 pt-1.5"><span className="text-gray-300 font-semibold">÷ 2 × 90%</span><span className="text-emerald-400 font-bold font-mono tabular-nums">{fmt(fi.hired_declarations)} грн</span></div>
                    </div>
                  </div>
                )}

                {/* Платні послуги */}
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><CreditCard size={12} className="text-orange-400" />Дохід від платних послуг</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Дохід лікаря (з модуля)</span>
                    <span className="text-blue-400 font-bold font-mono tabular-nums">{fmt(fi.paid_services_income)} грн</span>
                  </div>
                </div>

                {/* Підсумок */}
                <div className="px-5 py-4 bg-emerald-500/5">
                  <div className="flex justify-between text-base">
                    <span className="text-gray-200 font-semibold">Разом сформований дохід</span>
                    <span className="text-emerald-400 font-bold font-mono tabular-nums text-lg">{fmt(fi.total)} грн</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            СЕКЦІЯ 2: НСЗУ
        ═══════════════════════════════════════ */}
        {nhsu && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Landmark size={20} className="text-blue-400" />
              НСЗУ — Декларації
            </h2>

            {/* Дашборд НСЗУ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-neo p-5">
                <p className="text-xs text-gray-500 mb-2">Пацієнтів</p>
                <p className="text-xl font-bold text-white tabular-nums">{nhsu.grand_total_patients}</p>
              </div>
              <div className="card-neo p-5">
                <p className="text-xs text-gray-500 mb-2">Нарахування</p>
                <p className="text-xl font-bold text-blue-400 tabular-nums">{fmt(nhsu.grand_total_amount)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <p className="text-xs text-gray-500 mb-2">ЄП + ВЗ</p>
                <p className="text-xl font-bold text-red-400 tabular-nums">{fmt(nhsu.grand_total_ep_vz)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <p className="text-xs text-gray-500 mb-2">Ставка капітації</p>
                <p className="text-xl font-bold text-gray-300 tabular-nums">{nhsu.capitation_rate} <span className="text-xs text-gray-500">грн</span></p>
              </div>
            </div>

            {/* Діаграма пацієнтів по лікарях */}
            {nhsuDoctors.length > 0 && (
              <div className="card-neo p-5">
                <p className="text-sm font-medium text-gray-400 mb-3">Пацієнти по лікарях</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={nhsuDoctors.map((d: any) => ({
                    name: d.doctor_name.split(" ")[0],
                    patients: d.total_patients,
                    amount: d.total_amount,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="patients" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Пацієнтів" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Таблиця по лікарях */}
            {nhsuDoctors.length > 0 && (
              <div className="card-neo overflow-hidden">
                <div className="px-5 py-3 border-b border-dark-50/10">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2"><Users size={14} className="text-orange-400" />Деталі по лікарях</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-dark-50/10 bg-dark-300/50">
                        <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium">Лікар</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">Пацієнтів</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">Нарахування</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">ЄП</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">ВЗ</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">ЄП + ВЗ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nhsuDoctors.map((doc: any) => (
                        <tr key={doc.doctor_id} className="border-b border-dark-50/5">
                          <td className="px-3 py-2.5 text-gray-200">
                            {doc.doctor_name}
                            {doc.is_owner && <span className="ml-1.5 text-amber-400 text-[10px]">(власник)</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{doc.total_patients}</td>
                          <td className="px-3 py-2.5 text-right text-blue-400 font-medium tabular-nums">{fmt(doc.total_amount)}</td>
                          <td className="px-3 py-2.5 text-right text-red-400 tabular-nums">{fmt(doc.total_ep)}</td>
                          <td className="px-3 py-2.5 text-right text-red-400 tabular-nums">{fmt(doc.total_vz)}</td>
                          <td className="px-3 py-2.5 text-right text-red-400 font-medium tabular-nums">{fmt(doc.total_ep_vz)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-dark-50/15 bg-dark-400/20">
                        <td className="px-3 py-2.5 text-gray-300 font-semibold">Разом</td>
                        <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{nhsu.grand_total_patients}</td>
                        <td className="px-3 py-2.5 text-right text-blue-400 font-bold tabular-nums">{fmt(nhsu.grand_total_amount)}</td>
                        <td className="px-3 py-2.5 text-right text-red-400 font-bold tabular-nums">{fmt(nhsu.grand_total_ep)}</td>
                        <td className="px-3 py-2.5 text-right text-red-400 font-bold tabular-nums">{fmt(nhsu.grand_total_vz)}</td>
                        <td className="px-3 py-2.5 text-right text-red-400 font-bold tabular-nums">{fmt(nhsu.grand_total_ep_vz)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Таблиця по вікових групах */}
            {nhsuAgeGroups.length > 0 && (
              <div className="card-neo overflow-hidden">
                <div className="px-5 py-3 border-b border-dark-50/10">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2"><Layers size={14} className="text-orange-400" />По вікових групах</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-dark-50/10 bg-dark-300/50">
                        <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium">Вікова група</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">Коефіцієнт</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">Пацієнтів</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">Нарахування</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">ЄП + ВЗ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nhsuAgeGroups.map((ag: any) => (
                        <tr key={ag.age_group} className="border-b border-dark-50/5">
                          <td className="px-3 py-2.5 text-gray-200">{ag.age_group_label}</td>
                          <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{ag.age_coefficient}</td>
                          <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{ag.total_patients}</td>
                          <td className="px-3 py-2.5 text-right text-blue-400 font-medium tabular-nums">{fmt(ag.total_amount)}</td>
                          <td className="px-3 py-2.5 text-right text-red-400 tabular-nums">{fmt(ag.total_ep_vz)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════════════════════════
            СЕКЦІЯ 3: ПЛАТНІ ПОСЛУГИ
        ═══════════════════════════════════════ */}
        {paidDash && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MedFlowLogo size={20} className="text-green-400" />
              Платні послуги
            </h2>

            {/* Дашборд */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-accent-400" /><span className="text-xs text-gray-500">Оборот</span></div>
                <p className="text-xl font-bold text-white tabular-nums">{fmt(paidDash.total_revenue)} <span className="text-xs text-gray-500">грн</span></p>
                <div className="flex gap-4 mt-2 text-xs text-gray-400"><span>К-ть: {paidDash.total_quantity}</span><span>Сер.чек: {fmt(paidDash.avg_check)}</span></div>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><Users size={16} className="text-green-400" /><span className="text-xs text-gray-500">Дохід лікарів</span></div>
                <p className="text-xl font-bold text-green-400 tabular-nums">{fmt(paidDash.doctor_income)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><Package size={16} className="text-orange-400" /><span className="text-xs text-gray-500">Витрати</span></div>
                <p className="text-xl font-bold text-orange-400 tabular-nums">{fmt(paidDash.total_costs)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><Landmark size={16} className="text-blue-400" /><span className="text-xs text-gray-500">Дохід організації</span></div>
                <p className="text-xl font-bold text-blue-400 tabular-nums">{fmt(paidDash.org_income)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><Banknote size={16} className="text-yellow-400" /><span className="text-xs text-gray-500">Готівка в касі</span></div>
                <p className="text-xl font-bold text-yellow-400 tabular-nums">{fmt(paidDash.cash_in_register)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
              <div className="card-neo p-5">
                <div className="flex items-center gap-2 mb-3"><Wallet size={16} className="text-purple-400" /><span className="text-xs text-gray-500">Кошти на рахунку</span></div>
                <p className="text-xl font-bold text-purple-400 tabular-nums">{fmt(paidDash.bank_amount)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
            </div>

            {/* Витрати (Pie) */}
            {expensesPie.length > 0 && (
              <div className="card-neo p-5">
                <p className="text-sm font-medium text-gray-400 mb-3">Структура витрат</p>
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
            {paidTrend.length > 1 && (
              <div className="card-neo p-5">
                <p className="text-sm font-medium text-gray-400 mb-3">Динаміка по місяцях</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={paidTrend}>
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
            {paidTable.length > 0 && (
              <div className="card-neo overflow-hidden">
                <div className="px-5 py-3 border-b border-dark-50/10">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2"><ClipboardList size={14} className="text-orange-400" />Деталі по послугах</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[900px]">
                    <thead>
                      <tr className="border-b border-dark-50/10 bg-dark-300/50">
                        <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium">Код</th>
                        <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium">Назва</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">К-ть</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">Сума</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">Витрати</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">До розподілу</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">Дохід лікаря</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium">Дохід орг.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidTable.map((row: any) => (
                        <tr key={row.service_id} className="border-b border-dark-50/5">
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
            )}
          </section>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 py-4">
          MedFlow · Фінансовий менеджер ФОП
        </div>
      </div>
    </div>
  );
}
