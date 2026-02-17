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
  default_coefficient: number;
}

export interface DoctorAgeGroupRow {
  age_group: string;
  age_group_label: string;
  age_coefficient: number;
  patient_count: number;
  non_verified: number;
  amount: number;
  ep_vz: number;
}

export interface DoctorSummary {
  doctor_id: number;
  doctor_name: string;
  is_owner: boolean;
  rows: DoctorAgeGroupRow[];
  total_patients: number;
  total_amount: number;
  total_ep_vz: number;
}

export interface NhsuMonthlyReport {
  year: number;
  month: number;
  capitation_rate: number;
  doctors: DoctorSummary[];
  grand_total_patients: number;
  grand_total_non_verified: number;
  grand_total_amount: number;
  grand_total_ep_vz: number;
  esv_amount: number;
  paid_services_amount: number;
  owner_declaration_income: number;
  owner_other_doctor_income: number;
  total_income: number;
  withdrawal_amount: number;
}
