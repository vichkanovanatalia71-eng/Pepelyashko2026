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
  Users,
  Building2,
  BadgeDollarSign,
  Calculator,
  FileText,
  CreditCard,
  ClipboardList,
  Layers,
  BarChart3,
  UserCircle,
  PiggyBank,
  CircleDollarSign,
} from "lucide-react";

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
const PIE_COLORS = ["#60a5fa", "#f97316", "#ef4444", "#a855f7", "#10b981"];
const TT_STYLE = { background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 };

const fmt = (v: number) =>
  v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ShareData {
  token: string;
  filter_label: string;
  expires_at: string;
  data: {
    owner_name?: string;
    nhsu: any;
    paid_services: any;
    formed_income: any;
  };
}

/* ── Section divider component ── */
function SectionDivider({ title, icon: Icon, color }: { title: string; icon: typeof Building2; color: string }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <div className={`w-9 h-9 rounded-lg bg-${color}-500/10 flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={`text-${color}-400`} />
      </div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="flex-1 h-px bg-dark-50/10" />
    </div>
  );
}

/* ── Sub-section header ── */
function SubSection({ title, icon: Icon, color }: { title: string; icon: typeof FileText; color: string }) {
  return (
    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mt-2">
      <Icon size={15} className={`text-${color}-400`} />
      {title}
    </h3>
  );
}

/* ── NHSU Doctor Table (reusable) ── */
function NhsuDoctorTable({ doctor }: { doctor: any }) {
  return (
    <div className="card-neo overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-50/10">
        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <Layers size={14} className="text-orange-400" />
          Декларації: {doctor.doctor_name}
        </h4>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5">
        <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
          <p className="text-xs text-gray-500 mb-1">Пацієнтів</p>
          <p className="text-lg font-bold text-white tabular-nums">{doctor.total_patients}</p>
        </div>
        <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
          <p className="text-xs text-gray-500 mb-1">Нарахування</p>
          <p className="text-lg font-bold text-blue-400 tabular-nums">{fmt(doctor.total_amount)} <span className="text-[10px] text-gray-500">грн</span></p>
        </div>
        <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
          <p className="text-xs text-gray-500 mb-1">ЄП</p>
          <p className="text-lg font-bold text-red-400 tabular-nums">{fmt(doctor.total_ep)} <span className="text-[10px] text-gray-500">грн</span></p>
        </div>
        <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
          <p className="text-xs text-gray-500 mb-1">ВЗ</p>
          <p className="text-lg font-bold text-red-400 tabular-nums">{fmt(doctor.total_vz)} <span className="text-[10px] text-gray-500">грн</span></p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b border-dark-50/10 bg-dark-300/50">
              <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Вікова група</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Коеф.</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Пацієнтів</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Не вериф.</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Нарахування</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ЄП + ВЗ</th>
            </tr>
          </thead>
          <tbody>
            {(doctor.rows ?? []).map((r: any) => (
              <tr key={r.age_group} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                <td className="px-3 py-2.5 text-gray-200">{r.age_group_label}</td>
                <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{r.age_coefficient}</td>
                <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{r.patient_count}</td>
                <td className="px-3 py-2.5 text-right text-yellow-400/70 tabular-nums">{r.non_verified}</td>
                <td className="px-3 py-2.5 text-right text-blue-400 font-medium tabular-nums">{fmt(r.amount)}</td>
                <td className="px-3 py-2.5 text-right text-red-400 tabular-nums">{fmt(r.ep_vz_amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-dark-50/15 bg-dark-400/20">
              <td className="px-3 py-2.5 text-gray-300 font-semibold">Разом</td>
              <td />
              <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{doctor.total_patients}</td>
              <td className="px-3 py-2.5 text-right text-yellow-400/70 font-bold tabular-nums">{doctor.total_non_verified}</td>
              <td className="px-3 py-2.5 text-right text-blue-400 font-bold tabular-nums">{fmt(doctor.total_amount)}</td>
              <td className="px-3 py-2.5 text-right text-red-400 font-bold tabular-nums">{fmt(doctor.total_ep_vz)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
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
        const r = await api.get(`/monthly-expenses/owner-share/${token}/view`);
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
  const ownerName = data.data.owner_name || "";
  const expiresDate = new Date(data.expires_at).toLocaleDateString("uk-UA");

  // ── NHSU per-doctor data ──
  const nhsuDoctors: any[] = nhsu?.doctors ?? [];
  const ownerDoctor = nhsuDoctors.find((d: any) => d.is_owner);
  const hiredDoctors = nhsuDoctors.filter((d: any) => !d.is_owner);
  const hiredDoctor = fi?.hired_doctor
    ? hiredDoctors.find((d: any) => d.doctor_id === fi.hired_doctor.doctor_id) ?? hiredDoctors[0]
    : hiredDoctors[0];

  // ── NHSU aggregated totals ──
  const nhsuGrandPatients = nhsu?.grand_total_patients ?? 0;
  const nhsuGrandAmount = nhsu?.grand_total_amount ?? 0;
  const nhsuGrandEpVz = nhsu?.grand_total_ep_vz ?? 0;
  const nhsuGrandNonVerified = (nhsuDoctors).reduce((s: number, d: any) => s + (d.total_non_verified ?? 0), 0);

  // ── Paid services ──
  const paidDash = paid?.dashboard;
  const paidTable: any[] = paid?.services_table ?? [];
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

  // ── Combined totals for Block 1 ──
  const totalPaidRevenue = paidDash?.total_revenue ?? 0;

  return (
    <div className="min-h-screen bg-dark-700 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ══ HEADER ══ */}
        <div className="card-neo p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Building2 size={22} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {ownerName ? `Зведений звіт для ${ownerName}` : "Зведений звіт ФОП"}
              </h1>
              <p className="text-sm text-gray-400">{data.filter_label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
            <Clock size={12} />
            <span>Доступно до {expiresDate}</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            БЛОК 1: ЗАГАЛЬНІ ПОКАЗНИКИ ДОХОДУ
        ═══════════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionDivider title="Загальні показники доходу" icon={BarChart3} color="blue" />

          {/* Top-level summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-neo p-5">
              <div className="flex items-center gap-2 mb-2">
                <Landmark size={15} className="text-blue-400" />
                <span className="text-xs text-gray-500">Дохід НСЗУ (брутто)</span>
              </div>
              <p className="text-xl font-bold text-blue-400 tabular-nums">{fmt(nhsuGrandAmount)} <span className="text-xs text-gray-500">грн</span></p>
            </div>
            <div className="card-neo p-5">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={15} className="text-purple-400" />
                <span className="text-xs text-gray-500">Платні послуги (оборот)</span>
              </div>
              <p className="text-xl font-bold text-purple-400 tabular-nums">{fmt(totalPaidRevenue)} <span className="text-xs text-gray-500">грн</span></p>
            </div>
            <div className="card-neo p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users size={15} className="text-cyan-400" />
                <span className="text-xs text-gray-500">Пацієнтів НСЗУ</span>
              </div>
              <p className="text-xl font-bold text-white tabular-nums">{nhsuGrandPatients}</p>
              {nhsuGrandNonVerified > 0 && (
                <p className="text-xs text-yellow-400/70 mt-1">Не верифіковано: {nhsuGrandNonVerified}</p>
              )}
            </div>
            <div className="card-neo p-5 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank size={15} className="text-emerald-400" />
                <span className="text-xs text-gray-500">Разом (брутто + оборот)</span>
              </div>
              <p className="text-xl font-bold text-emerald-400 tabular-nums">{fmt(nhsuGrandAmount + totalPaidRevenue)} <span className="text-xs text-gray-500">грн</span></p>
            </div>
          </div>

          {/* ── 1.1 Дохід від НСЗУ ── */}
          {nhsu && (
            <div className="space-y-4">
              <SubSection title="Дохід від НСЗУ" icon={Landmark} color="blue" />

              {/* NHSU aggregate KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Загальне нарахування</p>
                  <p className="text-lg font-bold text-blue-400 tabular-nums">{fmt(nhsuGrandAmount)} <span className="text-[10px] text-gray-500">грн</span></p>
                </div>
                <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">ЄП + ВЗ (всі лікарі)</p>
                  <p className="text-lg font-bold text-red-400 tabular-nums">{fmt(nhsuGrandEpVz)} <span className="text-[10px] text-gray-500">грн</span></p>
                </div>
                <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Пацієнтів</p>
                  <p className="text-lg font-bold text-white tabular-nums">{nhsuGrandPatients}</p>
                </div>
                <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Не верифіковано</p>
                  <p className="text-lg font-bold text-yellow-400/70 tabular-nums">{nhsuGrandNonVerified}</p>
                </div>
              </div>

              {/* NHSU aggregated age group totals */}
              {nhsu.age_group_totals?.length > 0 && (
                <div className="card-neo overflow-hidden">
                  <div className="px-5 py-3 border-b border-dark-50/10">
                    <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Layers size={14} className="text-blue-400" />
                      Зведені декларації по вікових групах (усі лікарі)
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead>
                        <tr className="border-b border-dark-50/10 bg-dark-300/50">
                          <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Вікова група</th>
                          <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Коеф.</th>
                          <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Пацієнтів</th>
                          <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Не вериф.</th>
                          <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Нарахування</th>
                          <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ЄП + ВЗ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nhsu.age_group_totals.map((r: any) => (
                          <tr key={r.age_group} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                            <td className="px-3 py-2.5 text-gray-200">{r.age_group_label}</td>
                            <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{r.age_coefficient}</td>
                            <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{r.total_patients}</td>
                            <td className="px-3 py-2.5 text-right text-yellow-400/70 tabular-nums">{r.total_non_verified}</td>
                            <td className="px-3 py-2.5 text-right text-blue-400 font-medium tabular-nums">{fmt(r.total_amount)}</td>
                            <td className="px-3 py-2.5 text-right text-red-400 tabular-nums">{fmt(r.total_ep_vz)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-dark-50/15 bg-dark-400/20">
                          <td className="px-3 py-2.5 text-gray-300 font-semibold">Разом</td>
                          <td />
                          <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{nhsuGrandPatients}</td>
                          <td className="px-3 py-2.5 text-right text-yellow-400/70 font-bold tabular-nums">{nhsuGrandNonVerified}</td>
                          <td className="px-3 py-2.5 text-right text-blue-400 font-bold tabular-nums">{fmt(nhsuGrandAmount)}</td>
                          <td className="px-3 py-2.5 text-right text-red-400 font-bold tabular-nums">{fmt(nhsuGrandEpVz)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Per-doctor NHSU tables */}
              {nhsuDoctors.map((doc: any) => (
                <NhsuDoctorTable key={doc.doctor_id} doctor={doc} />
              ))}
            </div>
          )}

          {/* ── 1.2 Дохід від наданих послуг ── */}
          {paidDash && (
            <div className="space-y-4">
              <SubSection title="Дохід від наданих послуг" icon={CreditCard} color="purple" />

              {/* Dashboard KPIs */}
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

              {/* Expenses Pie */}
              {expensesPie.length > 0 && (
                <div className="card-neo p-5">
                  <p className="text-sm font-medium text-gray-400 mb-3">Структура витрат</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={expensesPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {expensesPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={TT_STYLE} formatter={(v: number) => fmt(v) + " грн"} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Trend */}
              {paidTrend.length > 1 && (
                <div className="card-neo p-5">
                  <p className="text-sm font-medium text-gray-400 mb-3">Динаміка по місяцях</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={paidTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                      <Tooltip contentStyle={TT_STYLE} />
                      <Bar dataKey="sum" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Оборот (грн)" />
                      <Bar dataKey="doctor_income" fill="#4ade80" radius={[4, 4, 0, 0]} name="Дохід лікарів (грн)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Services table */}
              {paidTable.length > 0 && (
                <div className="card-neo overflow-hidden">
                  <div className="px-5 py-3 border-b border-dark-50/10">
                    <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2"><ClipboardList size={14} className="text-orange-400" />Деталі по послугах</h4>
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
                        {paidTable.map((row: any) => (
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
              )}
            </div>
          )}

          {!nhsu && !paidDash && (
            <div className="card-neo p-8 text-center">
              <p className="text-gray-500 text-sm">Дані по загальних показниках доходу відсутні</p>
            </div>
          )}
        </section>

        {/* ═══ Visual separator between blocks ═══ */}
        <div className="border-t-2 border-dark-50/15 my-2" />

        {/* ══════════════════════════════════════════════════════════════
            БЛОК 2: ЗВЕДЕНИЙ ДОХІД ЛІКАРЯ ПЕПЕЛЯШКО
        ═══════════════════════════════════════════════════════════════ */}
        {fi && (
          <section className="space-y-5">
            <SectionDivider
              title={ownerName ? `Зведений дохід лікаря ${ownerName.split(" ")[0]}` : "Зведений дохід лікаря"}
              icon={UserCircle}
              color="emerald"
            />

            {/* Personal summary KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Власна декларація</p>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">{fmt(fi.own_declarations)} <span className="text-[10px] text-gray-500">грн</span></p>
              </div>
              <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Найманий лікар</p>
                <p className="text-lg font-bold text-blue-400 tabular-nums">{fmt(fi.hired_declarations)} <span className="text-[10px] text-gray-500">грн</span></p>
              </div>
              <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Платні послуги</p>
                <p className="text-lg font-bold text-purple-400 tabular-nums">{fmt(fi.paid_services_income)} <span className="text-[10px] text-gray-500">грн</span></p>
              </div>
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Разом за місяць</p>
                <p className="text-xl font-bold text-emerald-400 tabular-nums">{fmt(fi.total)} <span className="text-[10px] text-gray-500">грн</span></p>
              </div>
            </div>

            {/* ── 2.1 Дохід від власних декларацій НСЗУ ── */}
            <div className="space-y-4">
              <SubSection title="Дохід від власних декларацій НСЗУ" icon={BadgeDollarSign} color="emerald" />

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-neo p-5">
                  <p className="text-xs text-gray-500 mb-2">Брутто НСЗУ</p>
                  <p className="text-xl font-bold text-white tabular-nums">{fmt(fi.own_nhsu_brutto)} <span className="text-xs text-gray-500">грн</span></p>
                </div>
                <div className="card-neo p-5">
                  <p className="text-xs text-gray-500 mb-2">ЄП + ВЗ (всі)</p>
                  <p className="text-xl font-bold text-red-400 tabular-nums">{fmt(fi.ep_all + fi.vz_all)} <span className="text-xs text-gray-500">грн</span></p>
                </div>
                <div className="card-neo p-5">
                  <p className="text-xs text-gray-500 mb-2">ЄСВ ФОПа</p>
                  <p className="text-xl font-bold text-orange-400 tabular-nums">{fmt(fi.esv_owner)} <span className="text-xs text-gray-500">грн</span></p>
                </div>
                <div className="card-neo p-5 bg-emerald-500/5 border-emerald-500/20">
                  <p className="text-xs text-gray-500 mb-2">Чистий дохід</p>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">{fmt(fi.own_declarations)} <span className="text-xs text-gray-500">грн</span></p>
                </div>
              </div>

              {/* Calculation breakdown */}
              <div className="card-neo overflow-hidden">
                <div className="px-5 py-3 border-b border-dark-50/10">
                  <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Calculator size={14} className="text-orange-400" />Розрахунок доходу від власної декларації
                  </h4>
                </div>
                <div className="px-5 py-4 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Брутто НСЗУ (власник)</span><span className="text-white font-mono tabular-nums">{fmt(fi.own_nhsu_brutto)} грн</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">÷ 2</span><span className="text-amber-400 font-mono tabular-nums">{fmt(fi.own_nhsu_brutto / 2)} грн</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">ЄП (від доходу)</span><span className="text-red-400 font-mono tabular-nums">−{fmt(fi.ep_all)} грн</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">ВЗ (від доходу)</span><span className="text-red-400 font-mono tabular-nums">−{fmt(fi.vz_all)} грн</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">ЄСВ ФОПа</span><span className="text-red-400 font-mono tabular-nums">−{fmt(fi.esv_owner)} грн</span></div>
                  <div className="flex justify-between border-t border-dark-50/10 pt-1.5">
                    <span className="text-gray-300 font-semibold">Чистий дохід</span>
                    <span className="text-emerald-400 font-bold font-mono tabular-nums">{fmt(fi.own_declarations)} грн</span>
                  </div>
                </div>
              </div>

              {/* Owner's NHSU declarations table */}
              {ownerDoctor && <NhsuDoctorTable doctor={ownerDoctor} />}
            </div>

            {/* ── 2.2 Дохід від найманого лікаря ── */}
            <div className="space-y-4">
              <SubSection title="Дохід від декларацій найманого лікаря" icon={Users} color="blue" />

              {fi.hired_doctor ? (
                <>
                  {/* KPI */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="card-neo p-5">
                      <p className="text-xs text-gray-500 mb-2">Брутто НСЗУ ({fi.hired_doctor.doctor_name})</p>
                      <p className="text-xl font-bold text-white tabular-nums">{fmt(fi.hired_doctor.nhsu_brutto)} <span className="text-xs text-gray-500">грн</span></p>
                    </div>
                    <div className="card-neo p-5">
                      <p className="text-xs text-gray-500 mb-2">Витрати (ЄП, ВЗ, ЗП)</p>
                      <p className="text-xl font-bold text-red-400 tabular-nums">{fmt(fi.hired_doctor.total_expenses)} <span className="text-xs text-gray-500">грн</span></p>
                    </div>
                    <div className="card-neo p-5 bg-emerald-500/5 border-emerald-500/20">
                      <p className="text-xs text-gray-500 mb-2">Чистий дохід</p>
                      <p className="text-2xl font-bold text-emerald-400 tabular-nums">{fmt(fi.hired_declarations)} <span className="text-xs text-gray-500">грн</span></p>
                    </div>
                  </div>

                  {/* Calculation breakdown */}
                  <div className="card-neo overflow-hidden">
                    <div className="px-5 py-3 border-b border-dark-50/10">
                      <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Calculator size={14} className="text-orange-400" />Розрахунок доходу від найманого лікаря
                      </h4>
                    </div>
                    <div className="px-5 py-4 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">Брутто НСЗУ ({fi.hired_doctor.doctor_name})</span><span className="text-white font-mono tabular-nums">{fmt(fi.hired_doctor.nhsu_brutto)} грн</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Витрати (ЄП, ВЗ, ЗП лікаря та сестри)</span><span className="text-red-400 font-mono tabular-nums">−{fmt(fi.hired_doctor.total_expenses)} грн</span></div>
                      <div className="flex justify-between border-t border-dark-50/10 pt-1.5">
                        <span className="text-gray-300 font-semibold">Чистий дохід</span>
                        <span className="text-emerald-400 font-bold font-mono tabular-nums">{fmt(fi.hired_declarations)} грн</span>
                      </div>
                    </div>
                  </div>

                  {/* Hired doctor's NHSU declarations table */}
                  {hiredDoctor && <NhsuDoctorTable doctor={hiredDoctor} />}
                </>
              ) : (
                <div className="card-neo p-8 text-center">
                  <Users size={32} className="text-gray-600 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-gray-400 text-sm">Найманого лікаря не обрано або дані відсутні</p>
                  <p className="text-gray-600 text-xs mt-1">Оберіть найманого лікаря та медсестру при формуванні звіту</p>
                </div>
              )}
            </div>

            {/* ── 2.3 Дохід від платних послуг (персональний) ── */}
            <div className="space-y-4">
              <SubSection title="Дохід від платних послуг" icon={CircleDollarSign} color="purple" />

              <div className="card-neo p-5 bg-purple-500/5 border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CircleDollarSign size={15} className="text-purple-400" />
                  <span className="text-xs text-gray-500">Персональний дохід від платних послуг</span>
                </div>
                <p className="text-2xl font-bold text-purple-400 tabular-nums">{fmt(fi.paid_services_income)} <span className="text-xs text-gray-500">грн</span></p>
              </div>
            </div>

            {/* ── Final total ── */}
            <div className="card-neo p-6 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <PiggyBank size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Підсумковий дохід за місяць</p>
                    <p className="text-sm text-gray-500">
                      {ownerName || "Лікар-власник"} · {data.filter_label}
                    </p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-emerald-400 tabular-nums">{fmt(fi.total)} <span className="text-sm text-gray-500">грн</span></p>
              </div>
            </div>
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
