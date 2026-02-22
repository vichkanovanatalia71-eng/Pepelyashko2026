interface StatusBadgeProps {
  label: string;
  variant: "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
}

const VARIANTS = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.08)]",
  warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20 shadow-[0_0_8px_rgba(250,204,21,0.08)]",
  error:   "bg-red-500/15 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(248,113,113,0.08)]",
  info:    "bg-blue-500/15 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(96,165,250,0.08)]",
  neutral: "bg-dark-300/50 text-gray-400 border-dark-50/20",
} as const;

/**
 * Уніфікований бейдж статусу.
 * Використовується для відображення стану: сплачено, очікує, помилка, тощо.
 */
export default function StatusBadge({ label, variant, size = "sm" }: StatusBadgeProps) {
  const sizeClass = size === "sm"
    ? "px-2.5 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center font-medium rounded-lg border ${VARIANTS[variant]} ${sizeClass}`}>
      {label}
    </span>
  );
}
