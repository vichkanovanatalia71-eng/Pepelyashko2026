import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "Січень", "Лютий", "Березень", "Квітень",
  "Травень", "Червень", "Липень", "Серпень",
  "Вересень", "Жовтень", "Листопад", "Грудень",
];

interface MonthNavigatorProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  disableNext?: boolean;
  /** Показувати тільки рік (для TaxesPage) */
  yearOnly?: boolean;
}

/**
 * Єдиний компонент навігації по місяцях/роках.
 * Використовується на Dashboard, Expenses, Revenue, NHSU тощо.
 */
export default function MonthNavigator({
  year,
  month,
  onPrev,
  onNext,
  disableNext = false,
  yearOnly = false,
}: MonthNavigatorProps) {
  const label = yearOnly ? `${year}` : `${MONTH_NAMES[month]} ${year}`;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Навігація по періоду">
      <button
        onClick={onPrev}
        aria-label="Попередній період"
        className="p-2 rounded-xl bg-dark-300 border border-dark-50/10 text-gray-400
                   hover:text-white hover:bg-dark-200 transition-all
                   focus-visible:outline-2 focus-visible:outline-accent-400"
      >
        <ChevronLeft size={18} />
      </button>
      <span
        className="px-4 py-2 rounded-xl bg-dark-300 border border-dark-50/10
                   text-white font-bold text-sm sm:text-base min-w-[120px] sm:min-w-[160px] text-center select-none"
      >
        {label}
      </span>
      <button
        onClick={onNext}
        disabled={disableNext}
        aria-label="Наступний період"
        className={`p-2 rounded-xl bg-dark-300 border border-dark-50/10 transition-all
                    focus-visible:outline-2 focus-visible:outline-accent-400
                    ${disableNext
                      ? "text-gray-700 cursor-not-allowed"
                      : "text-gray-400 hover:text-white hover:bg-dark-200"
                    }`}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export { MONTH_NAMES };
