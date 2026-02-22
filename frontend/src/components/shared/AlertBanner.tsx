import type { ReactNode } from "react";
import { AlertCircle, Bell, CheckCircle, Info, X } from "lucide-react";

interface AlertBannerProps {
  variant: "warning" | "error" | "success" | "info";
  children: ReactNode;
  onDismiss?: () => void;
}

const CONFIG = {
  warning: {
    icon: Bell,
    cls: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  },
  error: {
    icon: AlertCircle,
    cls: "bg-red-500/10 border-red-500/20 text-red-400",
  },
  success: {
    icon: CheckCircle,
    cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  },
  info: {
    icon: Info,
    cls: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  },
} as const;

/**
 * Уніфікований банер сповіщення.
 * Використовується для нагадувань, помилок, успішних операцій тощо.
 */
export default function AlertBanner({ variant, children, onDismiss }: AlertBannerProps) {
  const { icon: Icon, cls } = CONFIG[variant];

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${cls}`}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon size={16} className="shrink-0" aria-hidden="true" />
        <span className="text-sm">{children}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Закрити сповіщення"
          className="p-1 rounded-lg hover:bg-dark-300/50 transition-all shrink-0
                     focus-visible:outline-2 focus-visible:outline-accent-400"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
