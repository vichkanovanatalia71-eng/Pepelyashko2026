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

type TabKey = "own" | "hired" | "paid";

const TABS: { key: TabKey; label: string; Icon: typeof FileText }[] = [
  { key: "own",   label: "Дохід від власних декларацій",              Icon: FileText },
  { key: "hired", label: "Дохід від декларацій лікаря-працівника",   Icon: Users },
  { key: "paid",  label: "Надані платні послуги",                     Icon: CreditCard },
];

export default function OwnerSharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("own");

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

          {/* Summary KPI row */}
          {fi && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
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
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
            <Clock size={12} />
            <span>Доступно до {expiresDate}</span>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div className="flex gap-1 bg-dark-600/60 rounded-xl p-1 border border-dark-50/10">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-accent-500/20 text-accent-300 border border-accent-500/40 shadow-md ring-1 ring-accent-500/20 underline underline-offset-4 decoration-accent-400/60"
                  : "text-gray-400 hover:text-gray-200 hover:bg-dark-400/40 border border-transparent cursor-pointer hover:underline hover:underline-offset-4 hover:decoration-gray-500/40"
              }`}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden text-xs">
                {key === "own" ? "Власна" : key === "hired" ? "Найманий" : "Послуги"}
              </span>
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════
            TAB 1: ДОХІД ВІД ВЛАСНОЇ ДЕКЛАРАЦІЇ
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "own" && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BadgeDollarSign size={20} className="text-emerald-400" />
              Дохід від власних декларацій
            </h2>

            {/* KPI cards */}
            {fi && (
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
            )}

            {/* Calculation breakdown */}
            {fi && (
              <div className="card-neo overflow-hidden">
                <div className="px-5 py-3 border-b border-dark-50/10">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Calculator size={14} className="text-orange-400" />Розрахунок доходу від власної декларації
                  </h3>
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
            )}

            {/* Owner's NHSU detail — patients by age group */}
            {ownerDoctor && (
              <div className="card-neo overflow-hidden">
                <div className="px-5 py-3 border-b border-dark-50/10">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Layers size={14} className="text-orange-400" />
                    Декларації: {ownerDoctor.doctor_name}
                  </h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5">
                  <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
                    <p className="text-xs text-gray-500 mb-1">Пацієнтів</p>
                    <p className="text-lg font-bold text-white tabular-nums">{ownerDoctor.total_patients}</p>
                  </div>
                  <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
                    <p className="text-xs text-gray-500 mb-1">Нарахування</p>
                    <p className="text-lg font-bold text-blue-400 tabular-nums">{fmt(ownerDoctor.total_amount)} <span className="text-[10px] text-gray-500">грн</span></p>
                  </div>
                  <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
                    <p className="text-xs text-gray-500 mb-1">ЄП</p>
                    <p className="text-lg font-bold text-red-400 tabular-nums">{fmt(ownerDoctor.total_ep)} <span className="text-[10px] text-gray-500">грн</span></p>
                  </div>
                  <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
                    <p className="text-xs text-gray-500 mb-1">ВЗ</p>
                    <p className="text-lg font-bold text-red-400 tabular-nums">{fmt(ownerDoctor.total_vz)} <span className="text-[10px] text-gray-500">грн</span></p>
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
                      {(ownerDoctor.rows ?? []).map((r: any) => (
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
                        <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{ownerDoctor.total_patients}</td>
                        <td className="px-3 py-2.5 text-right text-yellow-400/70 font-bold tabular-nums">{ownerDoctor.total_non_verified}</td>
                        <td className="px-3 py-2.5 text-right text-blue-400 font-bold tabular-nums">{fmt(ownerDoctor.total_amount)}</td>
                        <td className="px-3 py-2.5 text-right text-red-400 font-bold tabular-nums">{fmt(ownerDoctor.total_ep_vz)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {!fi && !ownerDoctor && (
              <div className="card-neo p-8 text-center">
                <p className="text-gray-500 text-sm">Дані за власною декларацією відсутні</p>
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 2: ДОХІД ВІД ДЕКЛАРАЦІЇ ЛІКАРЯ/ПРАЦІВНИКА
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "hired" && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users size={20} className="text-blue-400" />
              Дохід від декларацій лікаря-працівника
            </h2>

            {fi?.hired_doctor ? (
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
                    <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Calculator size={14} className="text-orange-400" />Розрахунок доходу від найманого лікаря
                    </h3>
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

                {/* Hired doctor's NHSU detail — patients by age group */}
                {hiredDoctor && (
                  <div className="card-neo overflow-hidden">
                    <div className="px-5 py-3 border-b border-dark-50/10">
                      <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Layers size={14} className="text-orange-400" />
                        Декларації: {hiredDoctor.doctor_name}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5">
                      <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
                        <p className="text-xs text-gray-500 mb-1">Пацієнтів</p>
                        <p className="text-lg font-bold text-white tabular-nums">{hiredDoctor.total_patients}</p>
                      </div>
                      <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
                        <p className="text-xs text-gray-500 mb-1">Нарахування</p>
                        <p className="text-lg font-bold text-blue-400 tabular-nums">{fmt(hiredDoctor.total_amount)} <span className="text-[10px] text-gray-500">грн</span></p>
                      </div>
                      <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
                        <p className="text-xs text-gray-500 mb-1">ЄП</p>
                        <p className="text-lg font-bold text-red-400 tabular-nums">{fmt(hiredDoctor.total_ep)} <span className="text-[10px] text-gray-500">грн</span></p>
                      </div>
                      <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3">
                        <p className="text-xs text-gray-500 mb-1">ВЗ</p>
                        <p className="text-lg font-bold text-red-400 tabular-nums">{fmt(hiredDoctor.total_vz)} <span className="text-[10px] text-gray-500">грн</span></p>
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
                          {(hiredDoctor.rows ?? []).map((r: any) => (
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
                            <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{hiredDoctor.total_patients}</td>
                            <td className="px-3 py-2.5 text-right text-yellow-400/70 font-bold tabular-nums">{hiredDoctor.total_non_verified}</td>
                            <td className="px-3 py-2.5 text-right text-blue-400 font-bold tabular-nums">{fmt(hiredDoctor.total_amount)}</td>
                            <td className="px-3 py-2.5 text-right text-red-400 font-bold tabular-nums">{fmt(hiredDoctor.total_ep_vz)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card-neo p-8 text-center">
                <Users size={32} className="text-gray-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-400 text-sm">Найманого лікаря не обрано або дані відсутні</p>
                <p className="text-gray-600 text-xs mt-1">Оберіть найманого лікаря та медсестру при формуванні звіту</p>
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 3: НАДАНІ ПЛАТНІ ПОСЛУГИ
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "paid" && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MedFlowLogo size={20} className="text-green-400" />
              Надані платні послуги
            </h2>

            {paidDash ? (
              <>
                {/* Dashboard */}
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
                      <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2"><ClipboardList size={14} className="text-orange-400" />Деталі по послугах</h3>
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
              </>
            ) : (
              <div className="card-neo p-8 text-center">
                <CreditCard size={32} className="text-gray-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-400 text-sm">Дані по платних послугах відсутні</p>
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
