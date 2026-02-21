import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  Lock,
  LockOpen,
  TrendingDown,
  Users,
  Receipt,
  Plus,
  Trash2,
  Edit2,
  X,
  Building2,
  Wallet,
  BarChart3,
  Check,
  UserPlus,
  Stethoscope,
  Copy,
  Sparkles,
  Download,
  CalendarDays,
  ImagePlus,
  AlertCircle,
} from "lucide-react";
import {
  LoadingSpinner,
  TabBar,
  AlertBanner,
  EmptyState,
} from "../components/shared";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../api/client";
import type {
  MonthlyExpenseData,
  FixedExpenseRow,
  SalaryExpenseRow,
  StaffMember,
  HiredDoctorInfo,
  Doctor,
  PeriodSummary,
  AiParsedExpense,
} from "../types";

// ── Constants ──────────────────────────────────────────────────────

import { MONTH_NAMES } from "../components/shared/MonthNavigator";

const MONTH_SHORT = [
  "Січ","Лют","Бер","Кві","Тра","Чер",
  "Лип","Сер","Вер","Жов","Лис","Гру",
];

const ROLE_LABELS: Record<string, string> = {
  doctor: "Лікар",
  nurse:  "Медична сестра",
  other:  "Інший персонал",
};

const TAB_KEY = "expenses_tab";

const TABS = [
  { id: "fixed",   label: "Постійні витрати" },
  { id: "salary",  label: "Зарплатні витрати" },
  { id: "other",   label: "Інші витрати" },
  { id: "taxes",   label: "Податки" },
  { id: "summary", label: "Підсумки" },
] as const;

type TabId = typeof TABS[number]["id"];

