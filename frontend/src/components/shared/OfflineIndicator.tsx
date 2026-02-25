import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[110] flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/90 backdrop-blur-sm text-white text-sm font-medium"
      style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      role="alert"
    >
      <WifiOff size={16} className="animate-pulse" />
      <span>Немає з'єднання з інтернетом</span>
    </div>
  );
}
