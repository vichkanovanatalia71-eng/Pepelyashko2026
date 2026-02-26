import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Save, RefreshCw, Lock, LockOpen,
  TrendingDown, Users, Receipt, Plus, Trash2, Edit2, X,
  Building2, Wallet, BarChart3, Check, UserPlus, Copy, Sparkles,
  Download, CalendarDays, ImagePlus, AlertCircle, FileSpreadsheet,
  Eye, Target, Activity, ArrowUpRight, ArrowDownRight,
  Share2, ClipboardList, TrendingUp, Banknote, HeartPulse,
} from "lucide-react";
import {
  LoadingSpinner, AlertBanner, EmptyState, ConfirmDialog,
} from "../components/shared";
import MedFlowLogo from "../components/shared/MedFlowLogo";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Line,
  AreaChart, Area, Legend, ComposedChart,
} from "recharts";
import api from "../api/client";
import type {
  MonthlyExpenseData, SalaryExpenseRow, StaffMember,
  HiredDoctorInfo, Doctor, PeriodSummary, AiParsedExpense,
} from "../types";

// ── Extracted modules ─────────────────────────────────────────────
import { MONTH_NAMES } from "../components/shared/MonthNavigator";
import { MONTH_SHORT, ROLE_LABELS, TT_STYLE, PIE_COLORS, CATEGORY_BADGE, fmt } from "./expenses/constants";
import { initSalaryForm, calcSalary as _calcSalary, calcOwnerSalary as _calcOwnerSalary, isSalaryDirty as _isSalaryDirty } from "./expenses/utils/salaryCalculations";
import { exportExpenseExcel, exportKpiExcel } from "./expenses/utils/excelExport";
import {
  CalcRow, TaxRow, SummaryRow, KpiCard, CheckboxToggle,
  Modal, ModalField,
} from "./expenses/components/ExpenseUiParts";
import { ShareLinkModal } from "./expenses/components/ShareLinkModal";
import type { SalaryFormState, OtherExpense, DetailRow, AnnualMonthData, KpiModalState } from "./expenses/types";

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function ExpensesPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Core data
  const [data, setData]       = useState<MonthlyExpenseData | null>(null);
  const [loading, setLoading] = useState(false);

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


  // ── Fixed modal state
  const [fixedModal, setFixedModal] = useState<{
    open: boolean; isEdit: boolean; id: number | null;
    name: string; desc: string; amount: string; recurring: boolean; saving: boolean;
  }>({ open: false, isEdit: false, id: null, name: "", desc: "", amount: "", recurring: true, saving: false });

  // ── Staff modal state
  const [staffModal, setStaffModal] = useState<{
    open: boolean; isEdit: boolean; id: number | null;
    fullName: string; position: string; role: "doctor" | "nurse" | "other";
    doctorId: number | null; saving: boolean;
  }>({ open: false, isEdit: false, id: null, fullName: "", position: "", role: "other", doctorId: null, saving: false });

  // ── Other expense modal state
  const [otherModal, setOtherModal] = useState<{
    open: boolean; isEdit: boolean; id: number | null;
    name: string; desc: string; amount: string; saving: boolean;
  }>({ open: false, isEdit: false, id: null, name: "", desc: "", amount: "", saving: false });

  // ── View mode: "all" = overview year, "month" = specific month ──
  const [viewMode, setViewMode] = useState<"all" | "month">("month");

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

  // ── Annual analytics data (for "all" mode) ──
  const [annualMonths, setAnnualMonths] = useState<AnnualMonthData[]>([]);
  const [annualLoading, setAnnualLoading] = useState(false);

  // ── KPI detail modal ──
  const [kpiModal, setKpiModal] = useState<KpiModalState>({ open: false, type: "", title: "" });

  // ── Share state ──
  const [shareLoading, setShareLoading] = useState(false);
  const [shareModal, setShareModal] = useState<{
    open: boolean; url: string; expiresAt: string;
  }>({ open: false, url: "", expiresAt: "" });

  // ── Accountant request state ──
  const [accReqLoading, setAccReqLoading] = useState(false);
  const [accReqModal, setAccReqModal] = useState<{
    open: boolean; url: string; expiresAt: string;
  }>({ open: false, url: "", expiresAt: "" });

  // ── Right sidebar drawer state ──
  type DrawerSection = "fixed" | "salary" | "other" | "taxes" | "summary" | null;
  const [activeDrawer, setActiveDrawer] = useState<DrawerSection>(null);

  // ── Left sidebar collapse state (inverse coupling: left expanded → right collapsed) ──
  const [leftCollapsed, setLeftCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "1"; } catch { return false; }
  });
  // Expense sidebar is expanded when left nav is collapsed, and vice versa
  const expSidebarCollapsed = !leftCollapsed;

  // ── Previous month data for copy-from feature ──
  const [prevMonthData, setPrevMonthData] = useState<MonthlyExpenseData | null>(null);
  const [prevOtherExpenses, setPrevOtherExpenses] = useState<OtherExpense[]>([]);
  const [prevMonthLoaded, setPrevMonthLoaded] = useState(false);
  const [sectionCopyLoading, setSectionCopyLoading] = useState<Record<string, boolean>>({});
  // Track which sections have already been copied (to hide the prompt after copy)
  const [sectionCopied, setSectionCopied] = useState<Record<string, boolean>>({});

  // ── Collapsible salary sections ──
  const [expandedSalary, setExpandedSalary] = useState<Set<number>>(new Set());
  const toggleSalaryExpand = useCallback((id: number) => {
    setExpandedSalary(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Styled confirm / alert dialogs (replace native browser dialogs) ──
  const [confirmDlg, setConfirmDlg] = useState<{
    title: string; description?: string;
    variant?: "danger" | "default"; confirmLabel?: string;
    action: () => void;
  } | null>(null);
  const [alertDlg, setAlertDlg] = useState<{
    title: string; description?: string;
  } | null>(null);

  // ── Load main expense data ─────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: resp } = await api.get<MonthlyExpenseData>("/monthly-expenses/", {
        params: { year, month },
      });
      setData(resp);

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

  // ── Load previous month data (for section copy feature) ────────
  const loadPrevMonth = useCallback(async () => {
    let pY = year;
    let pM = month - 1;
    if (pM < 1) { pM = 12; pY--; }
    setPrevMonthLoaded(false);
    try {
      const [expResp, otherResp] = await Promise.all([
        api.get<MonthlyExpenseData>("/monthly-expenses/", { params: { year: pY, month: pM } }).then(r => r.data).catch(() => null),
        api.get<OtherExpense[]>("/monthly-expenses/other", { params: { year: pY, month: pM } }).then(r => r.data).catch(() => []),
      ]);
      setPrevMonthData(expResp);
      setPrevOtherExpenses(otherResp);
    } catch {
      setPrevMonthData(null);
      setPrevOtherExpenses([]);
    } finally {
      setPrevMonthLoaded(true);
    }
  }, [year, month]);

  // ── Load annual data for analytics ────────────────────────────
  const loadAnnualData = useCallback(async () => {
    setAnnualLoading(true);
    try {
      const promises = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return Promise.all([
          api.get<MonthlyExpenseData>("/monthly-expenses/", { params: { year, month: m } }).then(r => r.data).catch(() => null),
          api.get<OtherExpense[]>("/monthly-expenses/other", { params: { year, month: m } }).then(r => r.data).catch(() => []),
        ]);
      });
      const results = await Promise.all(promises);
      const annual: AnnualMonthData[] = results.map(([d, others], i) => {
        const otherSum = (others as OtherExpense[]).reduce((s, e) => s + e.amount, 0);
        if (!d) return { month: i + 1, fixed: 0, salary: 0, taxes: 0, other: 0, income: 0, total: 0, remaining: 0 };
        const md = d as MonthlyExpenseData;
        const total = md.totals.fixed_total + md.totals.salary_total + md.totals.tax_total + otherSum;
        return {
          month: i + 1,
          fixed: md.totals.fixed_total,
          salary: md.totals.salary_total,
          taxes: md.totals.tax_total,
          other: otherSum,
          income: md.totals.income,
          total,
          remaining: md.totals.income - total,
        };
      });
      setAnnualMonths(annual);
    } catch (e) {
      console.error(e);
    } finally {
      setAnnualLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); loadOther(); loadStaff(); loadDoctors(); loadPeriods(); loadPrevMonth(); }, [load, loadOther, loadStaff, loadDoctors, loadPeriods, loadPrevMonth]);
  useEffect(() => { if (viewMode === "all") loadAnnualData(); }, [viewMode, loadAnnualData]);

  // Close drawer on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && activeDrawer) setActiveDrawer(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activeDrawer]);

  // ── Bottom sheet drag-to-resize (mobile) ──
  const [sheetHeight, setSheetHeight] = useState(92); // vh
  const sheetDragRef = useRef<{ startY: number; startH: number } | null>(null);
  const sheetPanelRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLDivElement | null>(null);

  // Reset sheet height when drawer opens + lock body scroll
  useEffect(() => {
    if (activeDrawer) {
      setSheetHeight(85);
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [activeDrawer]);

  // Prevent default touchmove on drag handle (avoids page scroll during drag)
  useEffect(() => {
    const handle = dragHandleRef.current;
    if (!handle) return;
    const prevent = (e: TouchEvent) => { e.preventDefault(); };
    handle.addEventListener("touchmove", prevent, { passive: false });
    return () => handle.removeEventListener("touchmove", prevent);
  });

  const onDragStart = useCallback((e: React.TouchEvent) => {
    sheetDragRef.current = { startY: e.touches[0].clientY, startH: sheetHeight };
  }, [sheetHeight]);

  const onDragMove = useCallback((e: React.TouchEvent) => {
    if (!sheetDragRef.current) return;
    const deltaY = sheetDragRef.current.startY - e.touches[0].clientY;
    const deltaVh = (deltaY / window.innerHeight) * 100;
    const newH = Math.max(20, Math.min(100, sheetDragRef.current.startH + deltaVh));
    setSheetHeight(newH);
  }, []);

  const onDragEnd = useCallback(() => {
    if (!sheetDragRef.current) return;
    const h = sheetHeight;
    sheetDragRef.current = null;
    // Snap to breakpoints: close (<30%), half (30-75%), full (>75%)
    if (h < 30) {
      setActiveDrawer(null);
    } else if (h < 75) {
      setSheetHeight(50);
    } else {
      setSheetHeight(85);
    }
  }, [sheetHeight]);

  // Sync with left sidebar collapse state
  useEffect(() => {
    function handleSidebarToggle(e: Event) {
      const detail = (e as CustomEvent).detail;
      setLeftCollapsed(detail.collapsed);
    }
    window.addEventListener("sidebar-toggle", handleSidebarToggle);
    return () => window.removeEventListener("sidebar-toggle", handleSidebarToggle);
  }, []);

  // ── Drawer section definitions ──
  const DRAWER_SECTIONS: { key: DrawerSection; label: string; icon: React.ReactNode; color: string; badgeColor: string; glow: string; getValue: () => number; getStatus: () => boolean }[] = [
    { key: "fixed", label: "Постійні витрати", icon: <TrendingDown size={18} />, color: "text-blue-400", badgeColor: "bg-blue-500/25 border-blue-400/50", glow: "0 0 14px rgba(59,130,246,0.45), 0 0 4px rgba(59,130,246,0.3)", getValue: () => data?.totals.fixed_total ?? 0, getStatus: () => (data?.fixed.some(r => r.amount > 0) ?? false) },
    { key: "salary", label: "Зарплатні витрати", icon: <Users size={18} />, color: "text-purple-400", badgeColor: "bg-purple-500/25 border-purple-400/50", glow: "0 0 14px rgba(168,85,247,0.45), 0 0 4px rgba(168,85,247,0.3)", getValue: () => data?.totals.salary_total ?? 0, getStatus: () => (data?.salary.some(r => r.brutto > 0) ?? false) },
    { key: "other", label: "Інші витрати", icon: <Wallet size={18} />, color: "text-amber-400", badgeColor: "bg-amber-500/25 border-amber-400/50", glow: "0 0 14px rgba(245,158,11,0.45), 0 0 4px rgba(245,158,11,0.3)", getValue: () => otherTotal, getStatus: () => otherExpenses.length > 0 },
    { key: "taxes", label: "Податки", icon: <Receipt size={18} />, color: "text-red-400", badgeColor: "bg-red-500/25 border-red-400/50", glow: "0 0 14px rgba(239,68,68,0.45), 0 0 4px rgba(239,68,68,0.3)", getValue: () => data?.totals.tax_total ?? 0, getStatus: () => (data?.totals.tax_total ?? 0) > 0 },
    { key: "summary", label: "Підсумки", icon: <Building2 size={18} />, color: "text-emerald-400", badgeColor: "bg-emerald-500/25 border-emerald-400/50", glow: "0 0 14px rgba(16,185,129,0.45), 0 0 4px rgba(16,185,129,0.3)", getValue: () => remaining, getStatus: () => grandWithOther > 0 },
  ];

  function toggleDrawer(section: DrawerSection) {
    setActiveDrawer(prev => prev === section ? null : section);
  }

  // ── Month navigation ──────────────────────────────────────────
  function hasDirtySalary(): boolean {
    if (!data) return false;
    return data.salary.some(row => isSalaryDirty(row.staff_member_id, row));
  }

  function doMonthChange(direction: "prev" | "next") {
    setActiveDrawer(null);
    setSectionCopied({});
    if (direction === "prev") {
      if (month === 1) { setYear(y => y - 1); setMonth(12); }
      else setMonth(m => m - 1);
    } else {
      if (month === 12) { setYear(y => y + 1); setMonth(1); }
      else setMonth(m => m + 1);
    }
  }

  function prevMonth() {
    if (hasDirtySalary()) {
      setConfirmDlg({
        title: "Є незбережені зміни зарплат",
        description: "При переході на інший місяць незбережені зміни буде втрачено. Продовжити?",
        confirmLabel: "Продовжити",
        action: () => doMonthChange("prev"),
      });
    } else {
      doMonthChange("prev");
    }
  }
  function nextMonth() {
    if (hasDirtySalary()) {
      setConfirmDlg({
        title: "Є незбережені зміни зарплат",
        description: "При переході на інший місяць незбережені зміни буде втрачено. Продовжити?",
        confirmLabel: "Продовжити",
        action: () => doMonthChange("next"),
      });
    } else {
      doMonthChange("next");
    }
  }

  // ── Salary calculations ───────────────────────────────────────
  // ── Salary calculations (delegated to extracted utils) ───────
  const calcSalary = (form: SalaryFormState) => _calcSalary(form, data?.settings);
  const calcOwnerSalary = () => _calcOwnerSalary(data, selectedHiredDoctorId, selectedHiredNurseId);

  // ── Share owner report ─────────────────────────────────────────
  async function handleOwnerShare() {
    setShareLoading(true);
    try {
      const res = await api.post("/monthly-expenses/owner-share", {
        year,
        month,
        hired_doctor_id: selectedHiredDoctorId,
        hired_nurse_id: selectedHiredNurseId,
      });
      const shareUrl = `${window.location.origin}${res.data.url}`;
      setShareModal({
        open: true,
        url: shareUrl,
        expiresAt: new Date(res.data.expires_at).toLocaleDateString("uk-UA"),
      });
    } catch (e) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: "Помилка створення посилання" });
    }
    setShareLoading(false);
  }

  // ── Accountant request ────────────────────────────────────────
  async function handleAccountantRequest() {
    setAccReqLoading(true);
    try {
      const res = await api.post("/monthly-expenses/accountant-request", {
        year,
        month,
      });
      const accUrl = `${window.location.origin}${res.data.url}`;
      setAccReqModal({
        open: true,
        url: accUrl,
        expiresAt: new Date(res.data.expires_at).toLocaleDateString("uk-UA"),
      });
    } catch (e) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: "Помилка створення запиту до бухгалтера" });
    }
    setAccReqLoading(false);
  }

  // ── Dirty checks (delegated to extracted utils) ──────────────
  function isSalaryDirty(staffId: number, row: SalaryExpenseRow): boolean {
    return _isSalaryDirty(staffId, row, salaryForms
    );
  }

  // ── Delete fixed ────────────────────────────────────────────────
  function deleteFixed(id: number, name: string) {
    setConfirmDlg({
      title: `Видалити витрату «${name}»?`,
      variant: "danger",
      confirmLabel: "Видалити",
      action: async () => {
        try {
          await api.delete(`/monthly-expenses/fixed/${id}`);
          await load();
        } catch (e: any) {
          console.error(e);
          setAlertDlg({ title: "Помилка", description: e?.response?.data?.detail || "Не вдалося видалити витрату." });
        }
      },
    });
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

  // ── Fixed expense save ─────────────────────────────────────────
  async function saveFixed() {
    if (!fixedModal.name.trim()) return;
    const fixedAmount = parseFloat(fixedModal.amount) || 0;
    if (fixedAmount < 0) { setAlertDlg({ title: "Помилка", description: "Сума не може бути від'ємною." }); return; }
    setFixedModal(s => ({ ...s, saving: true }));
    try {
      if (!fixedModal.recurring) {
        if (fixedModal.isEdit && fixedModal.id != null) {
          await api.delete(`/monthly-expenses/fixed/${fixedModal.id}`);
        }
        await api.post("/monthly-expenses/other", {
          name: fixedModal.name,
          description: fixedModal.desc,
          amount: parseFloat(fixedModal.amount) || 0,
          category: "general",
          year,
          month,
        });
        setFixedModal(s => ({ ...s, open: false, saving: false }));
        await Promise.all([load(), loadOther()]);
      } else {
        if (fixedModal.isEdit && fixedModal.id != null) {
          await api.put(`/monthly-expenses/fixed/${fixedModal.id}`, {
            name: fixedModal.name,
            description: fixedModal.desc,
            amount: parseFloat(fixedModal.amount) || 0,
            is_recurring: fixedModal.recurring,
          });
        } else {
          await api.post("/monthly-expenses/fixed", {
            year, month,
            name: fixedModal.name,
            description: fixedModal.desc,
            amount: parseFloat(fixedModal.amount) || 0,
            is_recurring: fixedModal.recurring,
          });
        }
        setFixedModal(s => ({ ...s, open: false, saving: false }));
        await load();
      }
    } catch (e: any) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: e?.response?.data?.detail || "Не вдалося зберегти витрату. Спробуйте ще раз." });
      setFixedModal(s => ({ ...s, saving: false }));
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

  function deleteStaff(id: number, name: string) {
    setConfirmDlg({
      title: `Видалити співробітника «${name}»?`,
      description: "Дані місяця залишаться.",
      variant: "danger",
      confirmLabel: "Видалити",
      action: async () => {
        try {
          await api.delete(`/staff/${id}`);
          await Promise.all([loadStaff(), load()]);
        } catch (e) {
          console.error(e);
        }
      },
    });
  }

  // ── Other expenses CRUD ────────────────────────────────────────
  async function saveOther() {
    if (!otherModal.name.trim()) return;
    const otherAmount = parseFloat(otherModal.amount) || 0;
    if (otherAmount < 0) { setAlertDlg({ title: "Помилка", description: "Сума не може бути від'ємною." }); return; }
    setOtherModal(s => ({ ...s, saving: true }));
    try {
      const payload = {
        name:        otherModal.name,
        description: otherModal.desc,
        amount:      parseFloat(otherModal.amount) || 0,
        category:    "general",
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
    } catch (e: any) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: e?.response?.data?.detail || "Не вдалося зберегти витрату. Спробуйте ще раз." });
      setOtherModal(s => ({ ...s, saving: false }));
    }
  }

  function deleteOther(id: number, name: string) {
    setConfirmDlg({
      title: `Видалити витрату «${name}»?`,
      variant: "danger",
      confirmLabel: "Видалити",
      action: async () => {
        try {
          await api.delete(`/monthly-expenses/other/${id}`);
          await loadOther();
        } catch (e: any) {
          console.error(e);
          setAlertDlg({ title: "Помилка", description: e?.response?.data?.detail || "Не вдалося видалити витрату." });
        }
      },
    });
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

  function unlockPeriod() {
    setConfirmDlg({
      title: "Розблокувати місяць для редагування?",
      confirmLabel: "Розблокувати",
      action: async () => {
        setLockLoading(true);
        try {
          await api.delete("/monthly-expenses/lock", { params: { year, month } });
          await Promise.all([load(), loadPeriods()]);
        } catch (e) { console.error(e); }
        finally { setLockLoading(false); }
      },
    });
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
    if (r.category === "fixed") {
      try {
        await api.post("/monthly-expenses/fixed", {
          year, month, name: r.name, amount: r.amount, is_recurring: r.is_recurring,
        });
        await load();
      } catch (e) { console.error(e); }
    }
    setAiModal({ open: false, text: "", file: null, loading: false, result: null });
    setActiveDrawer("fixed");
  }

  // ── Per-section copy from previous month ────────────────────────
  function getPrevMonthLabel(): string {
    let pM = month - 1;
    let pY = year;
    if (pM < 1) { pM = 12; pY--; }
    return `${MONTH_NAMES[pM - 1]} ${pY}`;
  }

  function isPrevMonthLocked(): boolean {
    return prevMonthData?.is_locked === true;
  }

  function hasPrevFixed(): boolean {
    return (prevMonthData?.fixed?.length ?? 0) > 0 && prevMonthData!.fixed.some(r => r.amount > 0);
  }

  function hasPrevSalary(): boolean {
    return (prevMonthData?.salary?.length ?? 0) > 0 && prevMonthData!.salary.some(r => r.brutto > 0);
  }

  function hasPrevOther(): boolean {
    return prevOtherExpenses.length > 0;
  }

  async function copySectionFromPrev(section: "fixed" | "salary" | "other") {
    setSectionCopyLoading(s => ({ ...s, [section]: true }));
    let pY = year;
    let pM = month - 1;
    if (pM < 1) { pM = 12; pY--; }

    try {
      if (section === "fixed" || section === "salary") {
        await api.post("/monthly-expenses/copy-from", {
          source_year: pY,
          source_month: pM,
          target_year: year,
          target_month: month,
          copy_fixed: section === "fixed",
          copy_salary: section === "salary",
        });
        await load();
      } else {
        // Copy other expenses one by one (no backend bulk copy)
        for (const exp of prevOtherExpenses) {
          await api.post("/monthly-expenses/other", {
            name: exp.name,
            description: exp.description,
            amount: exp.amount,
            category: exp.category,
            year,
            month,
          });
        }
        await loadOther();
      }
      setSectionCopied(s => ({ ...s, [section]: true }));
    } catch (e) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: "Не вдалося перенести дані. Спробуйте ще раз." });
    } finally {
      setSectionCopyLoading(s => ({ ...s, [section]: false }));
    }
  }

  // ── Excel export (delegated to extracted utils) ─────────────
  function exportExcel() {
    if (!data) return;
    exportExpenseExcel(data, otherExpenses, otherTotal, grandWithOther, remaining, year, month);
  }

  // (inline export code has been moved to expenses/utils/excelExport.ts)

  // ── Derived data ──────────────────────────────────────────────
  const otherTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

  const detailRows: DetailRow[] = data
    ? (() => {
        const rows: DetailRow[] = [];

        // ── Постійні витрати
        for (const r of data.fixed.filter(r => r.amount > 0)) {
          rows.push({ name: r.name, category: "fixed", amount: r.amount });
        }

        // ── Власник ФОП (3 напрямки)
        if (data.owner) {
          const ownerCalc = calcOwnerSalary();
          if (ownerCalc.ownDeclarations > 0) {
            rows.push({
              name: `${data.owner.doctor_name} — Кошти за власні декларації`,
              category: "owner_own",
              amount: ownerCalc.ownDeclarations,
            });
          }
          if (ownerCalc.hiredDeclarations > 0) {
            rows.push({
              name: `${data.owner.doctor_name} — Кошти за декларації найм. лікаря`,
              category: "owner_hired",
              amount: ownerCalc.hiredDeclarations,
            });
          }
          if (ownerCalc.paidServices > 0) {
            rows.push({
              name: `${data.owner.doctor_name} — Платні послуги`,
              category: "owner_paid",
              amount: ownerCalc.paidServices,
            });
          }
        }

        // ── Зарплатні витрати (лікарі та персонал) з розбивкою на ЗП та Платні послуги
        for (const r of data.salary.filter(s => !s.is_owner)) {
          if (r.total_employer_cost > 0) {
            rows.push({
              name: `${r.full_name} — Заробітна плата (Витрати роботодавця)`,
              category: "salary",
              amount: r.total_employer_cost,
            });
          }
          if (r.paid_services_income > 0) {
            rows.push({
              name: `${r.full_name} — Платні послуги`,
              category: "salary_paid",
              amount: r.paid_services_income,
            });
          }
        }

        // ── Інші витрати
        for (const r of otherExpenses) {
          rows.push({ name: r.name, category: "other", amount: r.amount });
        }

        // ── Податки
        rows.push({ name: `ЄП (${data.taxes.ep_rate}%)`,   category: "taxes", amount: data.taxes.ep });
        rows.push({ name: `ВЗ (${data.taxes.vz_rate}%)`,   category: "taxes", amount: data.taxes.vz });
        rows.push({ name: "ЄСВ власника",                   category: "taxes", amount: data.taxes.esv_owner });
        rows.push({ name: `ЄСВ роботодавця (${data.settings.esv_employer_rate}%)`, category: "taxes", amount: data.taxes.esv_employer });

        return rows;
      })()
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
    <div className={`space-y-5 max-w-7xl mx-auto transition-[padding] duration-300 ${
      viewMode === "month" && data ? (expSidebarCollapsed ? "lg:pr-[80px]" : "lg:pr-[208px]") : ""
    }`}>

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <Wallet size={22} className="text-orange-400" />
          </div>
          <div className="text-center">
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
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { load(); loadOther(); loadPeriods(); }}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-dark-300 transition-all"
            title="Оновити"
            aria-label="Оновити дані"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          </button>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-dark-500/50 border border-dark-50/15 rounded-2xl p-1">
            <button
              onClick={() => { setViewMode("all"); setActiveDrawer(null); }}
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
              onClick={() => { setViewMode("month"); setActiveDrawer(null); }}
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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <BarChart3 size={13} className="text-orange-400" />Витрати по місяцях — {year}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 stagger-enter">
              {periods.map(p => (
                <button
                  key={p.month}
                  onClick={() => { setMonth(p.month); setViewMode("month"); }}
                  className={`card-neo card-tap p-4 text-left hover:border-accent-500/40 transition-all ${
                    p.month === month ? "border-accent-500/40" : ""
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

          {/* ═══ ANNUAL ANALYTICS ═══ */}
          {!annualLoading && annualMonths.some(m => m.total > 0) && (() => {
            const withData = annualMonths.filter(m => m.total > 0 || m.income > 0);
            const annualFixed = annualMonths.reduce((s, m) => s + m.fixed, 0);
            const annualSalary = annualMonths.reduce((s, m) => s + m.salary, 0);
            const annualTaxes = annualMonths.reduce((s, m) => s + m.taxes, 0);
            const annualOther = annualMonths.reduce((s, m) => s + m.other, 0);
            const annualTotal = annualFixed + annualSalary + annualTaxes + annualOther;
            const annualIncome = annualMonths.reduce((s, m) => s + m.income, 0);
            const annualRemaining = annualIncome - annualTotal;
            const avgPerMonth = withData.length > 0 ? annualTotal / withData.length : 0;
            const bestMonth = withData.length > 0 ? withData.reduce((best, m) => m.remaining > best.remaining ? m : best, withData[0]) : null;
            const worstMonth = withData.length > 0 ? withData.reduce((worst, m) => m.remaining < worst.remaining ? m : worst, withData[0]) : null;
            const forecast = avgPerMonth * 12;

            const annualPie = [
              { name: "Постійні", value: annualFixed },
              { name: "Зарплатні", value: annualSalary },
              { name: "Інші", value: annualOther },
              { name: "Податки", value: annualTaxes },
            ].filter(d => d.value > 0);

            const chartData = annualMonths.map(m => ({
              label: MONTH_SHORT[m.month - 1],
              fixed: m.fixed,
              salary: m.salary,
              other: m.other,
              taxes: m.taxes,
              total: m.total,
              income: m.income,
              remaining: m.remaining,
            }));

            // Cumulative data
            let cumFixed = 0, cumSalary = 0, cumOther = 0, cumTaxes = 0;
            const cumulativeData = annualMonths.map(m => {
              cumFixed += m.fixed;
              cumSalary += m.salary;
              cumOther += m.other;
              cumTaxes += m.taxes;
              return {
                label: MONTH_SHORT[m.month - 1],
                fixed: cumFixed,
                salary: cumSalary,
                other: cumOther,
                taxes: cumTaxes,
                total: cumFixed + cumSalary + cumOther + cumTaxes,
              };
            });

            return (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-2">
                  <Activity size={14} className="inline mr-1.5 -mt-0.5" />
                  Аналітика за {year} рік
                </p>

                {/* Annual KPI Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-enter">
                  <div className="card-neo p-3 space-y-1">
                    <p className="text-xs text-gray-500">Всього витрат</p>
                    <p className="font-bold text-white font-mono tabular-nums">{fmt(annualTotal)} ₴</p>
                  </div>
                  <div className="card-neo p-3 space-y-1">
                    <p className="text-xs text-gray-500">Загальний дохід</p>
                    <p className="font-bold text-emerald-400 font-mono tabular-nums">{fmt(annualIncome)} ₴</p>
                  </div>
                  <div className="card-neo p-3 space-y-1">
                    <p className="text-xs text-gray-500">Залишок</p>
                    <p className={`font-bold font-mono tabular-nums ${annualRemaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {annualRemaining >= 0 ? "+" : ""}{fmt(annualRemaining)} ₴
                    </p>
                  </div>
                  <div className="card-neo p-3 space-y-1">
                    <p className="text-xs text-gray-500">Середнє / міс.</p>
                    <p className="font-bold text-blue-400 font-mono tabular-nums">{fmt(avgPerMonth)} ₴</p>
                  </div>
                  <div className="card-neo p-3 space-y-1">
                    <p className="text-xs text-gray-500 flex items-center gap-1">Найкращий <ArrowUpRight size={10} className="text-emerald-400" /></p>
                    <p className="font-bold text-emerald-400 font-mono tabular-nums text-sm">
                      {bestMonth ? MONTH_NAMES[bestMonth.month - 1] : "—"}
                    </p>
                  </div>
                  <div className="card-neo p-3 space-y-1">
                    <p className="text-xs text-gray-500 flex items-center gap-1">Найгірший <ArrowDownRight size={10} className="text-red-400" /></p>
                    <p className="font-bold text-red-400 font-mono tabular-nums text-sm">
                      {worstMonth ? MONTH_NAMES[worstMonth.month - 1] : "—"}
                    </p>
                  </div>
                </div>

                {/* Charts Row 1: Income vs Expenses + Pie */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Line chart: Income vs Expenses */}
                  <div className="card-neo p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-orange-400" />Дохід vs Витрати
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${Math.round(v / 1000)}k`} />
                        <Tooltip contentStyle={TT_STYLE} formatter={(v: number, name: string) => [fmt(v) + " ₴", name]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="total" fill="#6366f1" name="Витрати" barSize={16} radius={[4, 4, 0, 0]} opacity={0.7} />
                        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} name="Дохід" dot={{ r: 3, fill: "#10b981" }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Annual Pie */}
                  <div className="card-neo p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <BarChart3 size={13} className="text-orange-400" />Структура витрат за рік
                    </p>
                    {annualPie.length > 0 ? (
                      <div className="flex items-center gap-4">
                        <ResponsiveContainer width="55%" height={220}>
                          <PieChart>
                            <Pie data={annualPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                              {annualPie.map((_, idx) => (
                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={TT_STYLE} formatter={(v: number) => [fmt(v) + " ₴"]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2.5">
                          {annualPie.map((entry, idx) => {
                            const pct = annualTotal > 0 ? Math.round(entry.value / annualTotal * 100) : 0;
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                <span className="text-xs text-gray-400 flex-1">{entry.name}</span>
                                <span className="text-xs font-mono text-gray-300">{pct}%</span>
                                <span className="text-xs font-mono text-gray-500">{fmt(entry.value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-gray-600 text-sm">Немає даних</div>
                    )}
                  </div>
                </div>

                {/* Charts Row 2: Stacked Categories + Cumulative Growth */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Stacked bar: categories */}
                  <div className="card-neo p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <BarChart3 size={13} className="text-orange-400" />Витрати за категоріями
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chartData} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${Math.round(v / 1000)}k`} />
                        <Tooltip contentStyle={TT_STYLE} formatter={(v: number, name: string) => [fmt(v) + " ₴", name]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="fixed" stackId="a" fill="#6366f1" name="Постійні" />
                        <Bar dataKey="salary" stackId="a" fill="#a855f7" name="Зарплатні" />
                        <Bar dataKey="other" stackId="a" fill="#f59e0b" name="Інші" />
                        <Bar dataKey="taxes" stackId="a" fill="#f43f5e" name="Податки" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Cumulative area chart */}
                  <div className="card-neo p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-orange-400" />Накопичувальні витрати
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={cumulativeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${Math.round(v / 1000)}k`} />
                        <Tooltip contentStyle={TT_STYLE} formatter={(v: number, name: string) => [fmt(v) + " ₴", name]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="fixed" stackId="1" fill="#6366f1" stroke="#6366f1" fillOpacity={0.3} name="Постійні" />
                        <Area type="monotone" dataKey="salary" stackId="1" fill="#a855f7" stroke="#a855f7" fillOpacity={0.3} name="Зарплатні" />
                        <Area type="monotone" dataKey="other" stackId="1" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.3} name="Інші" />
                        <Area type="monotone" dataKey="taxes" stackId="1" fill="#f43f5e" stroke="#f43f5e" fillOpacity={0.3} name="Податки" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Charts Row 3: Remaining trend + Forecast */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Remaining (profit/loss) by month */}
                  <div className="card-neo p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Wallet size={13} className="text-orange-400" />Залишок (дохід − витрати) по місяцях
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${Math.round(v / 1000)}k`} />
                        <Tooltip contentStyle={TT_STYLE} formatter={(v: number) => [fmt(v) + " ₴", "Залишок"]} />
                        <Bar dataKey="remaining" name="Залишок" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.remaining >= 0 ? "#10b981" : "#f43f5e"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Forecast card */}
                  <div className="card-neo p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      <Target size={13} className="inline mr-1.5 -mt-0.5" />
                      Прогноз на рік
                    </p>
                    <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-dark-400/30 rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Прогноз витрат</p>
                          <p className="font-bold text-lg text-white font-mono tabular-nums">{fmt(forecast)} ₴</p>
                          <p className="text-xs text-gray-600 mt-1">на базі {withData.length} міс.</p>
                        </div>
                        <div className="bg-dark-400/30 rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Факт / Прогноз</p>
                          <p className={`font-bold text-lg font-mono tabular-nums ${annualTotal <= forecast ? "text-emerald-400" : "text-red-400"}`}>
                            {forecast > 0 ? Math.round(annualTotal / forecast * 100) : 0}%
                          </p>
                          <p className="text-xs text-gray-600 mt-1">виконання</p>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { label: "Постійні / міс.", value: withData.length > 0 ? annualFixed / withData.length : 0, color: "text-blue-400" },
                          { label: "Зарплатні / міс.", value: withData.length > 0 ? annualSalary / withData.length : 0, color: "text-purple-400" },
                          { label: "Інші / міс.", value: withData.length > 0 ? annualOther / withData.length : 0, color: "text-amber-400" },
                          { label: "Податки / міс.", value: withData.length > 0 ? annualTaxes / withData.length : 0, color: "text-red-400" },
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{item.label}</span>
                            <span className={`font-mono tabular-nums ${item.color}`}>{fmt(item.value)} ₴</span>
                          </div>
                        ))}
                        <div className="border-t border-dark-50/10 pt-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-200 font-semibold">Разом / міс.</span>
                            <span className="font-mono font-bold text-white tabular-nums">{fmt(avgPerMonth)} ₴</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
              onClick={handleAccountantRequest}
              disabled={accReqLoading}
              aria-label="Запит до бухгалтера"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-400/60 border border-dark-50/15 text-gray-300 text-xs font-semibold hover:border-orange-500/30 hover:text-orange-300 transition-all disabled:opacity-50"
            >
              {accReqLoading ? <RefreshCw size={13} className="animate-spin" /> : <ClipboardList size={13} aria-hidden="true" />}
              Бухгалтеру
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-enter">
            <KpiCard
              label="Постійні"
              value={data.totals.fixed_total}
              color="bg-blue-500/15"
              icon={<TrendingDown size={14} className="text-blue-400" />}
              onClick={() => setKpiModal({ open: true, type: "fixed", title: "Постійні витрати — деталізація" })}
            />
            <KpiCard
              label="Зарплатні"
              value={data.totals.salary_total}
              color="bg-purple-500/15"
              icon={<Users size={14} className="text-purple-400" />}
              onClick={() => setKpiModal({ open: true, type: "salary", title: "Зарплатні витрати — деталізація" })}
            />
            <KpiCard
              label="Інші"
              value={otherTotal}
              color="bg-amber-500/15"
              icon={<Wallet size={14} className="text-amber-400" />}
              onClick={() => setKpiModal({ open: true, type: "other", title: "Інші витрати — деталізація" })}
            />
            <KpiCard
              label="Податки"
              value={data.totals.tax_total}
              color="bg-red-500/15"
              icon={<Receipt size={14} className="text-red-400" />}
              onClick={() => setKpiModal({ open: true, type: "taxes", title: "Податки — деталізація" })}
            />
            <KpiCard
              label="Всього"
              value={grandWithOther}
              color="bg-dark-400/60"
              icon={<BarChart3 size={14} className="text-gray-400" />}
              onClick={() => setKpiModal({ open: true, type: "total", title: "Всі витрати — деталізація" })}
            />
            <div
              className="card-neo kpi-3d-hover card-tap p-4 flex flex-col gap-2 cursor-pointer hover:border-accent-500/40 transition-all"
              onClick={() => setKpiModal({ open: true, type: "remaining", title: "Фінансовий результат" })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setKpiModal({ open: true, type: "remaining", title: "Фінансовий результат" }); }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Залишок</span>
                <div className="flex items-center gap-1.5">
                  <Eye size={11} className="text-gray-600" />
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    remaining >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"
                  }`}>
                    {remaining >= 0
                      ? <Check size={14} className="text-emerald-400" />
                      : <AlertCircle size={14} className="text-red-400" />
                    }
                  </div>
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

          {/* ═══ MOBILE: Expense Section Tabs (horizontal scroll) ═══ */}
          <div className="lg:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2.5 pb-2 min-w-max">
              {DRAWER_SECTIONS.map(sec => {
                const isActive = activeDrawer === sec.key;
                const value = sec.getValue();
                const filled = sec.getStatus();
                return (
                  <button
                    key={sec.key}
                    onClick={() => toggleDrawer(sec.key as DrawerSection)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-orange-400/60 text-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-95 tap-target ${
                      isActive
                        ? "bg-orange-500/20 text-white"
                        : "bg-dark-400/50 text-gray-300 hover:text-white hover:border-orange-400/80"
                    }`}
                    style={{ boxShadow: "0 0 14px rgba(249,115,22,0.45), 0 0 4px rgba(249,115,22,0.3)" }}
                  >
                    <span className={`shrink-0 ${isActive ? sec.color : "text-gray-400"}`}>{sec.icon}</span>
                    <span className="truncate">{sec.label}</span>
                    <span className={`flex items-center gap-1.5 ml-0.5 ${isActive ? sec.color : "text-gray-500"}`}>
                      <span className={`w-2 h-2 rounded-full ${filled ? "bg-emerald-400" : "bg-gray-600"}`} />
                      <span className="font-mono tabular-nums text-xs">
                        {sec.key === "summary" ? `${value >= 0 ? "+" : ""}${fmt(value)}` : fmt(value)} ₴
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ DETAIL TABLE ═══ */}
          {detailRows.length > 0 && (
            <div className="card-neo overflow-hidden">
              <div className="flex items-center justify-center gap-3 px-5 py-3 border-b border-dark-50/10 bg-dark-400/20">
                <BarChart3 size={15} className="text-gray-400" />
                <h3 className="font-semibold text-white text-sm text-center">
                  Деталізація витрат — {MONTH_NAMES[month - 1]} {year}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[520px]">
                  <thead>
                    <tr className="border-b border-dark-50/10 bg-dark-300/50">
                      <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Назва</th>
                      <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Категорія</th>
                      <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Сума</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-50/5">
                    {detailRows.map((row, idx) => {
                      const badge = CATEGORY_BADGE[row.category] ?? CATEGORY_BADGE.other;
                      return (
                        <tr key={idx} className="hover:bg-dark-300/30 transition-colors">
                          <td className="px-3 py-2.5 text-gray-200">{row.name}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-gray-200 tabular-nums">
                            {fmt(row.amount)} ₴
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-dark-50/15 bg-dark-300/50">
                    <tr>
                      <td colSpan={2} className="px-3 py-2.5 text-xs font-semibold text-gray-400">
                        Всього
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold font-mono text-white tabular-nums">
                        {fmt(detailRows.reduce((s, r) => s + r.amount, 0))} ₴
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ═══ FIXED RIGHT SIDEBAR: Expense Section Menu ═══ */}
          <aside
            className={`hidden lg:flex flex-col shrink-0
                        bg-dark-600 border-l border-dark-50/10
                        fixed right-0 top-0 h-screen z-30
                        expense-sidebar-transition
                        ${expSidebarCollapsed ? "expense-sidebar-collapsed" : "expense-sidebar-expanded"}`}
            aria-label="Розділи витрат"
          >
            {/* Sidebar header */}
            <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-dark-50/10 ${expSidebarCollapsed ? "justify-center" : ""}`}>
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <BarChart3 size={18} className="text-orange-400" />
              </div>
              {!expSidebarCollapsed && <span className="sidebar-label text-sm font-semibold text-gray-300 truncate">Витрати</span>}
            </div>

            {/* Expense nav items */}
            <nav className="flex-1 flex flex-col gap-1 py-3 px-2 overflow-y-auto">
              {DRAWER_SECTIONS.map(sec => {
                const isActive = activeDrawer === sec.key;
                const value = sec.getValue();
                const filled = sec.getStatus();
                return (
                  <button
                    key={sec.key}
                    onClick={() => toggleDrawer(sec.key as DrawerSection)}
                    title={expSidebarCollapsed ? `${sec.label} · ${fmt(value)} ₴` : undefined}
                    className={`expense-nav-item group ${expSidebarCollapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"} ${
                      isActive ? "expense-nav-active" : "expense-nav-inactive"
                    }`}
                  >
                    <span className={`expense-nav-icon ${isActive ? "expense-nav-icon-active" : "expense-nav-icon-idle"} ${
                      isActive ? sec.badgeColor : ""
                    }`}>
                      <span className={isActive ? sec.color : ""}>{sec.icon}</span>
                    </span>
                    {!expSidebarCollapsed && (
                      <div className="sidebar-label flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isActive ? "text-white" : "text-gray-400"}`}>
                          {sec.label}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${filled ? "bg-emerald-400" : "bg-gray-600"}`} />
                          <span className={`text-[10px] font-mono tabular-nums truncate ${isActive ? sec.color : "text-gray-600"}`}>
                            {sec.key === "summary" ? (
                              <>{value >= 0 ? "+" : ""}{fmt(value)} ₴</>
                            ) : (
                              <>{fmt(value)} ₴</>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Month indicator */}
            <div className={`px-4 py-3 border-t border-dark-50/10 ${expSidebarCollapsed ? "text-center" : ""}`}>
              {expSidebarCollapsed ? (
                <p className="text-[10px] text-gray-600 font-mono">{String(month).padStart(2, "0")}</p>
              ) : (
                <p className="sidebar-label text-xs text-gray-600 truncate">{MONTH_NAMES[month - 1]} {year}</p>
              )}
            </div>
          </aside>

          {/* ═══ MODAL OVERLAYS for each expense section ═══ */}

          {/* ── MODAL: ПОСТІЙНІ ВИТРАТИ ── */}
          {activeDrawer === "fixed" && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:flex-row sm:items-start sm:justify-center sm:p-4 overflow-hidden sm:overflow-y-auto modal-overlay" role="dialog" aria-modal="true" aria-label="Постійні витрати">
            <div className="absolute inset-0" onClick={() => setActiveDrawer(null)} />
            <div ref={sheetPanelRef} className={`relative bg-dark-600 sm:rounded-2xl shadow-2xl w-full flex flex-col sm:my-auto animate-modal-in ${sheetHeight >= 100 ? "flex-1 sm:flex-none sm:max-h-[90vh]" : "rounded-t-3xl"}`} style={sheetHeight < 100 ? { border: "1px solid #ffffff15", height: `${sheetHeight}vh`, maxWidth: "900px", transition: sheetDragRef.current ? "none" : "height 0.3s ease" } : { border: "1px solid #ffffff15", maxWidth: "900px" }}>
              {/* Drag handle (mobile) */}
              <div ref={dragHandleRef} className="sm:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing shrink-0 touch-none" onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
                <div className="w-12 h-1.5 rounded-full bg-white/50" />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <TrendingDown size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base text-center">Постійні витрати</h3>
                    <p className={`text-xs mt-0.5 ${data.fixed.some(r => r.amount > 0) ? "text-emerald-400" : "text-gray-600"}`}>
                      {data.fixed.some(r => r.amount > 0) ? "Заповнено" : "Не заповнено"} · {fmt(data.totals.fixed_total)} ₴
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFixedModal({
                      open: true, isEdit: false, id: null,
                      name: "", desc: "", amount: "", recurring: true, saving: false,
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500/15 text-accent-400 border border-accent-500/20 text-xs font-semibold hover:bg-accent-500/25 transition-all"
                  >
                    <Plus size={13} /> Додати
                  </button>
                  <button onClick={() => setActiveDrawer(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Закрити">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">

              {/* Copy from previous month prompt */}
              {data.fixed.length === 0 && !sectionCopied.fixed && prevMonthLoaded && (
                <div className="px-5 py-4 border-t border-dark-50/10 bg-dark-400/10">
                  {!prevMonthData || !hasPrevFixed() ? (
                    <p className="text-xs text-gray-600 text-center">Немає даних у попередньому місяці для перенесення.</p>
                  ) : !isPrevMonthLocked() ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">
                        Неможливо перенести дані з <strong>{getPrevMonthLabel()}</strong> — попередній місяць не зафіксовано.
                        Спочатку зафіксуйте попередній період.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-500/10 border border-accent-500/20">
                      <Copy size={15} className="text-accent-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-200">
                          Перенести постійні витрати з <strong className="text-white">{getPrevMonthLabel()}</strong>?
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {prevMonthData.fixed.filter(r => r.amount > 0).length} записів · {fmt(prevMonthData.totals.fixed_total)} ₴
                        </p>
                      </div>
                      <button
                        onClick={() => copySectionFromPrev("fixed")}
                        disabled={sectionCopyLoading.fixed}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {sectionCopyLoading.fixed ? <RefreshCw size={13} className="animate-spin" /> : <Copy size={13} />}
                        Перенести
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="divide-y divide-dark-50/5 border-t border-dark-50/10">
                {data.fixed.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-600 text-sm">
                    Ще немає постійних витрат. Натисніть «Додати витрату» щоб створити.
                  </div>
                ) : data.fixed.map((row) => (
                  <div key={row.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-dark-400/20 transition-colors">

                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-300 truncate block">{row.name}</span>
                      {row.description && (
                        <span className="text-xs text-gray-600 truncate block">{row.description}</span>
                      )}
                    </div>

                    {row.is_recurring && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/15 text-accent-400 border border-accent-500/20 shrink-0">
                        щомісячно
                      </span>
                    )}

                    {row.edited_by === "accountant" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20 shrink-0" title={row.edited_at ? `Оновлено: ${new Date(row.edited_at).toLocaleDateString("uk-UA")}` : undefined}>
                        Бухгалтер
                      </span>
                    )}

                    <span className="text-sm font-mono font-semibold text-white tabular-nums shrink-0 w-28 text-right">
                      {fmt(row.amount)} ₴
                    </span>

                    <button
                      onClick={() => {
                        setFixedModal({
                          open: true, isEdit: true, id: row.id,
                          name: row.name, desc: row.description || "",
                          amount: String(row.amount),
                          recurring: row.is_recurring, saving: false,
                        });
                      }}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all shrink-0"
                      title="Редагувати"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      onClick={() => deleteFixed(row.id, row.name)}
                      className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                      title="Видалити"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              </div>
              {/* Sticky footer — outside scrollable area */}
              <div className="flex items-center justify-between px-5 py-3 bg-dark-400/30 border-t border-dark-50/15 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={() => setFixedModal({
                    open: true, isEdit: false, id: null,
                    name: "", desc: "", amount: "", recurring: true, saving: false,
                  })}
                  className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                >
                  <Plus size={13} /> Додати витрату
                </button>
                <span className="font-bold text-blue-400 font-mono tabular-nums">{fmt(data.totals.fixed_total)} ₴</span>
              </div>
            </div>
          </div>
          )}

          {/* ── MODAL: ЗАРПЛАТНІ ВИТРАТИ ── */}
          {activeDrawer === "salary" && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:flex-row sm:items-start sm:justify-center sm:p-4 overflow-hidden sm:overflow-y-auto modal-overlay" role="dialog" aria-modal="true" aria-label="Зарплатні витрати">
            <div className="absolute inset-0" onClick={() => setActiveDrawer(null)} />
            <div ref={sheetPanelRef} className={`relative bg-dark-600 sm:rounded-2xl shadow-2xl w-full flex flex-col sm:my-auto animate-modal-in ${sheetHeight >= 100 ? "flex-1 sm:flex-none sm:max-h-[90vh]" : "rounded-t-3xl"}`} style={sheetHeight < 100 ? { border: "1px solid #ffffff15", height: `${sheetHeight}vh`, maxWidth: "900px", transition: sheetDragRef.current ? "none" : "height 0.3s ease" } : { border: "1px solid #ffffff15", maxWidth: "900px" }}>
              {/* Drag handle (mobile) */}
              <div ref={dragHandleRef} className="sm:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing shrink-0 touch-none" onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
                <div className="w-12 h-1.5 rounded-full bg-white/50" />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base text-center">Зарплатні витрати</h3>
                    <p className={`text-xs mt-0.5 ${data.salary.some(r => r.brutto > 0) ? "text-emerald-400" : "text-gray-600"}`}>
                      {data.salary.some(r => r.brutto > 0) ? "Заповнено" : "Не заповнено"} · {fmt(data.totals.salary_total)} ₴
                    </p>
                  </div>
                </div>
                <button onClick={() => setActiveDrawer(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Закрити">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
              <div className="border-t border-dark-50/10">

              {/* Copy from previous month prompt */}
              {!data.salary.some(r => r.brutto > 0) && !sectionCopied.salary && prevMonthLoaded && (
                <div className="px-5 py-4 bg-dark-400/10">
                  {!prevMonthData || !hasPrevSalary() ? (
                    <p className="text-xs text-gray-600 text-center">Немає зарплатних даних у попередньому місяці для перенесення.</p>
                  ) : !isPrevMonthLocked() ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">
                        Неможливо перенести дані з <strong>{getPrevMonthLabel()}</strong> — попередній місяць не зафіксовано.
                        Спочатку зафіксуйте попередній період.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-500/10 border border-accent-500/20">
                      <Copy size={15} className="text-accent-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-200">
                          Перенести зарплатні дані з <strong className="text-white">{getPrevMonthLabel()}</strong>?
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {prevMonthData.salary.filter(r => r.brutto > 0).length} співробітників · {fmt(prevMonthData.totals.salary_total)} ₴
                        </p>
                      </div>
                      <button
                        onClick={() => copySectionFromPrev("salary")}
                        disabled={sectionCopyLoading.salary}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {sectionCopyLoading.salary ? <RefreshCw size={13} className="animate-spin" /> : <Copy size={13} />}
                        Перенести
                      </button>
                    </div>
                  )}
                </div>
              )}

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
                        <MedFlowLogo size={13} className="text-orange-400" />
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
                                <div className="ml-auto flex items-center gap-2">
                                  <button
                                    onClick={handleOwnerShare}
                                    disabled={shareLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-500/10 text-accent-400 border border-accent-500/20 hover:bg-accent-500/20 transition-all disabled:opacity-50"
                                    title="Поділитись звітом"
                                  >
                                    {shareLoading ? (
                                      <div className="w-3.5 h-3.5 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
                                    ) : (
                                      <Share2 size={13} />
                                    )}
                                    Поділитись
                                  </button>
                                  <span className="font-bold text-amber-400 font-mono tabular-nums">
                                    {fmt(ownerCalc.total)} ₴
                                  </span>
                                </div>
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
                              {/* Заголовок рядка (клікабельний для collapse/expand) */}
                              <div className="flex items-start justify-between mb-4 gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleSalaryExpand(row.staff_member_id)}
                                  className="flex items-center gap-2 text-left group min-w-0"
                                >
                                  <ChevronRight size={14} className={`text-gray-600 transition-transform duration-200 shrink-0 mt-0.5 ${expandedSalary.has(row.staff_member_id) ? "rotate-90" : ""}`} />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-white text-sm group-hover:text-purple-300 transition-colors truncate">{row.full_name}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="inline-block px-2 py-0.5 text-xs rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                        Лікар
                                    </span>
                                    {row.edited_by === "accountant" && (
                                      <span className="inline-block px-2 py-0.5 text-xs rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" title={row.edited_at ? `Оновлено бухгалтером: ${new Date(row.edited_at).toLocaleDateString("uk-UA")}` : undefined}>
                                        Бухгалтер
                                      </span>
                                    )}
                                    </div>
                                  </div>
                                </button>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
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
                                    className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 transition-all flex items-center justify-center"
                                    title="Редагувати"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteStaff(row.staff_member_id, row.full_name); }}
                                    className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center"
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

                              {/* Деталі (collapsible) */}
                              {expandedSalary.has(row.staff_member_id) && (<>
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
                                  {row.paid_services_income > 0 && (
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
                              </>)}
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
                        <HeartPulse size={13} className="text-orange-400" />
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
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="inline-block px-2 py-0.5 text-xs rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                                      {ROLE_LABELS[row.role] ?? row.role}
                                    </span>
                                    {row.edited_by === "accountant" && (
                                      <span className="inline-block px-2 py-0.5 text-xs rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" title={row.edited_at ? `Оновлено бухгалтером: ${new Date(row.edited_at).toLocaleDateString("uk-UA")}` : undefined}>
                                        Бухгалтер
                                      </span>
                                    )}
                                  </div>
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

              </div>
              </div>
              {/* Sticky footer — outside scrollable area */}
              <div className="flex items-center justify-between px-5 py-3 bg-dark-400/30 border-t border-dark-50/15 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <span className="text-xs text-gray-600">Персонал налаштовується в розділі Налаштування</span>
                <span className="font-bold text-purple-400 font-mono tabular-nums">{fmt(data.totals.salary_total)} ₴</span>
              </div>
            </div>
          </div>
          )}

          {/* ── MODAL: ІНШІ ВИТРАТИ ── */}
          {activeDrawer === "other" && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:flex-row sm:items-start sm:justify-center sm:p-4 overflow-hidden sm:overflow-y-auto modal-overlay" role="dialog" aria-modal="true" aria-label="Інші витрати">
            <div className="absolute inset-0" onClick={() => setActiveDrawer(null)} />
            <div ref={sheetPanelRef} className={`relative bg-dark-600 sm:rounded-2xl shadow-2xl w-full flex flex-col sm:my-auto animate-modal-in ${sheetHeight >= 100 ? "flex-1 sm:flex-none sm:max-h-[90vh]" : "rounded-t-3xl"}`} style={sheetHeight < 100 ? { border: "1px solid #ffffff15", height: `${sheetHeight}vh`, maxWidth: "900px", transition: sheetDragRef.current ? "none" : "height 0.3s ease" } : { border: "1px solid #ffffff15", maxWidth: "900px" }}>
              {/* Drag handle (mobile) */}
              <div ref={dragHandleRef} className="sm:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing shrink-0 touch-none" onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
                <div className="w-12 h-1.5 rounded-full bg-white/50" />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Wallet size={16} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base text-center">Інші витрати</h3>
                    <p className={`text-xs mt-0.5 ${otherExpenses.length > 0 ? "text-emerald-400" : "text-gray-600"}`}>
                      {otherExpenses.length > 0 ? "Заповнено" : "Не заповнено"} · {fmt(otherTotal)} ₴
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOtherModal({
                      open: true, isEdit: false, id: null,
                      name: "", desc: "", amount: "", saving: false,
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500/15 text-accent-400 border border-accent-500/20 text-xs font-semibold hover:bg-accent-500/25 transition-all"
                  >
                    <Plus size={13} /> Додати
                  </button>
                  <button onClick={() => setActiveDrawer(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Закрити">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
              <div className="border-t border-dark-50/10">

              {/* Copy from previous month prompt */}
              {otherExpenses.length === 0 && !sectionCopied.other && prevMonthLoaded && !otherLoading && (
                <div className="px-5 py-4 bg-dark-400/10">
                  {!hasPrevOther() ? (
                    <p className="text-xs text-gray-600 text-center">Немає інших витрат у попередньому місяці для перенесення.</p>
                  ) : !isPrevMonthLocked() ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">
                        Неможливо перенести дані з <strong>{getPrevMonthLabel()}</strong> — попередній місяць не зафіксовано.
                        Спочатку зафіксуйте попередній період.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-500/10 border border-accent-500/20">
                      <Copy size={15} className="text-accent-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-200">
                          Перенести інші витрати з <strong className="text-white">{getPrevMonthLabel()}</strong>?
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {prevOtherExpenses.length} записів · {fmt(prevOtherExpenses.reduce((s, e) => s + e.amount, 0))} ₴
                        </p>
                      </div>
                      <button
                        onClick={() => copySectionFromPrev("other")}
                        disabled={sectionCopyLoading.other}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {sectionCopyLoading.other ? <RefreshCw size={13} className="animate-spin" /> : <Copy size={13} />}
                        Перенести
                      </button>
                    </div>
                  )}
                </div>
              )}

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
                      <span className="font-mono text-sm text-gray-200 shrink-0 tabular-nums">{fmt(exp.amount)} ₴</span>
                      <button
                        onClick={() => setOtherModal({
                          open: true, isEdit: true, id: exp.id,
                          name: exp.name, desc: exp.description, amount: String(exp.amount),
                          saving: false,
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

              </div>
              </div>
              {/* Sticky footer — outside scrollable area */}
              <div className="flex items-center justify-between px-5 py-3 bg-dark-400/30 border-t border-dark-50/15 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={() => setOtherModal({
                    open: true, isEdit: false, id: null,
                    name: "", desc: "", amount: "", saving: false,
                  })}
                  className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                >
                  <Plus size={13} /> Додати витрату
                </button>
                <span className="font-bold text-amber-400 font-mono tabular-nums">{fmt(otherTotal)} ₴</span>
              </div>
            </div>
          </div>
          )}

          {/* ── MODAL: ПОДАТКИ ── */}
          {activeDrawer === "taxes" && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:flex-row sm:items-start sm:justify-center sm:p-4 overflow-hidden sm:overflow-y-auto modal-overlay" role="dialog" aria-modal="true" aria-label="Податки">
            <div className="absolute inset-0" onClick={() => setActiveDrawer(null)} />
            <div ref={sheetPanelRef} className={`relative bg-dark-600 sm:rounded-2xl shadow-2xl w-full flex flex-col sm:my-auto animate-modal-in ${sheetHeight >= 100 ? "flex-1 sm:flex-none sm:max-h-[90vh]" : "rounded-t-3xl"}`} style={sheetHeight < 100 ? { border: "1px solid #ffffff15", height: `${sheetHeight}vh`, maxWidth: "900px", transition: sheetDragRef.current ? "none" : "height 0.3s ease" } : { border: "1px solid #ffffff15", maxWidth: "900px" }}>
              {/* Drag handle (mobile) */}
              <div ref={dragHandleRef} className="sm:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing shrink-0 touch-none" onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
                <div className="w-12 h-1.5 rounded-full bg-white/50" />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                    <Receipt size={16} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base text-center">Податки</h3>
                    <p className={`text-xs mt-0.5 ${data.totals.tax_total > 0 ? "text-emerald-400" : "text-gray-600"}`}>
                      {data.totals.tax_total > 0 ? "Заповнено" : "Не заповнено"} · {fmt(data.totals.tax_total)} ₴
                    </p>
                  </div>
                </div>
                <button onClick={() => setActiveDrawer(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Закрити">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
              <div className="px-5 py-4 space-y-3 border-t border-dark-50/10">
                <div className="bg-dark-400/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Banknote size={13} className="text-orange-400" />Джерела доходу</p>
                  <TaxRow label="Дохід НСЗУ"    value={data.taxes.nhsu_income} />
                  <TaxRow label="Платні послуги" value={data.taxes.paid_services_income} />
                  <div className="border-t border-dark-50/10 pt-2">
                    <TaxRow label="Загальний дохід" value={data.taxes.total_income} bold />
                  </div>
                </div>

                <div className="bg-dark-400/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Receipt size={13} className="text-orange-400" />Нараховані податки</p>
                  <TaxRow label={`ЄП (${data.taxes.ep_rate}%)`}          value={data.taxes.ep} />
                  <TaxRow label={`ВЗ від доходу (${data.taxes.vz_rate}%)`} value={data.taxes.vz} />
                  <TaxRow label="ЄСВ власника (щомісячно)"               value={data.taxes.esv_owner} />
                  <TaxRow label={`ЄСВ роботодавця (${data.settings.esv_employer_rate}%)`} value={data.taxes.esv_employer} />
                  <div className="border-t border-dark-50/10 pt-2">
                    <TaxRow label="Разом податки" value={data.totals.tax_total} bold color="text-red-400" />
                  </div>
                </div>

                <div className="bg-dark-400/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Activity size={13} className="text-orange-400" />Ставки</p>
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
              </div>
            </div>
          </div>
          )}

          {/* ── MODAL: ПІДСУМКИ ── */}
          {activeDrawer === "summary" && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:flex-row sm:items-start sm:justify-center sm:p-4 overflow-hidden sm:overflow-y-auto modal-overlay" role="dialog" aria-modal="true" aria-label="Підсумки">
            <div className="absolute inset-0" onClick={() => setActiveDrawer(null)} />
            <div ref={sheetPanelRef} className={`relative bg-dark-600 sm:rounded-2xl shadow-2xl w-full flex flex-col sm:my-auto animate-modal-in ${sheetHeight >= 100 ? "flex-1 sm:flex-none sm:max-h-[90vh]" : "rounded-t-3xl"}`} style={sheetHeight < 100 ? { border: "1px solid #ffffff15", height: `${sheetHeight}vh`, maxWidth: "900px", transition: sheetDragRef.current ? "none" : "height 0.3s ease" } : { border: "1px solid #ffffff15", maxWidth: "900px" }}>
              {/* Drag handle (mobile) */}
              <div ref={dragHandleRef} className="sm:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing shrink-0 touch-none" onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
                <div className="w-12 h-1.5 rounded-full bg-white/50" />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base text-center">
                      Підсумки — {MONTH_NAMES[month - 1]} {year}
                    </h3>
                    <p className={`text-xs mt-0.5 ${grandWithOther > 0 ? "text-emerald-400" : "text-gray-600"}`}>
                      {grandWithOther > 0 ? "Заповнено" : "Не заповнено"} · Залишок: {remaining >= 0 ? "+" : ""}{fmt(remaining)} ₴
                    </p>
                  </div>
                </div>
                <button onClick={() => setActiveDrawer(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Закрити">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
              <div className="px-5 py-5 space-y-2.5 border-t border-dark-50/10">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-orange-400" />Структура витрат
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
              </div>
            </div>
          </div>
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
          onSave={saveFixed}
          saveDisabled={!fixedModal.name.trim()}
          saving={fixedModal.saving}
          footer={
            <div className="flex gap-3">
              <button
                onClick={() => setFixedModal(s => ({ ...s, open: false }))}
                className="flex-1 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 hover:text-white text-sm transition-all"
              >
                Скасувати
              </button>
              <button
                onClick={saveFixed}
                disabled={fixedModal.saving || !fixedModal.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {fixedModal.saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Зберегти
              </button>
            </div>
          }
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
        </Modal>
      )}

      {/* ── Staff modal ── */}
      {staffModal.open && (
        <Modal
          title={staffModal.isEdit ? "Редагувати співробітника" : "Додати співробітника"}
          onClose={() => setStaffModal(s => ({ ...s, open: false }))}
          onSave={saveStaff}
          saveDisabled={!staffModal.fullName.trim()}
          saving={staffModal.saving}
          footer={
            <div className="flex gap-3">
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
          }
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
        </Modal>
      )}

      {/* ── Copy-from modal ── */}
      {copyModal.open && (
        <Modal
          title="Копіювати дані з попереднього місяця"
          onClose={() => setCopyModal(s => ({ ...s, open: false }))}
          footer={
            <div className="flex gap-3">
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
          }
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
        </Modal>
      )}

      {/* ── AI parse modal ── */}
      {aiModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:flex-row sm:items-start sm:justify-center sm:p-4 overflow-hidden sm:overflow-y-auto modal-overlay" role="dialog" aria-modal="true" aria-label="AI-аналіз витрати">
          <div className="absolute inset-0" onClick={() => setAiModal({ open: false, text: "", file: null, loading: false, result: null })} />
          <div
            className="relative bg-dark-600 rounded-t-3xl sm:rounded-2xl w-full max-w-lg sm:my-auto modal-glow expense-sheet-modal pb-[env(safe-area-inset-bottom)]"
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
                        <p className="text-white font-medium">{aiModal.result.category === "fixed" ? "Постійна витрата" : "Інша витрата"}</p>
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

      {/* ── KPI Detail modal (85% screen) ── */}
      {kpiModal.open && data && (() => {
        type ModalRow = { name: string; detail?: string; amount: number };
        let rows: ModalRow[] = [];
        let totalLabel = "Всього";
        let totalValue = 0;

        switch (kpiModal.type) {
          case "fixed":
            rows = data.fixed.filter(r => r.amount > 0).map(r => ({
              name: r.name,
              detail: r.is_recurring ? "Постійна" : "Разова",
              amount: r.amount,
            }));
            totalValue = data.totals.fixed_total;
            break;
          case "salary":
            rows = data.salary.map(r => ({
              name: r.full_name,
              detail: `${ROLE_LABELS[r.role] ?? r.role} · Брутто: ${fmt(r.brutto)} · ЄСВ: ${fmt(r.esv)}${r.supplement > 0 ? ` · Доплата: ${fmt(r.supplement)}` : ""}${r.individual_bonus > 0 ? ` · Бонус: ${fmt(r.individual_bonus)}` : ""}${r.paid_services_income > 0 ? ` · Платні послуги: ${fmt(r.paid_services_income)}` : ""}`,
              amount: r.total_employer_cost,
            }));
            totalValue = data.totals.salary_total;
            break;
          case "other":
            rows = otherExpenses.map(r => ({
              name: r.name,
              detail: r.description || "",
              amount: r.amount,
            }));
            totalValue = otherTotal;
            break;
          case "taxes":
            rows = [
              { name: `Єдиний податок (${data.taxes.ep_rate}%)`, detail: `від доходу ${fmt(data.taxes.total_income)} ₴`, amount: data.taxes.ep },
              { name: `Військовий збір (${data.taxes.vz_rate}%)`, detail: `від доходу ${fmt(data.taxes.total_income)} ₴`, amount: data.taxes.vz },
              { name: "ЄСВ власника", detail: "Фіксований щомісячний", amount: data.taxes.esv_owner },
              { name: `ЄСВ роботодавця (${data.settings.esv_employer_rate}%)`, detail: "Від зарплатного фонду", amount: data.taxes.esv_employer },
            ];
            totalValue = data.totals.tax_total;
            break;
          case "total":
            rows = [
              ...data.fixed.filter(r => r.amount > 0).map(r => ({
                name: r.name, detail: "Постійні", amount: r.amount,
              })),
              ...data.salary.map(r => ({
                name: r.full_name, detail: `Зарплатні · ${ROLE_LABELS[r.role] ?? r.role}`, amount: r.total_employer_cost,
              })),
              ...otherExpenses.map(r => ({
                name: r.name, detail: "Інші", amount: r.amount,
              })),
              { name: `ЄП (${data.taxes.ep_rate}%)`, detail: "Податки", amount: data.taxes.ep },
              { name: `ВЗ (${data.taxes.vz_rate}%)`, detail: "Податки", amount: data.taxes.vz },
              { name: "ЄСВ власника", detail: "Податки", amount: data.taxes.esv_owner },
              { name: `ЄСВ роботодавця (${data.settings.esv_employer_rate}%)`, detail: "Податки", amount: data.taxes.esv_employer },
            ];
            totalValue = grandWithOther;
            break;
          case "remaining":
            totalLabel = "Залишок";
            rows = [
              { name: "Дохід НСЗУ", detail: "Дохід", amount: data.taxes.nhsu_income },
              { name: "Платні послуги", detail: "Дохід", amount: data.taxes.paid_services_income },
              { name: "Постійні витрати", detail: "Витрати", amount: -data.totals.fixed_total },
              { name: "Зарплатні витрати", detail: "Витрати", amount: -data.totals.salary_total },
              { name: "Інші витрати", detail: "Витрати", amount: -otherTotal },
              { name: "Податки", detail: "Витрати", amount: -data.totals.tax_total },
            ];
            totalValue = remaining;
            break;
        }

        const handleExportKpiExcel = () => exportKpiExcel(rows, totalLabel, totalValue, kpiModal.title, kpiModal.type, year, month);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:flex-row sm:items-start sm:justify-center sm:p-4 overflow-hidden sm:overflow-y-auto modal-overlay" role="dialog" aria-modal="true" aria-label={kpiModal.title}>
            <div className="absolute inset-0" onClick={() => setKpiModal({ open: false, type: "", title: "" })} />
            <div
              className="relative bg-dark-600 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full flex flex-col sm:my-auto expense-sheet-modal pb-[env(safe-area-inset-bottom)]"
              style={{ border: "1px solid #ffffff15", maxHeight: "92vh", maxWidth: "900px" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <h4 className="font-semibold text-white text-base">{kpiModal.title}</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportKpiExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
                  >
                    <FileSpreadsheet size={13} /> Excel
                  </button>
                  <button
                    onClick={() => setKpiModal({ open: false, type: "", title: "" })}
                    aria-label="Закрити"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {/* Sub-header */}
              <div className="px-6 py-2 border-b border-dark-50/10 bg-dark-400/20 shrink-0">
                <p className="text-xs text-gray-500">
                  {MONTH_NAMES[month - 1]} {year} · {rows.length} записів
                </p>
              </div>
              {/* Table */}
              <div className="overflow-y-auto flex-1">
                <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[520px]">
                  <thead className="sticky top-0 bg-dark-600 z-10">
                    <tr className="border-b border-dark-50/10 bg-dark-300/50">
                      <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Назва</th>
                      <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Деталі</th>
                      <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Сума</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-50/5">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-dark-300/30 transition-colors">
                        <td className="px-3 py-2.5 text-gray-200">{row.name}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{row.detail}</td>
                        <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${row.amount < 0 ? "text-red-400" : "text-gray-200"}`}>
                          {row.amount < 0 ? "−" : ""}{fmt(Math.abs(row.amount))} ₴
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-dark-50/15 bg-dark-300/50">
                    <tr>
                      <td colSpan={2} className="px-3 py-2.5 text-xs font-semibold text-gray-300">{totalLabel}</td>
                      <td className={`px-3 py-2.5 text-right font-bold font-mono tabular-nums text-lg ${
                        kpiModal.type === "remaining" ? (totalValue >= 0 ? "text-emerald-400" : "text-red-400") : "text-white"
                      }`}>
                        {kpiModal.type === "remaining" && totalValue >= 0 ? "+" : ""}{totalValue < 0 ? "−" : ""}{fmt(Math.abs(totalValue))} ₴
                      </td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Other expense modal ── */}
      {otherModal.open && (
        <Modal
          title={otherModal.isEdit ? "Редагувати витрату" : "Додати витрату"}
          onClose={() => setOtherModal(s => ({ ...s, open: false }))}
          onSave={saveOther}
          saveDisabled={!otherModal.name.trim()}
          saving={otherModal.saving}
          footer={
            <div className="flex gap-3">
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
          }
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
        </Modal>
      )}

      {/* ── Accountant request modal (extracted to ShareLinkModal) ── */}
      <ShareLinkModal
        open={accReqModal.open}
        onClose={() => setAccReqModal({ open: false, url: "", expiresAt: "" })}
        url={accReqModal.url}
        expiresAt={accReqModal.expiresAt}
        icon={<ClipboardList size={18} className="text-orange-400" />}
        title="Запит до бухгалтера створено"
        description="Надішліть це посилання бухгалтеру. Сторінка доступна 15 днів"
        accentClass="orange"
      />

      {/* ── Share modal (extracted to ShareLinkModal) ── */}
      <ShareLinkModal
        open={shareModal.open}
        onClose={() => setShareModal({ open: false, url: "", expiresAt: "" })}
        url={shareModal.url}
        expiresAt={shareModal.expiresAt}
        icon={<Share2 size={18} className="text-accent-400" />}
        title="Посилання створено"
        description="Сторінка доступна для перегляду без авторизації протягом 30 днів"
        accentClass="accent"
      />

      {/* ── Styled confirm dialog (replaces native confirm()) ── */}
      <ConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        description={confirmDlg?.description}
        variant={confirmDlg?.variant ?? "default"}
        confirmLabel={confirmDlg?.confirmLabel ?? "Підтвердити"}
        onConfirm={() => { confirmDlg?.action(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />

      {/* ── Styled alert dialog (replaces native alert()) ── */}
      <ConfirmDialog
        open={!!alertDlg}
        title={alertDlg?.title ?? ""}
        description={alertDlg?.description}
        confirmLabel="Зрозуміло"
        cancelLabel="Закрити"
        onConfirm={() => setAlertDlg(null)}
        onCancel={() => setAlertDlg(null)}
      />
    </div>
  );
}
