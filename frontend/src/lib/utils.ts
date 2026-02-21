import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Форматує число у гривневому форматі (uk-UA).
 * Приклад: 1234.5 → "1 234,50"
 */
export function fmtUAH(n: number) {
  return Number(n).toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
