import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Уніфікований діалог підтвердження.
 * Використовується для підтвердження видалення, скасування, тощо.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  icon,
  confirmLabel = "Підтвердити",
  cancelLabel = "Скасувати",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDanger = variant === "danger";

  const confirmClass = isDanger
    ? "bg-red-500 hover:bg-red-600 active:scale-97 text-white shadow-lg shadow-red-500/20"
    : "bg-orange-500 hover:bg-orange-600 active:scale-97 text-white shadow-lg shadow-orange-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative p-6 max-w-sm w-full my-auto animate-modal-in
                      rounded-2xl
                      bg-dark-600
                      border border-orange-500/25
                      shadow-[0_0_60px_rgba(249,115,22,0.22),0_0_120px_rgba(249,115,22,0.08),0_24px_70px_rgba(0,0,0,0.55),0_0_0_1px_rgba(249,115,22,0.12)]">

        {/* Top orange glow line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl
                        bg-gradient-to-r from-transparent via-orange-500/90 to-transparent
                        shadow-[0_0_20px_6px_rgba(249,115,22,0.20)]" />

        <button
          onClick={onCancel}
          aria-label="Закрити"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-500 hover:text-white
                     hover:bg-dark-300/50 active:scale-90
                     transition-all duration-150
                     focus-visible:outline-2 focus-visible:outline-accent-400"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4
                          glow-pulse
                          ${isDanger
                            ? "bg-red-500/15 shadow-[0_0_30px_rgba(239,68,68,0.35),0_0_60px_rgba(239,68,68,0.15),0_0_100px_rgba(239,68,68,0.06)]"
                            : "bg-orange-500/15 shadow-[0_0_30px_rgba(249,115,22,0.40),0_0_60px_rgba(249,115,22,0.18),0_0_100px_rgba(249,115,22,0.06)]"
                          }`}>
            {icon || <AlertTriangle size={26} className={isDanger ? "text-red-400" : "text-orange-400"} />}
          </div>
          <h3 id="confirm-title" className="text-lg font-semibold text-white mb-2">{title}</h3>
          {description && <p className="text-sm text-gray-400 mb-6 leading-relaxed">{description}</p>}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-gray-400
                       bg-dark-400 border border-dark-50/10 hover:text-white hover:bg-dark-300
                       hover:border-orange-500/20
                       active:scale-97 transition-all duration-150
                       focus-visible:outline-2 focus-visible:outline-accent-400"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold
                       active:scale-97 transition-all duration-150
                       focus-visible:outline-2 focus-visible:outline-accent-400 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
