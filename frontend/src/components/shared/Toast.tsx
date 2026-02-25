import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

const ICON: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const STYLE: Record<ToastType, { icon: string; bg: string; border: string }> = {
  success: {
    icon: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
  },
  error: {
    icon: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
  },
  info: {
    icon: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove],
  );

  const value: ToastContextValue = {
    success: useCallback((msg: string) => add("success", msg), [add]),
    error: useCallback((msg: string) => add("error", msg), [add]),
    info: useCallback((msg: string) => add("info", msg), [add]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-[100] flex flex-col gap-2 sm:w-80"
          aria-live="polite"
        >
          {toasts.map((toast) => {
            const s = STYLE[toast.type];
            const Icon = ICON[toast.type];
            return (
              <div
                key={toast.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-elevation-2 ${s.bg} ${s.border}`}
                style={{ animation: "fadeSlideUp 0.3s ease both" }}
                role="status"
              >
                <Icon size={18} className={`${s.icon} shrink-0 mt-0.5`} />
                <p className="text-sm text-gray-200 flex-1 min-w-0">{toast.message}</p>
                <button
                  onClick={() => remove(toast.id)}
                  className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors shrink-0"
                  aria-label="Закрити"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
