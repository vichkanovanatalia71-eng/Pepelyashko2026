// ── Staff types ───────────────────────────────────────────────────────
export interface StaffMember {
  id: number;
  full_name: string;
  role: "doctor" | "nurse" | "other";
  position: string;
  is_active: boolean;
  doctor_id: number | null;
}

// ── Revenue analytics types ──────────────────────────────────────────
export interface DoctorRevenue {
  doctor_id: number;
  doctor_name: string;
  nhsu: number;
  paid_services: number;
  total: number;
}
export interface ServiceRevenue {
  service_id: number;
  code: string;
  name: string;
  quantity: number;
  revenue: number;
}
export interface MonthlyRevenueTrend {
  year: number;
  month: number;
  month_name: string;
  nhsu: number;
  paid_services: number;
  total: number;
}
export interface AiRecommendation {
  type: string;  // "risk" | "opportunity" | "warning" | "insight"
  title: string;
  description: string;
  data_basis: string;
}
export interface IntegrityWarning {
  type: string;
  message: string;
}
export interface RevenueAnalytics {
  year: number;
  month: number;
  period_label: string;
  total: number;
  nhsu: number;
  paid_services: number;
  nhsu_pct: number;
  paid_pct: number;
  avg_per_doctor: number;
  prev_total: number;
  prev_nhsu: number;
  prev_paid: number;
  mom_pct: number;
  by_doctor: DoctorRevenue[];
  top_services: ServiceRevenue[];
  monthly_trend: MonthlyRevenueTrend[];
  recommendations: AiRecommendation[];
  warnings: IntegrityWarning[];
}

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
  category_id: number | null;
  date: string;
}

export interface IncomeCategory {
  id: number;
  name: string;
  description: string;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  category_id: number | null;
  staff_member_id: number | null;
  date: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
}

export interface ExpenseTemplate {
  id: number;
  name: string;
  amount: number;
  description: string;
  category_id: number | null;
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
  pdfo_rate: number;
  vz_zp_rate: number;
  esv_employer_rate: number;
}

// ── Structured monthly expenses ──────────────────────────────────────
export interface MonthlyTaxRates {
  pdfo_rate: number;
  vz_zp_rate: number;
  esv_employer_rate: number;
  ep_rate: number;
  vz_rate: number;
}

export interface FixedExpenseRow {
  id: number;
  name: string;
  description: string;
  amount: number;
  is_recurring: boolean;
  edited_by?: string | null;
  edited_at?: string | null;
}

export interface SalaryExpenseRow {
  staff_member_id: number;
  full_name: string;
  role: "doctor" | "nurse" | "other";
  brutto: number;
  pdfo: number;
  vz_zp: number;
  esv: number;
  netto: number;
  has_supplement: boolean;
  target_net: number | null;
  supplement: number;
  individual_bonus: number;
  paid_services_from_module: boolean;
  paid_services_income: number;
  total_employer_cost: number;
  // НСЗУ дані (для пов'язаних лікарів)
  doctor_id: number | null;
  nhsu_brutto: number;
  nhsu_ep: number;
  nhsu_vz: number;
  is_owner: boolean;
  edited_by?: string | null;
  edited_at?: string | null;
}

export interface TaxBlock {
  nhsu_income: number;
  paid_services_income: number;
  total_income: number;
  ep_rate: number;
  vz_rate: number;
  ep: number;
  vz: number;
  esv_owner: number;
  esv_employer: number;
}

export interface ExpenseTotals {
  fixed_total: number;
  salary_total: number;
  tax_total: number;
  grand_total: number;
  income: number;
  remaining: number;
}

export interface HiredDoctorInfo {
  doctor_id: number;
  doctor_name: string;
  nhsu_brutto: number;
  nhsu_ep: number;
  nhsu_vz: number;
  staff_member_id: number | null;
  staff_brutto: number;
  staff_total_employer_cost: number;
}

export interface OwnerBlock {
  doctor_id: number;
  doctor_name: string;
  nhsu_brutto: number;
  paid_services_income: number;
  ep_all: number;
  vz_all: number;
  esv_owner: number;
  hired_doctors: HiredDoctorInfo[];
}

