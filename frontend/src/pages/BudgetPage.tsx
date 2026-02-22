import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ChevronDown, ChevronUp, Copy, Info,
  Lightbulb, Plus, Trash2, TrendingDown, X, Check,
  RefreshCw, BarChart2, Users,
} from "lucide-react";
import api from "../api/client";
import { MONTH_NAMES } from "../components/shared/MonthNavigator";
import { LoadingSpinner } from "../components/shared";

// ─── Types ──────────────────────────────────────────────────────────
interface CellValue {
  value: number | null;
  is_locked: boolean;
}
interface BudgetRow {
  id: number;
  section: string;          // "fixed" | "variable"
  sub_type: string;         // "fixed" | "quasi_fixed" | "variable"
  input_type: string;       // "manual" | "auto_formula" | "auto_module"
  name: string;
  description: string;
  order_index: number;
  is_info_row: boolean;
  is_system: boolean;
  formula_key: string | null;
  staff_member_id: number | null;
  months: Record<string, CellValue>;
  yearly_total: number | null;
}
interface BudgetTable {
  year: number;
  rows: BudgetRow[];
  monthly_income: Record<string, number>;
  monthly_totals: Record<string, number>;
  monthly_remaining: Record<string, number>;
}
interface Recommendation {
  type: string;   // "info" | "warning" | "breakeven" | "tip"
  title: string;
  body: string;
  months?: number[];
}

// ─── Constants ──────────────────────────────────────────────────────
const MONTHS_SHORT = ["Січ","Лют","Бер","Кві","Тра","Чер","Лип","Сер","Вер","Жов","Лис","Гру"];
const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── Sub-type badge ──────────────────────────────────────────────────
function SubTypeBadge({ row }: { row: BudgetRow }) {
  if (row.is_info_row) return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-500/15 text-gray-500 border border-gray-500/20 whitespace-nowrap">
      інфо
    </span>
  );
  if (row.input_type === "auto_formula") return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 whitespace-nowrap">
      авто
    </span>
  );
  if (row.input_type === "auto_module") return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/20 whitespace-nowrap">
      з модуля
    </span>
  );
  if (row.sub_type === "quasi_fixed") return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20 whitespace-nowrap">
      план±
    </span>
  );
  if (row.section === "fixed") return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
      заплановано
    </span>
  );
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/20 whitespace-nowrap">
      ручний
    </span>
  );
}

// ─── Recommendation card ─────────────────────────────────────────────
const REC_STYLE: Record<string, { icon: typeof Info; bg: string; border: string; color: string }> = {
  info:      { icon: Info,          bg: "bg-blue-500/5",    border: "border-blue-500/20",   color: "text-blue-400"   },
  warning:   { icon: AlertTriangle, bg: "bg-amber-500/5",   border: "border-amber-500/20",  color: "text-amber-400"  },
  breakeven: { icon: BarChart2,     bg: "bg-emerald-500/5", border: "border-emerald-500/20",color: "text-emerald-400"},
  tip:       { icon: Lightbulb,     bg: "bg-violet-500/5",  border: "border-violet-500/20", color: "text-violet-400" },
};
function RecCard({ rec }: { rec: Recommendation }) {
  const s = REC_STYLE[rec.type] ?? REC_STYLE.info;
  const Icon = s.icon;
  return (
    <div className={`flex gap-3 p-3 rounded-xl border ${s.bg} ${s.border}`}>
      <Icon size={16} className={`${s.color} shrink-0 mt-0.5`} />
      <div>
        <p className={`text-xs font-semibold ${s.color} mb-0.5`}>{rec.title}</p>
        <p className="text-xs text-gray-400 leading-relaxed">{rec.body}</p>
      </div>
    </div>
  );
}

