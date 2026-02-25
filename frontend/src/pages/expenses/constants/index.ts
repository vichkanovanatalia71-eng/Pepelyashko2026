export const MONTH_SHORT = [
  "Січ", "Лют", "Бер", "Кві", "Тра", "Чер",
  "Лип", "Сер", "Вер", "Жов", "Лис", "Гру",
];

export const ROLE_LABELS: Record<string, string> = {
  doctor: "Лікар",
  nurse: "Медична сестра",
  other: "Інший персонал",
};

export const TT_STYLE = {
  background: "#1a1a2e",
  border: "1px solid #ffffff15",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

export const PIE_COLORS = ["#6366f1", "#a855f7", "#f59e0b", "#f43f5e", "#10b981"];

export const CATEGORY_BADGE: Record<string, { label: string; cls: string }> = {
  fixed: { label: "Постійні", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  salary: { label: "Зарплатні", cls: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  salary_paid: { label: "Платні послуги (ЗП)", cls: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  owner_own: { label: "Власник · Власні декл.", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  owner_hired: { label: "Власник · Найм. лікар", cls: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
  owner_paid: { label: "Власник · Платні послуги", cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  other: { label: "Інші", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  taxes: { label: "Податки", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
};

export const fmt = (n: number) =>
  n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
