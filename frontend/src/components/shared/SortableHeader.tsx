import { ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey?: string;
  sortDirection?: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey;
  const arrowIcon =
    isActive && sortDirection === "asc" ? (
      <ArrowUp size={14} />
    ) : isActive && sortDirection === "desc" ? (
      <ArrowDown size={14} />
    ) : null;

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1.5 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap transition-colors ${
        isActive
          ? "text-accent-400"
          : "text-gray-500 hover:text-gray-300"
      } ${className}`}
    >
      {label}
      {arrowIcon && <span className={isActive ? "text-accent-400" : "text-gray-600"}>{arrowIcon}</span>}
    </button>
  );
}

export function useSortableData<T extends Record<string, any>>(
  data: T[],
  initialSortKey?: string,
  initialDirection?: SortDirection
) {
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey);
  const [direction, setDirection] = useState<SortDirection>(initialDirection ?? null);

  const sortedData = useMemo(() => {
    if (!sortKey || !direction) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null || bVal == null) return 0;

      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (direction === "asc") {
        return aStr.localeCompare(bStr, "uk-UA");
      }
      return bStr.localeCompare(aStr, "uk-UA");
    });
  }, [data, sortKey, direction]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (direction === "asc") {
        setDirection("desc");
      } else {
        setSortKey(undefined);
        setDirection(null);
      }
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  return { sortedData, sortKey, direction, handleSort };
}
