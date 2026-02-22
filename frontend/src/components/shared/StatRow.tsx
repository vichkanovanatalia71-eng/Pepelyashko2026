import { fmtUAH } from "../../lib/utils";

interface StatRowProps {
  label: string;
  value: number;
  /** Колір тексту значення */
  color?: string;
  /** Жирний шрифт */
  bold?: boolean;
  /** Кольоровий індикатор зліва */
  dot?: string;
  /** Показувати верхню рамку */
  borderTop?: boolean;
}

/**
 * Уніфікований рядок статистики (ключ–значення).
 * Використовується в Dashboard, Taxes, Expenses Summary тощо.
 */
export default function StatRow({
  label,
  value,
  color = "text-gray-200",
  bold = false,
  dot,
  borderTop = false,
}: StatRowProps) {
  return (
    <div
      className={`flex items-center justify-between py-3 gap-2
                  ${borderTop ? "border-t border-dark-50/10 pt-3" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {dot && <div className={`w-2 h-2 rounded-full ${dot} shrink-0`} />}
        <span className={bold ? "text-white font-medium text-sm" : "text-gray-400 text-sm"}>
          {label}
        </span>
      </div>
      <span className={`font-mono tabular-nums whitespace-nowrap ${color} ${bold ? "font-bold text-base" : "font-semibold text-sm"}`}>
        {fmtUAH(value)} ₴
      </span>
    </div>
  );
}
