import { useState, useCallback, useEffect } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

interface ExpandableChartProps {
  title: string;
  children: React.ReactNode;
  /** Render the full-screen version of the chart (receives isExpanded) */
  renderExpanded?: () => React.ReactNode;
  className?: string;
}

export function ExpandableChart({
  title,
  children,
  renderExpanded,
  className = "",
}: ExpandableChartProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((v) => !v), []);
  const close = useCallback(() => setExpanded(false), []);

  // Close on ESC key
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // Prevent body scroll while expanded
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [expanded, close]);

  return (
    <>
      {/* Inline chart with expand button */}
      <div className={`relative group ${className}`}>
        {children}
        <button
          onClick={toggle}
          title="Розгорнути графік"
          className="absolute top-2 right-2 z-10
                     w-8 h-8 rounded-lg bg-dark-500/80 backdrop-blur-sm
                     flex items-center justify-center
                     text-gray-400 hover:text-white hover:bg-dark-400
                     opacity-0 group-hover:opacity-100 focus:opacity-100
                     transition-all duration-200"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Full-screen modal overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-dark-700/95 backdrop-blur-md
                     flex flex-col animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — розгорнутий вигляд`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-dark-50/15">
            <h2 className="text-lg font-semibold text-white truncate">{title}</h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={close}
                className="w-9 h-9 rounded-lg bg-dark-400 flex items-center justify-center
                           text-gray-400 hover:text-white transition-colors"
                title="Згорнути"
              >
                <Minimize2 size={16} />
              </button>
              <button
                onClick={close}
                className="w-9 h-9 rounded-lg bg-dark-400 flex items-center justify-center
                           text-gray-400 hover:text-white transition-colors"
                title="Закрити"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Chart area — full viewport */}
          <div className="flex-1 p-4 sm:p-8 overflow-auto">
            <div className="w-full h-full min-h-[300px]">
              {renderExpanded ? renderExpanded() : children}
            </div>
          </div>

          {/* Zoom hint */}
          <div className="px-4 py-2 text-center border-t border-dark-50/10">
            <p className="text-xs text-gray-600">
              Натисніть ESC або кнопку закриття для повернення
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/** Hook for chart expand/collapse state */
export function useExpandableChart() {
  const [expanded, setExpanded] = useState(false);
  const open = useCallback(() => setExpanded(true), []);
  const close = useCallback(() => setExpanded(false), []);
  const toggle = useCallback(() => setExpanded((v) => !v), []);
  return { expanded, open, close, toggle };
}
