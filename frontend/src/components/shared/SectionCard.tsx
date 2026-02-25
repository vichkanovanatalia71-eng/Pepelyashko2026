import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  icon?: ReactNode;
  /** Акцентний колір для іконки контейнера */
  iconBg?: string;
  /** Значення, що показується праворуч від заголовку */
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

/**
 * Уніфікована секційна картка.
 * Використовується для блоків з заголовком + контент (податки, підсумки, налаштування тощо).
 */
export default function SectionCard({
  title,
  icon,
  iconBg = "bg-accent-500/15",
  trailing,
  children,
  className = "",
  noPadding = false,
}: SectionCardProps) {
  return (
    <section className={`card-neo card-3d-hover overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-center gap-3 px-5 py-4 border-b border-dark-50/10
                        bg-dark-400/20 backdrop-blur-sm relative">
          {icon && (
            <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0
                            shadow-sm icon-badge`}>
              {icon}
            </div>
          )}
          <h3 className="font-semibold text-white text-sm">{title}</h3>
          {trailing && <div className="absolute right-5 top-1/2 -translate-y-1/2 shrink-0">{trailing}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "px-5 py-4"}>
        {children}
      </div>
    </section>
  );
}
