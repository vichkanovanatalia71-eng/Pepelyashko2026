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
  Shield,
} from "lucide-react";

const MONTHS_UA = [
  "", "Січень", "Лютий", "Березень", "Квітень",
  "Травень", "Червень", "Липень", "Серпень",
  "Вересень", "Жовтень", "Листопад", "Грудень",
];
const fmt = (v: number) =>
  v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type TabId = "overview" | "nhsu" | "paid" | "doctor" | "payments";

const TABS: { id: TabId; label: string; icon: typeof Eye }[] = [
  { id: "overview", label: "Огляд", icon: Eye },
  { id: "nhsu", label: "НСЗУ", icon: Landmark },
  { id: "paid", label: "Платні послуги", icon: CreditCard },
  { id: "doctor", label: "Дохід лікаря", icon: Stethoscope },
  { id: "payments", label: "Оплата доходу і витрат", icon: Banknote },
];

interface ReturnExpensesData {
  cash_return_fixed: { id: number; name: string; amount: number }[];
  cash_return_other: { id: number; name: string; amount: number }[];
  cash_return_sum: number;
  supplements: { staff_member_id: number; full_name: string; supplement: number }[];
  supplements_total: number;
  doctor_incomes: { doctor_id: number; doctor_name: string; income: number }[];
  doctor_income_total: number;
  cash_in_register: number;
  withdraw_to_card: number;
  year: number;
  month: number;
}

