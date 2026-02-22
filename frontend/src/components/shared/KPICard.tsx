import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, Info } from "lucide-react";
import { fmtUAH } from "../../lib/utils";

interface KPICardProps {
  label: string;
  value: number;
  icon: ReactNode;
  /** Колір тексту значення, наприклад "text-emerald-400" */
  color?: string;
  /** Колір рамки, наприклад "border-emerald-500/20" */
  borderColor?: string;
  /** % зміни до попереднього періоду */
  changePct?: number;
  /** Значення попереднього періоду */
  prevValue?: number;
  /** Середнє за 6 місяців */
  avgValue?: number;
  /** Підпис tooltip — що означає цей KPI */
  tooltip?: string;
  /** Слот для додаткового контенту знизу (спарклайн, підказка) */
  children?: ReactNode;
  onClick?: () => void;
}

/**
 * Уніфікована KPI-картка з порівняннями та tooltip.
 * Використовується на Dashboard, Revenue, SharePage для відображення ключових метрик.
 */
export default function KPICard({
  label,
  value,
  icon,
  color = "text-accent-400",
  borderColor = "border-accent-500/20",
  changePct,
  prevValue,
  avgValue,
  tooltip,
  children,
  onClick,
}: KPICardProps) {
  const Tag = onClick ? "button" : "div";
  const [showTooltip, setShowTooltip] = useState(false);

  const hasChange = changePct !== undefined && changePct !== 0;
  const changePositive = (changePct ?? 0) > 0;
  const changeColor = hasChange
    ? changePositive
      ? "text-emerald-400"
      : "text-red-400"
    : "text-gray-500";
  const ChangeIcon = hasChange
    ? changePositive
      ? ArrowUpRight
      : ArrowDownRight
    : Minus;

  return (
    <Tag
      onClick={onClick}
      className={`card-neo kpi-3d-hover card-tap p-4 lg:p-5 border ${borderColor} text-left w-full relative group
                  ${onClick ? "cursor-pointer" : ""}
                  focus-visible:outline-2 focus-visible:outline-accent-400`}
    >
      {/* Header row: icon + change badge */}
      <div className="flex items-center justify-between mb-3">
        {icon}
        {changePct !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg
                        ${hasChange
                          ? changePositive
                            ? "bg-emerald-500/10"
                            : "bg-red-500/10"
                          : "bg-dark-300/50"
                        } ${changeColor}`}
          >
            <ChangeIcon size={12} />
            {changePct > 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Label with info tooltip */}
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-xs lg:text-sm text-gray-500">{label}</p>
        {tooltip && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
            className="text-gray-600 hover:text-gray-400 transition-colors"
            aria-label="Інформація"
          >
            <Info size={12} />
          </button>
        )}
      </div>

      {/* Value */}
      <p className={`text-lg lg:text-2xl font-bold ${color} tabular-nums`}>
        {fmtUAH(value)}{" "}
        <span className="text-sm lg:text-base font-normal">&#8372;</span>
      </p>

      {/* Comparison row */}
      {(prevValue !== undefined || avgValue !== undefined) && (
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {prevValue !== undefined && (
            <span className="text-[10px] lg:text-xs text-gray-600">
              мин: {fmtUAH(prevValue)} ₴
            </span>
          )}
          {avgValue !== undefined && avgValue > 0 && (
            <span className="text-[10px] lg:text-xs text-gray-600">
              серед: {fmtUAH(avgValue)} ₴
            </span>
          )}
        </div>
      )}

      {/* Tooltip popup */}
      {showTooltip && tooltip && (
        <div className="absolute left-2 right-2 bottom-full mb-2 z-20 p-3 rounded-2xl
                        bg-dark-500 border border-dark-50/20 shadow-elevation-3
                        backdrop-blur-xl animate-enter-scale">
          <p className="text-xs text-gray-300 leading-relaxed">{tooltip}</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
            className="mt-2 text-xs text-accent-400 hover:text-accent-300"
          >
            Закрити
          </button>
        </div>
      )}

      {children}
    </Tag>
  );
}
