interface LoadingSpinnerProps {
  /** Висота контейнера (за замовчуванням h-64) */
  height?: string;
  /** Текст під спіннером */
  label?: string;
}

/**
 * Уніфікований індикатор завантаження.
 */
export default function LoadingSpinner({ height = "h-64", label }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${height} gap-3`} role="status" aria-live="polite">
      <div className="relative w-10 h-10">
        {/* Outer ring */}
        <div className="absolute inset-0 border-2 border-accent-500/20 rounded-full" />
        {/* Spinning ring */}
        <div className="absolute inset-0 border-2 border-transparent border-t-accent-500 rounded-full animate-spin" />
      </div>
      {label && <p className="text-sm text-gray-500 mt-1">{label}</p>}
      <span className="sr-only">Завантаження…</span>
    </div>
  );
}
