import { X, Copy, ExternalLink, Link } from "lucide-react";

interface ShareLinkModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  expiresAt: string;
  icon: React.ReactNode;
  iconColor?: string;
  title: string;
  description: string;
  accentClass?: string;
}

export function ShareLinkModal({
  open, onClose, url, expiresAt,
  icon, title, description, accentClass = "accent",
}: ShareLinkModalProps) {
  if (!open) return null;

  const btnPrimary = accentClass === "orange"
    ? "bg-orange-500 text-white hover:bg-orange-400"
    : "bg-accent-500 text-white hover:bg-accent-400";
  const btnSecondary = accentClass === "orange"
    ? "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
    : "bg-accent-500/10 border-accent-500/20 text-accent-400 hover:bg-accent-500/20";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:flex-row sm:items-start sm:justify-center sm:p-4 overflow-hidden sm:overflow-y-auto modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative bg-dark-600 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full flex flex-col sm:my-auto animate-modal-in expense-sheet-modal"
        style={{ border: "1px solid #ffffff15", maxWidth: "28rem", height: "85dvh", maxHeight: "85dvh" }}
      >
        {/* Drag indicator (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {icon}
            <h4 className="font-semibold text-white text-base">{title}</h4>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <p className="text-xs text-gray-500 mb-4">
            {description} (до {expiresAt}).
          </p>
          <div className="flex items-center gap-2 bg-dark-400/40 rounded-xl p-3 mb-5">
            <Link size={14} className="text-gray-500 shrink-0" />
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 bg-transparent text-sm text-gray-200 font-mono outline-none"
              onFocus={e => e.target.select()}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(url)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${btnSecondary}`}
            >
              <Copy size={14} /> Копіювати
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${btnPrimary}`}
            >
              <ExternalLink size={14} /> Відкрити
            </a>
          </div>
          <div className="flex gap-2 mt-3">
            <a
              href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 text-xs hover:text-white hover:border-dark-50/40 transition-all"
            >
              Email
            </a>
            <a
              href={`viber://forward?text=${encodeURIComponent(url)}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 text-xs hover:text-white hover:border-dark-50/40 transition-all"
            >
              Viber
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dark-50/20 text-gray-400 text-xs hover:text-white hover:border-dark-50/40 transition-all"
            >
              Telegram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
