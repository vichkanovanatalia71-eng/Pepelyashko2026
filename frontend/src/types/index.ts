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
