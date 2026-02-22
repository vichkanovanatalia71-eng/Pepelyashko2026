import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

/**
 * Уніфікований заголовок сторінки.
 * Зліва — заголовок + підзаголовок, справа — слот для елементів керування.
 */
export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 lg:mb-8 flex-wrap gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-gray-500 text-sm mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