const TT_STYLE = {
  background: "#1a1a2e",
  border: "1px solid #ffffff15",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

const PIE_COLORS = ["#6366f1", "#a855f7", "#f59e0b", "#f43f5e", "#10b981"];

const CATEGORY_BADGE: Record<string, { label: string; cls: string }> = {
  fixed:  { label: "Постійні",   cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  salary: { label: "Зарплатні",  cls: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  other:  { label: "Інші",       cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  taxes:  { label: "Податки",    cls: "bg-red-500/20 text-red-300 border-red-500/30" },
};

const fmt = (n: number) =>
  n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Local types ────────────────────────────────────────────────────

interface SalaryFormState {
  brutto: string;
  has_supplement: boolean;
  target_net: string;
  individual_bonus: string;
  paid_services_from_module: boolean;
  saving: boolean;
}

interface FixedPending {
  amount: string;
  is_recurring: boolean;
  saving: boolean;
}

interface OtherExpense {
  id: number;
  name: string;
  description: string;
  amount: number;
  category: string;
  year: number;
  month: number;
}

interface TrendPoint {
  label: string;
  fixed: number;
  salary: number;
  other: number;
  taxes: number;
}

interface DetailRow {
  name: string;
  category: string;
  amount: number;
}

// ── Helpers ────────────────────────────────────────────────────────

function initSalaryForm(row: SalaryExpenseRow): SalaryFormState {
  return {
    brutto: row.brutto > 0 ? String(row.brutto) : "",
    has_supplement: row.has_supplement,
    target_net: row.target_net != null ? String(row.target_net) : "",
    individual_bonus: row.individual_bonus > 0 ? String(row.individual_bonus) : "",
    paid_services_from_module: row.paid_services_from_module,
    saving: false,
  };
}

function getMonthsBack(year: number, month: number, count: number) {
  const result: { year: number; month: number }[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    result.unshift({ year: y, month: m });
    m--;
    if (m < 1) { m = 12; y--; }
  }
  return result;
}

// ── Sub-components ─────────────────────────────────────────────────

function CalcRow({
  label, value, color = "text-gray-300", info, locked, bold,
}: {
  label: string; value: number; color?: string;
  info?: string; locked?: boolean; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm gap-2">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {locked && <Lock size={11} className="text-gray-600 shrink-0" aria-hidden="true" />}
        <span className="text-gray-400 truncate">{label}</span>
        {info && <span className="text-xs text-gray-600 italic shrink-0">({info})</span>}
      </div>
      <span className={`font-mono shrink-0 tabular-nums ${color} ${bold ? "font-bold" : ""}`}>
        {fmt(value)} ₴
      </span>
    </div>
  );
}

function TaxRow({
  label, value, bold, color = "text-gray-300",
}: {
  label: string; value: number; bold?: boolean; color?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm gap-2">
      <div className="flex items-center gap-1.5">
        <Lock size={11} className="text-gray-600 shrink-0" aria-hidden="true" />
        <span className={bold ? "text-gray-200 font-semibold" : "text-gray-400"}>{label}</span>
      </div>
      <span className={`font-mono tabular-nums ${color} ${bold ? "font-bold" : ""}`}>{fmt(value)} ₴</span>
    </div>
  );
}

function SummaryRow({
  label, value, color = "text-gray-300", bold,
}: {
  label: string; value: number; color?: string; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? "text-gray-200 font-semibold" : "text-gray-400"}>{label}</span>
      <span className={`font-mono tabular-nums ${color} ${bold ? "font-bold" : ""}`}>{fmt(value)} ₴</span>
    </div>
  );
}

function KpiCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="card-neo kpi-3d-hover p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`} aria-hidden="true">
          {icon}
        </div>
      </div>
      <p className="font-bold text-lg font-mono leading-tight tabular-nums">
        {fmt(value)} <span className="text-sm font-normal text-gray-500">₴</span>
      </p>
    </div>
  );
}

function CheckboxToggle({
  checked, onToggle, label,
}: {
  checked: boolean; onToggle: () => void; label: string;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        onClick={onToggle}
        className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
          checked ? "bg-accent-500 border-accent-500" : "border-dark-50/30 bg-dark-300"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

// ── Modal backdrop ─────────────────────────────────────────────────

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative bg-dark-600 rounded-2xl shadow-2xl w-full max-w-md"
        style={{ border: "1px solid #ffffff15" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h4 className="font-semibold text-white text-sm">{title}</h4>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all
                       focus-visible:outline-2 focus-visible:outline-accent-400"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function ModalField({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="label-dark">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-dark w-full"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function ExpensesPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Tab state with sessionStorage persistence
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const stored = sessionStorage.getItem(TAB_KEY);
    return (stored as TabId) || "fixed";
  });

  // Core data
  const [data, setData]       = useState<MonthlyExpenseData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fixed expenses
  const [fixedPending, setFixedPending] = useState<Record<string, FixedPending>>({});

  // Salary forms
  const [salaryForms, setSalaryForms] = useState<Record<number, SalaryFormState>>({});

  // Other expenses
  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>([]);
  const [otherLoading, setOtherLoading]   = useState(false);

  // Staff list & NHSU doctors
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);

  // Owner hired doctor/nurse selection (persisted in localStorage)
  const [selectedHiredDoctorId, setSelectedHiredDoctorId] = useState<number | null>(() => {
    const v = localStorage.getItem("owner_hired_doctor_id");
    return v ? parseInt(v) : null;
  });
  const [selectedHiredNurseId, setSelectedHiredNurseId] = useState<number | null>(() => {
    const v = localStorage.getItem("owner_hired_nurse_id");
    return v ? parseInt(v) : null;
  });

  // Charts
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);

  // ── Fixed modal state
  const [fixedModal, setFixedModal] = useState<{
    open: boolean; isEdit: boolean; categoryKey: string;
    name: string; desc: string; amount: string; recurring: boolean; saving: boolean;
  }>({ open: false, isEdit: false, categoryKey: "", name: "", desc: "", amount: "", recurring: true, saving: false });

  // ── Staff modal state
  const [staffModal, setStaffModal] = useState<{
    open: boolean; isEdit: boolean; id: number | null;
    fullName: string; position: string; role: "doctor" | "nurse" | "other";
    doctorId: number | null; saving: boolean;
  }>({ open: false, isEdit: false, id: null, fullName: "", position: "", role: "other", doctorId: null, saving: false });

  // ── Other expense modal state
  const [otherModal, setOtherModal] = useState<{
    open: boolean; isEdit: boolean; id: number | null;
    name: string; desc: string; amount: string; category: string; saving: boolean;
  }>({ open: false, isEdit: false, id: null, name: "", desc: "", amount: "", category: "general", saving: false });

  // ── View mode: "all" = overview year, "month" = specific month ──
  const [viewMode, setViewMode] = useState<"all" | "month">("all");

  // ── Periods summary (for "all" mode) ──
  const [periods, setPeriods] = useState<PeriodSummary[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);

  // ── Lock state ──
  const [lockLoading, setLockLoading] = useState(false);

  // ── Copy-from modal ──
  const [copyModal, setCopyModal] = useState<{
    open: boolean;
    srcYear: number; srcMonth: number;
    copyFixed: boolean; copySalary: boolean; saving: boolean;
  }>({ open: false, srcYear: 0, srcMonth: 0, copyFixed: true, copySalary: true, saving: false });

  // ── AI parse modal ──
  const [aiModal, setAiModal] = useState<{
    open: boolean;
    text: string;
    file: File | null;
    loading: boolean;
    result: AiParsedExpense | null;
  }>({ open: false, text: "", file: null, loading: false, result: null });
  const aiFileRef = useRef<HTMLInputElement>(null);

  // ── Change tab with persistence
  function changeTab(tab: TabId) {
    setActiveTab(tab);
    sessionStorage.setItem(TAB_KEY, tab);
  }

  // ── Load main expense data ─────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: resp } = await api.get<MonthlyExpenseData>("/monthly-expenses/", {
        params: { year, month },
      });
      setData(resp);

      const fp: Record<string, FixedPending> = {};
      for (const row of resp.fixed) {
        fp[row.category_key] = {
          amount: row.amount > 0 ? String(row.amount) : "",
          is_recurring: row.is_recurring,
          saving: false,
        };
      }
      setFixedPending(fp);

      const sf: Record<number, SalaryFormState> = {};
      for (const row of resp.salary) {
        sf[row.staff_member_id] = initSalaryForm(row);
      }
      setSalaryForms(sf);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  // ── Load other expenses ───────────────────────────────────────
  const loadOther = useCallback(async () => {
    setOtherLoading(true);
    try {
      const { data: resp } = await api.get<OtherExpense[]>("/monthly-expenses/other", {
        params: { year, month },
      });
      setOtherExpenses(resp);
    } catch (e) {
      console.error(e);
    } finally {
      setOtherLoading(false);
    }
  }, [year, month]);

  // ── Load staff & doctors ─────────────────────────────────────
  const loadStaff = useCallback(async () => {
    try {
      const { data: resp } = await api.get<StaffMember[]>("/staff/");
      setStaffList(resp);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadDoctors = useCallback(async () => {
    try {
      const { data: resp } = await api.get<Doctor[]>("/nhsu/doctors/");
      setDoctorsList(resp);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ── Load periods summary for the year ────────────────────────
  const loadPeriods = useCallback(async () => {
    setPeriodsLoading(true);
    try {
      const { data: resp } = await api.get<PeriodSummary[]>("/monthly-expenses/periods", {
        params: { year },
      });
      setPeriods(resp);
    } catch (e) {
      console.error(e);
    } finally {
      setPeriodsLoading(false);
    }
  }, [year]);

  // ── Load 6-month trend ─────────────────────────────────────────
  const loadTrend = useCallback(async () => {
    const months = getMonthsBack(year, month, 6);
    const points: TrendPoint[] = [];
    for (const m of months) {
      try {
        const { data: resp } = await api.get<MonthlyExpenseData>("/monthly-expenses/", {
          params: { year: m.year, month: m.month },
        });
        const otherTotal = 0; // we'll try to get other separately
        points.push({
          label: MONTH_SHORT[m.month - 1],
          fixed:  resp.totals.fixed_total,
          salary: resp.totals.salary_total,
          other:  otherTotal,
          taxes:  resp.totals.tax_total,
        });
      } catch {
        points.push({ label: MONTH_SHORT[m.month - 1], fixed: 0, salary: 0, other: 0, taxes: 0 });
      }
    }
    setTrendData(points);
  }, [year, month]);

  useEffect(() => { load(); loadOther(); loadStaff(); loadDoctors(); loadTrend(); loadPeriods(); }, [load, loadOther, loadStaff, loadDoctors, loadTrend, loadPeriods]);

  // ── Month navigation ──────────────────────────────────────────
  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // ── Salary calculations ───────────────────────────────────────
  function calcSalary(form: SalaryFormState) {
    const s = data?.settings;
    if (!s) return { pdfo: 0, vz_zp: 0, esv: 0, netto: 0, supplement: 0, total_employer: 0 };
    const brutto   = parseFloat(form.brutto) || 0;
    const pdfo     = Math.round(brutto * s.pdfo_rate / 100 * 100) / 100;
    const vz_zp    = Math.round(brutto * s.vz_zp_rate / 100 * 100) / 100;
    const esv      = Math.round(brutto * s.esv_employer_rate / 100 * 100) / 100;
    const netto    = Math.round((brutto - pdfo - vz_zp) * 100) / 100;
    const targetNet = form.has_supplement && form.target_net ? parseFloat(form.target_net) : null;
    const supplement = targetNet != null ? Math.max(0, Math.round((targetNet - netto) * 100) / 100) : 0;
    const indBonus   = parseFloat(form.individual_bonus) || 0;
    const total_employer = Math.round((brutto + esv + supplement + indBonus) * 100) / 100;
    return { pdfo, vz_zp, esv, netto, supplement, total_employer };
  }

  // ── Owner salary calculations ─────────────────────────────────
  function calcOwnerSalary() {
    const owner = data?.owner;
    if (!owner) return { ownDeclarations: 0, hiredDeclarations: 0, paidServices: 0, total: 0 };

    const ownDeclarations = Math.max(
      0,
      Math.round(((owner.nhsu_brutto / 2) - (owner.ep_all + owner.vz_all + owner.esv_owner)) * 0.9 * 100) / 100,
    );

    let hiredDeclarations = 0;
    if (selectedHiredDoctorId !== null && selectedHiredNurseId !== null) {
      const hd = owner.hired_doctors.find(d => d.doctor_id === selectedHiredDoctorId);
      const nurseRow = data?.salary.find(s => s.staff_member_id === selectedHiredNurseId);
      if (hd && nurseRow) {
        hiredDeclarations = Math.max(
          0,
          Math.round(
            (hd.nhsu_brutto - hd.nhsu_ep - hd.nhsu_vz
              - hd.staff_total_employer_cost
              - nurseRow.total_employer_cost) / 2 * 0.9 * 100,
          ) / 100,
        );
      }
    }

    const paidServices = owner.paid_services_income;
    const total = Math.round((ownDeclarations + hiredDeclarations + paidServices) * 100) / 100;
    return { ownDeclarations, hiredDeclarations, paidServices, total };
  }

  // ── Dirty checks ──────────────────────────────────────────────
  function isFixedDirty(key: string, row: FixedExpenseRow): boolean {
    const p = fixedPending[key];
    if (!p) return false;
    return (parseFloat(p.amount) || 0) !== row.amount || p.is_recurring !== row.is_recurring;
  }

  function isSalaryDirty(staffId: number, row: SalaryExpenseRow): boolean {
    const f = salaryForms[staffId];
    if (!f) return false;
    return (
      (parseFloat(f.brutto) || 0)          !== row.brutto ||
      f.has_supplement                      !== row.has_supplement ||
      (parseFloat(f.target_net) || 0)      !== (row.target_net ?? 0) ||
      (parseFloat(f.individual_bonus) || 0) !== row.individual_bonus ||
      f.paid_services_from_module           !== row.paid_services_from_module
    );
  }

  // ── Save fixed ────────────────────────────────────────────────
  async function saveFixed(key: string) {
    const pending = fixedPending[key];
    if (!pending) return;
    setFixedPending(p => ({ ...p, [key]: { ...p[key], saving: true } }));
    try {
      await api.put("/monthly-expenses/fixed", {
        year, month,
        category_key: key,
        amount: parseFloat(pending.amount) || 0,
        is_recurring: pending.is_recurring,
      });
      await load();
    } catch (e) {
      console.error(e);
      setFixedPending(p => ({ ...p, [key]: { ...p[key], saving: false } }));
    }
  }

  // ── Save salary ───────────────────────────────────────────────
  async function saveSalary(staffId: number) {
    const form = salaryForms[staffId];
    if (!form) return;
    setSalaryForms(s => ({ ...s, [staffId]: { ...s[staffId], saving: true } }));
    try {
      await api.put("/monthly-expenses/salary", {
        year, month,
        staff_member_id: staffId,
        brutto: parseFloat(form.brutto) || 0,
        has_supplement: form.has_supplement,
        target_net: form.has_supplement && form.target_net ? parseFloat(form.target_net) : null,
        individual_bonus: parseFloat(form.individual_bonus) || 0,
        paid_services_from_module: form.paid_services_from_module,
      });
      await load();
    } catch (e) {
      console.error(e);
      setSalaryForms(s => ({ ...s, [staffId]: { ...s[staffId], saving: false } }));
    }
  }

  // ── Delete fixed (zero out) ───────────────────────────────────
  async function deleteFixed(key: string) {
    if (!confirm("Скинути суму до нуля для цієї категорії?")) return;
    setFixedPending(p => ({ ...p, [key]: { ...p[key], amount: "0", saving: true } }));
    try {
      await api.put("/monthly-expenses/fixed", {
        year, month, category_key: key, amount: 0, is_recurring: false,
      });
      await load();
    } catch (e) {
      console.error(e);
      setFixedPending(p => ({ ...p, [key]: { ...p[key], saving: false } }));
    }
  }

  // ── Staff CRUD ─────────────────────────────────────────────────
  async function saveStaff() {
    if (!staffModal.fullName.trim()) return;
    setStaffModal(s => ({ ...s, saving: true }));
    try {
      if (staffModal.isEdit && staffModal.id != null) {
        await api.put(`/staff/${staffModal.id}`, {
          full_name: staffModal.fullName,
          position:  staffModal.position,
          role:      staffModal.role,
          doctor_id: staffModal.role === "doctor" ? staffModal.doctorId : null,
        });
      } else {
        await api.post("/staff/", {
          full_name:  staffModal.fullName,
          position:   staffModal.position,
          role:       staffModal.role,
          doctor_id:  staffModal.role === "doctor" ? staffModal.doctorId : null,
        });
      }
      setStaffModal(s => ({ ...s, open: false, saving: false }));
      await Promise.all([loadStaff(), load()]);
    } catch (e) {
      console.error(e);
      setStaffModal(s => ({ ...s, saving: false }));
    }
  }

  async function deleteStaff(id: number, name: string) {
    if (!confirm(`Видалити співробітника «${name}»? Дані місяця залишаться.`)) return;
    try {
      await api.delete(`/staff/${id}`);
      await Promise.all([loadStaff(), load()]);
    } catch (e) {
      console.error(e);
    }
  }

  // ── Other expenses CRUD ────────────────────────────────────────
  async function saveOther() {
    if (!otherModal.name.trim()) return;
    setOtherModal(s => ({ ...s, saving: true }));
    try {
      const payload = {
        name:        otherModal.name,
        description: otherModal.desc,
        amount:      parseFloat(otherModal.amount) || 0,
        category:    otherModal.category,
        year,
        month,
      };
      if (otherModal.isEdit && otherModal.id != null) {
        await api.put(`/monthly-expenses/other/${otherModal.id}`, payload);
      } else {
        await api.post("/monthly-expenses/other", payload);
      }
      setOtherModal(s => ({ ...s, open: false, saving: false }));
      await loadOther();
    } catch (e) {
      console.error(e);
      setOtherModal(s => ({ ...s, saving: false }));
    }
  }

  async function deleteOther(id: number, name: string) {
    if (!confirm(`Видалити витрату «${name}»?`)) return;
    try {
      await api.delete(`/monthly-expenses/other/${id}`);
      await loadOther();
    } catch (e) {
      console.error(e);
    }
  }

  // ── Lock / Unlock period ──────────────────────────────────────
  async function lockPeriod() {
    setLockLoading(true);
    try {
      await api.post("/monthly-expenses/lock", { year, month });
      await Promise.all([load(), loadPeriods()]);
    } catch (e) { console.error(e); }
    finally { setLockLoading(false); }
  }

  async function unlockPeriod() {
    if (!confirm("Розблокувати місяць для редагування?")) return;
    setLockLoading(true);
    try {
      await api.delete("/monthly-expenses/lock", { params: { year, month } });
      await Promise.all([load(), loadPeriods()]);
    } catch (e) { console.error(e); }
    finally { setLockLoading(false); }
  }

  // ── Copy from period ──────────────────────────────────────────
  async function copyFromPeriod() {
    if (!copyModal.srcYear || !copyModal.srcMonth) return;
    setCopyModal(s => ({ ...s, saving: true }));
    try {
      await api.post("/monthly-expenses/copy-from", {
        source_year:  copyModal.srcYear,
        source_month: copyModal.srcMonth,
        target_year:  year,
        target_month: month,
        copy_fixed:   copyModal.copyFixed,
        copy_salary:  copyModal.copySalary,
      });
      setCopyModal(s => ({ ...s, open: false, saving: false }));
      await Promise.all([load(), loadPeriods()]);
    } catch (e) {
      console.error(e);
      setCopyModal(s => ({ ...s, saving: false }));
    }
  }

  // ── Open copy modal with previous month as default source ─────
  function openCopyModal() {
    let srcYear = year;
    let srcMonth = month - 1;
    if (srcMonth < 1) { srcMonth = 12; srcYear--; }
    setCopyModal({ open: true, srcYear, srcMonth, copyFixed: true, copySalary: true, saving: false });
  }

  // ── AI parse expense ──────────────────────────────────────────
  async function submitAiParse() {
    setAiModal(s => ({ ...s, loading: true }));
    try {
      const formData = new FormData();
      if (aiModal.text) formData.append("text", aiModal.text);
      if (aiModal.file) formData.append("file", aiModal.file);
      const { data: result } = await api.post<AiParsedExpense>("/monthly-expenses/ai-parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAiModal(s => ({ ...s, loading: false, result }));
    } catch (e) {
      console.error(e);
      setAiModal(s => ({ ...s, loading: false }));
    }
  }

  async function applyAiResult() {
    if (!aiModal.result) return;
    const r = aiModal.result;
    if (r.category === "fixed" && r.category_key) {
      const key = r.category_key;
      setFixedPending(p => ({
        ...p,
        [key]: { amount: String(r.amount), is_recurring: r.is_recurring, saving: false },
      }));
      try {
        await api.put("/monthly-expenses/fixed", {
          year, month, category_key: key, amount: r.amount, is_recurring: r.is_recurring,
        });
        await load();
      } catch (e) { console.error(e); }
    }
    setAiModal({ open: false, text: "", file: null, loading: false, result: null });
    changeTab("fixed");
  }

  // ── Excel export ──────────────────────────────────────────────
  function exportExcel() {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      [`Витрати за ${MONTH_NAMES[month - 1]} ${year}`],
      [],
      ["Категорія", "Назва", "Сума (₴)"],
      ...data.fixed.filter(r => r.amount > 0).map(r => ["Постійні", r.category_name, r.amount]),
      ...data.salary.map(r => ["Зарплатні", r.full_name, r.total_employer_cost]),
      ...otherExpenses.map(r => ["Інші", r.name, r.amount]),
      ["Податки", `ЄП (${data.taxes.ep_rate}%)`, data.taxes.ep],
      ["Податки", `ВЗ (${data.taxes.vz_rate}%)`, data.taxes.vz],
      ["Податки", "ЄСВ власника (щомісячно)", data.taxes.esv_owner],
      ["Податки", `ЄСВ роботодавця (${data.settings.esv_employer_rate}%)`, data.taxes.esv_employer],
      [],
      ["", "ВСЬОГО", grandWithOther],
      ["", "Дохід", data.totals.income],
      ["", "Залишок", (data.totals.income) - grandWithOther],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 35 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, MONTH_NAMES[month - 1]);
    XLSX.writeFile(wb, `витрати_${year}_${String(month).padStart(2, "0")}.xlsx`);
  }

  // ── Derived data ──────────────────────────────────────────────
  const otherTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

  const pieData = data
    ? [
        { name: "Постійні",  value: data.totals.fixed_total },
        { name: "Зарплатні", value: data.totals.salary_total },
        { name: "Інші",      value: otherTotal },
        { name: "Податки",   value: data.totals.tax_total },
      ].filter(d => d.value > 0)
    : [];

  const detailRows: DetailRow[] = data
    ? [
        ...data.fixed.filter(r => r.amount > 0).map(r => ({
          name: r.category_name, category: "fixed", amount: r.amount,
        })),
        ...data.salary.map(r => ({
          name: r.full_name, category: "salary", amount: r.total_employer_cost,
        })),
        ...otherExpenses.map(r => ({
          name: r.name, category: "other", amount: r.amount,
        })),
        { name: `ЄП (${data.taxes.ep_rate}%)`,   category: "taxes", amount: data.taxes.ep },
        { name: `ВЗ (${data.taxes.vz_rate}%)`,   category: "taxes", amount: data.taxes.vz },
        { name: "ЄСВ власника",                   category: "taxes", amount: data.taxes.esv_owner },
        { name: `ЄСВ роботодавця (${data.settings.esv_employer_rate}%)`, category: "taxes", amount: data.taxes.esv_employer },
      ]
    : [];

  const grandWithOther = (data?.totals.grand_total ?? 0) + otherTotal;
  const remaining      = (data?.totals.income ?? 0) - grandWithOther;

  // ── Loading state ─────────────────────────────────────────────
  if (loading && !data) {
    return <LoadingSpinner label="Завантаження витрат…" />;
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Витрати</h2>
          {viewMode === "month" && data && (
            <p className="text-gray-500 text-sm mt-1">
              Всього:{" "}
              <span className="text-red-400 font-semibold tabular-nums">{fmt(grandWithOther)} ₴</span>
              {"  ·  "}
              Залишок:{" "}
              <span className={`tabular-nums ${remaining >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}`}>
                {remaining >= 0 ? "+" : ""}{fmt(remaining)} ₴
              </span>
              {data.is_locked && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-400">
                  <Lock size={12} /> Зафіксовано
                </span>
              )}
            </p>
          )}
          {viewMode === "all" && (
            <p className="text-gray-500 text-sm mt-1">Огляд усіх місяців — {year}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { load(); loadOther(); loadTrend(); loadPeriods(); }}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-dark-300 transition-all"
            title="Оновити"
            aria-label="Оновити дані"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          </button>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-dark-500/50 border border-dark-50/15 rounded-2xl p-1">
            <button
              onClick={() => setViewMode("all")}
              aria-label="Показати всі місяці"
              aria-pressed={viewMode === "all"}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "all"
                  ? "bg-accent-500/20 text-accent-300 border border-accent-500/40"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <CalendarDays size={13} aria-hidden="true" /> Всього
            </button>
            <button
              onClick={() => setViewMode("month")}
              aria-label={`Показати ${MONTH_NAMES[month - 1]}`}
              aria-pressed={viewMode === "month"}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "month"
                  ? "bg-accent-500/20 text-accent-300 border border-accent-500/40"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {MONTH_NAMES[month - 1]}
            </button>
          </div>

          {/* Year/Month nav */}
          {viewMode === "all" ? (
            <nav className="flex items-center gap-1 bg-dark-500/50 border border-dark-50/15 rounded-2xl px-2 py-1.5" aria-label="Навігація по роках">
              <button onClick={() => setYear(y => y - 1)}
                aria-label="Попередній рік"
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-dark-300 transition-all">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <span className="px-3 text-sm font-semibold text-white min-w-[60px] text-center tabular-nums">{year}</span>
              <button onClick={() => setYear(y => y + 1)}
                aria-label="Наступний рік"
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-dark-300 transition-all">
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          ) : (
            <nav className="flex items-center gap-1 bg-dark-500/50 border border-dark-50/15 rounded-2xl px-2 py-1.5" aria-label="Навігація по місяцях">
              <button onClick={prevMonth}
                aria-label="Попередній місяць"
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-dark-300 transition-all">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <span className="px-3 text-sm font-semibold text-white min-w-[140px] text-center">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <button onClick={nextMonth}
                aria-label="Наступний місяць"
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-dark-300 transition-all">
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* ═══ "ALL" MODE — periods overview ═══ */}
      {viewMode === "all" && (
        <div className="space-y-4">
          {/* Annual stacked bar chart */}
          <div className="card-neo p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Витрати по місяцях — {year}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={periods.map(p => ({
                  label: MONTH_SHORT[p.month - 1],
                  fixed: p.fixed_total,
                  salary: p.salary_brutto_total,
                }))}
                barSize={14}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={TT_STYLE}
                  formatter={(v: number, name: string) => [fmt(v) + " ₴", name]}
                />
                <Bar dataKey="fixed"  stackId="a" fill="#6366f1" name="Постійні"  radius={[0,0,0,0]} />
                <Bar dataKey="salary" stackId="a" fill="#a855f7" name="Зарплатні" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Periods grid */}
          {periodsLoading ? (
            <LoadingSpinner height="h-24" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {periods.map(p => (
                <button
                  key={p.month}
                  onClick={() => { setMonth(p.month); setViewMode("month"); }}
                  className={`card-neo p-4 text-left hover:border-accent-500/40 transition-all ${
                    p.month === month && viewMode === "month" ? "border-accent-500/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{MONTH_NAMES[p.month - 1]}</span>
                    {p.is_locked ? (
                      <Lock size={12} className="text-amber-400" />
                    ) : p.has_data ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : null}
                  </div>
                  {p.has_data ? (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500">Постійні: <span className="text-blue-400 font-mono tabular-nums">{fmt(p.fixed_total)}</span> ₴</p>
                      <p className="text-xs text-gray-500">Зарплата: <span className="text-purple-400 font-mono tabular-nums">{fmt(p.salary_brutto_total)}</span> ₴</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">Немає даних</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ MONTH MODE: action bar + banners ═══ */}
      {viewMode === "month" && (
        <>
          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {data?.is_locked ? (
              <button
                onClick={unlockPeriod}
                disabled={lockLoading}
                aria-label="Розблокувати місяць для редагування"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-all disabled:opacity-50"
              >
                {lockLoading ? <RefreshCw size={13} className="animate-spin" /> : <LockOpen size={13} aria-hidden="true" />}
                Розблокувати
              </button>
            ) : (
              <button
                onClick={lockPeriod}
                disabled={lockLoading || !data}
                aria-label="Зафіксувати місяць"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-400/60 border border-dark-50/15 text-gray-300 text-xs font-semibold hover:border-amber-500/30 hover:text-amber-300 transition-all disabled:opacity-50"
              >
                {lockLoading ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} aria-hidden="true" />}
                Зафіксувати
              </button>
            )}
            <button
              onClick={openCopyModal}
              aria-label="Копіювати дані з іншого місяця"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-400/60 border border-dark-50/15 text-gray-300 text-xs font-semibold hover:border-accent-500/30 hover:text-accent-300 transition-all"
            >
              <Copy size={13} aria-hidden="true" /> Копіювати з...
            </button>
            <button
              onClick={() => setAiModal(s => ({ ...s, open: true }))}
              aria-label="AI-аналіз витрати"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-400/60 border border-dark-50/15 text-gray-300 text-xs font-semibold hover:border-purple-500/30 hover:text-purple-300 transition-all"
            >
              <Sparkles size={13} aria-hidden="true" /> AI-аналіз
            </button>
            <button
              onClick={exportExcel}
              disabled={!data}
              aria-label="Експортувати в Excel"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-400/60 border border-dark-50/15 text-gray-300 text-xs font-semibold hover:border-emerald-500/30 hover:text-emerald-300 transition-all disabled:opacity-50"
            >
              <Download size={13} aria-hidden="true" /> Excel
            </button>
          </div>

          {/* Lock banner */}
          {data?.is_locked && (
            <AlertBanner variant="warning">
              Місяць <strong>{MONTH_NAMES[month - 1]} {year}</strong> зафіксовано. Для редагування{" "}
              <button
                onClick={unlockPeriod}
                className="underline hover:text-yellow-300 transition-colors"
                aria-label="Розблокувати місяць"
              >
                розблокуйте
              </button>.
            </AlertBanner>
          )}

          {/* Missing salary warning */}
          {data?.missing_salary_staff && data.missing_salary_staff.length > 0 && (
            <AlertBanner variant="warning">
              <span>
                <strong>Є співробітники без зарплати за {MONTH_NAMES[month - 1]}:</strong>{" "}
                {data.missing_salary_staff.join(", ")} — вкажіть дані для дотримання трудового законодавства.
              </span>
            </AlertBanner>
          )}
        </>
      )}

      {data && viewMode === "month" && (
        <>
          {/* ═══ DASHBOARD: KPI CARDS ═══ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Постійні"
              value={data.totals.fixed_total}
              color="bg-blue-500/15"
              icon={<TrendingDown size={14} className="text-blue-400" />}
            />
            <KpiCard
              label="Зарплатні"
              value={data.totals.salary_total}
              color="bg-purple-500/15"
              icon={<Users size={14} className="text-purple-400" />}
            />
            <KpiCard
              label="Інші"
              value={otherTotal}
              color="bg-amber-500/15"
              icon={<Wallet size={14} className="text-amber-400" />}
            />
            <KpiCard
              label="Податки"
              value={data.totals.tax_total}
              color="bg-red-500/15"
              icon={<Receipt size={14} className="text-red-400" />}
            />
            <KpiCard
              label="Всього"
              value={grandWithOther}
              color="bg-dark-400/60"
              icon={<BarChart3 size={14} className="text-gray-400" />}
            />
            <div className="card-neo kpi-3d-hover p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Залишок</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  remaining >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"
                }`}>
                  {remaining >= 0
                    ? <Check size={14} className="text-emerald-400" />
                    : <AlertCircle size={14} className="text-red-400" />
                  }
                </div>
              </div>
              <p className={`font-bold text-lg font-mono leading-tight tabular-nums ${
                remaining >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {remaining >= 0 ? "+" : ""}{fmt(remaining)}{" "}
                <span className="text-sm font-normal text-gray-500">₴</span>
              </p>
            </div>
          </div>

          {/* ═══ DASHBOARD: CHARTS ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Bar chart: 6-month trend */}
            <div className="card-neo p-4" style={TT_STYLE}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Тенденція за 6 місяців
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={TT_STYLE}
                    formatter={(v: number, name: string) => [fmt(v) + " ₴", name]}
                  />
                  <Bar dataKey="fixed"  stackId="a" fill="#6366f1" name="Постійні"  radius={[0,0,0,0]} />
                  <Bar dataKey="salary" stackId="a" fill="#a855f7" name="Зарплатні" radius={[0,0,0,0]} />
                  <Bar dataKey="other"  stackId="a" fill="#f59e0b" name="Інші"      radius={[0,0,0,0]} />
                  <Bar dataKey="taxes"  stackId="a" fill="#f43f5e" name="Податки"   radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart: current month structure */}
            <div className="card-neo p-4" style={TT_STYLE}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Структура витрат — {MONTH_NAMES[month - 1]}
              </p>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TT_STYLE}
                        formatter={(v: number) => [fmt(v) + " ₴"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {pieData.map((entry, idx) => {
                      const total = pieData.reduce((s, d) => s + d.value, 0);
                      const pct = total > 0 ? Math.round(entry.value / total * 100) : 0;
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                          />
                          <span className="text-xs text-gray-400 flex-1">{entry.name}</span>
                          <span className="text-xs font-mono text-gray-300">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
                  Немає даних
                </div>
              )}
            </div>
          </div>

          {/* ═══ DETAIL TABLE ═══ */}
          {detailRows.length > 0 && (
            <div className="card-neo overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-dark-50/10 bg-dark-400/20">
                <BarChart3 size={15} className="text-gray-400" />
                <h3 className="font-semibold text-white text-sm">
                  Деталізація витрат — {MONTH_NAMES[month - 1]} {year}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-50/10">
                      <th scope="col" className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Назва</th>
                      <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Категорія</th>
                      <th scope="col" className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Сума</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-50/5">
                    {detailRows.map((row, idx) => {
                      const badge = CATEGORY_BADGE[row.category] ?? CATEGORY_BADGE.other;
                      return (
                        <tr key={idx} className="hover:bg-dark-400/15 transition-colors">
                          <td className="px-5 py-2.5 text-gray-300">{row.name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono text-gray-200 tabular-nums">
                            {fmt(row.amount)} ₴
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-dark-50/15 bg-dark-400/20">
                    <tr>
                      <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-gray-400">
                        Всього
                      </td>
                      <td className="px-5 py-3 text-right font-bold font-mono text-white tabular-nums">
                        {fmt(detailRows.reduce((s, r) => s + r.amount, 0))} ₴
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ═══ TAB NAVIGATION ═══ */}
          <TabBar
            tabs={TABS.map(t => ({ id: t.id, label: t.label }))}
            activeTab={activeTab}
            onChange={(id) => changeTab(id as TabId)}
          />

          {/* ═══ TAB PANELS ═══ */}

          {/* ────────────────────────────────────────
              TAB: ПОСТІЙНІ ВИТРАТИ
          ──────────────────────────────────────── */}
          {activeTab === "fixed" && (
            <section className="card-neo overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-50/10 bg-dark-400/20">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                  <TrendingDown size={16} className="text-blue-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">Постійні витрати</h3>
                <span className="ml-auto text-sm font-mono font-semibold text-blue-400 tabular-nums">
                  {fmt(data.totals.fixed_total)} ₴
                </span>
              </div>

              <div className="divide-y divide-dark-50/5">
                {data.fixed.map((row) => {
                  const pending = fixedPending[row.category_key];
                  if (!pending) return null;
                  const dirty = isFixedDirty(row.category_key, row);
                  return (
                    <div key={row.category_key}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-dark-400/20 transition-colors">

                      <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">{row.category_name}</span>

                      <div className="w-36 shrink-0">
                        <div className="relative">
                          <input
                            type="number" step="0.01" min="0"
                            value={pending.amount}
                            onChange={e => setFixedPending(p => ({
                              ...p, [row.category_key]: { ...p[row.category_key], amount: e.target.value }
                            }))}
                            onKeyDown={e => { if (e.key === "Enter") saveFixed(row.category_key); }}
                            className="input-dark text-right pr-8 py-2 text-sm w-full"
                            placeholder="0.00"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                        </div>
                      </div>

                      {/* Recurring toggle */}
                      <div
                        onClick={() => setFixedPending(p => ({
                          ...p,
                          [row.category_key]: {
                            ...p[row.category_key],
                            is_recurring: !p[row.category_key].is_recurring,
                          }
                        }))}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          pending.is_recurring
                            ? "bg-accent-500 border-accent-500"
                            : "border-dark-50/30 bg-dark-300"
                        }`}
                        title="Постійна"
                      >
                        {pending.is_recurring && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>

                      <button
                        onClick={() => saveFixed(row.category_key)}
                        disabled={!dirty || pending.saving}
                        title="Зберегти"
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${
                          dirty ? "text-accent-400 hover:bg-accent-500/10" : "text-gray-700 cursor-default"
                        }`}
                      >
                        {pending.saving
                          ? <RefreshCw size={13} className="animate-spin" />
                          : <Save size={13} />
                        }
                      </button>

                      <button
                        onClick={() => {
                          setFixedModal({
                            open: true, isEdit: true, categoryKey: row.category_key,
                            name: row.category_name, desc: "", amount: String(pending.amount),
                            recurring: pending.is_recurring, saving: false,
                          });
                        }}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all shrink-0"
                        title="Редагувати"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        onClick={() => deleteFixed(row.category_key)}
                        className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                        title="Скинути"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-5 py-3 bg-dark-400/20 border-t border-dark-50/10">
                <button
                  onClick={() => setFixedModal({
                    open: true, isEdit: false, categoryKey: "",
                    name: "", desc: "", amount: "", recurring: true, saving: false,
                  })}
                  className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                >
                  <Plus size={13} /> Додати категорію
                </button>
                <span className="font-bold text-blue-400 font-mono tabular-nums">{fmt(data.totals.fixed_total)} ₴</span>
              </div>
            </section>
          )}

          {/* ────────────────────────────────────────
              TAB: ЗАРПЛАТНІ ВИТРАТИ
          ──────────────────────────────────────── */}
          {activeTab === "salary" && (
            <section className="card-neo overflow-hidden">
              {/* ── Заголовок секції ── */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-50/10 bg-dark-400/20">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-purple-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">Зарплатні витрати</h3>
                <span className="ml-auto text-sm font-mono font-semibold text-purple-400 tabular-nums">
                  {fmt(data.totals.salary_total)} ₴
                </span>
              </div>

              {data.salary.length === 0 && !data.owner ? (
                <EmptyState
                  icon={<Users size={32} />}
                  title="Немає активних співробітників"
                  description="Додайте персонал у розділі Налаштування."
                />
              ) : (
                <>
                  {/* ══════════════════════════════════════════
                      БЛОК: ЛІКАРІ (власник + найманий персонал)
                  ══════════════════════════════════════════ */}
                  {(data.owner || data.salary.some(r => r.role === "doctor" && !r.is_owner)) && (
                    <div className="border-b border-dark-50/10">
                      {/* Заголовок підсекції */}
                      <div className="px-5 py-2.5 bg-dark-400/30 border-b border-dark-50/8 flex items-center gap-2">
                        <Stethoscope size={13} className="text-teal-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Лікарі</span>
                      </div>

                      {/* ── Власник ФОП ── */}
                      {data.owner && (() => {
                        const ownerCalc = calcOwnerSalary();
                        const nurses = data.salary.filter(s => s.role === "nurse");
                        const hd: HiredDoctorInfo | undefined = data.owner.hired_doctors.find(
                          d => d.doctor_id === selectedHiredDoctorId
                        );
                        const nurseRow = data.salary.find(s => s.staff_member_id === selectedHiredNurseId);
                        return (
                          <div className="border-b border-amber-500/20">
                            <div className="px-5 py-4 bg-amber-500/5">
                              <div className="flex items-center gap-2 mb-4">
                                <Building2 size={16} className="text-amber-400" />
                                <p className="font-semibold text-amber-300 text-sm">
                                  {data.owner.doctor_name} — Власник ФОП
                                </p>
                                <span className="ml-auto font-bold text-amber-400 font-mono tabular-nums">
                                  {fmt(ownerCalc.total)} ₴
                                </span>
                              </div>

                              {/* 1 — Кошти за власні декларації */}
                              <div className="bg-dark-400/40 rounded-xl p-4 space-y-2 mb-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                  Кошти за власні декларації
                                </p>
                                <CalcRow label="Брутто НСЗУ (власник)" value={data.owner.nhsu_brutto} color="text-white" />
                                <CalcRow label="÷ 2" value={data.owner.nhsu_brutto / 2} color="text-amber-400" />
                                <CalcRow label="ЄП (всі лікарі)" value={data.owner.ep_all} color="text-red-400" info="відрахування" />
                                <CalcRow label="ВЗ (всі лікарі)" value={data.owner.vz_all} color="text-red-400" info="відрахування" />
                                <CalcRow label="ЄСВ власника" value={data.owner.esv_owner} color="text-red-400" info="відрахування" />
                                <div className="border-t border-dark-50/10 pt-2">
                                  <CalcRow label="= × 90%" value={ownerCalc.ownDeclarations} color="text-emerald-400" bold />
                                </div>
                              </div>

                              {/* 2 — Кошти за декларації обраного найманого лікаря */}
                              {data.owner.hired_doctors.length > 0 && (
                                <div className="bg-dark-400/40 rounded-xl p-4 space-y-3 mb-3">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Кошти за декларації найманого лікаря
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="label-dark">Оберіть лікаря</label>
                                      <select
                                        value={selectedHiredDoctorId ?? ""}
                                        onChange={e => {
                                          const id = e.target.value ? parseInt(e.target.value) : null;
                                          setSelectedHiredDoctorId(id);
                                          localStorage.setItem("owner_hired_doctor_id", id ? String(id) : "");
                                        }}
                                        className="input-dark w-full"
                                      >
                                        <option value="">— Оберіть лікаря —</option>
                                        {data.owner.hired_doctors.map(d => (
                                          <option key={d.doctor_id} value={d.doctor_id}>{d.doctor_name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="label-dark">Медична сестра</label>
                                      <select
                                        value={selectedHiredNurseId ?? ""}
                                        onChange={e => {
                                          const id = e.target.value ? parseInt(e.target.value) : null;
                                          setSelectedHiredNurseId(id);
                                          localStorage.setItem("owner_hired_nurse_id", id ? String(id) : "");
                                        }}
                                        className="input-dark w-full"
                                      >
                                        <option value="">— Оберіть сестру —</option>
                                        {nurses.map(n => (
                                          <option key={n.staff_member_id} value={n.staff_member_id}>{n.full_name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  {hd && nurseRow ? (
                                    <div className="space-y-2 pt-2 border-t border-dark-50/10">
                                      <CalcRow label={`Брутто НСЗУ (${hd.doctor_name})`} value={hd.nhsu_brutto} color="text-white" />
                                      <CalcRow label="ЄП лікаря" value={hd.nhsu_ep} color="text-red-400" info="відрахування" />
                                      <CalcRow label="ВЗ лікаря" value={hd.nhsu_vz} color="text-red-400" info="відрахування" />
                                      <CalcRow label="ЗП лікаря (витрати)" value={hd.staff_total_employer_cost} color="text-red-400" info="відрахування" />
                                      <CalcRow label={`ЗП сестри (${nurseRow.full_name})`} value={nurseRow.total_employer_cost} color="text-red-400" info="відрахування" />
                                      <div className="border-t border-dark-50/10 pt-2">
                                        <CalcRow label="÷ 2 × 90%" value={ownerCalc.hiredDeclarations} color="text-emerald-400" bold />
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-600 italic">
                                      Оберіть лікаря та медичну сестру для розрахунку
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* 3 — Оплата за платні послуги */}
                              <div className="bg-dark-400/40 rounded-xl p-4 space-y-2 mb-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                  Оплата за платні послуги
                                </p>
                                <CalcRow
                                  label="Дохід лікаря (з модуля)"
                                  value={data.owner.paid_services_income}
                                  color="text-blue-400"
                                  locked
                                />
                              </div>

                              {/* Підсумок власника */}
                              <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                                <p className="text-sm font-semibold text-gray-300">Разом власнику за місяць</p>
                                <p className="font-bold text-amber-400 font-mono text-lg tabular-nums">{fmt(ownerCalc.total)} ₴</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── Найманий персонал-лікарі ── */}
                      <div className="divide-y divide-dark-50/5">
                        {data.salary.filter(r => r.role === "doctor" && !r.is_owner).map((row) => {
                          const form = salaryForms[row.staff_member_id];
                          if (!form) return null;
                          const calc  = calcSalary(form);
                          const dirty = isSalaryDirty(row.staff_member_id, row);
                          return (
                            <div key={row.staff_member_id} className="p-5">
                              {/* Заголовок рядка */}
                              <div className="flex items-start justify-between mb-4 gap-2">
                                <div>
                                  <p className="font-semibold text-white text-sm">{row.full_name}</p>
                                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                    Лікар
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      const sm = staffList.find(s => s.id === row.staff_member_id);
                                      setStaffModal({
                                        open: true, isEdit: true, id: row.staff_member_id,
                                        fullName: sm?.full_name ?? row.full_name,
                                        position: sm?.position ?? "",
                                        role:     row.role,
                                        doctorId: sm?.doctor_id ?? null,
                                        saving:   false,
                                      });
                                    }}
                                    className="p-1.5 rounded-lg text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                                    title="Редагувати"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteStaff(row.staff_member_id, row.full_name)}
                                    className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    title="Видалити"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">Витрати роботодавця</p>
                                    <p className="font-bold text-purple-400 font-mono text-base tabular-nums">{fmt(calc.total_employer)} ₴</p>
                                  </div>
                                </div>
                              </div>

                              {/* НСЗУ банер (якщо є дані) */}
                              {row.nhsu_brutto > 0 && (
                                <div className="mb-4 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20">
                                  <p className="text-xs font-semibold text-teal-400 mb-2">НСЗУ — декларації</p>
                                  <div className="flex flex-wrap gap-4">
                                    <div>
                                      <p className="text-xs text-gray-500">Брутто</p>
                                      <p className="text-sm font-mono text-white">{fmt(row.nhsu_brutto)} ₴</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">ЄП</p>
                                      <p className="text-sm font-mono text-red-400">−{fmt(row.nhsu_ep)} ₴</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">ВЗ</p>
                                      <p className="text-sm font-mono text-red-400">−{fmt(row.nhsu_vz)} ₴</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Форма зарплати */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div>
                                    <label className="label-dark">Офіційна зарплата (брутто)</label>
                                    <div className="relative">
                                      <input type="number" step="0.01" min="0"
                                        value={form.brutto}
                                        onChange={e => setSalaryForms(s => ({ ...s, [row.staff_member_id]: { ...s[row.staff_member_id], brutto: e.target.value } }))}
                                        className="input-dark pr-8 w-full" placeholder="0.00"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                                    </div>
                                  </div>
                                  <CheckboxToggle
                                    checked={form.has_supplement} label="Є доплата"
                                    onToggle={() => setSalaryForms(s => ({ ...s, [row.staff_member_id]: { ...s[row.staff_member_id], has_supplement: !s[row.staff_member_id].has_supplement } }))}
                                  />
                                  {form.has_supplement && (
                                    <div>
                                      <label className="label-dark">Цільова сума на руки</label>
                                      <div className="relative">
                                        <input type="number" step="0.01" min="0"
                                          value={form.target_net}
                                          onChange={e => setSalaryForms(s => ({ ...s, [row.staff_member_id]: { ...s[row.staff_member_id], target_net: e.target.value } }))}
                                          className="input-dark pr-8 w-full" placeholder="0.00"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                                      </div>
                                    </div>
                                  )}
                                  <CheckboxToggle
                                    checked={form.paid_services_from_module}
                                    label="Оплата за платні послуги"
                                    onToggle={() => setSalaryForms(s => ({ ...s, [row.staff_member_id]: { ...s[row.staff_member_id], paid_services_from_module: !s[row.staff_member_id].paid_services_from_module } }))}
                                  />
                                  <div>
                                    <label className="label-dark">Індивідуальні доплати</label>
                                    <div className="relative">
                                      <input type="number" step="0.01" min="0"
                                        value={form.individual_bonus}
                                        onChange={e => setSalaryForms(s => ({ ...s, [row.staff_member_id]: { ...s[row.staff_member_id], individual_bonus: e.target.value } }))}
                                        className="input-dark pr-8 w-full" placeholder="0.00"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-dark-400/30 rounded-xl p-4 space-y-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Автоматичний розрахунок</p>
                                  <CalcRow label="Брутто" value={parseFloat(form.brutto) || 0} color="text-white" />
                                  <CalcRow label={`ПДФО ${data.settings.pdfo_rate}%`} value={calc.pdfo} color="text-gray-500" info="Інформаційно" />
                                  <CalcRow label={`ВЗ із ЗП ${data.settings.vz_zp_rate}%`} value={calc.vz_zp} color="text-gray-500" info="Інформаційно" />
                                  <div className="border-t border-dark-50/10 pt-2">
                                    <CalcRow label="Нетто (на руки)" value={calc.netto} color="text-emerald-400" bold />
                                  </div>
                                  <CalcRow label={`ЄСВ роботодавця ${data.settings.esv_employer_rate}%`} value={calc.esv} color="text-red-400" />
                                  {form.has_supplement && calc.supplement > 0 && (
                                    <CalcRow label="Доплата до цільової суми" value={calc.supplement} color="text-amber-400" />
                                  )}
                                  {form.paid_services_from_module && (
                                    <CalcRow label="Оплата за послуги (модуль)" value={row.paid_services_income} color="text-blue-400" locked />
                                  )}
                                  {(parseFloat(form.individual_bonus) || 0) > 0 && (
                                    <CalcRow label="Індивідуальна доплата" value={parseFloat(form.individual_bonus) || 0} color="text-amber-400" />
                                  )}
                                  <div className="border-t border-dark-50/10 pt-2">
                                    <CalcRow label="Витрати роботодавця" value={calc.total_employer} color="text-purple-400" bold />
                                  </div>
                                </div>
                              </div>
                              {dirty && (
                                <div className="mt-4 flex justify-end">
                                  <button onClick={() => saveSalary(row.staff_member_id)} disabled={form.saving} className="btn-accent text-sm py-2 px-5 flex items-center gap-2">
                                    {form.saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    Зберегти
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ══════════════════════════════════════════
                      БЛОК: ПЕРСОНАЛ (медсестри та інші)
                  ══════════════════════════════════════════ */}
                  {data.salary.some(r => r.role !== "doctor") && (
                    <div>
                      <div className="px-5 py-2.5 bg-dark-400/30 border-b border-dark-50/8 flex items-center gap-2">
                        <Users size={13} className="text-purple-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Медичний персонал</span>
                      </div>
                      <div className="divide-y divide-dark-50/5">
                        {data.salary.filter(r => r.role !== "doctor").map((row) => {
                          const form = salaryForms[row.staff_member_id];
                          if (!form) return null;
                          const calc  = calcSalary(form);
                          const dirty = isSalaryDirty(row.staff_member_id, row);
                          return (
                            <div key={row.staff_member_id} className="p-5">
                              <div className="flex items-start justify-between mb-4 gap-2">
                                <div>
                                  <p className="font-semibold text-white text-sm">{row.full_name}</p>
                                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                                    {ROLE_LABELS[row.role] ?? row.role}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      const sm = staffList.find(s => s.id === row.staff_member_id);
                                      setStaffModal({
                                        open: true, isEdit: true, id: row.staff_member_id,
                                        fullName: sm?.full_name ?? row.full_name,
                                        position: sm?.position ?? "",
                                        role:     row.role,
                                        doctorId: sm?.doctor_id ?? null,
                                        saving:   false,
                                      });
                                    }}
                                    className="p-1.5 rounded-lg text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                                    title="Редагувати"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteStaff(row.staff_member_id, row.full_name)}
                                    className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    title="Видалити"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">Витрати роботодавця</p>
                                    <p className="font-bold text-purple-400 font-mono text-base tabular-nums">{fmt(calc.total_employer)} ₴</p>
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div>
                                    <label className="label-dark">Офіційна зарплата (брутто)</label>
                                    <div className="relative">
                                      <input type="number" step="0.01" min="0"
                                        value={form.brutto}
                                        onChange={e => setSalaryForms(s => ({ ...s, [row.staff_member_id]: { ...s[row.staff_member_id], brutto: e.target.value } }))}
                                        className="input-dark pr-8 w-full" placeholder="0.00"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                                    </div>
                                  </div>
                                  <CheckboxToggle
                                    checked={form.has_supplement} label="Є доплата"
                                    onToggle={() => setSalaryForms(s => ({ ...s, [row.staff_member_id]: { ...s[row.staff_member_id], has_supplement: !s[row.staff_member_id].has_supplement } }))}
                                  />
                                  {form.has_supplement && (
                                    <div>
                                      <label className="label-dark">Цільова сума на руки</label>
                                      <div className="relative">
                                        <input type="number" step="0.01" min="0"
                                          value={form.target_net}
                                          onChange={e => setSalaryForms(s => ({ ...s, [row.staff_member_id]: { ...s[row.staff_member_id], target_net: e.target.value } }))}
                                          className="input-dark pr-8 w-full" placeholder="0.00"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="bg-dark-400/30 rounded-xl p-4 space-y-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Автоматичний розрахунок</p>
                                  <CalcRow label="Брутто" value={parseFloat(form.brutto) || 0} color="text-white" />
                                  <CalcRow label={`ПДФО ${data.settings.pdfo_rate}%`} value={calc.pdfo} color="text-gray-500" info="Інформаційно" />
                                  <CalcRow label={`ВЗ із ЗП ${data.settings.vz_zp_rate}%`} value={calc.vz_zp} color="text-gray-500" info="Інформаційно" />
                                  <div className="border-t border-dark-50/10 pt-2">
                                    <CalcRow label="Нетто (на руки)" value={calc.netto} color="text-emerald-400" bold />
                                  </div>
                                  <CalcRow label={`ЄСВ роботодавця ${data.settings.esv_employer_rate}%`} value={calc.esv} color="text-red-400" />
                                  {form.has_supplement && calc.supplement > 0 && (
                                    <CalcRow label="Доплата до цільової суми" value={calc.supplement} color="text-amber-400" />
                                  )}
                                  <div className="border-t border-dark-50/10 pt-2">
                                    <CalcRow label="Витрати роботодавця" value={calc.total_employer} color="text-purple-400" bold />
                                  </div>
                                </div>
                              </div>
                              {dirty && (
                                <div className="mt-4 flex justify-end">
                                  <button onClick={() => saveSalary(row.staff_member_id)} disabled={form.saving} className="btn-accent text-sm py-2 px-5 flex items-center gap-2">
                                    {form.saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    Зберегти
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Футер ── */}
              <div className="flex items-center justify-between px-5 py-3 bg-dark-400/20 border-t border-dark-50/10">
                <span className="text-xs text-gray-600">Персонал налаштовується в розділі Налаштування</span>
                <span className="font-bold text-purple-400 font-mono tabular-nums">{fmt(data.totals.salary_total)} ₴</span>
              </div>
            </section>
          )}

          {/* ────────────────────────────────────────
              TAB: ІНШІ ВИТРАТИ
          ──────────────────────────────────────── */}
          {activeTab === "other" && (
            <section className="card-neo overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-50/10 bg-dark-400/20">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Wallet size={16} className="text-amber-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">Інші витрати</h3>
                <span className="ml-auto text-sm font-mono font-semibold text-amber-400 tabular-nums">
                  {fmt(otherTotal)} ₴
                </span>
              </div>

              {otherLoading ? (
                <LoadingSpinner height="h-24" />
              ) : otherExpenses.length === 0 ? (
                <EmptyState
                  icon={<Wallet size={32} />}
                  title="Немає інших витрат за цей місяць"
                />
              ) : (
                <div className="divide-y divide-dark-50/5">
                  {otherExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center gap-3 px-5 py-3 hover:bg-dark-400/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{exp.name}</p>
                        {exp.description && (
                          <p className="text-xs text-gray-600 truncate mt-0.5">{exp.description}</p>
                        )}
                      </div>
                      {exp.category && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 shrink-0">
                          {exp.category}
                        </span>
                      )}
                      <span className="font-mono text-sm text-gray-200 shrink-0 tabular-nums">{fmt(exp.amount)} ₴</span>
                      <button
                        onClick={() => setOtherModal({
                          open: true, isEdit: true, id: exp.id,
                          name: exp.name, desc: exp.description, amount: String(exp.amount),
                          category: exp.category, saving: false,
                        })}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all shrink-0"
                        title="Редагувати"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => deleteOther(exp.id, exp.name)}
                        className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                        title="Видалити"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between px-5 py-3 bg-dark-400/20 border-t border-dark-50/10">
                <button
                  onClick={() => setOtherModal({
                    open: true, isEdit: false, id: null,
                    name: "", desc: "", amount: "", category: "general", saving: false,
                  })}
                  className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                >
                  <Plus size={13} /> Додати витрату
                </button>
                <span className="font-bold text-amber-400 font-mono tabular-nums">{fmt(otherTotal)} ₴</span>
              </div>
            </section>
          )}

          {/* ────────────────────────────────────────
              TAB: ПОДАТКИ
          ──────────────────────────────────────── */}
          {activeTab === "taxes" && (
            <section className="card-neo overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-50/10 bg-dark-400/20">
                <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                  <Receipt size={16} className="text-red-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">Податки</h3>
                <span className="ml-auto text-sm font-mono font-semibold text-red-400 tabular-nums">
                  {fmt(data.totals.tax_total)} ₴
                </span>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="bg-dark-400/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Джерела доходу</p>
                  <TaxRow label="Дохід НСЗУ"    value={data.taxes.nhsu_income} />
                  <TaxRow label="Платні послуги" value={data.taxes.paid_services_income} />
                  <div className="border-t border-dark-50/10 pt-2">
                    <TaxRow label="Загальний дохід" value={data.taxes.total_income} bold />
                  </div>
                </div>

                <div className="bg-dark-400/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Нараховані податки</p>
                  <TaxRow label={`ЄП (${data.taxes.ep_rate}%)`}          value={data.taxes.ep} />
                  <TaxRow label={`ВЗ від доходу (${data.taxes.vz_rate}%)`} value={data.taxes.vz} />
                  <TaxRow label="ЄСВ власника (щомісячно)"               value={data.taxes.esv_owner} />
                  <TaxRow label={`ЄСВ роботодавця (${data.settings.esv_employer_rate}%)`} value={data.taxes.esv_employer} />
                  <div className="border-t border-dark-50/10 pt-2">
                    <TaxRow label="Разом податки" value={data.totals.tax_total} bold color="text-red-400" />
                  </div>
                </div>

                <div className="bg-dark-400/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ставки</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "ПДФО", value: `${data.settings.pdfo_rate}%` },
                      { label: "ВЗ із ЗП", value: `${data.settings.vz_zp_rate}%` },
                      { label: "ЄСВ роботодавця", value: `${data.settings.esv_employer_rate}%` },
                      { label: "ЄП", value: `${data.taxes.ep_rate}%` },
                      { label: "ВЗ від доходу", value: `${data.taxes.vz_rate}%` },
                      { label: "ЄСВ власника", value: `${fmt(data.taxes.esv_owner)} ₴` },
                    ].map(item => (
                      <div key={item.label} className="bg-dark-500/40 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                        <p className="font-bold text-white font-mono">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ────────────────────────────────────────
              TAB: ПІДСУМКИ
          ──────────────────────────────────────── */}
          {activeTab === "summary" && (
            <section className="card-neo overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-50/10 bg-dark-400/20">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-emerald-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">
                  Підсумки — {MONTH_NAMES[month - 1]} {year}
                </h3>
              </div>

              <div className="px-5 py-5 space-y-2.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Структура витрат
                </p>
                <SummaryRow label="Постійні витрати"  value={data.totals.fixed_total}  color="text-blue-400" />
                <SummaryRow label="Зарплатні витрати" value={data.totals.salary_total} color="text-purple-400" />
                <SummaryRow label="Інші витрати"      value={otherTotal}               color="text-amber-400" />
                <SummaryRow label="Податки"           value={data.totals.tax_total}    color="text-red-400" />
                <div className="border-t border-dark-50/10 pt-2.5">
                  <SummaryRow label="Всього витрат за місяць" value={grandWithOther} color="text-white" bold />
                </div>

                <div className="pt-3 pb-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Фінансовий результат
                  </p>
                </div>
                <SummaryRow label="Дохід НСЗУ"    value={data.taxes.nhsu_income}           color="text-gray-300" />
                <SummaryRow label="Платні послуги" value={data.taxes.paid_services_income}  color="text-gray-300" />
                <div className="border-t border-dark-50/10 pt-2.5">
                  <SummaryRow label="Загальний дохід"    value={data.totals.income} color="text-emerald-400" bold />
                </div>

                <div className="border-t border-dark-50/10 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-300">Залишок після витрат</span>
                    <div className="flex items-center gap-2">
                      {remaining < 0 && <AlertCircle size={16} className="text-red-400" />}
                      <span className={`font-bold text-xl font-mono tabular-nums ${remaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {remaining >= 0 ? "+" : ""}{fmt(remaining)} ₴
                      </span>
                    </div>
                  </div>
                </div>

                {remaining < 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
                    <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">
                      Витрати перевищують доходи на{" "}
                      <span className="font-bold">{fmt(Math.abs(remaining))} ₴</span>.
                      Перегляньте структуру витрат.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════ */}

      {/* ── Fixed expense modal ── */}
      {fixedModal.open && (
        <Modal
          title={fixedModal.isEdit ? "Редагувати постійну витрату" : "Додати постійну витрату"}
          onClose={() => setFixedModal(s => ({ ...s, open: false }))}
        >
          <ModalField
            label="Назва"
            value={fixedModal.name}
            onChange={v => setFixedModal(s => ({ ...s, name: v }))}
            placeholder="Оренда офісу..."
          />
          <ModalField
            label="Опис"
            value={fixedModal.desc}
            onChange={v => setFixedModal(s => ({ ...s, desc: v }))}
            placeholder="Необов'язково"
          />
          <ModalField
            label="Сума (₴)"
            value={fixedModal.amount}
            onChange={v => setFixedModal(s => ({ ...s, amount: v }))}
            type="number"
            placeholder="0.00"
          />
          <CheckboxToggle
            checked={fixedModal.recurring}
            label="Постійна (щомісячна)"
            onToggle={() => setFixedModal(s => ({ ...s, recurring: !s.recurring }))}
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setFixedModal(s => ({ ...s, open: false }))}
              className="flex-1 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 hover:text-white text-sm transition-all"
            >
              Скасувати
            </button>
            <button
              onClick={async () => {
                if (!fixedModal.name.trim() || !fixedModal.categoryKey) return;
                setFixedModal(s => ({ ...s, saving: true }));
                try {
                  await api.put("/monthly-expenses/fixed", {
                    year, month,
                    category_key: fixedModal.categoryKey,
                    amount: parseFloat(fixedModal.amount) || 0,
                    is_recurring: fixedModal.recurring,
                  });
                  setFixedModal(s => ({ ...s, open: false, saving: false }));
                  await load();
                } catch (e) {
                  console.error(e);
                  setFixedModal(s => ({ ...s, saving: false }));
                }
              }}
              disabled={fixedModal.saving}
              className="flex-1 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {fixedModal.saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Зберегти
            </button>
          </div>
        </Modal>
      )}

      {/* ── Staff modal ── */}
      {staffModal.open && (
        <Modal
          title={staffModal.isEdit ? "Редагувати співробітника" : "Додати співробітника"}
          onClose={() => setStaffModal(s => ({ ...s, open: false }))}
        >
          <ModalField
            label="ПІБ"
            value={staffModal.fullName}
            onChange={v => setStaffModal(s => ({ ...s, fullName: v }))}
            placeholder="Іваненко Іван Іванович"
          />
          <ModalField
            label="Посада"
            value={staffModal.position}
            onChange={v => setStaffModal(s => ({ ...s, position: v }))}
            placeholder="Лікар загальної практики"
          />
          <div>
            <label className="label-dark">Роль</label>
            <select
              value={staffModal.role}
              onChange={e => setStaffModal(s => ({ ...s, role: e.target.value as "doctor" | "nurse" | "other", doctorId: null }))}
              className="input-dark w-full"
            >
              <option value="doctor">Лікар</option>
              <option value="nurse">Медична сестра</option>
              <option value="other">Інший персонал</option>
            </select>
          </div>
          {staffModal.role === "doctor" && (
            <div>
              <label className="label-dark">Лікар НСЗУ (прив'язка)</label>
              <select
                value={staffModal.doctorId ?? ""}
                onChange={e => setStaffModal(s => ({
                  ...s,
                  doctorId: e.target.value ? parseInt(e.target.value) : null,
                }))}
                className="input-dark w-full"
              >
                <option value="">— Без прив'язки —</option>
                {doctorsList.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name}{d.is_owner ? " (Власник)" : ""}</option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                Для підтягування даних з модулів НСЗУ та Платних послуг
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStaffModal(s => ({ ...s, open: false }))}
              className="flex-1 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 hover:text-white text-sm transition-all"
            >
              Скасувати
            </button>
            <button
              onClick={saveStaff}
              disabled={staffModal.saving || !staffModal.fullName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {staffModal.saving ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {staffModal.isEdit ? "Зберегти" : "Додати"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Copy-from modal ── */}
      {copyModal.open && (
        <Modal
          title="Копіювати дані з попереднього місяця"
          onClose={() => setCopyModal(s => ({ ...s, open: false }))}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-dark">Рік</label>
                <select
                  value={copyModal.srcYear}
                  onChange={e => setCopyModal(s => ({ ...s, srcYear: parseInt(e.target.value) }))}
                  className="input-dark w-full"
                >
                  {[year - 1, year].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-dark">Місяць</label>
                <select
                  value={copyModal.srcMonth}
                  onChange={e => setCopyModal(s => ({ ...s, srcMonth: parseInt(e.target.value) }))}
                  className="input-dark w-full"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2 p-3 rounded-xl bg-dark-400/30 border border-dark-50/10">
              <p className="text-xs text-gray-500 mb-2">Що копіювати:</p>
              <CheckboxToggle
                checked={copyModal.copyFixed}
                label="Постійні витрати"
                onToggle={() => setCopyModal(s => ({ ...s, copyFixed: !s.copyFixed }))}
              />
              <CheckboxToggle
                checked={copyModal.copySalary}
                label="Зарплатні налаштування"
                onToggle={() => setCopyModal(s => ({ ...s, copySalary: !s.copySalary }))}
              />
            </div>
            <p className="text-xs text-gray-600">
              Дані буде скопійовано в <span className="text-white">{MONTH_NAMES[month - 1]} {year}</span>.
              Існуючі записи цільового місяця будуть перезаписані.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setCopyModal(s => ({ ...s, open: false }))}
              className="flex-1 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 hover:text-white text-sm transition-all"
            >
              Скасувати
            </button>
            <button
              onClick={copyFromPeriod}
              disabled={copyModal.saving || (!copyModal.copyFixed && !copyModal.copySalary)}
              className="flex-1 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {copyModal.saving ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
              Копіювати
            </button>
          </div>
        </Modal>
      )}

      {/* ── AI parse modal ── */}
      {aiModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="AI-аналіз витрати">
          <div className="absolute inset-0" onClick={() => setAiModal({ open: false, text: "", file: null, loading: false, result: null })} />
          <div
            className="relative bg-dark-600 rounded-2xl shadow-2xl w-full max-w-lg"
            style={{ border: "1px solid #ffffff15" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                <h4 className="font-semibold text-white text-sm">AI-аналіз витрати</h4>
              </div>
              <button
                onClick={() => setAiModal({ open: false, text: "", file: null, loading: false, result: null })}
                aria-label="Закрити"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all
                           focus-visible:outline-2 focus-visible:outline-accent-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {!aiModal.result ? (
                <>
                  <div>
                    <label className="label-dark">Опис витрати (текст)</label>
                    <textarea
                      value={aiModal.text}
                      onChange={e => setAiModal(s => ({ ...s, text: e.target.value }))}
                      placeholder="Наприклад: оплатив оренду 15000 грн за лютий, щомісячно..."
                      className="input-dark w-full h-24 resize-none"
                    />
                  </div>
                  <div>
                    <label className="label-dark">або зображення / чек</label>
                    <div
                      onClick={() => aiFileRef.current?.click()}
                      className="border border-dashed border-dark-50/20 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/5 transition-all"
                    >
                      <ImagePlus size={24} className="text-gray-600 mx-auto mb-2" />
                      {aiModal.file ? (
                        <p className="text-sm text-purple-300">{aiModal.file.name}</p>
                      ) : (
                        <p className="text-xs text-gray-600">Натисніть щоб обрати зображення (JPG, PNG, PDF)</p>
                      )}
                    </div>
                    <input
                      ref={aiFileRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={e => setAiModal(s => ({ ...s, file: e.target.files?.[0] ?? null }))}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setAiModal({ open: false, text: "", file: null, loading: false, result: null })}
                      className="flex-1 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 hover:text-white text-sm transition-all"
                    >
                      Скасувати
                    </button>
                    <button
                      onClick={submitAiParse}
                      disabled={aiModal.loading || (!aiModal.text.trim() && !aiModal.file)}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {aiModal.loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Аналізувати
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Результат AI</p>
                      <span className="text-xs text-gray-500">
                        Впевненість: {Math.round(aiModal.result.confidence * 100)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Категорія</p>
                        <p className="text-white font-medium">{aiModal.result.category_key || aiModal.result.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Сума</p>
                        <p className="text-emerald-400 font-bold font-mono tabular-nums">{fmt(aiModal.result.amount)} ₴</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Назва</p>
                        <p className="text-white">{aiModal.result.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Постійна</p>
                        <p className="text-white">{aiModal.result.is_recurring ? "Так" : "Ні"}</p>
                      </div>
                    </div>
                    {aiModal.result.note && (
                      <p className="text-xs text-gray-500 italic border-t border-purple-500/20 pt-2">
                        {aiModal.result.note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setAiModal(s => ({ ...s, result: null }))}
                      className="flex-1 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 hover:text-white text-sm transition-all"
                    >
                      Назад
                    </button>
                    <button
                      onClick={applyAiResult}
                      className="flex-1 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={14} /> Застосувати
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Other expense modal ── */}
      {otherModal.open && (
        <Modal
          title={otherModal.isEdit ? "Редагувати витрату" : "Додати витрату"}
          onClose={() => setOtherModal(s => ({ ...s, open: false }))}
        >
          <ModalField
            label="Назва"
            value={otherModal.name}
            onChange={v => setOtherModal(s => ({ ...s, name: v }))}
            placeholder="Витрата..."
          />
          <ModalField
            label="Опис"
            value={otherModal.desc}
            onChange={v => setOtherModal(s => ({ ...s, desc: v }))}
            placeholder="Необов'язково"
          />
          <ModalField
            label="Сума (₴)"
            value={otherModal.amount}
            onChange={v => setOtherModal(s => ({ ...s, amount: v }))}
            type="number"
            placeholder="0.00"
          />
          <ModalField
            label="Категорія"
            value={otherModal.category}
            onChange={v => setOtherModal(s => ({ ...s, category: v }))}
            placeholder="general"
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setOtherModal(s => ({ ...s, open: false }))}
              className="flex-1 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 hover:text-white text-sm transition-all"
            >
              Скасувати
            </button>
            <button
              onClick={saveOther}
              disabled={otherModal.saving || !otherModal.name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {otherModal.saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {otherModal.isEdit ? "Зберегти" : "Додати"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