// ─── Copy month modal ────────────────────────────────────────────────
interface CopyModalState { rowId?: number; section?: string; year: number }
function CopyMonthModal({
  state, onClose, onApply,
}: {
  state: CopyModalState;
  onClose: () => void;
  onApply: (sourceMonth: number, targetMonths: number[], section?: string) => Promise<void>;
}) {
  const [source, setSource] = useState(1);
  const [targets, setTargets] = useState<Set<number>>(new Set([2,3,4,5,6,7,8,9,10,11,12]));
  const [busy, setBusy] = useState(false);

  function toggleTarget(m: number) {
    setTargets(prev => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  }
  function toggleAll() {
    const all = Array.from({length: 12}, (_,i) => i+1).filter(m => m !== source);
    const allSelected = all.every(m => targets.has(m));
    setTargets(allSelected ? new Set() : new Set(all));
  }

  async function handleApply() {
    if (targets.size === 0) return;
    setBusy(true);
    try {
      await onApply(source, Array.from(targets), state.section);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-600 border border-dark-50/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-50/10">
          <h3 className="text-sm font-semibold text-white">Скопіювати значення по місяцях</h3>
          <button onClick={onClose} aria-label="Закрити" className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-dark-300 transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Скопіювати з місяця:</label>
            <select
              value={source}
              onChange={e => {
                const newSrc = Number(e.target.value);
                setSource(newSrc);
                setTargets(prev => { const n = new Set(prev); n.delete(newSrc); return n; });
              }}
              className="w-full bg-dark-400 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-500/50"
            >
              {MONTH_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-400">Скопіювати в місяці:</label>
              <button onClick={toggleAll} className="text-xs text-accent-400 hover:text-accent-300 transition-colors">
                {Array.from({length:12},(_,i)=>i+1).filter(m=>m!==source).every(m=>targets.has(m)) ? "Зняти всі" : "Вибрати всі"}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MONTHS_SHORT.map((m, i) => {
                const month = i + 1;
                const disabled = month === source;
                const checked = targets.has(month);
                return (
                  <button
                    key={month}
                    disabled={disabled}
                    onClick={() => toggleTarget(month)}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${disabled ? "opacity-30 cursor-not-allowed border-dark-50/10 text-gray-600"
                        : checked ? "bg-accent-500/15 border-accent-500/30 text-accent-400"
                        : "bg-dark-400 border-dark-50/15 text-gray-400 hover:border-accent-500/30 hover:text-accent-400"
                      }`}
                  >
                    {checked && !disabled && <Check size={10} />}
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-dark-400 text-sm text-gray-400 hover:text-gray-200 transition-colors">
              Скасувати
            </button>
            <button
              onClick={handleApply}
              disabled={busy || targets.size === 0}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent-500 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
            >
              {busy ? "Копіюємо..." : `Скопіювати → ${targets.size} міс.`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function BudgetPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<BudgetTable | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [recsOpen, setRecsOpen] = useState(true);
  const [fixedOpen, setFixedOpen] = useState(true);
  const [varOpen, setVarOpen] = useState(true);

  // Inline editing
  const [editKey, setEditKey] = useState<string | null>(null); // "rowId-month"
  const [editVal, setEditVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Copy modal
  const [copyModal, setCopyModal] = useState<CopyModalState | null>(null);

  // Add row inline
  const [addSection, setAddSection] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addSubType, setAddSubType] = useState("fixed");
  const [addBusy, setAddBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        api.get(`/budget/?year=${year}`),
        api.get(`/budget/recommendations?year=${year}`),
      ]);
      setData(tRes.data);
      setRecs(rRes.data.recommendations ?? []);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  // Focus input when editing starts
  useEffect(() => {
    if (editKey) setTimeout(() => inputRef.current?.focus(), 0);
  }, [editKey]);

  // ── Cell editing ──
  function startEdit(row: BudgetRow, month: number) {
    if (row.months[month].is_locked) return;
    const key = `${row.id}-${month}`;
    setEditKey(key);
    setEditVal(String(row.months[month].value ?? ""));
  }

  async function saveCell(rowId: number, month: number) {
    const parsed = editVal.trim() === "" ? null : parseFloat(editVal.replace(",", "."));
    if (!Number.isFinite(parsed) && parsed !== null) {
      setEditKey(null);
      return;
    }
    setEditKey(null);
    try {
      await api.put("/budget/cell", { row_id: rowId, year, month, value: parsed });
      load();
    } catch { /* ignore */ }
  }

  function handleKeyDown(e: React.KeyboardEvent, rowId: number, month: number) {
    if (e.key === "Enter") { e.preventDefault(); saveCell(rowId, month); }
    if (e.key === "Escape") { setEditKey(null); }
    if (e.key === "Tab") {
      e.preventDefault();
      saveCell(rowId, month);
      // Move to next month
      const nextMonth = month < 12 ? month + 1 : null;
      if (nextMonth && data) {
        const row = data.rows.find(r => r.id === rowId);
        if (row && !row.months[nextMonth].is_locked) {
          setTimeout(() => startEdit(row, nextMonth), 50);
        }
      }
    }
  }

  // ── Copy month ──
  async function handleCopyApply(sourceMonth: number, targetMonths: number[], section?: string) {
    await api.post("/budget/copy-month", {
      year,
      source_month: sourceMonth,
      target_months: targetMonths,
      section: section ?? "fixed",
    });
    load();
  }

  // ── Add row ──
  async function handleAddRow() {
    if (!addName.trim() || !addSection) return;
    setAddBusy(true);
    try {
      await api.post("/budget/rows", {
        section: addSection,
        sub_type: addSubType,
        name: addName.trim(),
        description: "",
      });
      setAddSection(null);
      setAddName("");
      setAddSubType("fixed");
      load();
    } finally {
      setAddBusy(false);
    }
  }

  // ── Delete row ──
  async function handleDeleteRow(rowId: number) {
    if (!confirm("Видалити цей рядок?")) return;
    try {
      await api.delete(`/budget/rows/${rowId}`);
      load();
    } catch { /* ignore */ }
  }

  // ── Derived ──
  const fixedRows = data?.rows.filter(r => r.section === "fixed") ?? [];
  const varRows   = data?.rows.filter(r => r.section === "variable") ?? [];

  // Sequential numbering (skip info rows)
  function rowNum(rows: BudgetRow[], idx: number): number | null {
    const r = rows[idx];
    if (r.is_info_row) return null;
    let num = 0;
    for (let i = 0; i <= idx; i++) {
      if (!rows[i].is_info_row) num++;
    }
    return num;
  }

  // ── Cell display ──
  function cellClass(cell: CellValue, isInfo: boolean) {
    if (isInfo) return "text-gray-500 bg-dark-400/20 cursor-default";
    if (cell.is_locked) return "text-gray-400 bg-dark-400/30 cursor-default";
    if (cell.value === null) return "text-amber-400/70 bg-amber-500/5 border border-amber-500/20 cursor-pointer hover:border-amber-400/40";
    return "text-gray-200 cursor-pointer hover:bg-dark-300/50";
  }

  const yearlyTotals = {
    expenses: Object.values(data?.monthly_totals ?? {}).reduce((a,b) => a+b, 0),
    income:   Object.values(data?.monthly_income ?? {}).reduce((a,b) => a+b, 0),
    remaining:Object.values(data?.monthly_remaining ?? {}).reduce((a,b) => a+b, 0),
  };

  // ── Render table rows (із підтримкою зарплатних блоків) ──
  function renderRows(rows: BudgetRow[]) {
    const elements: JSX.Element[] = [];

    rows.forEach((row, idx) => {
      const num    = rowNum(rows, idx);
      const isInfo  = row.is_info_row;
      const isStaff = row.staff_member_id !== null;

      // ── Заголовок зарплатного блоку ──────────────────────────────
      if (row.formula_key?.startsWith("salary_brutto__")) {
        // Витягуємо ПІБ: "Оклад (Іваненко М.)" → "Іваненко М."
        const staffName = row.name.replace(/^Оклад \(/, "").replace(/\)$/, "");
        elements.push(
          <tr key={`sh-${row.staff_member_id}`} className="bg-accent-500/5 border-t-2 border-accent-500/20">
            <td className="sticky left-0 z-10 bg-accent-500/10 px-2 py-1.5 border-r border-dark-50/5" />
            <td className="sticky left-8 z-10 bg-accent-500/10 px-3 py-1.5 border-r border-dark-50/5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-accent-500/20 flex items-center justify-center shrink-0">
                  <Users size={11} className="text-accent-400" />
                </div>
                <span className="text-[11px] font-bold text-accent-400">{staffName}</span>
                <span className="text-[10px] text-gray-600">Зарплатний блок</span>
              </div>
            </td>
            {Array.from({length: 14}).map((_, i) => (
              <td key={i} className={`bg-accent-500/5 ${i === 12 ? "border-l border-dark-50/5" : i === 13 ? "border-l border-dark-50/5" : ""}`} />
            ))}
          </tr>
        );
      }

      // ── Основний рядок ────────────────────────────────────────────
      const rowBg   = isStaff && isInfo ? "bg-blue-500/5" : "";
      const rowBorder = isStaff ? "border-l-2 border-accent-500/15" : "";
      const stickyBg  = isStaff && isInfo ? "bg-blue-950/60" : "bg-dark-600";

      elements.push(
        <tr
          key={row.id}
          className={`border-b border-dark-50/5 transition-colors ${rowBg} ${rowBorder}
            ${isInfo ? "italic" : "hover:bg-dark-400/20"}`}
        >
          {/* # */}
          <td className={`sticky left-0 z-10 ${stickyBg} w-8 px-2 py-2 text-center text-xs text-gray-600 border-r border-dark-50/5`}>
            {num ?? ""}
          </td>

          {/* Назва + badge */}
          <td className={`sticky left-8 z-10 ${stickyBg} min-w-[200px] max-w-[240px] px-3 py-2 border-r border-dark-50/5`}>
            <div className="flex items-start gap-1.5">
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium leading-tight truncate
                  ${isInfo ? "text-gray-500" : isStaff ? "text-gray-300" : "text-gray-200"}`}>
                  {row.name}
                  {isInfo && (
                    <span className="ml-1.5 text-[9px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded not-italic">
                      не враховується
                    </span>
                  )}
                </p>
                {row.description && (
                  <p className="text-[10px] text-gray-600 leading-tight mt-0.5 line-clamp-1">
                    {row.description}
                  </p>
                )}
              </div>
              <SubTypeBadge row={row} />
            </div>
          </td>

          {/* 12 місяців */}
          {Array.from({length: 12}, (_, i) => i + 1).map(m => {
            const cell      = row.months[m] ?? { value: null, is_locked: false };
            const cellKey   = `${row.id}-${m}`;
            const isEditing = editKey === cellKey;

            return (
              <td key={m} className="px-1 py-1 text-right min-w-[80px]">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={() => saveCell(row.id, m)}
                    onKeyDown={e => handleKeyDown(e, row.id, m)}
                    className="w-full text-right text-xs bg-accent-500/10 border border-accent-500/40 rounded px-1.5 py-1 text-accent-300 focus:outline-none"
                  />
                ) : (
                  <button
                    disabled={cell.is_locked || isInfo}
                    onClick={() => startEdit(row, m)}
                    className={`w-full text-right text-xs px-1.5 py-1 rounded transition-all ${cellClass(cell, isInfo)}`}
                  >
                    {cell.value !== null
                      ? fmt(cell.value)
                      : (isInfo || cell.is_locked ? "—" : "···")}
                  </button>
                )}
              </td>
            );
          })}

          {/* Всього за рік */}
          <td className={`px-3 py-2 text-right text-xs font-semibold min-w-[90px] border-l border-dark-50/5
            ${isInfo ? "text-gray-600" : "text-gray-300"}`}>
            {fmt(row.yearly_total)}
          </td>

          {/* Дії */}
          <td className="px-2 py-2 text-center min-w-[60px] border-l border-dark-50/5">
            <div className="flex items-center gap-1 justify-center">
              {row.input_type === "manual" && !isInfo && (
                <button
                  onClick={() => setCopyModal({ rowId: row.id, year, section: row.section })}
                  title="Скопіювати по місяцях"
                  className="p-1 rounded text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all"
                >
                  <Copy size={12} />
                </button>
              )}
              {!row.is_system && (
                <button
                  onClick={() => handleDeleteRow(row.id)}
                  title="Видалити рядок"
                  className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    });

    return elements;
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingDown size={22} className="text-accent-400" />
            Витрати
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Помісячне планування та облік витрат підприємства
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(y => y - 1)}
            aria-label="Попередній рік"
            className="px-3 py-2 rounded-xl bg-dark-400 border border-dark-50/15 text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            ←
          </button>
          <span className="px-4 py-2 rounded-xl bg-dark-500 border border-dark-50/10 text-white font-semibold text-sm min-w-[70px] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear(y => y + 1)}
            aria-label="Наступний рік"
            className="px-3 py-2 rounded-xl bg-dark-400 border border-dark-50/15 text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            →
          </button>
          <button
            onClick={load}
            disabled={loading}
            aria-label="Оновити дані"
            className="p-2 rounded-xl bg-dark-400 border border-dark-50/15 text-gray-400 hover:text-accent-400 transition-colors"
            title="Оновити"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Рекомендації ── */}
      {recs.length > 0 && (
        <div className="card-neo-inset rounded-2xl overflow-hidden">
          <button
            onClick={() => setRecsOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-400/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lightbulb size={15} className="text-violet-400" />
              <span className="text-sm font-semibold text-gray-200">Рекомендації</span>
              <span className="px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-bold">
                {recs.length}
              </span>
            </div>
            {recsOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>
          {recsOpen && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2 stagger-enter">
              {recs.map((r, i) => <RecCard key={i} rec={r} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Таблиця ── */}
      <div className="card-neo rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-dark-50/10 bg-dark-500/50">
                <th scope="col" className="sticky left-0 z-20 bg-dark-500/80 w-8 px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-r border-dark-50/5">
                  №
                </th>
                <th scope="col" className="sticky left-8 z-20 bg-dark-500/80 min-w-[200px] px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-r border-dark-50/5">
                  Стаття витрат
                </th>
                {MONTHS_SHORT.map((m, i) => (
                  <th scope="col" key={i} className="px-1 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[80px]">
                    {m}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[90px] border-l border-dark-50/5">
                  Всього
                </th>
                <th scope="col" className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[60px] border-l border-dark-50/5">
                  Дії
                </th>
              </tr>

              {/* Дохід (довідково) */}
              {data && (
                <tr className="border-b border-dark-50/5 bg-emerald-500/5">
                  <td className="sticky left-0 z-10 bg-emerald-900/20 w-8 px-2 py-1.5 border-r border-dark-50/5" />
                  <td className="sticky left-8 z-10 bg-emerald-900/20 px-3 py-1.5 border-r border-dark-50/5">
                    <span className="text-[10px] font-semibold text-emerald-400">Дохід (Доходи)</span>
                  </td>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <td key={m} className="px-1.5 py-1.5 text-right text-[10px] text-emerald-400 font-medium tabular-nums">
                      {fmt(data.monthly_income[m] ?? 0)}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right text-[10px] text-emerald-400 font-semibold border-l border-dark-50/5 tabular-nums">
                    {fmt(yearlyTotals.income)}
                  </td>
                  <td className="border-l border-dark-50/5" />
                </tr>
              )}
            </thead>

            <tbody>
              {/* ── Постійні витрати ── */}
              <tr
                className="bg-dark-500/40 border-b border-dark-50/10 cursor-pointer hover:bg-dark-400/30 transition-colors"
                onClick={() => setFixedOpen(o => !o)}
              >
                <td className="sticky left-0 z-10 bg-dark-500/80 px-2 py-2 border-r border-dark-50/5" />
                <td
                  className="sticky left-8 z-10 bg-dark-500/80 px-3 py-2 border-r border-dark-50/5"
                  colSpan={1}
                >
                  <div className="flex items-center gap-2">
                    {fixedOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronUp size={14} className="text-gray-500" />}
                    <span className="text-xs font-bold text-gray-300 tracking-wide uppercase">Постійні витрати</span>
                    <span className="text-[10px] text-gray-600">({fixedRows.filter(r => !r.is_info_row).length} статей)</span>
                  </div>
                </td>
                {Array.from({length: 14}).map((_, i) => (
                  <td key={i} className={i === 12 ? "border-l border-dark-50/5" : i === 13 ? "border-l border-dark-50/5" : ""} />
                ))}
              </tr>

              {fixedOpen && renderRows(fixedRows)}

              {/* Кнопка «+ Додати» для постійних */}
              {fixedOpen && (
                <tr className="border-b border-dark-50/5 bg-dark-400/10">
                  <td />
                  <td colSpan={15} className="px-3 py-2">
                    {addSection === "fixed" ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={addName}
                          onChange={e => setAddName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleAddRow(); if (e.key === "Escape") setAddSection(null); }}
                          placeholder="Назва статті витрат..."
                          className="flex-1 text-xs bg-dark-400 border border-dark-50/20 rounded-lg px-2.5 py-1.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
                        />
                        <select
                          value={addSubType}
                          onChange={e => setAddSubType(e.target.value)}
                          className="text-xs bg-dark-400 border border-dark-50/20 rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none"
                        >
                          <option value="fixed">Постійна</option>
                          <option value="quasi_fixed">Умовно-постійна</option>
                        </select>
                        <button
                          onClick={handleAddRow}
                          disabled={addBusy || !addName.trim()}
                          className="px-3 py-1.5 rounded-lg bg-accent-500 text-xs font-semibold text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
                        >
                          {addBusy ? "..." : "Додати"}
                        </button>
                        <button
                          onClick={() => { setAddSection(null); setAddName(""); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-dark-300 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddSection("fixed"); setAddName(""); setAddSubType("fixed"); }}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-accent-400 hover:bg-accent-500/5 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Plus size={13} />
                        Додати рядок постійних витрат
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {/* ── Змінні витрати ── */}
              <tr
                className="bg-dark-500/40 border-b border-dark-50/10 cursor-pointer hover:bg-dark-400/30 transition-colors"
                onClick={() => setVarOpen(o => !o)}
              >
                <td className="sticky left-0 z-10 bg-dark-500/80 px-2 py-2 border-r border-dark-50/5" />
                <td className="sticky left-8 z-10 bg-dark-500/80 px-3 py-2 border-r border-dark-50/5">
                  <div className="flex items-center gap-2">
                    {varOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronUp size={14} className="text-gray-500" />}
                    <span className="text-xs font-bold text-gray-300 tracking-wide uppercase">Змінні витрати</span>
                    <span className="text-[10px] text-gray-600">({varRows.filter(r => !r.is_info_row).length} статей)</span>
                  </div>
                </td>
                {Array.from({length: 14}).map((_, i) => (
                  <td key={i} className={i === 12 ? "border-l border-dark-50/5" : i === 13 ? "border-l border-dark-50/5" : ""} />
                ))}
              </tr>

              {varOpen && renderRows(varRows)}

              {/* Кнопка «+ Додати» для змінних */}
              {varOpen && (
                <tr className="border-b border-dark-50/5 bg-dark-400/10">
                  <td />
                  <td colSpan={15} className="px-3 py-2">
                    {addSection === "variable" ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={addName}
                          onChange={e => setAddName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleAddRow(); if (e.key === "Escape") setAddSection(null); }}
                          placeholder="Назва статті витрат..."
                          className="flex-1 text-xs bg-dark-400 border border-dark-50/20 rounded-lg px-2.5 py-1.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
                        />
                        <button
                          onClick={handleAddRow}
                          disabled={addBusy || !addName.trim()}
                          className="px-3 py-1.5 rounded-lg bg-accent-500 text-xs font-semibold text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
                        >
                          {addBusy ? "..." : "Додати"}
                        </button>
                        <button
                          onClick={() => { setAddSection(null); setAddName(""); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-dark-300 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddSection("variable"); setAddName(""); setAddSubType("variable"); }}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-accent-400 hover:bg-accent-500/5 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Plus size={13} />
                        Додати рядок змінних витрат
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>

            {/* ── Підсумки ── */}
            {data && (
              <tfoot>
                {/* Кнопка «Скопіювати всі постійні» */}
                <tr className="border-t border-dark-50/10 bg-dark-500/20">
                  <td />
                  <td colSpan={14} className="px-3 py-2">
                    <button
                      onClick={() => setCopyModal({ year, section: "fixed" })}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent-400 hover:bg-accent-500/5 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Copy size={12} />
                      Скопіювати всі постійні витрати по місяцях...
                    </button>
                  </td>
                  <td className="border-l border-dark-50/5" />
                </tr>

                {/* Всього витрат */}
                <tr className="border-t border-dark-50/15 bg-dark-400/30">
                  <td className="sticky left-0 z-10 bg-dark-400/60 px-2 py-3 border-r border-dark-50/5" />
                  <td className="sticky left-8 z-10 bg-dark-400/60 px-3 py-3 border-r border-dark-50/5">
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">Всього витрат</span>
                  </td>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <td key={m} className="px-1.5 py-3 text-right text-xs font-semibold text-gray-200 tabular-nums">
                      {fmt(data.monthly_totals[m] ?? 0)}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right text-xs font-bold text-gray-100 border-l border-dark-50/5 tabular-nums">
                    {fmt(yearlyTotals.expenses)}
                  </td>
                  <td className="border-l border-dark-50/5" />
                </tr>

                {/* Залишок після витрат */}
                <tr className="border-t border-dark-50/10">
                  <td className="sticky left-0 z-10 bg-dark-600 px-2 py-3 border-r border-dark-50/5" />
                  <td className="sticky left-8 z-10 bg-dark-600 px-3 py-3 border-r border-dark-50/5">
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">Залишок після витрат</span>
                  </td>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                    const rem = data.monthly_remaining[m] ?? 0;
                    const isOver = rem < 0;
                    return (
                      <td key={m} className="px-1.5 py-3 text-right text-xs font-semibold tabular-nums">
                        <span className={isOver
                          ? "text-red-400 bg-red-500/10 px-1 py-0.5 rounded"
                          : "text-emerald-400"
                        }>
                          {isOver && "−"}
                          {fmt(Math.abs(rem))}
                          {isOver && <span className="ml-0.5 text-[9px]">!</span>}
                        </span>
                      </td>
                    );
                  })}
                  <td className={`px-3 py-3 text-right text-xs font-bold border-l border-dark-50/5 tabular-nums ${yearlyTotals.remaining < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {yearlyTotals.remaining < 0 && "−"}
                    {fmt(Math.abs(yearlyTotals.remaining))}
                  </td>
                  <td className="border-l border-dark-50/5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Empty / loading state */}
        {loading && !data && (
          <LoadingSpinner label="Завантаження…" />
        )}
      </div>

      {/* ── Легенда типів ── */}
      <div className="flex flex-wrap gap-3 px-1">
        {[
          { label: "заплановано", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
          { label: "план±", cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
          { label: "авто", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
          { label: "з модуля", cls: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
          { label: "інфо", cls: "bg-gray-500/15 text-gray-500 border-gray-500/20" },
        ].map(({ label, cls }) => (
          <span key={label} className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>
            {label}
          </span>
        ))}
        <span className="text-[10px] text-gray-600 self-center">
          — комірки ···  потребують заповнення; <span className="text-gray-400 bg-amber-500/5 border border-amber-500/20 px-1 rounded">···</span> = незаповнено
        </span>
      </div>

      {/* ── Copy modal ── */}
      {copyModal && (
        <CopyMonthModal
          state={copyModal}
          onClose={() => setCopyModal(null)}
          onApply={handleCopyApply}
        />
      )}
    </div>
  );
}
