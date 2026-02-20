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
  tax_vz: number;
  total_taxes: number;
  income_after_taxes: number;
}

export interface TaxSummary {
  quarter: string;
  income: number;
  single_tax: number;
  esv: number;
  vz: number;
  total: number;
}

export interface MonthlyPL {
  month: number;
  month_name: string;
  income: number;
  expenses: number;
  net_profit: number;
  tax_single: number;
  tax_esv: number;
  tax_vz: number;
  total_taxes: number;
  income_after_taxes: number;
}

export interface AnnualReport {
  year: number;
  months: MonthlyPL[];
  total_income: number;
  total_expenses: number;
  total_net_profit: number;
  total_tax_single: number;
  total_tax_esv: number;
  total_tax_vz: number;
  total_taxes: number;
  total_income_after_taxes: number;
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
  esv_monthly: number;
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

// ── Щомісячний облік платних послуг ─────────────────────────────────

export interface ReportEntry {
  service_id: number;
  service_code: string;
  service_name: string;
  quantity: number;
}

export interface MonthReport {
  id: number;
  doctor_id: number;
  doctor_name: string;
  year: number;
  month: number;
  cash_in_register: number;
  status: "draft" | "final";
  entries: ReportEntry[];
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  total_revenue: number;
  total_quantity: number;
  avg_check: number;
  prev_month_revenue: number;
  prev_month_quantity: number;
  doctor_income: number;
  materials_cost: number;
  ep_amount: number;
  vz_amount: number;
  total_costs: number;
  org_income: number;
  cash_in_register: number;
  bank_amount: number;
}

export interface DoctorBreakdown {
  doctor_id: number;
  doctor_name: string;
  quantity: number;
}

export interface ServiceTableRow {
  service_id: number;
  code: string;
  name: string;
  price: number;
  total_quantity: number;
  by_doctor: DoctorBreakdown[];
  sum: number;
  materials: number;
  ep_amount: number;
  vz_amount: number;
  to_split: number;
  doctor_income: number;
  org_income: number;
}

export interface MonthlyTrendRow {
  year: number;
  month: number;
  quantity: number;
  sum: number;
  materials: number;
  ep_amount: number;
  vz_amount: number;
  to_split: number;
  doctor_income: number;
}

export interface TopMaterialRow {
  name: string;
  unit: string;
  total_quantity: number;
  total_cost: number;
  share_pct: number;
}

export interface AnalyticsData {
  dashboard: DashboardData;
  services_table: ServiceTableRow[];
  monthly_trend: MonthlyTrendRow[];
  top_materials: TopMaterialRow[];
  reports: MonthReport[];
  ep_rate: number;
  vz_rate: number;
}

export interface ShareResponse {
  token: string;
  url: string;
  expires_at: string;
}
