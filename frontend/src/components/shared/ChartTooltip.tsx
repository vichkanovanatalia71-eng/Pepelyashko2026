import { fmt } from "../../pages/expenses/constants";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill?: string }>;
  label?: string;
}

export function EnhancedTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-dark-700 border border-dark-50/30 rounded-lg p-3 shadow-lg backdrop-blur-sm">
      {label && <p className="text-xs text-gray-400 mb-1.5">{label}</p>}
      <div className="space-y-1">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {item.fill && (
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.fill }}
              />
            )}
            <span className="text-xs text-gray-300">{item.name}:</span>
            <span className="text-sm font-semibold text-white font-mono tabular-nums">
              {fmt(item.value)} ₴
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
