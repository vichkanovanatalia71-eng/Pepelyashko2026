import type { ReactNode } from "react";
import { fmtUAH } from "../../lib/utils";

interface KPICardProps {
  label: string;
  value: number;
  icon: ReactNode;
  /** Колір тексту значення, наприклад "text-emerald-400" */
  color?: string;
  /** Колір рамки, наприклад "border-emerald-500/20" */
  borderColor?: string;
  /** Слот для додаткового контенту знизу (спарклайн, підказка) */
  children?: ReactNode;
  onClick?: () => void;
}

/**
 * Уніфікована KPI-картка.
 * Використовується на Dashboard, Revenue, SharePage для відображення ключових метрик.
 */
export default function KPICard({
  label,
  value,
  icon,
  color = "text-accent-400",
  borderColor = "border-accent-500/20",
  children,
  onClick,
}: KPICardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`card-neo kpi-3d-hover p-4 lg:p-6 border ${borderColor} text-left w-full
                  ${onClick ? "cursor-pointer" : ""}
                  focus-visible:outline-2 focus-visible:outline-accent-400`}
    >
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        {icon}
      </div>
      <p className="text-xs lg:text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-lg lg:text-2xl font-bold ${color} tabular-nums`}>
        {fmtUAH(value)}{" "}
        <span className="text-sm lg:text-base font-normal">&#8372;</span>
      </p>
      {children}
    </Tag>
  );
}
