interface StatusBadgeProps {
  label: string;
  variant: "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
}

const VARIANTS = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  error:   "bg-red-500/15 text-red-400 border-red-500/20",
  info:    "bg-blue-500/15 text-blue-400 border-blue-500/20",
  neutral: "bg-dark-300/50 text-gray-400 border-dark-50/20",
} as const;

/**
 * Уніфікований бейдж статусу.
 * Використовується для відображення стану: сплачено, очікує, помилка, тощо.
 */
export default function StatusBadge({ label, variant, size = "sm" }: StatusBadgeProps) {
  const sizeClass = size === "sm"
    ? "px-2 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center font-medium rounded-lg border ${VARIANTS[variant]} ${sizeClass}`}>
      {label}
    </span>
  );
}
