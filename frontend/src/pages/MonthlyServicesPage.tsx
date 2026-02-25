import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import {
  BarChart3,
  Plus,
  Trash2,
  Pencil,
  Download,
  Share2,
  RefreshCw,
  X,
  Lock,
  Unlock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Banknote,
  Wallet,
  Landmark,

  TrendingUp,
  TrendingDown,
  Package,
  Copy,
  AlertCircle,
  Upload,
  Sparkles,
  CheckCircle2,
  FileImage,
  ClipboardList,
  Users,
} from "lucide-react";
import { LoadingSpinner, ConfirmDialog, AlertBanner } from "../components/shared";
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
import type {
  AnalyticsData,
  Doctor,
  MonthReport,
  Service,
  ServiceTableRow,
  ShareResponse,
} from "../types";

const MONTHS_UA = [
  "", "Січень", "Лютий", "Березень", "Квітень",
  "Травень", "Червень", "Липень", "Серпень",
  "Вересень", "Жовтень", "Листопад", "Грудень",
];
const PIE_COLORS = ["#60a5fa", "#f97316", "#ef4444"];

const fmt = (v: number) =>
  v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (cur: number, prev: number) => {
  if (!prev) return cur > 0 ? "+100%" : "—";
  const d = ((cur - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
};

export default function MonthlyServicesPage() {
  const now = new Date();

  // ── Фільтри ──
  const [selectedDoctor, setSelectedDoctor] = useState<number | 0>(0);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  // ── Дані ──
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [catalogServices, setCatalogServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Сортування таблиці ──
  const [sortField, setSortField] = useState<keyof ServiceTableRow>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Модалки ──
  const [showReportForm, setShowReportForm] = useState(false);
  const [editingReport, setEditingReport] = useState<MonthReport | null>(null);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [deleteReportId, setDeleteReportId] = useState<number | null>(null);
  const [finalizeWarningId, setFinalizeWarningId] = useState<number | null>(null);
  const [alertDlg, setAlertDlg] = useState<{ title: string; description?: string } | null>(null);

  // ── Форма звіту ──
  const [formDoctor, setFormDoctor] = useState<number>(0);
  const [formCash, setFormCash] = useState("");
  const [formEntries, setFormEntries] = useState<Record<number, number>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [cashWarning, setCashWarning] = useState("");

  // ── Готівка в касі (per-period) ──
  interface PeriodInfo {
    last_active_doctor_id: number | null;
    cash_for_period: number | null;
    submitted_doctor_ids: number[];
  }
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null);

  // ── AI-аналіз зображень ──
  interface AiImage { file: File; preview: string; analyzed: boolean; error?: string }
  const [aiImages, setAiImages] = useState<AiImage[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [aiStatus, setAiStatus] = useState<"idle" | "analyzing" | "done" | "partial" | "error">("idle");
  const [aiFilledEntries, setAiFilledEntries] = useState<Set<number>>(new Set());
  const [aiUnmatched, setAiUnmatched] = useState<{name: string; quantity: number}[]>([]);
  const aiFileRef = useRef<HTMLInputElement>(null);

  // ── Завантаження ──
  useEffect(() => {
    loadDoctors();
    loadCatalogServices();
  }, []);
  useEffect(() => { loadAnalytics(); }, [selectedDoctor, selectedYear, selectedMonth]);
  useEffect(() => { loadPeriodInfo(); }, [selectedYear, selectedMonth]);

  async function loadDoctors() {
    try {
      const r = await api.get("/nhsu/doctors");
      setDoctors(r.data);
    } catch {}
  }

  async function loadCatalogServices() {
    try {
      const r = await api.get("/services/");
      const sorted = (r.data as Service[]).sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
      );
      setCatalogServices(sorted);
    } catch {}
  }

  async function loadPeriodInfo(): Promise<PeriodInfo | null> {
    try {
      const r = await api.get("/monthly-services/period-info", {
        params: { year: selectedYear, month: selectedMonth },
      });
      setPeriodInfo(r.data);
      return r.data as PeriodInfo;
    } catch {
      return null;
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    try {
      const params: Record<string, any> = { year: selectedYear, month: selectedMonth };
      if (selectedDoctor) params.doctor_id = selectedDoctor;
      const r = await api.get("/monthly-services/analytics", { params });
      setAnalytics(r.data);
    } catch {}
    setLoading(false);
  }

  // ── Helpers ──
  const d = analytics?.dashboard;
  const isEndOfMonth = (() => {
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return now.getDate() >= last - 3;
  })();
  const hasReportsThisMonth =
    analytics?.reports?.some(
      (r) => r.year === now.getFullYear() && r.month === now.getMonth() + 1
    ) ?? false;

  // ── Сортування таблиці ──
  const sortedTable = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.services_table].sort((a, b) => {
      const av = a[sortField] as number | string;
      const bv = b[sortField] as number | string;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [analytics, sortField, sortDir]);

  function handleSort(field: keyof ServiceTableRow) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  function SortIcon({ field }: { field: keyof ServiceTableRow }) {
    if (sortField !== field) return <ArrowUpDown size={11} className="ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp size={11} className="ml-1 text-accent-400" />
      : <ArrowDown size={11} className="ml-1 text-accent-400" />;
  }

  // ── AI-зображення ──
  const handleAiFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    setAiImages(p => [...p, ...arr.map(f => ({ file: f, preview: URL.createObjectURL(f), analyzed: false }))]);
  };
  const removeAiImage = (i: number) => setAiImages(p => { URL.revokeObjectURL(p[i].preview); return p.filter((_, idx) => idx !== i); });

  const analyzeAiImages = async () => {
    if (!aiImages.length) return;
    setAiAnalyzing(true);
    setAiStatus("analyzing");
    setAiResult("Розпізнавання…");
    setAiUnmatched([]);
    try {
      const fd = new FormData();
      aiImages.forEach(img => fd.append("images", img.file));
      const { data } = await api.post("/monthly-services/analyze-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const res = data.results?.[0];
      if (!res) throw new Error("Порожня відповідь");
      if (res.error) { setAiResult(`Помилка: ${res.error}`); setAiStatus("error"); return; }

      // Заповнюємо готівку
      if (res.cash_in_register > 0) setFormCash(String(res.cash_in_register));

      // Заповнюємо послуги та відстежуємо AI-заповнені
      const filledIds = new Set<number>();
      if (res.entries?.length) {
        setFormEntries(prev => {
          const next = { ...prev };
          for (const e of res.entries) {
            next[e.service_id] = (next[e.service_id] || 0) + e.quantity;
            filledIds.add(e.service_id);
          }
          return next;
        });
      }
      setAiFilledEntries(filledIds);

      // Незіставлені послуги: ті з raw_services, яких немає у entries
      const matchedCount = res.entries?.length ?? 0;
      const rawServices: {name: string; quantity: number}[] = res.raw_services ?? [];
      const matchedNames = new Set((res.entries ?? []).map((_: any, i: number) => rawServices[i]?.name?.toLowerCase()));
      const unmatched = rawServices.filter(s => !matchedNames.has(s.name?.toLowerCase()));
      setAiUnmatched(unmatched);

      // Лікар
      if (res.doctor_name && doctors.length) {
        const match = doctors.find(d => d.full_name.toLowerCase().includes(res.doctor_name.toLowerCase()));
        if (match) setFormDoctor(match.id);
      }

      setAiImages(p => p.map(img => ({ ...img, analyzed: true })));
      const total = rawServices.length;
      const confidence = res.confidence ?? "low";
      const pct = total ? Math.round((matchedCount / total) * 100) : 0;

      if (confidence === "low" || pct < 50) {
        setAiStatus("partial");
        setAiResult(`Потрібне уточнення — зіставлено ${pct}% (${matchedCount}/${total}). Впевненість: ${confidence}`);
      } else {
        setAiStatus("done");
        setAiResult(`Розпізнано ${pct}% (${matchedCount}/${total} послуг). Впевненість: ${confidence}`);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "Помилка AI-аналізу";
      setAiResult(msg);
      setAiStatus("error");
      setAiImages(p => p.map(img => ({ ...img, error: msg })));
    } finally {
      setAiAnalyzing(false);
    }
  };

  // ── CRUD звітів ──
  function openCreateReport() {
    setEditingReport(null);
    setFormDoctor(doctors.length ? doctors[0].id : 0);
    setFormCash("");   // порожньо = каса не вводилась
    setFormEntries({});
    setFormError("");
    setCashWarning("");
    setAiImages([]);
    setAiResult("");
    setAiStatus("idle");
    setAiFilledEntries(new Set());
    setAiUnmatched([]);
    setShowReportForm(true);
  }

  function openEditReport(rep: MonthReport) {
    setEditingReport(rep);
    setFormDoctor(rep.doctor_id);
    // При редагуванні — підставляємо поточну касу за місяць (зі стану periodInfo)
    setFormCash(periodInfo?.cash_for_period != null ? String(periodInfo.cash_for_period) : "");
    const ent: Record<number, number> = {};
    rep.entries.forEach((e) => { ent[e.service_id] = e.quantity; });
    setFormEntries(ent);
    setFormError("");
    setCashWarning("");
    setAiImages([]);
    setAiResult("");
    setAiStatus("idle");
    setAiFilledEntries(new Set());
    setAiUnmatched([]);
    setShowReportForm(true);
  }

  async function handleSaveReport() {
    if (!formDoctor) { setFormError("Оберіть лікаря"); return; }
    setCashWarning("");

    // cash_in_register: null = не введена, number = введена (навіть 0 — валідне)
    const cashPayload: number | null = formCash !== "" ? (parseFloat(formCash) || 0) : null;

    setFormLoading(true);
    setFormError("");
    const entries = Object.entries(formEntries)
      .filter(([, q]) => q > 0)
      .map(([sid, q]) => ({ service_id: Number(sid), quantity: q }));
    try {
      if (editingReport) {
        await api.put(`/monthly-services/reports/${editingReport.id}`, {
          cash_in_register: cashPayload,
          entries,
        });
      } else {
        await api.post("/monthly-services/reports", {
          doctor_id: formDoctor,
          year: selectedYear,
          month: selectedMonth,
          cash_in_register: cashPayload,
          entries,
        });
      }
      setShowReportForm(false);
      await Promise.all([loadAnalytics(), loadPeriodInfo()]);
    } catch (e: any) {
      if (e?.response?.status === 409) {
        // Каса вже внесена іншим звітом — підвантажуємо актуальне значення
        const freshInfo = await loadPeriodInfo();
        if (freshInfo?.cash_for_period != null) {
          setFormCash(String(freshInfo.cash_for_period));
        }
        setFormError("Готівка за цей місяць вже внесена. Відображено поточне значення.");
      } else {
        setFormError(e?.response?.data?.detail ?? "Помилка збереження");
      }
    }
    setFormLoading(false);
  }

  async function handleDeleteReport(id: number) {
    try {
      await api.delete(`/monthly-services/reports/${id}`);
      setDeleteReportId(null);
      await Promise.all([loadAnalytics(), loadPeriodInfo()]);
    } catch {}
  }

  async function handleCopyPrevious() {
    if (!selectedDoctor) {
      setAlertDlg({ title: "Увага", description: "Оберіть конкретного лікаря для копіювання звіту" });
      return;
    }
    try {
      await api.post(
        `/monthly-services/reports/copy-previous?doctor_id=${selectedDoctor}&year=${selectedYear}&month=${selectedMonth}`,
      );
      await Promise.all([loadAnalytics(), loadPeriodInfo()]);
    } catch (e: any) {
      setAlertDlg({ title: "Помилка", description: e?.response?.data?.detail ?? "Не вдалося скопіювати звіт" });
    }
  }

  async function handleFinalize(id: number) {
    // Якщо каса за місяць не внесена — показуємо попередження
    if (periodInfo?.cash_for_period === null) {
      setFinalizeWarningId(id);
      return;
    }
    await _doFinalize(id);
  }

  async function _doFinalize(id: number) {
    try {
      await api.post(`/monthly-services/reports/${id}/finalize`);
      await loadAnalytics();
    } catch {}
    setFinalizeWarningId(null);
  }

  async function handleUnfinalize(id: number) {
    try {
      await api.post(`/monthly-services/reports/${id}/unfinalize`);
      await loadAnalytics();
    } catch {}
  }

  // ── Експорт / Поширення ──
  async function handleExport() {
    try {
      const r = await api.post("/monthly-services/export", {
        doctor_id: selectedDoctor || null, year: selectedYear, month: selectedMonth,
      }, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `paid_services_${selectedYear}_${String(selectedMonth).padStart(2,"0")}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {}
  }

  async function handleShare() {
    try {
      const r = await api.post("/monthly-services/share", {
        doctor_id: selectedDoctor || null, year: selectedYear, month: selectedMonth,
      });
      setShareData(r.data);
    } catch {}
  }

  function copyShareUrl() {
    if (shareData) {
      navigator.clipboard.writeText(`${window.location.origin}${shareData.url}`);
    }
  }

  // ── AI-аналіз (rule-based) ──
  const trendAnalysis = useMemo(() => {
    if (!d) return { type: "neutral" as const, text: "Недостатньо даних" };
    const diff = d.total_revenue - d.prev_month_revenue;
    const pctChange = d.prev_month_revenue ? (diff / d.prev_month_revenue) * 100 : 0;
    if (pctChange > 5) return { type: "positive" as const, text: `Оборот зріс на ${pctChange.toFixed(1)}%. Позитивна динаміка. Рекомендація: масштабувати найпопулярніші послуги.` };
    if (pctChange < -5) return { type: "negative" as const, text: `Оборот впав на ${Math.abs(pctChange).toFixed(1)}%. Рекомендація: перевірити ціноутворення та завантаженість лікарів.` };
    return { type: "neutral" as const, text: `Оборот стабільний (${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%). Рекомендація: розглянути розширення переліку послуг.` };
  }, [d]);

  // ── Дані для діаграм ──
  const trendChart = useMemo(() =>
    (analytics?.monthly_trend ?? []).filter(r => r.sum > 0).map(r => ({
      label: `${MONTHS_UA[r.month]?.slice(0, 3)} ${r.year}`,
      sum: r.sum,
      doctor_income: r.doctor_income,
      quantity: r.quantity,
    })), [analytics]);

  const expensesPie = useMemo(() => {
    if (!d) return [];
    return [
      { name: "Матеріали", value: d.materials_cost },
      { name: `ЄП (${analytics?.ep_rate ?? 5}%)`, value: d.ep_amount },
      { name: `ВЗ (${analytics?.vz_rate ?? 1}%)`, value: d.vz_amount },
    ].filter(x => x.value > 0);
  }, [d, analytics]);

  const topByRevenue = useMemo(() =>
    [...(analytics?.services_table ?? [])]
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 5), [analytics]);

  const topByQty = useMemo(() =>
    [...(analytics?.services_table ?? [])]
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5), [analytics]);

  // ── Чи показувати поле "Готівка в касі" ──
  // При створенні: показуємо будь-якому лікарю, якщо каса за місяць ще не внесена.
  // При редагуванні: показуємо завжди (щоб можна було оновити касу).
  const showCashField = editingReport
    ? true
    : periodInfo?.cash_for_period === null;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-orange-500/10 items-center justify-center">
            <BarChart3 size={22} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Платні послуги</h1>
            <p className="text-xs sm:text-sm text-gray-500">Щомісячний облік та аналітика</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} aria-label="Експорт у Excel" className="flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-xl border border-green-500/20 transition-all tap-target">
            <Download size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={handleShare} aria-label="Поділитися" className="flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/10 rounded-xl border border-purple-500/20 transition-all tap-target">
            <Share2 size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Поділитися</span>
          </button>
          <button onClick={handleCopyPrevious} aria-label="Копіювати з попереднього місяця" className="flex items-center gap-2 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-500/10 rounded-xl border border-cyan-500/20 transition-all tap-target" title="Копіювати з попереднього місяця">
            <Copy size={15} aria-hidden="true" />
            <span className="hidden sm:inline">З минулого</span>
          </button>
          <button onClick={openCreateReport} aria-label="Додати звіт" className="flex items-center gap-2 px-4 py-2 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20 tap-target">
            <Plus size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Додати звіт</span>
          </button>
        </div>
      </div>

      {/* Фільтри */}
      <div className="card-neo p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-4">
          <div className="flex flex-col gap-1">
            <label className="block text-xs text-gray-500">Лікар</label>
            <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(Number(e.target.value))} className="bg-dark-300 border border-dark-50/20 rounded-xl px-2 py-2 sm:px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-accent-500/50 w-full">
              <option value={0}>Всі</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="block text-xs text-gray-500">Місяць</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-dark-300 border border-dark-50/20 rounded-xl px-2 py-2 sm:px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-accent-500/50 w-full">
              {MONTHS_UA.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="block text-xs text-gray-500">Рік</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-dark-300 border border-dark-50/20 rounded-xl px-2 py-2 sm:px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-accent-500/50 w-full">
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Банер: час заповнити звіт */}
      {isEndOfMonth && !hasReportsThisMonth && selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1 && (
        <AlertBanner variant="warning">
          Наближається кінець місяця. Час заповнити звіт за {MONTHS_UA[selectedMonth]}.
        </AlertBanner>
      )}

      {loading ? (
        <LoadingSpinner label="Завантаження..." />
      ) : d ? (
        <>
          {/* ══ Дашборд (6 блоків) ══ */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stagger-enter">
            {/* Блок 1: Наданих послуг */}
            <button onClick={() => setShowServicesModal(true)} className="card-neo card-tap p-5 text-left hover:border-accent-500/20 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-accent-400" />
                <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">Наданих послуг</span>
              </div>
              <p className="text-xl font-bold text-white tabular-nums">{fmt(d.total_revenue)} <span className="text-xs text-gray-500">грн</span></p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>К-ть: {d.total_quantity}</span>
                <span>Сер. чек: {fmt(d.avg_check)}</span>
                <span className={d.total_revenue >= d.prev_month_revenue ? "text-green-400" : "text-red-400"}>
                  {pct(d.total_revenue, d.prev_month_revenue)}
                </span>
              </div>
            </button>

            {/* Блок 2: Дохід лікаря */}
            <button onClick={() => setShowDoctorModal(true)} className="card-neo card-tap p-5 text-left hover:border-accent-500/20 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <MedFlowLogo size={16} className="text-green-400" />
                <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">{selectedDoctor ? "Дохід лікаря" : "Дохід лікарів"}</span>
              </div>
              <p className="text-xl font-bold text-green-400 tabular-nums">{fmt(d.doctor_income)} <span className="text-xs text-gray-500">грн</span></p>
            </button>

            {/* Блок 3: Витрати */}
            <button onClick={() => setShowExpensesModal(true)} className="card-neo card-tap p-5 text-left hover:border-accent-500/20 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-orange-400" />
                <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">Витрати</span>
              </div>
              <p className="text-xl font-bold text-orange-400 tabular-nums">{fmt(d.total_costs)} <span className="text-xs text-gray-500">грн</span></p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span>Мат: {fmt(d.materials_cost)}</span>
                <span>ЄП: {fmt(d.ep_amount)}</span>
                <span>ВЗ: {fmt(d.vz_amount)}</span>
              </div>
            </button>

            {/* Блок 4: Дохід організації */}
            <div className="card-neo p-5">
              <div className="flex items-center gap-2 mb-3">
                <Landmark size={16} className="text-blue-400" />
                <span className="text-xs text-gray-500">Дохід організації</span>
              </div>
              <p className="text-xl font-bold text-blue-400 tabular-nums">{fmt(d.org_income)} <span className="text-xs text-gray-500">грн</span></p>
            </div>

            {/* Блок 5: Готівка в касі */}
            <div className="card-neo p-5">
              <div className="flex items-center gap-2 mb-3">
                <Banknote size={16} className="text-yellow-400" />
                <span className="text-xs text-gray-500">Готівка в касі</span>
              </div>
              <p className="text-xl font-bold text-yellow-400 tabular-nums">{fmt(d.cash_in_register)} <span className="text-xs text-gray-500">грн</span></p>
            </div>

            {/* Блок 6: Кошти на рахунку */}
            <div className="card-neo p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet size={16} className="text-purple-400" />
                <span className="text-xs text-gray-500">Кошти на рахунку в банку</span>
              </div>
              <p className="text-xl font-bold text-purple-400 tabular-nums">{fmt(d.bank_amount)} <span className="text-xs text-gray-500">грн</span></p>
            </div>
          </div>

          {/* ══ Звіти ══ */}
          {analytics && analytics.reports.length > 0 && (
            <div className="card-neo p-5 space-y-3">
              <h3 className="text-sm font-medium text-gray-400">Звіти за {MONTHS_UA[selectedMonth]} {selectedYear}</h3>
              <div className="space-y-2 stagger-enter">
                {analytics.reports.map((rep) => {
                  const isFinal = rep.status === "final";
                  return (
                  <div key={rep.id} className={`card-tap flex items-center justify-between rounded-xl px-4 py-3 border-l-4 transition-all ${
                    isFinal
                      ? "bg-green-500/5 border-l-green-500/60"
                      : "bg-dark-300/30 border-l-amber-500/40"
                  }`}>
                    <div>
                      <p className="text-sm text-gray-200">{rep.doctor_name}</p>
                      <p className="text-xs text-gray-500">Готівка: {fmt(rep.cash_in_register)} грн · {rep.entries.reduce((s, e) => s + e.quantity, 0)} послуг</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                        isFinal
                          ? "text-green-400 bg-green-500/10 border-green-500/20"
                          : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      }`}>
                        {isFinal ? "Зафіксовано" : "Чернетка"}
                      </span>
                      {!isFinal ? (
                        <>
                          <button onClick={() => openEditReport(rep)} aria-label="Редагувати звіт" className="p-1.5 text-gray-500 hover:text-accent-400 hover:bg-accent-500/10 rounded-lg transition-all" title="Редагувати"><Pencil size={14} /></button>
                          <button onClick={() => handleFinalize(rep.id)} aria-label="Зафіксувати звіт" className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all" title="Зафіксувати"><Lock size={14} /></button>
                          <button onClick={() => setDeleteReportId(rep.id)} aria-label="Видалити звіт" className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Видалити"><Trash2 size={14} /></button>
                        </>
                      ) : (
                        <button onClick={() => handleUnfinalize(rep.id)} aria-label="Розфіксувати звіт" className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all" title="Розфіксувати"><Unlock size={14} /></button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ Таблиця послуг ══ */}
          <div className="card-neo overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-50/10">
              <h3 className="text-sm font-medium text-gray-400">Перелік наданих послуг</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1100px]">
                <thead>
                  <tr className="border-b border-dark-50/10 bg-dark-300/50">
                    {([
                      ["code", "Код"], ["name", "Назва"], ["total_quantity", "К-ть"],
                      ["sum", "Сума"], ["materials", "Матеріали"],
                      ["ep_amount", `ЄП`], ["vz_amount", `ВЗ`],
                      ["to_split", "До розподілу"], ["doctor_income", "Дохід лік."], ["org_income", "Дохід орг."],
                    ] as [keyof ServiceTableRow, string][]).map(([f, label]) => (
                      <th key={f} scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap cursor-pointer hover:text-gray-200 transition-colors" onClick={() => handleSort(f)}>
                        <span className="inline-flex items-center">{label}<SortIcon field={f} /></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTable.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-10 text-gray-600 text-sm">Немає даних. Додайте звіт за місяць.</td></tr>
                  )}
                  {sortedTable.map((row) => (
                    <tr key={row.service_id} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-accent-400">{row.code}</td>
                      <td className="px-3 py-2.5 text-gray-200">{row.name}</td>
                      <td className="px-3 py-2.5 text-gray-200 text-right tabular-nums">{row.total_quantity}</td>
                      <td className="px-3 py-2.5 text-gray-200 text-right tabular-nums">{fmt(row.sum)}</td>
                      <td className="px-3 py-2.5 text-gray-400 text-right tabular-nums">{fmt(row.materials)}</td>
                      <td className="px-3 py-2.5 text-orange-400/80 text-right tabular-nums">{fmt(row.ep_amount)}</td>
                      <td className="px-3 py-2.5 text-orange-400/80 text-right tabular-nums">{fmt(row.vz_amount)}</td>
                      <td className="px-3 py-2.5 text-gray-300 text-right tabular-nums">{fmt(row.to_split)}</td>
                      <td className="px-3 py-2.5 text-green-400 text-right tabular-nums font-medium">{fmt(row.doctor_income)}</td>
                      <td className="px-3 py-2.5 text-green-400 text-right tabular-nums font-medium">{fmt(row.org_income)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : !loading && (
        <div className="card-neo p-12 text-center text-gray-600">Оберіть фільтр або додайте перший звіт.</div>
      )}

      {/* ═══════ МОДАЛКИ ═══════ */}

      {/* ── Форма звіту ── */}
      {showReportForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={() => setShowReportForm(false)}>
          <div className="bg-dark-600 rounded-none sm:rounded-2xl w-full max-w-3xl min-h-full sm:min-h-0 sm:my-8 animate-modal-in pb-20 sm:pb-0 modal-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-50/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Pencil size={16} className="text-orange-400" />
                {editingReport ? "Редагування звіту" : "Новий звіт"} · {MONTHS_UA[selectedMonth]} {selectedYear}
              </h2>
              <button onClick={() => setShowReportForm(false)} aria-label="Закрити форму звіту" className="p-2 text-gray-500 hover:text-gray-300 hover:bg-dark-300 rounded-lg transition-all"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!editingReport && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Лікар <span className="text-red-400">*</span></label>
                    <select value={formDoctor} onChange={(e) => setFormDoctor(Number(e.target.value))} className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500/50">
                      <option value={0}>— Оберіть —</option>
                      {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                    </select>
                  </div>
                )}
                {showCashField ? (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Готівка в касі (грн)
                      <span className="ml-1.5 text-gray-600">(вноситься один раз за {MONTHS_UA[selectedMonth]})</span>
                    </label>
                    <input
                      type="number" min="0" step="0.01" placeholder="0"
                      value={formCash}
                      onChange={(e) => { setFormCash(e.target.value); if (cashWarning) setCashWarning(""); }}
                      className={`w-full bg-dark-300 border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none ${cashWarning ? "border-amber-500/60 focus:border-amber-500" : "border-dark-50/20 focus:border-accent-500/50"}`}
                    />
                  </div>
                ) : periodInfo?.cash_for_period != null ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 self-end pb-3">
                    <Banknote size={13} className="text-yellow-500/60 shrink-0" />
                    Готівка за {MONTHS_UA[selectedMonth]}:
                    <span className="text-yellow-400 font-medium ml-1">{fmt(periodInfo.cash_for_period)} грн</span>
                    <span className="text-gray-600">(вже внесена)</span>
                  </div>
                ) : null}
              </div>

              {/* ── AI-завантаження зображення ── */}
              <div className="rounded-xl border border-dashed border-dark-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-purple-400" />
                    <p className="text-sm font-medium text-gray-300">Розпізнавання зі скріншота</p>
                  </div>
                  <input ref={aiFileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { if (e.target.files) handleAiFiles(e.target.files); e.target.value = ""; }} />
                  <button type="button" onClick={() => aiFileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-400 hover:bg-purple-500/10 rounded-lg border border-purple-500/20 transition-all">
                    <Upload size={13} aria-hidden="true" /> Завантажити фото
                  </button>
                </div>

                {aiImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {aiImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.preview} alt="" className="w-16 h-16 object-cover rounded-lg border border-dark-50/20" />
                        {img.analyzed && !img.error && <CheckCircle2 size={14} className="absolute -top-1 -right-1 text-green-400 bg-dark-600 rounded-full" />}
                        {img.error && <AlertCircle size={14} className="absolute -top-1 -right-1 text-red-400 bg-dark-600 rounded-full" />}
                        <button onClick={() => removeAiImage(i)}
                          aria-label="Видалити зображення"
                          className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {aiImages.length > 0 && (
                  <button type="button" onClick={analyzeAiImages} disabled={aiAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-xs font-medium transition-all border border-purple-500/20 disabled:opacity-50">
                    {aiAnalyzing ? <RefreshCw size={13} className="animate-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
                    {aiAnalyzing ? "Аналіз…" : "Розпізнати AI"}
                  </button>
                )}

                {aiResult && !aiAnalyzing && (
                  <div className="space-y-1.5">
                    <p className={`text-xs flex items-center gap-1.5 ${
                      aiStatus === "error" ? "text-red-400" :
                      aiStatus === "partial" ? "text-amber-400" :
                      "text-green-400"
                    }`}>
                      {aiStatus === "done" ? <CheckCircle2 size={12} /> :
                       aiStatus === "partial" ? <AlertCircle size={12} /> :
                       <FileImage size={12} />}
                      {aiResult}
                    </p>
                    {aiUnmatched.length > 0 && (
                      <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 space-y-0.5">
                        <p className="text-xs text-amber-400 font-medium mb-1">Не вдалось зіставити з каталогом:</p>
                        {aiUnmatched.map((s, i) => (
                          <p key={i} className="text-xs text-gray-500">• {s.name} <span className="text-gray-600">(к-ть: {s.quantity})</span></p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-300 mb-3">Кількість послуг за місяць</p>
                <div className="rounded-xl border border-dark-50/10 overflow-x-auto">
                  <table className="w-full text-xs min-w-[320px]">
                    <thead>
                      <tr className="bg-dark-300/50 border-b border-dark-50/10">
                        <th scope="col" className="text-left px-3 py-2 text-gray-500 font-medium">Код</th>
                        <th scope="col" className="text-left px-3 py-2 text-gray-500 font-medium">Назва</th>
                        <th scope="col" className="text-right px-3 py-2 text-gray-500 font-medium w-20">Ціна</th>
                        <th scope="col" className="text-center px-3 py-2 text-gray-500 font-medium w-28">Кількість</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogServices.map((svc) => {
                        const isAiFilled = aiFilledEntries.has(svc.id);
                        return (
                          <tr key={svc.id} className={`border-b border-dark-50/5 ${isAiFilled ? "bg-purple-500/5" : ""}`}>
                            <td className="px-3 py-2 font-mono text-accent-400">{svc.code}</td>
                            <td className="px-3 py-2 text-gray-200">
                              {svc.name}
                              {isAiFilled && <Sparkles size={10} className="inline ml-1.5 text-purple-400 opacity-70" />}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{fmt(svc.price)}</td>
                            <td className="px-3 py-1.5">
                              <input type="number" min="0" step="1"
                                placeholder="0"
                                value={formEntries[svc.id] || ""}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setFormEntries((p) => ({ ...p, [svc.id]: val }));
                                  if (isAiFilled && val === 0) {
                                    setAiFilledEntries(prev => { const n = new Set(prev); n.delete(svc.id); return n; });
                                  }
                                }}
                                className={`w-full bg-dark-300 border rounded-lg px-2 py-1.5 text-center text-white focus:outline-none ${isAiFilled ? "border-purple-500/40 focus:border-purple-500/60" : "border-dark-50/10 focus:border-accent-500/40"}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {cashWarning && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <AlertCircle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300">{cashWarning}</p>
                </div>
              )}
              {formError && <p className="text-xs text-red-400">{formError}</p>}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button onClick={() => setShowReportForm(false)} className="px-5 py-2.5 text-sm text-gray-400 hover:text-gray-200 rounded-xl border border-dark-50/20 transition-all">Скасувати</button>
                <button onClick={handleSaveReport} disabled={formLoading} className="flex items-center gap-2 px-5 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20 disabled:opacity-50">
                  {formLoading && <RefreshCw size={14} className="animate-spin" aria-hidden="true" />}
                  {editingReport ? "Зберегти зміни" : "Зберегти чернетку"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Детальна статистика послуг (Блок 1) ── */}
      {showServicesModal && d && analytics && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={() => setShowServicesModal(false)}>
          <div className="bg-dark-600 rounded-none sm:rounded-2xl w-full max-w-4xl min-h-full sm:min-h-0 sm:my-8 animate-modal-in pb-20 sm:pb-0 modal-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-50/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><ClipboardList size={16} className="text-orange-400" />Детальна статистика наданих послуг</h2>
              <div className="flex gap-2">
                <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/10 rounded-lg border border-green-500/20 transition-all"><Download size={13} aria-hidden="true" /> Excel</button>
                <button onClick={() => setShowServicesModal(false)} aria-label="Закрити статистику послуг" className="p-2 text-gray-500 hover:text-gray-300 hover:bg-dark-300 rounded-lg transition-all"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: "Оборот", value: fmt(d.total_revenue) + " грн", color: "text-white" },
                  { label: "Кількість", value: String(d.total_quantity), color: "text-accent-400" },
                  { label: "Середній чек", value: fmt(d.avg_check) + " грн", color: "text-blue-400" },
                  { label: "MoM", value: pct(d.total_revenue, d.prev_month_revenue), color: d.total_revenue >= d.prev_month_revenue ? "text-green-400" : "text-red-400" },
                ].map((k, i) => (
                  <div key={i} className="card-neo-inset p-4">
                    <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                    <p className={`text-lg font-bold tabular-nums ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* ТОП-5 за оборотом */}
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">ТОП-5 послуг за оборотом</p>
                <div className="space-y-1.5">
                  {topByRevenue.map((s, i) => (
                    <div key={s.service_id} className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-4">{i + 1}.</span>
                      <span className="text-gray-200 flex-1">{s.name}</span>
                      <span className="text-accent-400 font-medium tabular-nums">{fmt(s.sum)} грн</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ТОП-5 за кількістю */}
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">Найпопулярніші послуги за кількістю</p>
                <div className="space-y-1.5">
                  {topByQty.map((s, i) => (
                    <div key={s.service_id} className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-4">{i + 1}.</span>
                      <span className="text-gray-200 flex-1">{s.name}</span>
                      <span className="text-accent-400 font-medium tabular-nums">{s.total_quantity} шт</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Динаміка по місяцях */}
              {trendChart.length > 1 && (
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-3">Динаміка по місяцях</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={trendChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                      <Bar dataKey="sum" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Оборот (грн)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ШІ-аналіз */}
              <div className="card-neo-inset p-4">
                <p className="text-xs font-medium text-gray-400 mb-2">Аналіз / рекомендації</p>
                <div className="flex items-start gap-2">
                  {trendAnalysis.type === "positive" && <TrendingUp size={16} className="text-green-400 mt-0.5 shrink-0" />}
                  {trendAnalysis.type === "negative" && <TrendingDown size={16} className="text-red-400 mt-0.5 shrink-0" />}
                  {trendAnalysis.type === "neutral" && <BarChart3 size={16} className="text-gray-400 mt-0.5 shrink-0" />}
                  <p className="text-xs text-gray-300">{trendAnalysis.text}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Дохід лікарів (Блок 2) ── */}
      {showDoctorModal && d && analytics && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={() => setShowDoctorModal(false)}>
          <div className="bg-dark-600 rounded-none sm:rounded-2xl w-full max-w-4xl min-h-full sm:min-h-0 sm:my-8 animate-modal-in pb-20 sm:pb-0 modal-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-50/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Users size={16} className="text-orange-400" />{selectedDoctor ? "Дохід лікаря" : "Дохід лікарів"}</h2>
              <div className="flex gap-2">
                <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-400 hover:bg-purple-500/10 rounded-lg border border-purple-500/20 transition-all"><Share2 size={13} aria-hidden="true" /> Поділитися</button>
                <button onClick={() => setShowDoctorModal(false)} aria-label="Закрити дохід лікарів" className="p-2 text-gray-500 hover:text-gray-300 hover:bg-dark-300 rounded-lg transition-all"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* KPI */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[
                  { label: "Оборот", value: fmt(d.total_revenue) + " грн" },
                  { label: "Кількість", value: String(d.total_quantity) },
                  { label: "Дохід", value: fmt(d.doctor_income) + " грн" },
                ].map((k, i) => (
                  <div key={i} className="card-neo-inset p-4">
                    <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                    <p className="text-lg font-bold text-green-400 tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Витрати та податки (Pie) */}
              {expensesPie.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-3">Витрати та податки</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={expensesPie} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {expensesPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} formatter={(v: number) => fmt(v) + " грн"} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Дохід по місяцях */}
              {trendChart.length > 1 && (
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-3">Дохід по місяцях</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={trendChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                      <Bar dataKey="doctor_income" fill="#4ade80" radius={[4, 4, 0, 0]} name="Дохід лікаря (грн)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Таблиця по місяцях */}
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">Деталі по місяцях</p>
                <div className="overflow-x-auto rounded-xl border border-dark-50/10">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-dark-300/50 border-b border-dark-50/10">
                        <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Місяць</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">К-ть</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Сума</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Витрати</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ЄП</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">ВЗ</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">До розподілу</th>
                        <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Дохід лікаря</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.monthly_trend.filter(r => r.sum > 0).map((r) => (
                        <tr key={`${r.year}-${r.month}`} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                          <td className="px-3 py-2 text-gray-300">{MONTHS_UA[r.month]} {r.year}</td>
                          <td className="px-3 py-2 text-right text-gray-300 tabular-nums">{r.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-300 tabular-nums">{fmt(r.sum)}</td>
                          <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{fmt(r.materials)}</td>
                          <td className="px-3 py-2 text-right text-orange-400/80 tabular-nums">{fmt(r.ep_amount)}</td>
                          <td className="px-3 py-2 text-right text-orange-400/80 tabular-nums">{fmt(r.vz_amount)}</td>
                          <td className="px-3 py-2 text-right text-gray-300 tabular-nums">{fmt(r.to_split)}</td>
                          <td className="px-3 py-2 text-right text-green-400 font-medium tabular-nums">{fmt(r.doctor_income)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Витрати (Блок 3) ── */}
      {showExpensesModal && d && analytics && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={() => setShowExpensesModal(false)}>
          <div className="bg-dark-600 rounded-none sm:rounded-2xl w-full max-w-3xl min-h-full sm:min-h-0 sm:my-8 animate-modal-in pb-20 sm:pb-0 modal-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-50/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><TrendingDown size={16} className="text-orange-400" />Детальна статистика витрат</h2>
              <div className="flex gap-2">
                <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/10 rounded-lg border border-green-500/20 transition-all"><Download size={13} aria-hidden="true" /> Excel</button>
                <button onClick={() => setShowExpensesModal(false)} aria-label="Закрити статистику витрат" className="p-2 text-gray-500 hover:text-gray-300 hover:bg-dark-300 rounded-lg transition-all"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: "Матеріали", value: fmt(d.materials_cost), color: "text-blue-400" },
                  { label: `ЄП (${analytics.ep_rate}%)`, value: fmt(d.ep_amount), color: "text-orange-400" },
                  { label: `ВЗ (${analytics.vz_rate}%)`, value: fmt(d.vz_amount), color: "text-red-400" },
                  { label: "Всього", value: fmt(d.total_costs), color: "text-white" },
                ].map((k, i) => (
                  <div key={i} className="card-neo-inset p-4">
                    <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                    <p className={`text-lg font-bold tabular-nums ${k.color}`}>{k.value} <span className="text-xs text-gray-500">грн</span></p>
                  </div>
                ))}
              </div>

              {/* ТОП матеріалів */}
              {analytics.top_materials.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">ТОП-10 матеріалів</p>
                  <div className="overflow-x-auto rounded-xl border border-dark-50/10">
                    <table className="w-full text-xs min-w-[480px]">
                      <thead>
                        <tr className="bg-dark-300/50 border-b border-dark-50/10">
                          <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">#</th>
                          <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Назва</th>
                          <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Од.</th>
                          <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">К-ть</th>
                          <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Сума</th>
                          <th scope="col" className="text-right px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Частка (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.top_materials.map((m, i) => (
                          <tr key={i} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                            <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                            <td className="px-3 py-2 text-gray-200">{m.name}</td>
                            <td className="px-3 py-2 text-gray-400">{m.unit}</td>
                            <td className="px-3 py-2 text-right text-gray-300 tabular-nums">{m.total_quantity}</td>
                            <td className="px-3 py-2 text-right text-gray-200 tabular-nums">{fmt(m.total_cost)}</td>
                            <td className="px-3 py-2 text-right text-accent-400 tabular-nums">{m.share_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Податки */}
              <div className="card-neo-inset p-4">
                <p className="text-xs font-medium text-gray-400 mb-3">Податки</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Єдиний податок ({analytics.ep_rate}%)</span><span className="text-orange-400 font-medium">{fmt(d.ep_amount)} грн</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Військовий збір ({analytics.vz_rate}%)</span><span className="text-red-400 font-medium">{fmt(d.vz_amount)} грн</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Видалення звіту ── */}
      <ConfirmDialog
        open={deleteReportId !== null}
        title="Видалити звіт?"
        description="Цю дію неможливо скасувати."
        variant="danger"
        confirmLabel="Видалити"
        cancelLabel="Скасувати"
        onConfirm={() => handleDeleteReport(deleteReportId!)}
        onCancel={() => setDeleteReportId(null)}
      />

      {/* ── Попередження: зафіксувати без каси ── */}
      {finalizeWarningId !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={() => setFinalizeWarningId(null)}>
          <div className="bg-dark-600 border border-amber-500/25 rounded-2xl p-6 w-full max-w-sm my-auto animate-modal-in
                   shadow-[0_0_40px_rgba(245,158,11,0.12),0_20px_60px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Готівку не внесено</h3>
                <p className="text-sm text-amber-300">
                  Необхідно зазначити суму готівки в касі на кінець місяця
                  ({MONTHS_UA[selectedMonth]} {selectedYear}).
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Ви можете закрити це вікно, відредагувати звіт і ввести готівку — або зафіксувати звіт без каси.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setFinalizeWarningId(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 rounded-xl border border-dark-50/20 transition-all">Скасувати</button>
              <button onClick={() => _doFinalize(finalizeWarningId)} className="px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-xl border border-amber-500/20 transition-all">
                Зафіксувати без каси
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share діалог ── */}
      {shareData && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={() => setShareData(null)}>
          <div className="bg-dark-600 rounded-2xl p-6 w-full max-w-md my-auto animate-modal-in modal-glow" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Посилання створено</h3>
            <p className="text-sm text-gray-400 mb-4">Діє 30 днів. Доступ тільки для читання.</p>
            <div className="flex gap-2 mb-4">
              <input readOnly value={`${window.location.origin}${shareData.url}`} className="flex-1 bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white font-mono" />
              <button onClick={copyShareUrl} className="flex items-center gap-1.5 px-3 py-2 text-sm text-accent-400 hover:bg-accent-500/10 rounded-xl border border-accent-500/20 transition-all"><Copy size={14} aria-hidden="true" /> Копіювати</button>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShareData(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 rounded-xl border border-dark-50/20 transition-all">Закрити</button>
            </div>
          </div>
        </div>
      )}

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
