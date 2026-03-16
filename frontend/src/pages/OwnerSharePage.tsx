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
  CreditCard,
  ClipboardList,
  Layers,
  BarChart3,
  UserCircle,
  PiggyBank,
  CircleDollarSign,
  Printer,
  Eye,
  Stethoscope,
  FileSpreadsheet,
  Shield,
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

type TabId = "overview" | "nhsu" | "paid" | "doctor" | "details";

const TABS: { id: TabId; label: string; icon: typeof Eye }[] = [
  { id: "overview", label: "Огляд", icon: Eye },
  { id: "nhsu", label: "НСЗУ", icon: Landmark },
  { id: "paid", label: "Платні послуги", icon: CreditCard },
  { id: "doctor", label: "Дохід лікаря", icon: Stethoscope },
  { id: "details", label: "Деталізація", icon: FileSpreadsheet },
];

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

/* ── KPI Card ── */
function KpiCard({
  label, value, suffix = "грн", icon: Icon, color, large, highlight,
}: {
  label: string; value: string; suffix?: string;
  icon: typeof Building2; color: string; large?: boolean; highlight?: boolean;
}) {
  return (
    <div className={`card-neo p-5 ${highlight ? `bg-${color}-500/5 border-${color}-500/20` : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className={`text-${color}-400`} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`${large ? "text-2xl" : "text-xl"} font-bold text-${color}-400 tabular-nums`}>
        {value} {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
      </p>
    </div>
  );
}

/* ── Mini KPI (smaller, for summary rows) ── */
function MiniKpi({ label, value, color = "white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-dark-400/50 border border-dark-50/10 p-3.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold text-${color} tabular-nums`}>{value}</p>
    </div>
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

/* ── Age Group Summary Table ── */
function AgeGroupSummaryTable({ nhsu, nhsuGrandPatients, nhsuGrandNonVerified, nhsuGrandAmount, nhsuGrandEpVz }: {
  nhsu: any; nhsuGrandPatients: number; nhsuGrandNonVerified: number; nhsuGrandAmount: number; nhsuGrandEpVz: number;
}) {
  if (!nhsu?.age_group_totals?.length) return null;
  return (
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
  );
}

/* ── Services Detail Table ── */
function ServicesTable({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  return (
    <div className="card-neo overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-50/10">
        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <ClipboardList size={14} className="text-orange-400" />Перелік наданих послуг
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-dark-50/10 bg-dark-300/50">
              <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Код</th>
              <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Назва</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">К-ть</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Сума</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Матеріали</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ЄП</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ВЗ</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">До розподілу</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Дохід лікаря</th>
              <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Дохід орг.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.service_id} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                <td className="px-3 py-2.5 font-mono text-accent-400">{row.code}</td>
                <td className="px-3 py-2.5 text-gray-200">{row.name}</td>
                <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{row.total_quantity}</td>
                <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{fmt(row.sum)}</td>
                <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{fmt(row.materials)}</td>
                <td className="px-3 py-2.5 text-right text-red-400 tabular-nums">{fmt(row.ep_amount ?? 0)}</td>
                <td className="px-3 py-2.5 text-right text-red-400 tabular-nums">{fmt(row.vz_amount ?? 0)}</td>
                <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">{fmt(row.to_split)}</td>
                <td className="px-3 py-2.5 text-right text-green-400 font-medium tabular-nums">{fmt(row.doctor_income)}</td>
                <td className="px-3 py-2.5 text-right text-green-400 font-medium tabular-nums">{fmt(row.org_income)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB CONTENT COMPONENTS
   ════════════════════════════════════════════════════════════ */

/* ── Tab: Огляд ── */
function TabOverview({ nhsuGrandAmount, totalPaidRevenue, paidDash, fi, ownerName }: {
  nhsuGrandAmount: number; totalPaidRevenue: number;
  paidDash: any; fi: any; ownerName: string;
}) {
  const totalRevenue = nhsuGrandAmount + totalPaidRevenue;
  const doctorIncome = fi?.total ?? 0;
  const orgIncome = paidDash?.org_income ?? 0;

  return (
    <div className="space-y-6">
      {/* Primary KPIs — Level 1 */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart3 size={12} />
          Загальний фінансовий підсумок
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Загальний дохід (брутто)" value={fmt(totalRevenue)} icon={PiggyBank} color="emerald" large highlight />
          <KpiCard label="Дохід від НСЗУ" value={fmt(nhsuGrandAmount)} icon={Landmark} color="blue" />
          <KpiCard label="Дохід від платних послуг" value={fmt(totalPaidRevenue)} icon={CreditCard} color="purple" />
        </div>
      </div>

{/* Distribution KPIs — Level 3 */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={12} />
          Розподіл доходу
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-neo p-6 bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Stethoscope size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Дохід лікаря</p>
                <p className="text-sm text-gray-400">{ownerName || "Лікар-власник"}</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-400 tabular-nums">{fmt(doctorIncome)} <span className="text-sm text-gray-500">грн</span></p>
          </div>
          <div className="card-neo p-6 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building2 size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Дохід організації</p>
                <p className="text-sm text-gray-400">Від платних послуг</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-400 tabular-nums">{fmt(orgIncome)} <span className="text-sm text-gray-500">грн</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: НСЗУ ── */
function TabNhsu({ nhsu, nhsuDoctors, nhsuGrandPatients, nhsuGrandNonVerified, nhsuGrandAmount }: {
  nhsu: any; nhsuDoctors: any[]; nhsuGrandPatients: number;
  nhsuGrandNonVerified: number; nhsuGrandAmount: number;
}) {
  if (!nhsu) {
    return (
      <div className="card-neo p-8 text-center">
        <Landmark size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Дані НСЗУ відсутні</p>
      </div>
    );
  }

  const nhsuEp = nhsuDoctors.reduce((s: number, d: any) => s + (d.total_ep ?? 0), 0);
  const nhsuVz = nhsuDoctors.reduce((s: number, d: any) => s + (d.total_vz ?? 0), 0);
  const nhsuNet = nhsuGrandAmount - nhsuEp - nhsuVz;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Landmark size={12} />
          Підсумок НСЗУ
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <MiniKpi label="Пацієнти" value={String(nhsuGrandPatients)} />
          <MiniKpi label="Не верифіковані" value={String(nhsuGrandNonVerified)} color="yellow-400/70" />
          <MiniKpi label="Сума (брутто)" value={`${fmt(nhsuGrandAmount)} грн`} color="blue-400" />
          <MiniKpi label="ЄП 5%" value={`${fmt(nhsuEp)} грн`} color="red-400" />
          <MiniKpi label="ВЗ 1%" value={`${fmt(nhsuVz)} грн`} color="red-400" />
          <MiniKpi label="Чистий дохід" value={`${fmt(nhsuNet)} грн`} color="emerald-400" />
        </div>
      </div>

      {/* Doctor summary */}
      {nhsuDoctors.length > 1 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={12} />
            Зведення по лікарях
          </p>
          <div className="card-neo overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dark-50/10 bg-dark-300/50">
                    <th scope="col" className="text-left px-4 py-3 text-gray-400 font-medium">Лікар</th>
                    <th scope="col" className="text-right px-4 py-3 text-gray-400 font-medium">Пацієнтів</th>
                    <th scope="col" className="text-right px-4 py-3 text-gray-400 font-medium">Не вериф.</th>
                    <th scope="col" className="text-right px-4 py-3 text-gray-400 font-medium">Нарахування</th>
                    <th scope="col" className="text-right px-4 py-3 text-gray-400 font-medium">ЄП</th>
                    <th scope="col" className="text-right px-4 py-3 text-gray-400 font-medium">ВЗ</th>
                  </tr>
                </thead>
                <tbody>
                  {nhsuDoctors.map((d: any) => (
                    <tr key={d.doctor_id} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                      <td className="px-4 py-3 text-gray-200 font-medium">{d.doctor_name}</td>
                      <td className="px-4 py-3 text-right text-gray-200 tabular-nums">{d.total_patients}</td>
                      <td className="px-4 py-3 text-right text-yellow-400/70 tabular-nums">{d.total_non_verified}</td>
                      <td className="px-4 py-3 text-right text-blue-400 font-medium tabular-nums">{fmt(d.total_amount)}</td>
                      <td className="px-4 py-3 text-right text-red-400 tabular-nums">{fmt(d.total_ep)}</td>
                      <td className="px-4 py-3 text-right text-red-400 tabular-nums">{fmt(d.total_vz)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-dark-50/15 bg-dark-400/20">
                    <td className="px-4 py-3 text-gray-300 font-semibold">Разом</td>
                    <td className="px-4 py-3 text-right text-white font-bold tabular-nums">{nhsuGrandPatients}</td>
                    <td className="px-4 py-3 text-right text-yellow-400/70 font-bold tabular-nums">{nhsuGrandNonVerified}</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-bold tabular-nums">{fmt(nhsuGrandAmount)}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-bold tabular-nums">{fmt(nhsuEp)}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-bold tabular-nums">{fmt(nhsuVz)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Age group detail per doctor */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers size={12} />
          Деталізація по вікових групах
        </p>
        <div className="space-y-4">
          {nhsuDoctors.map((doc: any) => (
            <NhsuDoctorTable key={doc.doctor_id} doctor={doc} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Платні послуги ── */
function TabPaidServices({ paidDash, paidTable }: {
  paidDash: any; paidTable: any[];
}) {
  if (!paidDash) {
    return (
      <div className="card-neo p-8 text-center">
        <CreditCard size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Дані по платних послугах відсутні</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CreditCard size={12} />
          Підсумок по платних послугах
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Наданих послуг (оборот)" value={fmt(paidDash.total_revenue)} icon={TrendingUp} color="accent" />
          <KpiCard label="Дохід лікарів" value={fmt(paidDash.doctor_income)} icon={Users} color="green" />
          <KpiCard label="Витрати" value={fmt(paidDash.total_costs)} icon={Package} color="orange" />
          <KpiCard label="Дохід організації" value={fmt(paidDash.org_income)} icon={Building2} color="blue" />
          <KpiCard label="Готівка в касі" value={fmt(paidDash.cash_in_register)} icon={Banknote} color="yellow" />
          <KpiCard label="Кошти на рахунку в банку" value={fmt(paidDash.bank_amount)} icon={Wallet} color="purple" />
        </div>
      </div>

      {/* Services table */}
      {paidTable.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ClipboardList size={12} />
            Перелік наданих послуг
          </p>
          <ServicesTable rows={paidTable} />
        </div>
      )}
    </div>
  );
}

/* ── Tab: Дохід лікаря ── */
function TabDoctorIncome({ fi, ownerDoctor, hiredDoctor, ownerName, filterLabel }: {
  fi: any; ownerDoctor: any; hiredDoctor: any; ownerName: string; filterLabel: string;
}) {
  if (!fi) {
    return (
      <div className="card-neo p-8 text-center">
        <UserCircle size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Дані про дохід лікаря відсутні</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal summary */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UserCircle size={12} />
          Зведений дохід лікаря {ownerName ? ownerName.split(" ")[0] : ""}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <MiniKpi label="Дохід від НСЗУ (власна декларація)" value={`${fmt(fi.own_declarations)} грн`} color="emerald-400" />
          <MiniKpi label="Дохід від НСЗУ (найманий лікар)" value={`${fmt(fi.hired_declarations)} грн`} color="blue-400" />
          <MiniKpi label="Дохід від платних послуг" value={`${fmt(fi.paid_services_income)} грн`} color="purple-400" />
          <MiniKpi label="Податки (ЄП + ВЗ + ЄСВ)" value={`${fmt(fi.ep_all + fi.vz_all + fi.esv_owner)} грн`} color="red-400" />
          <MiniKpi label="Чистий дохід за період" value={`${fmt(fi.total)} грн`} color="emerald-400" />
        </div>
      </div>

      {/* Final total card */}
      <div className="card-neo p-6 bg-emerald-500/5 border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <PiggyBank size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Підсумковий дохід за період</p>
              <p className="text-sm text-gray-500">{ownerName || "Лікар-власник"} · {filterLabel}</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-400 tabular-nums">{fmt(fi.total)} <span className="text-sm text-gray-500">грн</span></p>
        </div>
      </div>

      {/* ── НСЗУ лікаря: власна декларація ── */}
      <div className="space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <BadgeDollarSign size={12} />
          НСЗУ — власна декларація
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Брутто НСЗУ" value={fmt(fi.own_nhsu_brutto)} icon={Landmark} color="white" />
          <KpiCard label="ЄП + ВЗ (всі)" value={fmt(fi.ep_all + fi.vz_all)} icon={Shield} color="red" />
          <KpiCard label="ЄСВ ФОПа" value={fmt(fi.esv_owner)} icon={Calculator} color="orange" />
          <KpiCard label="Чистий дохід" value={fmt(fi.own_declarations)} icon={TrendingUp} color="emerald" large highlight />
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

        {ownerDoctor && <NhsuDoctorTable doctor={ownerDoctor} />}
      </div>

      {/* ── НСЗУ лікаря: найманий лікар ── */}
      <div className="space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Users size={12} />
          НСЗУ — найманий лікар
        </p>

        {fi.hired_doctor ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label={`Брутто НСЗУ (${fi.hired_doctor.doctor_name})`} value={fmt(fi.hired_doctor.nhsu_brutto)} icon={Landmark} color="white" />
              <KpiCard label="Витрати (ЄП, ВЗ, ЗП)" value={fmt(fi.hired_doctor.total_expenses)} icon={Package} color="red" />
              <KpiCard label="Чистий дохід" value={fmt(fi.hired_declarations)} icon={TrendingUp} color="emerald" large highlight />
            </div>

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

            {hiredDoctor && <NhsuDoctorTable doctor={hiredDoctor} />}
          </>
        ) : (
          <div className="card-neo p-8 text-center">
            <Users size={32} className="text-gray-600 mx-auto mb-3" aria-hidden="true" />
            <p className="text-gray-400 text-sm">Найманого лікаря не обрано або дані відсутні</p>
          </div>
        )}
      </div>

      {/* ── Платні послуги лікаря ── */}
      <div className="space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <CircleDollarSign size={12} />
          Платні послуги — персональний дохід
        </p>
        <div className="card-neo p-5 bg-purple-500/5 border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign size={15} className="text-purple-400" />
            <span className="text-xs text-gray-500">Персональний дохід від платних послуг</span>
          </div>
          <p className="text-2xl font-bold text-purple-400 tabular-nums">{fmt(fi.paid_services_income)} <span className="text-xs text-gray-500">грн</span></p>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Деталізація ── */
function TabDetails({
  nhsu, nhsuDoctors, nhsuGrandPatients, nhsuGrandNonVerified, nhsuGrandAmount, nhsuGrandEpVz,
  paidTable, paidTrend, expensesPie,
}: {
  nhsu: any; nhsuDoctors: any[]; nhsuGrandPatients: number;
  nhsuGrandNonVerified: number; nhsuGrandAmount: number; nhsuGrandEpVz: number;
  paidTable: any[]; paidTrend: any[]; expensesPie: any[];
}) {
  return (
    <div className="space-y-6">
      {/* NHSU age group totals */}
      {nhsu && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Landmark size={12} />
            Повна розшифровка НСЗУ по вікових групах
          </p>
          <AgeGroupSummaryTable
            nhsu={nhsu}
            nhsuGrandPatients={nhsuGrandPatients}
            nhsuGrandNonVerified={nhsuGrandNonVerified}
            nhsuGrandAmount={nhsuGrandAmount}
            nhsuGrandEpVz={nhsuGrandEpVz}
          />
        </div>
      )}

      {/* Per-doctor NHSU detail */}
      {nhsuDoctors.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={12} />
            Деталізація НСЗУ по лікарях та вікових групах
          </p>
          <div className="space-y-4">
            {nhsuDoctors.map((doc: any) => (
              <NhsuDoctorTable key={doc.doctor_id} doctor={doc} />
            ))}
          </div>
        </div>
      )}

      {/* Services full table */}
      {paidTable.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ClipboardList size={12} />
            Повна розшифровка по платних послугах
          </p>
          <ServicesTable rows={paidTable} />
        </div>
      )}

      {/* Charts */}
      {expensesPie.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 size={12} />
            Структура витрат
          </p>
          <div className="card-neo p-5">
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
        </div>
      )}

      {paidTrend.length > 1 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 size={12} />
            Динаміка по місяцях
          </p>
          <div className="card-neo p-5">
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
        </div>
      )}

      {!nhsu && paidTable.length === 0 && (
        <div className="card-neo p-8 text-center">
          <FileSpreadsheet size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Деталізовані дані відсутні</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function OwnerSharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

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
  const nhsuGrandNonVerified = nhsuDoctors.reduce((s: number, d: any) => s + (d.total_non_verified ?? 0), 0);

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

  const totalPaidRevenue = paidDash?.total_revenue ?? 0;

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-dark-700">
      {/* ══ STICKY HEADER ══ */}
      <div className="sticky top-0 z-50 bg-dark-700/95 backdrop-blur-sm border-b border-dark-50/10">
        <div className="max-w-6xl mx-auto px-4">
          {/* Module title row */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Building2 size={18} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Фінанси ФОП</h1>
                <p className="text-xs text-gray-500">{data.filter_label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-3">
                <Clock size={11} />
                <span>до {expiresDate}</span>
              </div>
              <button
                onClick={handlePrint}
                className="p-2 rounded-lg bg-dark-400/50 border border-dark-50/10 text-gray-400 hover:text-white hover:bg-dark-300/50 transition-colors"
                title="Друк / PDF"
              >
                <Printer size={15} />
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 overflow-x-auto pb-0 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-accent-400 border-accent-400 bg-dark-400/30"
                      : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-dark-400/20"
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ TAB CONTENT ══ */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "overview" && (
          <TabOverview
            nhsuGrandAmount={nhsuGrandAmount}
            totalPaidRevenue={totalPaidRevenue}
            paidDash={paidDash}
            fi={fi}
            ownerName={ownerName}
          />
        )}

        {activeTab === "nhsu" && (
          <TabNhsu
            nhsu={nhsu}
            nhsuDoctors={nhsuDoctors}
            nhsuGrandPatients={nhsuGrandPatients}
            nhsuGrandNonVerified={nhsuGrandNonVerified}
            nhsuGrandAmount={nhsuGrandAmount}
          />
        )}

        {activeTab === "paid" && (
          <TabPaidServices
            paidDash={paidDash}
            paidTable={paidTable}
          />
        )}

        {activeTab === "doctor" && (
          <TabDoctorIncome
            fi={fi}
            ownerDoctor={ownerDoctor}
            hiredDoctor={hiredDoctor}
            ownerName={ownerName}
            filterLabel={data.filter_label}
          />
        )}

        {activeTab === "details" && (
          <TabDetails
            nhsu={nhsu}
            nhsuDoctors={nhsuDoctors}
            nhsuGrandPatients={nhsuGrandPatients}
            nhsuGrandNonVerified={nhsuGrandNonVerified}
            nhsuGrandAmount={nhsuGrandAmount}
            nhsuGrandEpVz={nhsuGrandEpVz}
            paidTable={paidTable}
            paidTrend={paidTrend}
            expensesPie={expensesPie}
          />
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 py-6 mt-8 border-t border-dark-50/10">
          MedFlow · Фінансовий менеджер ФОП
        </div>
      </div>
    </div>
  );
}