export interface MonthlyExpenseData {
  year: number;
  month: number;
  settings: MonthlyTaxRates;
  fixed: FixedExpenseRow[];
  salary: SalaryExpenseRow[];
  taxes: TaxBlock;
  totals: ExpenseTotals;
  owner?: OwnerBlock;
  is_locked: boolean;
  missing_salary_staff: string[];
  accountant_submitted_at?: string | null;
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
  quantity: number | string;
  cost: number | string;
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
  | "ep_amount"
  | "vz_amount"
  | "total_costs"
  | "net_income"
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

// ── Dashboard (enriched) ─────────────────────────────────────────────

export interface CategoryBreakdown {
  name: string;
  amount: number;
  pct: number;
}

export interface TrendPoint {
  month_name: string;
  income: number;
  expenses: number;
  profit: number;
  taxes: number;
}

export interface DashboardInsight {
  type: string;
  title: string;
  description: string;
}

export interface DoctorRevenue {
  doctor_id: number;
  doctor_name: string;
  nhsu: number;
  paid_services: number;
  total: number;
}

export interface ServiceRevenue {
  service_id: number;
  code: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface AiInsight {
  type: string;
  title: string;
  description: string;
  data_basis?: string;
}

export interface DataIntegrityWarning {
  type: string;
  message: string;
}

// ── ПРІОРИТЕТ 1: Пацієнти ────────────────────────────────────────────

export interface AgeGroupBreakdown {
  age_group: string;
  age_label: string;
  patient_count: number;
  non_verified: number;
  pct: number;
}

export interface DoctorPatientLoad {
  doctor_id: number;
  doctor_name: string;
  patient_count: number;
  patient_count_prev: number;
  patient_count_change_pct: number;
  services_count: number;
  revenue_per_patient: number;
}

// ── ПРІОРИТЕТ 1: Персонал & ФОП ───────────────────────────────────────

export interface StaffRoleBreakdown {
  role: string;
  role_label: string;
  count: number;
  salary_total: number;
  salary_netto_total: number;
  pdfo_total: number;
  vz_total: number;
  esv_employer_total: number;
  salary_brutto_total: number;
  individual_bonus_total: number;
  supplement_total: number;
  total_employer_cost: number;
  pct: number;
}

export interface OwnerFinancialInfo {
  doctor_id: number;
  doctor_name: string;
  is_owner: boolean;
  nhsu_income: number;
  paid_services_income: number;
  total_income: number;
  ep_amount: number;
  vz_amount: number;
  esv_owner_amount: number;
  total_taxes: number;
  income_after_taxes: number;
}

// ── ПРІОРИТЕТ 1: Платні послуги ───────────────────────────────────────

export interface DoctorServiceBreakdown {
  doctor_id: number;
  doctor_name: string;
  quantity: number;
  revenue: number;
}

export interface ServiceBreakdownDetail {
  service_id: number;
  code: string;
  name: string;
  quantity: number;
  revenue: number;
  materials_cost: number;
  margin: number;
  margin_pct: number;
  by_doctor: DoctorServiceBreakdown[];
}

export interface DashboardReport {
  year: number;
  month: number;
  period_label: string;

  // ── Основні фінансові показники
  total_income: number;
  total_expenses: number;
  net_profit: number;
  tax_single: number;
  tax_esv: number;
  tax_vz: number;
  total_taxes: number;
  income_after_taxes: number;

  prev_income: number;
  prev_expenses: number;
  prev_profit: number;
  prev_taxes: number;

  income_change_pct: number;
  expenses_change_pct: number;
  profit_change_pct: number;
  taxes_change_pct: number;

  avg_income_6m: number;
  avg_expenses_6m: number;
  avg_profit_6m: number;

  // ── Доходи
  income_by_category: CategoryBreakdown[];
  top_income_sources: CategoryBreakdown[];
  nhsu_income: number;
  paid_services_income: number;
  nhsu_pct: number;
  paid_pct: number;
  income_by_doctor: DoctorRevenue[];
  top_services: ServiceRevenue[];

  // ── Витрати
  expense_by_category: CategoryBreakdown[];
  top_expense_items: CategoryBreakdown[];
  fixed_expenses: number;
  salary_expenses: number;

  // ── Податки
  tax_single_rate: number;
  tax_esv_monthly: number;
  tax_vz_rate: number;

  // ── Операційні показники
  total_services_count: number;
  services_by_doctor: Record<string, number>;
  active_doctors_count: number;

  // ── ПРІОРИТЕТ 1: ПАЦІЄНТИ ──
  patients_by_age: AgeGroupBreakdown[];
  patients_by_doctor: DoctorPatientLoad[];
  total_patients: number;
  total_patients_prev: number;
  total_patients_change_pct: number;
  total_non_verified: number;
  total_non_verified_pct: number;

  // ── ПРІОРИТЕТ 1: ПЕРСОНАЛ & ФОП ──
  staff_by_role: StaffRoleBreakdown[];
  owner_info: OwnerFinancialInfo | null;
  total_staff_count: number;
  fop_total: number;
  fop_pct: number;

  // ── ПРІОРИТЕТ 1: ПЛАТНІ ПОСЛУГИ ──
  top_paid_services: ServiceBreakdownDetail[];
  paid_services_total_revenue: number;
  paid_services_total_qty: number;
  services_total_margin: number;
  services_margin_pct: number;

  // ── Цілісність даних
  data_integrity_warnings: DataIntegrityWarning[];
  missing_salary_staff: string[];

  // ── Тренди
  trend: TrendPoint[];

  // ── AI Аналітика
  insights: DashboardInsight[];
  ai_insights: AiInsight[];
}

// ── Monthly expense periods & AI ─────────────────────────────────────

export interface PeriodSummary {
  year: number;
  month: number;
  fixed_total: number;
  salary_brutto_total: number;
  is_locked: boolean;
  has_data: boolean;
}

export interface AiParsedExpense {
  category: string;       // "fixed" | "other"
  name: string;
  amount: number;
  is_recurring: boolean;
  confidence: number;     // 0–1
  note: string;
}
