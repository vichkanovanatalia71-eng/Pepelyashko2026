import { Check, Users, Receipt, Clock } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface AccountantNotification {
  share_id: number;
  year: number;
  month: number;
  month_name: string;
  submitted_at: string | null;
  salary_count: number;
  salary_total: number;
  fixed_count: number;
  fixed_total: number;
  other_count: number;
  other_total: number;
  grand_total: number;
}

interface Props {
  notification: AccountantNotification;
  onDismiss: (shareId: number) => void;
}

export default function AccountantNotificationModal({ notification, onDismiss }: Props) {
  const n = notification;
  const submittedAt = n.submitted_at
    ? new Date(n.submitted_at).toLocaleString("uk-UA", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acc-notif-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
        style={{ animation: "fadeIn 0.25s ease forwards" }}
      />

      {/* Modal */}
      <div
        className="relative w-[90vw] max-w-lg rounded-2xl border border-teal-500/25 bg-dark-600 overflow-hidden"
        style={{
          animation: "modalScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          boxShadow:
            "0 0 35px rgba(20, 184, 166, 0.3), 0 0 70px rgba(20, 184, 166, 0.12), 0 0 110px rgba(20, 184, 166, 0.06), 0 12px 40px rgba(0, 0, 0, 0.45)",
        }}
      >
        {/* Top glow line */}
        <div className="h-[3px] bg-gradient-to-r from-transparent via-teal-400 to-transparent" />

        <div className="p-6 sm:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center"
              style={{
                boxShadow: "0 0 30px rgba(20, 184, 166, 0.25), 0 0 60px rgba(20, 184, 166, 0.1)",
                animation: "successPulse 2.5s ease-in-out infinite",
              }}
            >
              <Check size={30} className="text-teal-400" />
            </div>
          </div>

          {/* Title */}
          <h3
            id="acc-notif-title"
            className="text-xl font-bold text-white text-center mb-1"
          >
            Бухгалтер надіслав звіт
          </h3>
          <p className="text-sm text-gray-400 text-center mb-1">
            {n.month_name} {n.year}
          </p>
          {submittedAt && (
            <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1.5 mb-5">
              <Clock size={11} />
              {submittedAt}
            </p>
          )}

          {/* Summary grid */}
          <div className="space-y-2.5 mb-5">
            {n.salary_count > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users size={15} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Зарплати (брутто)</p>
                    <p className="text-[10px] text-gray-500">{n.salary_count} працівників</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-400 tabular-nums">
                  {fmt(n.salary_total)} грн
                </span>
              </div>
            )}

            {n.fixed_count > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Receipt size={15} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Постійні витрати</p>
                    <p className="text-[10px] text-gray-500">{n.fixed_count} позицій</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-orange-400 tabular-nums">
                  {fmt(n.fixed_total)} грн
                </span>
              </div>
            )}

            {n.other_count > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Receipt size={15} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Разові витрати</p>
                    <p className="text-[10px] text-gray-500">{n.other_count} позицій</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-purple-400 tabular-nums">
                  {fmt(n.other_total)} грн
                </span>
              </div>
            )}

            {/* Grand total */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-400/40 border border-dark-50/10">
              <span className="text-sm text-gray-400 font-medium">Загальна сума</span>
              <span className="text-lg font-bold text-white tabular-nums">
                {fmt(n.grand_total)} грн
              </span>
            </div>
          </div>

          {/* Info text */}
          <p className="text-xs text-gray-500 text-center mb-5">
            Дані записані в систему з позначкою «Бухгалтер». Ви можете переглянути деталі на сторінці Витрат.
          </p>

          {/* Dismiss button */}
          <button
            onClick={() => onDismiss(n.share_id)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgb(20, 184, 166), rgb(13, 148, 136))",
              boxShadow: "0 0 20px rgba(20, 184, 166, 0.3), 0 8px 20px rgba(20, 184, 166, 0.15)",
            }}
          >
            <Check size={16} />
            Зрозуміло
          </button>
        </div>
      </div>
    </div>
  );
}
