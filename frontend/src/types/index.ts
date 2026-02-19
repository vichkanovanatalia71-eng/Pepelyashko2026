export interface User {
  id: number;
  email: string;
  full_name: string;
  fop_group: number;
  tax_rate: number;
  is_active: boolean;
}

export interface Income {
  id: number;
  amount: number;
  description: string;
  source: string;
  payment_method: string;
  date: string;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  category_id: number | null;
  date: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
}

export interface PeriodReport {
  period: string;
  total_income: number;
  total_expenses: number;
  net_profit: number;
  tax_single: number;
  tax_esv: number;
  total_taxes: number;
  income_after_taxes: number;
}

export interface TaxSummary {
  quarter: string;
  income: number;
  single_tax: number;
  esv: number;
  total: number;
}

// ── НСЗУ ────────────────────────────────────────────────────────────

export interface Doctor {
  id: number;
  full_name: string;
  is_owner: boolean;
  is_active: boolean;
}

export interface AgeGroup {
  key: string;
  label: string;
}

export interface NhsuSettings {
  id: number;
  capitation_rate: number;
  coeff_0_5: number;
  coeff_6_17: number;
  coeff_18_39: number;
  coeff_40_64: number;
  coeff_65_plus: number;
  ep_rate: number;
  vz_rate: number;
}

export interface DoctorAgeGroupRow {
  age_group: string;
  age_group_label: string;
  age_coefficient: number;
  patient_count: number;
  non_verified: number;
  amount: number;
  ep_amount: number;
  vz_amount: number;
  ep_vz_amount: number;
}

export interface DoctorSummary {
  doctor_id: number;
  doctor_name: string;
  is_owner: boolean;
  rows: DoctorAgeGroupRow[];
  total_patients: number;
  total_non_verified: number;
  total_amount: number;
  total_ep: number;
  total_vz: number;
  total_ep_vz: number;
}

export interface AgeGroupSummary {
  age_group: string;
  age_group_label: string;
  age_coefficient: number;
  total_patients: number;
  total_non_verified: number;
  total_amount: number;
  total_ep: number;
  total_vz: number;
  total_ep_vz: number;
}

// ── Платні послуги ───────────────────────────────────────────────────

export interface MaterialItem {
  name: string;
  unit: string;
  quantity: number;
  cost: number;
}

export interface Service {
  id: number;
  code: string;
  name: string;
  price: number;
  materials: MaterialItem[];
  // Розраховані фінансові поля
  total_materials_cost: number;
  ep_amount: number;
  vz_amount: number;
  total_costs: number;
  net_income: number;
  doctor_income: number;
  org_income: number;
}

export type SortField =
  | "code"
  | "name"
  | "price"
  | "total_materials_cost"
  | "doctor_income"
  | "org_income";

export type SortDirection = "asc" | "desc";

export interface NhsuMonthlyReport {
  year: number;
  month: number;
  capitation_rate: number;
  ep_rate: number;
  vz_rate: number;
  doctors: DoctorSummary[];
  age_group_totals: AgeGroupSummary[];
  grand_total_patients: number;
  grand_total_non_verified: number;
  grand_total_amount: number;
  grand_total_ep: number;
  grand_total_vz: number;
  grand_total_ep_vz: number;
}
