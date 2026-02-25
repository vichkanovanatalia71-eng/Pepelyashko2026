import { AlertCircle } from 'lucide-react';

export function FormError({ message, visible = true }: { message?: string; visible?: boolean }) {
  if (!visible || !message) return null;

  return (
    <div className="flex items-start gap-1.5 mt-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-xs text-red-400">{message}</p>
    </div>
  );
}
