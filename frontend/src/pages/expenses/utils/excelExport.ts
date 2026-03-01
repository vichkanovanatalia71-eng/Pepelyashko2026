import * as XLSX from "xlsx";
import type { MonthlyExpenseData } from "../../../types";
import type { OtherExpense } from "../types";
import { ROLE_LABELS } from "../constants";
import { MONTH_NAMES } from "../../../components/shared/MonthNavigator";
import { calcNetto } from "./salaryCalculations";

export function exportExpenseExcel(
  data: MonthlyExpenseData,
  otherExpenses: OtherExpense[],
  otherTotal: number,
  grandWithOther: number,
  remaining: number,
  year: number,
  month: number,
) {
  const wb = XLSX.utils.book_new();
  const monthName = MONTH_NAMES[month - 1] ?? `Місяць ${month}`;

  // ── Sheet 1: Summary ──
  const summaryRows: (string | number)[][] = [
    [`ЗВЕДЕНИЙ ЗВІТ ВИТРАТ — ${monthName} ${year}`],
    [],
    ["РОЗДІЛ", "СТАТТЯ", "СУМА (₴)"],
    [],
    ["═══ ДОХОДИ ═══", "", ""],
    ["Дохід", "Дохід НСЗУ", data.taxes.nhsu_income],
    ["Дохід", "Платні послуги", data.taxes.paid_services_income],
    ["", "ЗАГАЛЬНИЙ ДОХІД", data.totals.income],
    [],
    ["═══ ПОСТІЙНІ ВИТРАТИ ═══", "", ""],
    ...data.fixed.filter(r => r.amount > 0).map(r => [
      "Постійні", `${r.name}${r.is_recurring ? " (постійна)" : ""}`, r.amount,
    ] as (string | number)[]),
    ["", "Разом постійні", data.totals.fixed_total],
    [],
    ["═══ ЗАРПЛАТНІ ВИТРАТИ ═══", "", ""],
  ];

  for (const r of data.salary) {
    summaryRows.push(["Зарплата", `${r.full_name} — Брутто`, r.brutto]);
    summaryRows.push(["Зарплата", `${r.full_name} — ЄСВ роботодавця (${data.settings.esv_employer_rate}%)`, r.esv]);
    if (r.supplement > 0) summaryRows.push(["Зарплата", `${r.full_name} — Доплата до цільової суми`, r.supplement]);
    if (r.individual_bonus > 0) summaryRows.push(["Зарплата", `${r.full_name} — Індивідуальна доплата`, r.individual_bonus]);
    if (r.paid_services_income > 0) summaryRows.push(["Зарплата", `${r.full_name} — Оплата за платні послуги`, r.paid_services_income]);
    summaryRows.push(["Зарплата", `${r.full_name} — ВСЬОГО витрати роботодавця`, r.total_employer_cost]);
    if (r.nhsu_brutto > 0) {
      summaryRows.push(["Зарплата", `${r.full_name} — НСЗУ брутто`, r.nhsu_brutto]);
      summaryRows.push(["Зарплата", `${r.full_name} — НСЗУ ЄП`, r.nhsu_ep]);
      summaryRows.push(["Зарплата", `${r.full_name} — НСЗУ ВЗ`, r.nhsu_vz]);
    }
    const netto = calcNetto(r.brutto, data.settings.pdfo_rate, data.settings.vz_zp_rate);
    summaryRows.push(["Зарплата", `${r.full_name} — Нетто (на руки)`, netto]);
    summaryRows.push([]);
  }
  summaryRows.push(["", "Разом зарплатні", data.totals.salary_total]);
  summaryRows.push([]);

  if (otherExpenses.length > 0) {
    summaryRows.push(["═══ ІНШІ ВИТРАТИ ═══", "", ""]);
    for (const r of otherExpenses) {
      summaryRows.push(["Інші", `${r.name}${r.description ? ` (${r.description})` : ""}`, r.amount]);
    }
    summaryRows.push(["", "Разом інші", otherTotal]);
    summaryRows.push([]);
  }

  summaryRows.push(["═══ ПОДАТКИ ═══", "", ""]);
  summaryRows.push(["Податки", `Єдиний податок (${data.taxes.ep_rate}%)`, data.taxes.ep]);
  summaryRows.push(["Податки", `Військовий збір (${data.taxes.vz_rate}%)`, data.taxes.vz]);
  summaryRows.push(["Податки", "ЄСВ власника (щомісячний)", data.taxes.esv_owner]);
  summaryRows.push(["Податки", `ЄСВ роботодавця (${data.settings.esv_employer_rate}%)`, data.taxes.esv_employer]);
  summaryRows.push(["", "Разом податки", data.totals.tax_total]);
  summaryRows.push([]);

  if (data.owner) {
    summaryRows.push(["═══ БЛОК ВЛАСНИКА ═══", "", ""]);
    summaryRows.push(["Власник", data.owner.doctor_name, ""]);
    summaryRows.push(["Власник", "НСЗУ брутто", data.owner.nhsu_brutto]);
    summaryRows.push(["Власник", "Платні послуги (дохід лікаря)", data.owner.paid_services_income]);
    summaryRows.push(["Власник", "ЄП всього", data.owner.ep_all]);
    summaryRows.push(["Власник", "ВЗ всього", data.owner.vz_all]);
    summaryRows.push(["Власник", "ЄСВ власника", data.owner.esv_owner]);
    if (data.owner.hired_doctors.length > 0) {
      summaryRows.push([]);
      summaryRows.push(["Власник", "Наймані лікарі:", ""]);
      for (const hd of data.owner.hired_doctors) {
        summaryRows.push(["Найм. лікар", `${hd.doctor_name} — НСЗУ`, hd.nhsu_brutto]);
        summaryRows.push(["Найм. лікар", `${hd.doctor_name} — ЄП`, hd.nhsu_ep]);
        summaryRows.push(["Найм. лікар", `${hd.doctor_name} — ВЗ`, hd.nhsu_vz]);
        summaryRows.push(["Найм. лікар", `${hd.doctor_name} — Витрати роботодавця`, hd.staff_total_employer_cost]);
      }
      summaryRows.push([]);
    }
  }

  summaryRows.push(["═══ ПІДСУМКИ ═══", "", ""]);
  summaryRows.push(["Підсумок", "Загальний дохід", data.totals.income]);
  summaryRows.push(["Підсумок", "Всього витрат", grandWithOther]);
  summaryRows.push(["Підсумок", "ЗАЛИШОК", remaining]);
  summaryRows.push([]);
  summaryRows.push(["═══ СТАВКИ ═══", "", ""]);
  summaryRows.push(["Ставка", "ЄП", `${data.taxes.ep_rate}%`]);
  summaryRows.push(["Ставка", "ВЗ від доходу", `${data.taxes.vz_rate}%`]);
  summaryRows.push(["Ставка", "ЄСВ роботодавця", `${data.settings.esv_employer_rate}%`]);
  summaryRows.push(["Ставка", "ЄСВ власника (місячний)", data.taxes.esv_owner]);

  const ws = XLSX.utils.aoa_to_sheet(summaryRows);
  ws["!cols"] = [{ wch: 18 }, { wch: 48 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, "Зведена таблиця");

  // ── Sheet 2: Staff ──
  const staffHeader = [
    "ПІБ", "Роль", "Брутто", "ЄСВ роботодавця", "Доплата", "Бонус",
    "Платні послуги", "Нетто (на руки)", "Витрати роботодавця",
    "НСЗУ брутто", "НСЗУ ЄП", "НСЗУ ВЗ",
  ];
  const staffRows = data.salary.map(r => {
    const netto = calcNetto(r.brutto, data.settings.pdfo_rate, data.settings.vz_zp_rate);
    return [
      r.full_name, ROLE_LABELS[r.role] ?? r.role,
      r.brutto, r.esv, r.supplement, r.individual_bonus,
      r.paid_services_income, netto, r.total_employer_cost,
      r.nhsu_brutto, r.nhsu_ep, r.nhsu_vz,
    ];
  });
  const ws2 = XLSX.utils.aoa_to_sheet([
    [`Персонал — ${monthName} ${year}`],
    [],
    staffHeader,
    ...staffRows,
  ]);
  ws2["!cols"] = staffHeader.map(() => ({ wch: 16 }));
  (ws2["!cols"] as { wch: number }[])[0] = { wch: 30 };
  XLSX.utils.book_append_sheet(wb, ws2, "Персонал");

  XLSX.writeFile(wb, `витрати_${year}_${String(month).padStart(2, "0")}.xlsx`);
}

export function exportReturnExpensesExcel(
  cashReturnFixed: { id: number; name: string; amount: number }[],
  cashReturnOther: { id: number; name: string; amount: number }[],
  cashReturnSum: number,
  supplements: { full_name: string; supplement: number }[],
  supplementsTotal: number,
  doctorIncomes: { doctor_name: string; income: number }[],
  doctorIncomeTotal: number,
  cashInRegister: number,
  withdrawToCard: number,
  year: number,
  month: number,
) {
  const wb = XLSX.utils.book_new();
  const monthName = MONTH_NAMES[month - 1] ?? `Місяць ${month}`;

  const rows: (string | number)[][] = [
    [`ВИТРАТИ НА ПОВЕРНЕННЯ — ${monthName} ${year}`],
    [],
    ["КАТЕГОРІЯ", "СТАТТЯ", "СУМА (₴)"],
    [],
    ["═══ ПОВЕРНЕННЯ ГОТІВКИ ═══", "", ""],
  ];

  for (const r of cashReturnFixed) {
    rows.push(["Постійна витрата", r.name, r.amount]);
  }
  for (const r of cashReturnOther) {
    rows.push(["Інша витрата", r.name, r.amount]);
  }
  rows.push(["", "Разом повернення готівки", cashReturnSum]);
  rows.push([]);

  rows.push(["═══ ДОПЛАТИ ДО ЦІЛЬОВОЇ СУМИ ═══", "", ""]);
  if (supplements.length === 0) {
    rows.push(["", "Немає доплат", 0]);
  } else {
    for (const r of supplements) {
      rows.push(["Доплата", `${r.full_name} — доплата`, r.supplement]);
    }
  }
  rows.push(["", "Разом доплати", supplementsTotal]);
  rows.push([]);

  rows.push(["═══ ДОХІД ЛІКАРІВ (ПЛАТНІ ПОСЛУГИ) ═══", "", ""]);
  if (doctorIncomes.length === 0) {
    rows.push(["", "Немає даних", 0]);
  } else {
    for (const d of doctorIncomes) {
      rows.push(["Дохід лікаря", d.doctor_name, d.income]);
    }
  }
  rows.push(["", "Разом дохід лікарів", doctorIncomeTotal]);
  rows.push([]);

  rows.push(["═══ ГОТІВКА В КАСІ ═══", "", ""]);
  rows.push(["Каса", `Готівка в касі за ${monthName} ${year}`, cashInRegister]);
  rows.push([]);

  rows.push(["═══ ПІДСУМОК ═══", "", ""]);
  rows.push(["Підсумок", "Витрати на повернення", cashReturnSum]);
  rows.push(["Підсумок", "+ Доплати до цільової суми", supplementsTotal]);
  rows.push(["Підсумок", "+ Дохід лікарів", doctorIncomeTotal]);
  rows.push(["Підсумок", "− Готівка в касі", cashInRegister]);
  rows.push(["", "ВИВЕСТИ НА КАРТКУ", withdrawToCard]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 48 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, "Витрати на повернення");

  XLSX.writeFile(wb, `повернення_${year}_${String(month).padStart(2, "0")}.xlsx`);
}

export function exportKpiExcel(
  rows: { name: string; detail?: string; amount: number }[],
  totalLabel: string,
  totalValue: number,
  title: string,
  type: string,
  year: number,
  month: number,
) {
  const wb = XLSX.utils.book_new();
  const header = ["Назва", "Деталі", "Сума (₴)"];
  const dataRows = rows.map(r => [r.name, r.detail ?? "", r.amount]);
  dataRows.push(["", totalLabel, totalValue]);
  const monthName = MONTH_NAMES[month - 1] ?? `Місяць ${month}`;
  const ws = XLSX.utils.aoa_to_sheet([
    [title],
    [`${monthName} ${year}`],
    [],
    header,
    ...dataRows,
  ]);
  ws["!cols"] = [{ wch: 40 }, { wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, "Деталі");
  XLSX.writeFile(wb, `${type}_${year}_${String(month).padStart(2, "0")}.xlsx`);
}
