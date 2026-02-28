import type { AiParsedExpense } from "../../../types";

export type ExpenseCategory =
  | "fixed" | "salary" | "salary_paid"
  | "owner_own" | "owner_hired" | "owner_paid"
  | "other" | "taxes" | "general";

export interface SalaryFormState {
  brutto: string;
  has_supplement: boolean;
  target_net: string;
  individual_bonus: string;
  paid_services_from_module: boolean;
  saving: boolean;
}

export interface OtherExpense {
  id: number;
  name: string;
  description: string;
  amount: number;
  category: ExpenseCategory | string;
  year: number;
  month: number;
  edited_by?: string | null;
  edited_at?: string | null;
  visible_to_accountant?: boolean;
}

export interface DetailRow {
  name: string;
  category: string;
  amount: number;
}

export interface AnnualMonthData {
  month: number;
  fixed: number;
  salary: number;
  taxes: number;
  other: number;
  income: number;
  total: number;
  remaining: number;
}

export interface KpiModalState {
  open: boolean;
  type: "fixed" | "salary" | "other" | "taxes" | "total" | "remaining" | "";
  title: string;
}

export type DrawerSection = "fixed" | "salary" | "other" | "taxes" | "summary" | null;

export interface FixedModalState {
  open: boolean;
  isEdit: boolean;
  id: number | null;
  name: string;
  desc: string;
  amount: string;
  recurring: boolean;
  saving: boolean;
}

export interface StaffModalState {
  open: boolean;
  isEdit: boolean;
  id: number | null;
  fullName: string;
  position: string;
  role: "doctor" | "nurse" | "other";
  doctorId: number | null;
  saving: boolean;
}

export interface OtherModalState {
  open: boolean;
  isEdit: boolean;
  id: number | null;
  name: string;
  desc: string;
  amount: string;
  category: string;
  saving: boolean;
}

export interface CopyModalState {
  open: boolean;
  srcYear: number;
  srcMonth: number;
  copyFixed: boolean;
  copySalary: boolean;
  saving: boolean;
}

export interface AiModalState {
  open: boolean;
  text: string;
  file: File | null;
  loading: boolean;
  result: AiParsedExpense | null;
  error?: string;
}

export interface ShareModalState {
  open: boolean;
  url: string;
  expiresAt: string;
}

export interface ConfirmDlgState {
  title: string;
  description?: string;
  variant?: "danger" | "default";
  confirmLabel?: string;
  action: () => void;
}

export interface AlertDlgState {
  title: string;
  description?: string;
}