interface ShareData {
  token: string;
  filter_label: string;
  expires_at: string;
  data: {
    owner_name?: string;
    nhsu: any;
    paid_services: any;
    formed_income: any;
    return_expenses?: ReturnExpensesData;
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
    <div className={`card-neo p-5 text-center ${highlight ? `bg-${color}-500/5 border-${color}-500/20` : ""}`}>
      <div className="flex items-center justify-center gap-2 mb-2">
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
          <div className="card-neo p-6 bg-emerald-500/5 border-emerald-500/20 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
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

      {/* Per-doctor services breakdown */}
      {paidTable.length > 0 && (() => {
        // Collect unique doctors from by_doctor arrays
        const doctorMap = new Map<number, { doctor_id: number; doctor_name: string }>();
        for (const row of paidTable) {
          for (const bd of (row.by_doctor ?? [])) {
            if (!doctorMap.has(bd.doctor_id)) {
              doctorMap.set(bd.doctor_id, { doctor_id: bd.doctor_id, doctor_name: bd.doctor_name });
            }
          }
        }
        const doctors = Array.from(doctorMap.values());
        if (doctors.length < 2) return null;

        return (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Stethoscope size={12} />
              Надані послуги по лікарях
            </p>
            <div className="space-y-4">
              {doctors.map((doc) => {
                const doctorRows = paidTable
                  .filter((row: any) => (row.by_doctor ?? []).some((bd: any) => bd.doctor_id === doc.doctor_id))
                  .map((row: any) => {
                    const bd = row.by_doctor.find((b: any) => b.doctor_id === doc.doctor_id);
                    const qty = bd?.quantity ?? 0;
                    const ratio = row.total_quantity > 0 ? qty / row.total_quantity : 0;
                    return {
                      service_id: row.service_id,
                      code: row.code,
                      name: row.name,
                      price: row.price,
                      quantity: qty,
                      sum: (row.price ?? 0) * qty,
                      materials: (row.materials ?? 0) * ratio,
                      ep_amount: (row.ep_amount ?? 0) * ratio,
                      vz_amount: (row.vz_amount ?? 0) * ratio,
                      to_split: (row.to_split ?? 0) * ratio,
                      doctor_income: (row.doctor_income ?? 0) * ratio,
                      org_income: (row.org_income ?? 0) * ratio,
                    };
                  });

                const totalQty = doctorRows.reduce((s: number, r: any) => s + r.quantity, 0);
                const totalSum = doctorRows.reduce((s: number, r: any) => s + r.sum, 0);
                const totalDocIncome = doctorRows.reduce((s: number, r: any) => s + r.doctor_income, 0);

                return (
                  <div key={doc.doctor_id} className="card-neo overflow-hidden">
                    <div className="px-5 py-3 border-b border-dark-50/10 flex items-center gap-2">
                      <Stethoscope size={14} className="text-emerald-400" />
                      <h4 className="text-sm font-medium text-gray-300">{doc.doctor_name}</h4>
                      <span className="ml-auto text-xs text-gray-500">
                        {totalQty} послуг · {fmt(totalSum)} грн · дохід {fmt(totalDocIncome)} грн
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[700px]">
                        <thead>
                          <tr className="border-b border-dark-50/10 bg-dark-300/50">
                            <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Код</th>
                            <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Назва</th>
                            <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">К-ть</th>
                            <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Сума</th>
                            <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Дохід лікаря</th>
                            <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Дохід орг.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doctorRows.map((r: any) => (
                            <tr key={r.service_id} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                              <td className="px-3 py-2.5 font-mono text-accent-400">{r.code}</td>
                              <td className="px-3 py-2.5 text-gray-200">{r.name}</td>
                              <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{r.quantity}</td>
                              <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">{fmt(r.sum)}</td>
                              <td className="px-3 py-2.5 text-right text-green-400 font-medium tabular-nums">{fmt(r.doctor_income)}</td>
                              <td className="px-3 py-2.5 text-right text-green-400 font-medium tabular-nums">{fmt(r.org_income)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-dark-50/15 bg-dark-400/20">
                            <td className="px-3 py-2.5 text-gray-300 font-semibold" colSpan={2}>Разом</td>
                            <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{totalQty}</td>
                            <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{fmt(totalSum)}</td>
                            <td className="px-3 py-2.5 text-right text-green-400 font-bold tabular-nums">{fmt(totalDocIncome)}</td>
                            <td className="px-3 py-2.5 text-right text-green-400 font-bold tabular-nums">
                              {fmt(doctorRows.reduce((s: number, r: any) => s + r.org_income, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ── Tab: Дохід лікаря ── */
function TabDoctorIncome({ fi, ownerName, filterLabel }: {
  fi: any; ownerName: string; filterLabel: string;
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

/* ── Tab: Оплата доходу і витрат ── */
function PaymentRow({
  label, value, color = "text-gray-300", bold = false,
}: {
  label: string; value: number; color?: string; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${bold ? "font-semibold text-white" : "text-gray-400"}`}>{label}</span>
      <span className={`text-sm font-mono tabular-nums ${bold ? "font-bold" : "font-medium"} ${color}`}>
        {fmt(value)} ₴
      </span>
    </div>
  );
}

function TabPayments({ returnExpenses }: { returnExpenses?: ReturnExpensesData }) {
  if (!returnExpenses) {
    return (
      <div className="card-neo p-8 text-center">
        <Banknote size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Дані про витрати на повернення відсутні</p>
      </div>
    );
  }

  const re = returnExpenses;
  const monthName = MONTHS_UA[re.month] ?? "";

  return (
    <div className="space-y-4">
      <div className="card-neo p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
            <Banknote size={18} className="text-teal-400" />
          </div>
          <h3 className="font-semibold text-white text-base">Витрати на повернення</h3>
        </div>

        {/* Повернення готівки */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Повернення готівки
          </p>
          {re.cash_return_fixed.length === 0 && re.cash_return_other.length === 0 ? (
            <p className="text-sm text-gray-600">Немає витрат з позначкою повернення.</p>
          ) : (
            <div className="space-y-1">
              {re.cash_return_fixed.map(r => (
                <PaymentRow key={`f-${r.id}`} label={r.name} value={r.amount} color="text-blue-400" />
              ))}
              {re.cash_return_other.map(e => (
                <PaymentRow key={`o-${e.id}`} label={e.name} value={e.amount} color="text-amber-400" />
              ))}
              <div className="border-t border-dark-50/10 pt-1.5 mt-1.5">
                <PaymentRow label="Разом" value={re.cash_return_sum} color="text-white" bold />
              </div>
            </div>
          )}
        </div>

        {/* Доплати до цільової суми */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Доплати до цільової суми
          </p>
          {re.supplements.length === 0 ? (
            <p className="text-sm text-gray-600">Немає доплат.</p>
          ) : (
            <div className="space-y-1">
              {re.supplements.map(s => (
                <PaymentRow key={s.staff_member_id} label={`${s.full_name} — доплата`} value={s.supplement} color="text-purple-400" />
              ))}
              <div className="border-t border-dark-50/10 pt-1.5 mt-1.5">
                <PaymentRow label="Разом" value={re.supplements_total} color="text-white" bold />
              </div>
            </div>
          )}
        </div>

        {/* Дохід лікарів */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Дохід лікарів (платні послуги)
          </p>
          {re.doctor_incomes.length === 0 ? (
            <p className="text-sm text-gray-600">Немає даних.</p>
          ) : (
            <div className="space-y-1">
              {re.doctor_incomes.map(d => (
                <PaymentRow key={d.doctor_id} label={d.doctor_name} value={d.income} color="text-emerald-400" />
              ))}
              <div className="border-t border-dark-50/10 pt-1.5 mt-1.5">
                <PaymentRow label="Разом" value={re.doctor_income_total} color="text-white" bold />
              </div>
            </div>
          )}
        </div>

        {/* Готівка в касі */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Готівка в касі
          </p>
          <PaymentRow label={`Готівка в касі за ${monthName} ${re.year}`} value={re.cash_in_register} color="text-yellow-400" />
        </div>

        {/* Підсумок: Вивести на картку */}
        <div className="border-t border-white/10 pt-4">
          <div className="space-y-1.5 text-sm">
            <PaymentRow label="Витрати на повернення" value={re.cash_return_sum} />
            <PaymentRow label="+ Доплати до цільової суми" value={re.supplements_total} />
            <PaymentRow label="+ Дохід лікарів" value={re.doctor_income_total} />
            <PaymentRow label="− Готівка в касі" value={re.cash_in_register} />
            <div className="border-t border-dark-50/10 pt-2.5 mt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Вивести на картку</span>
                <span className={`font-bold text-xl font-mono tabular-nums ${re.withdraw_to_card >= 0 ? "text-teal-400" : "text-red-400"}`}>
                  {fmt(re.withdraw_to_card)} ₴
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
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

  // ── NHSU aggregated totals ──
  const nhsuGrandPatients = nhsu?.grand_total_patients ?? 0;
  const nhsuGrandAmount = nhsu?.grand_total_amount ?? 0;
  const nhsuGrandNonVerified = nhsuDoctors.reduce((s: number, d: any) => s + (d.total_non_verified ?? 0), 0);

  // ── Paid services ──
  const paidDash = paid?.dashboard;
  const paidTable: any[] = paid?.services_table ?? [];

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
                <h1 className="text-base font-bold text-white">Зведені фінанси за ФОП {ownerName ? `+ ${ownerName}` : ""}</h1>
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
            ownerName={ownerName}
            filterLabel={data.filter_label}
          />
        )}

        {activeTab === "payments" && (
          <TabPayments returnExpenses={data.data.return_expenses} />
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 py-6 mt-8 border-t border-dark-50/10">
          MedFlow · Фінансовий менеджер ФОП
        </div>
      </div>
    </div>
  );
}
