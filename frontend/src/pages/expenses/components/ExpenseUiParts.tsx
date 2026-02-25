import { Lock, X, Eye, AlertCircle, Copy, RefreshCw } from "lucide-react";
import { fmt } from "../constants";

// ── Calculation Row ───────────────────────────────────────────────
export function CalcRow({
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

// ── Tax Row ───────────────────────────────────────────────────────
export function TaxRow({
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

// ── Summary Row ───────────────────────────────────────────────────
export function SummaryRow({
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

// ── KPI Card ──────────────────────────────────────────────────────
export function KpiCard({
  label, value, color, icon, onClick,
}: {
  label: string; value: number; color: string; icon: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      className={`card-neo kpi-3d-hover p-4 flex flex-col gap-2 ${onClick ? "card-tap cursor-pointer hover:border-accent-500/40 transition-all" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          {onClick && <Eye size={11} className="text-gray-600" />}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`} aria-hidden="true">
            {icon}
          </div>
        </div>
      </div>
      <p className="font-bold text-lg font-mono leading-tight tabular-nums">
        {fmt(value)} <span className="text-sm font-normal text-gray-500">₴</span>
      </p>
    </div>
  );
}

// ── Checkbox Toggle ───────────────────────────────────────────────
export function CheckboxToggle({
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
            <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

// ── Modal Backdrop ────────────────────────────────────────────────
export function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-start justify-center sm:p-4 overflow-y-auto modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-dark-600 rounded-t-3xl sm:rounded-2xl w-full max-w-md sm:my-auto animate-modal-in modal-glow expense-sheet-modal pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h4 className="font-semibold text-white text-sm">{title}</h4>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all focus-visible:outline-2 focus-visible:outline-accent-400"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ── Modal Field ───────────────────────────────────────────────────
export function ModalField({
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

// ── Drawer Section Modal Shell ────────────────────────────────────
export function DrawerModalShell({
  ariaLabel, icon, iconBg, title, subtitle, onClose, children,
}: {
  ariaLabel: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-start justify-center sm:p-4 overflow-y-auto modal-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-dark-600 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full flex flex-col sm:my-auto animate-modal-in expense-sheet-modal pb-[env(safe-area-inset-bottom)]" style={{ border: "1px solid #ffffff15", maxHeight: "92vh", maxWidth: "900px" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">{title}</h3>
              <div className="text-xs mt-0.5">{subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Закрити">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Copy From Previous Month Prompt ──────────────────────────────
export function CopyFromPrevPrompt({
  isEmpty, sectionCopied, prevMonthLoaded, hasPrev, isPrevLocked,
  prevMonthLabel, prevCountLabel, onCopy, copyLoading,
}: {
  isEmpty: boolean;
  sectionCopied: boolean;
  prevMonthLoaded: boolean;
  hasPrev: boolean;
  isPrevLocked: boolean;
  prevMonthLabel: string;
  prevCountLabel: string;
  onCopy: () => void;
  copyLoading: boolean;
}) {
  if (!isEmpty || sectionCopied || !prevMonthLoaded) return null;

  if (!hasPrev) {
    return (
      <div className="px-5 py-4 border-t border-dark-50/10 bg-dark-400/10">
        <p className="text-xs text-gray-600 text-center">Немає даних у попередньому місяці для перенесення.</p>
      </div>
    );
  }

  if (!isPrevLocked) {
    return (
      <div className="px-5 py-4 border-t border-dark-50/10 bg-dark-400/10">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Неможливо перенести дані з <strong>{prevMonthLabel}</strong> — попередній місяць не зафіксовано.
            Спочатку зафіксуйте попередній період.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-dark-50/10 bg-dark-400/10">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-500/10 border border-accent-500/20">
        <Copy size={15} className="text-accent-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-gray-200">
            Перенести дані з <strong className="text-white">{prevMonthLabel}</strong>?
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{prevCountLabel}</p>
        </div>
        <button
          onClick={onCopy}
          disabled={copyLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-xs font-semibold transition-all disabled:opacity-50"
        >
          {copyLoading ? <RefreshCw size={13} className="animate-spin" /> : <Copy size={13} />}
          Перенести
        </button>
      </div>
    </div>
  );
}
