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

  const confirmClass = variant === "danger"
    ? "bg-red-500 hover:bg-red-600 text-white"
    : "btn-accent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative card-neo border border-dark-50/10 p-6 max-w-sm w-full animate-modal-in">
        <button
          onClick={onCancel}
          aria-label="Закрити"
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-500 hover:text-white transition-colors
                     focus-visible:outline-2 focus-visible:outline-accent-400"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
            variant === "danger" ? "bg-red-500/15" : "bg-accent-500/15"
          }`}>
            {icon || <AlertTriangle size={24} className={variant === "danger" ? "text-red-400" : "text-accent-400"} />}
          </div>
          <h3 id="confirm-title" className="text-lg font-semibold text-white mb-2">{title}</h3>
          {description && <p className="text-sm text-gray-400 mb-6">{description}</p>}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400
                       bg-dark-400 border border-dark-50/10 hover:text-white hover:bg-dark-300 transition-all
                       focus-visible:outline-2 focus-visible:outline-accent-400"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                       focus-visible:outline-2 focus-visible:outline-accent-400 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
