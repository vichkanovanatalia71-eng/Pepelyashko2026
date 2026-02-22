import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Уніфікований стан «нема даних».
 * Показується коли сторінка/секція не має даних для відображення.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="card-neo p-12 text-center animate-enter-up" role="status">
      <div className="flex justify-center mb-4 text-gray-600">
        <div className="w-16 h-16 rounded-2xl bg-dark-400/50 flex items-center justify-center
                        shadow-neo-inset">
          {icon || <Inbox size={32} strokeWidth={1.5} />}
        </div>
      </div>
      <p className="text-gray-400 text-lg font-medium">{title}</p>
      {description && (
        <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
