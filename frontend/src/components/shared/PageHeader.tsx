import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

/**
 * Уніфікований заголовок сторінки.
 * Зліва — іконка + заголовок + підзаголовок, справа — слот для елементів керування.
 */
export default function PageHeader({ title, subtitle, icon, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 lg:mb-8 flex-wrap gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1 justify-center">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0 text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-gray-500 text-sm mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
