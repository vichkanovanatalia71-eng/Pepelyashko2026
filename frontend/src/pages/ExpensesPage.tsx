import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  Lock,
  TrendingDown,
  Users,
  Receipt,
  AlertCircle,
} from "lucide-react";
import api from "../api/client";
import type {
  MonthlyExpenseData,
  FixedExpenseRow,
  SalaryExpenseRow,
} from "../types";

const MONTH_NAMES = [
  "Січень","Лютий","Березень","Квітень","Травень","Червень",
  "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень",
];

const ROLE_LABELS: Record<string, string> = {
  doctor: "Лікар",
  nurse:  "Медична сестра",
  other:  "Інший персонал",
};

const fmt = (n: number) =>
  n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Salary card form state ─────────────────────────────────────────
interface SalaryFormState {
  brutto: string;
  has_supplement: boolean;
  target_net: string;
  individual_bonus: string;
  paid_services_from_module: boolean;
  saving: boolean;
}

function initSalaryForm(row: SalaryExpenseRow): SalaryFormState {
  return {
    brutto: row.brutto > 0 ? String(row.brutto) : "",
    has_supplement: row.has_supplement,
    target_net: row.target_net != null ? String(row.target_net) : "",
    individual_bonus: row.individual_bonus > 0 ? String(row.individual_bonus) : "",
    paid_services_from_module: row.paid_services_from_module,
    saving: false,
  };
}

// ── Fixed expense pending state ────────────────────────────────────
interface FixedPending {
  amount: string;
  is_recurring: boolean;
  saving: boolean;
}

export default function ExpensesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<MonthlyExpenseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixedPending, setFixedPending] = useState<Record<string, FixedPending>>({});
  const [salaryForms, setSalaryForms] = useState<Record<number, SalaryFormState>>({});

  // ── Load data ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: resp } = await api.get<MonthlyExpenseData>("/monthly-expenses/", {
        params: { year, month },
      });
      setData(resp);

      const fp: Record<string, FixedPending> = {};
      for (const row of resp.fixed) {
        fp[row.category_key] = {
          amount: row.amount > 0 ? String(row.amount) : "",
          is_recurring: row.is_recurring,
          saving: false,
        };
      }
      setFixedPending(fp);

      const sf: Record<number, SalaryFormState> = {};
      for (const row of resp.salary) {
        sf[row.staff_member_id] = initSalaryForm(row);
      }
      setSalaryForms(sf);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // ── Month navigation ───────────────────────────────────────────
  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // ── Save fixed expense ─────────────────────────────────────────
  async function saveFixed(key: string) {
    const pending = fixedPending[key];
    if (!pending) return;
    setFixedPending(p => ({ ...p, [key]: { ...p[key], saving: true } }));
    try {
      await api.put("/monthly-expenses/fixed", {
        year, month,
        category_key: key,
        amount: parseFloat(pending.amount) || 0,
        is_recurring: pending.is_recurring,
      });
      await load();
    } catch (e) {
      console.error(e);
      setFixedPending(p => ({ ...p, [key]: { ...p[key], saving: false } }));
    }
  }

  // ── Save salary expense ────────────────────────────────────────
  async function saveSalary(staffId: number) {
    const form = salaryForms[staffId];
    if (!form) return;
    setSalaryForms(s => ({ ...s, [staffId]: { ...s[staffId], saving: true } }));
    try {
      await api.put("/monthly-expenses/salary", {
        year, month,
        staff_member_id: staffId,
        brutto: parseFloat(form.brutto) || 0,
        has_supplement: form.has_supplement,
        target_net: form.has_supplement && form.target_net ? parseFloat(form.target_net) : null,
        individual_bonus: parseFloat(form.individual_bonus) || 0,
        paid_services_from_module: form.paid_services_from_module,
      });
      await load();
    } catch (e) {
      console.error(e);
      setSalaryForms(s => ({ ...s, [staffId]: { ...s[staffId], saving: false } }));
    }
  }

  // ── Live salary calc ───────────────────────────────────────────
  function calcSalary(form: SalaryFormState) {
    const s = data?.settings;
    if (!s) return { pdfo: 0, vz_zp: 0, esv: 0, netto: 0, supplement: 0, total_employer: 0 };
    const brutto = parseFloat(form.brutto) || 0;
    const pdfo = Math.round(brutto * s.pdfo_rate / 100 * 100) / 100;
    const vz_zp = Math.round(brutto * s.vz_zp_rate / 100 * 100) / 100;
    const esv = Math.round(brutto * s.esv_employer_rate / 100 * 100) / 100;
    const netto = Math.round((brutto - pdfo - vz_zp) * 100) / 100;
    const targetNet = form.has_supplement && form.target_net ? parseFloat(form.target_net) : null;
    const supplement = targetNet != null ? Math.max(0, Math.round((targetNet - netto) * 100) / 100) : 0;
    const indBonus = parseFloat(form.individual_bonus) || 0;
    const total_employer = Math.round((brutto + esv + supplement + indBonus) * 100) / 100;
    return { pdfo, vz_zp, esv, netto, supplement, total_employer };
  }

  // ── Check if fixed row is dirty ────────────────────────────────
  function isFixedDirty(key: string, row: FixedExpenseRow): boolean {
    const p = fixedPending[key];
    if (!p) return false;
    return (parseFloat(p.amount) || 0) !== row.amount ||
           p.is_recurring !== row.is_recurring;
  }

  function isSalaryDirty(staffId: number, row: SalaryExpenseRow): boolean {
    const f = salaryForms[staffId];
    if (!f) return false;
    return (parseFloat(f.brutto) || 0) !== row.brutto ||
           f.has_supplement !== row.has_supplement ||
           (parseFloat(f.target_net) || 0) !== (row.target_net ?? 0) ||
           (parseFloat(f.individual_bonus) || 0) !== row.individual_bonus ||
           f.paid_services_from_module !== row.paid_services_from_module;
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={20} className="text-accent-400 animate-spin mr-2" />
        <span className="text-gray-500">Завантаження...</span>
      </div>
    );
  }

  const remaining = data?.totals.remaining ?? 0;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ══ Header ══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Витрати</h2>
          {data && (
            <p className="text-gray-500 text-sm mt-1">
              Всього:{" "}
              <span className="text-red-400 font-semibold">{fmt(data.totals.grand_total)} ₴</span>
              {"  ·  "}
              Залишок:{" "}
              <span className={remaining >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                {remaining >= 0 ? "+" : ""}{fmt(remaining)} ₴
              </span>
            </p>
          )}
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-1 bg-dark-500/50 border border-dark-50/15 rounded-2xl px-2 py-1.5">
          <button onClick={prevMonth}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-dark-300 transition-all">
            <ChevronLeft size={18} />
          </button>
          <span className="px-3 text-sm font-semibold text-white min-w-[140px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-dark-300 transition-all">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* ════════════════════════════════════════════
              БЛОК 1: ПОСТІЙНІ ВИТРАТИ
          ════════════════════════════════════════════ */}
          <section className="card-neo overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-50/10 bg-dark-400/20">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <TrendingDown size={16} className="text-blue-400" />
              </div>
              <h3 className="font-semibold text-white text-sm">Постійні витрати</h3>
              <span className="ml-auto text-sm font-mono font-semibold text-blue-400">
                {fmt(data.totals.fixed_total)} ₴
              </span>
            </div>

            <div className="divide-y divide-dark-50/5">
              {data.fixed.map((row) => {
                const pending = fixedPending[row.category_key];
                if (!pending) return null;
                const dirty = isFixedDirty(row.category_key, row);
                return (
                  <div key={row.category_key}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-dark-400/20 transition-colors">

                    <span className="text-sm text-gray-300 w-44 shrink-0">{row.category_name}</span>

                    <div className="flex-1 max-w-[160px]">
                      <div className="relative">
                        <input
                          type="number" step="0.01" min="0"
                          value={pending.amount}
                          onChange={e => setFixedPending(p => ({
                            ...p, [row.category_key]: { ...p[row.category_key], amount: e.target.value }
                          }))}
                          onKeyDown={e => { if (e.key === "Enter") saveFixed(row.category_key); }}
                          className="input-dark text-right pr-8 py-2 text-sm"
                          placeholder="0.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                      </div>
                    </div>

                    {/* Recurring toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <div
                        onClick={() => setFixedPending(p => ({
                          ...p,
                          [row.category_key]: {
                            ...p[row.category_key],
                            is_recurring: !p[row.category_key].is_recurring
                          }
                        }))}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                          pending.is_recurring
                            ? "bg-accent-500 border-accent-500"
                            : "border-dark-50/30 bg-dark-300"
                        }`}
                      >
                        {pending.is_recurring && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 hidden sm:inline">Постійна</span>
                    </label>

                    <button
                      onClick={() => saveFixed(row.category_key)}
                      disabled={!dirty || pending.saving}
                      title="Зберегти"
                      className={`p-1.5 rounded-lg transition-all shrink-0 ${
                        dirty ? "text-accent-400 hover:bg-accent-500/10" : "text-gray-700 cursor-default"
                      }`}
                    >
                      {pending.saving
                        ? <RefreshCw size={13} className="animate-spin" />
                        : <Save size={13} />
                      }
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-5 py-3 bg-dark-400/20 border-t border-dark-50/10">
              <span className="text-sm font-semibold text-gray-400">Разом постійні витрати</span>
              <span className="font-bold text-blue-400 font-mono">{fmt(data.totals.fixed_total)} ₴</span>
            </div>
          </section>

          {/* ════════════════════════════════════════════
              БЛОК 2: ЗАРПЛАТНІ ВИТРАТИ
          ════════════════════════════════════════════ */}
          <section className="card-neo overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-50/10 bg-dark-400/20">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                <Users size={16} className="text-purple-400" />
              </div>
              <h3 className="font-semibold text-white text-sm">Зарплатні витрати</h3>
              <span className="ml-auto text-sm font-mono font-semibold text-purple-400">
                {fmt(data.totals.salary_total)} ₴
              </span>
            </div>

            {data.salary.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-gray-600 text-sm">Немає активних співробітників.</p>
                <p className="text-gray-700 text-xs mt-1">Додайте персонал у розділі «Налаштування».</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-50/5">
                {data.salary.map((row) => {
                  const form = salaryForms[row.staff_member_id];
                  if (!form) return null;
                  const calc = calcSalary(form);
                  const dirty = isSalaryDirty(row.staff_member_id, row);

                  return (
                    <div key={row.staff_member_id} className="p-5">
                      <div className="flex items-start justify-between mb-4 gap-2">
                        <div>
                          <p className="font-semibold text-white text-sm">{row.full_name}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                            {ROLE_LABELS[row.role] ?? row.role}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500">Витрати роботодавця</p>
                          <p className="font-bold text-purple-400 font-mono text-base">{fmt(calc.total_employer)} ₴</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Left: inputs */}
                        <div className="space-y-3">
                          <div>
                            <label className="label-dark">Офіційна зарплата (брутто)</label>
                            <div className="relative">
                              <input type="number" step="0.01" min="0"
                                value={form.brutto}
                                onChange={e => setSalaryForms(s => ({
                                  ...s,
                                  [row.staff_member_id]: { ...s[row.staff_member_id], brutto: e.target.value }
                                }))}
                                className="input-dark pr-8"
                                placeholder="0.00"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                            </div>
                          </div>

                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <div
                              onClick={() => setSalaryForms(s => ({
                                ...s,
                                [row.staff_member_id]: {
                                  ...s[row.staff_member_id],
                                  has_supplement: !s[row.staff_member_id].has_supplement
                                }
                              }))}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                form.has_supplement
                                  ? "bg-accent-500 border-accent-500"
                                  : "border-dark-50/30 bg-dark-300"
                              }`}
                            >
                              {form.has_supplement && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                              )}
                            </div>
                            <span className="text-sm text-gray-300">Є доплата</span>
                          </label>

                          {form.has_supplement && (
                            <div>
                              <label className="label-dark">Цільова сума на руки</label>
                              <div className="relative">
                                <input type="number" step="0.01" min="0"
                                  value={form.target_net}
                                  onChange={e => setSalaryForms(s => ({
                                    ...s,
                                    [row.staff_member_id]: {
                                      ...s[row.staff_member_id],
                                      target_net: e.target.value
                                    }
                                  }))}
                                  className="input-dark pr-8"
                                  placeholder="0.00"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                              </div>
                            </div>
                          )}

                          {/* Doctor-specific */}
                          {row.role === "doctor" && (
                            <>
                              <label className="flex items-center gap-2.5 cursor-pointer">
                                <div
                                  onClick={() => setSalaryForms(s => ({
                                    ...s,
                                    [row.staff_member_id]: {
                                      ...s[row.staff_member_id],
                                      paid_services_from_module:
                                        !s[row.staff_member_id].paid_services_from_module
                                    }
                                  }))}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                    form.paid_services_from_module
                                      ? "bg-accent-500 border-accent-500"
                                      : "border-dark-50/30 bg-dark-300"
                                  }`}
                                >
                                  {form.paid_services_from_module && (
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                      <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm text-gray-300">Оплата за платні послуги</span>
                              </label>

                              <div>
                                <label className="label-dark">Індивідуальні доплати</label>
                                <div className="relative">
                                  <input type="number" step="0.01" min="0"
                                    value={form.individual_bonus}
                                    onChange={e => setSalaryForms(s => ({
                                      ...s,
                                      [row.staff_member_id]: {
                                        ...s[row.staff_member_id],
                                        individual_bonus: e.target.value
                                      }
                                    }))}
                                    className="input-dark pr-8"
                                    placeholder="0.00"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">₴</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Right: auto-calculated */}
                        <div className="bg-dark-400/30 rounded-xl p-4 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Автоматичний розрахунок
                          </p>
                          <CalcRow label="Брутто" value={parseFloat(form.brutto) || 0} color="text-white" />
                          <CalcRow
                            label={`ПДФО ${data.settings.pdfo_rate}%`}
                            value={calc.pdfo}
                            color="text-gray-500"
                            info="Інформаційно"
                          />
                          <CalcRow
                            label={`ВЗ із ЗП ${data.settings.vz_zp_rate}%`}
                            value={calc.vz_zp}
                            color="text-gray-500"
                            info="Інформаційно"
                          />
                          <div className="border-t border-dark-50/10 pt-2">
                            <CalcRow label="Нетто (на руки)" value={calc.netto} color="text-emerald-400" bold />
                          </div>
                          <CalcRow
                            label={`ЄСВ роботодавця ${data.settings.esv_employer_rate}%`}
                            value={calc.esv}
                            color="text-red-400"
                          />
                          {form.has_supplement && calc.supplement > 0 && (
                            <CalcRow
                              label="Доплата до цільової суми"
                              value={calc.supplement}
                              color="text-amber-400"
                            />
                          )}
                          {row.role === "doctor" && form.paid_services_from_module && (
                            <CalcRow
                              label="Оплата за послуги (модуль)"
                              value={row.paid_services_income}
                              color="text-blue-400"
                              locked
                            />
                          )}
                          {row.role === "doctor" && (parseFloat(form.individual_bonus) || 0) > 0 && (
                            <CalcRow
                              label="Індивідуальна доплата"
                              value={parseFloat(form.individual_bonus) || 0}
                              color="text-amber-400"
                            />
                          )}
                          <div className="border-t border-dark-50/10 pt-2">
                            <CalcRow
                              label="Витрати роботодавця"
                              value={calc.total_employer}
                              color="text-purple-400"
                              bold
                            />
                          </div>
                        </div>
                      </div>

                      {dirty && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => saveSalary(row.staff_member_id)}
                            disabled={form.saving}
                            className="btn-accent text-sm py-2 px-5 flex items-center gap-2"
                          >
                            {form.saving
                              ? <RefreshCw size={14} className="animate-spin" />
                              : <Save size={14} />
                            }
                            Зберегти
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between px-5 py-3 bg-dark-400/20 border-t border-dark-50/10">
              <span className="text-sm font-semibold text-gray-400">Разом зарплатні витрати</span>
              <span className="font-bold text-purple-400 font-mono">{fmt(data.totals.salary_total)} ₴</span>
            </div>
          </section>

          {/* ════════════════════════════════════════════
              БЛОК 3: ПОДАТКИ
          ════════════════════════════════════════════ */}
          <section className="card-neo overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-50/10 bg-dark-400/20">
              <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <Receipt size={16} className="text-red-400" />
              </div>
              <h3 className="font-semibold text-white text-sm">Податки</h3>
              <span className="ml-auto text-sm font-mono font-semibold text-red-400">
                {fmt(data.totals.tax_total)} ₴
              </span>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="bg-dark-400/20 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Джерела доходу</p>
                <TaxRow label="Дохід НСЗУ" value={data.taxes.nhsu_income} />
                <TaxRow label="Платні послуги" value={data.taxes.paid_services_income} />
                <div className="border-t border-dark-50/10 pt-2">
                  <TaxRow label="Загальний дохід" value={data.taxes.total_income} bold />
                </div>
              </div>

              <div className="bg-dark-400/20 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Нараховані податки</p>
                <TaxRow label={`ЄП (${data.taxes.ep_rate}%)`} value={data.taxes.ep} />
                <TaxRow label={`ВЗ від доходу (${data.taxes.vz_rate}%)`} value={data.taxes.vz} />
                <div className="border-t border-dark-50/10 pt-2">
                  <TaxRow label="Разом податки" value={data.totals.tax_total} bold color="text-red-400" />
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════
              ПІДСУМКИ
          ════════════════════════════════════════════ */}
          <section className="card-neo overflow-hidden">
            <div className="px-5 py-5 space-y-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Підсумки — {MONTH_NAMES[month - 1]} {year}
              </p>
              <SummaryRow label="Постійні витрати" value={data.totals.fixed_total} color="text-blue-400" />
              <SummaryRow label="Зарплатні витрати" value={data.totals.salary_total} color="text-purple-400" />
              <SummaryRow label="Податки" value={data.totals.tax_total} color="text-red-400" />
              <div className="border-t border-dark-50/10 pt-2.5">
                <SummaryRow label="Всього витрат за місяць" value={data.totals.grand_total} color="text-white" bold />
              </div>
              <SummaryRow label="Дохід за місяць" value={data.totals.income} color="text-emerald-400" bold />
              <div className="border-t border-dark-50/10 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-300">Залишок після витрат</span>
                  <div className="flex items-center gap-2">
                    {remaining < 0 && <AlertCircle size={16} className="text-red-400" />}
                    <span className={`font-bold text-xl font-mono ${remaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {remaining >= 0 ? "+" : ""}{fmt(remaining)} ₴
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────

function CalcRow({
  label, value, color = "text-gray-300", info, locked, bold
}: {
  label: string; value: number; color?: string;
  info?: string; locked?: boolean; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm gap-2">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {locked && <Lock size={11} className="text-gray-600 shrink-0" />}
        <span className="text-gray-400 truncate">{label}</span>
        {info && <span className="text-xs text-gray-600 italic shrink-0">({info})</span>}
      </div>
      <span className={`font-mono shrink-0 ${color} ${bold ? "font-bold" : ""}`}>
        {fmt(value)} ₴
      </span>
    </div>
  );
}

function TaxRow({
  label, value, bold, color = "text-gray-300"
}: {
  label: string; value: number; bold?: boolean; color?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm gap-2">
      <div className="flex items-center gap-1.5">
        <Lock size={11} className="text-gray-600 shrink-0" />
        <span className={bold ? "text-gray-200 font-semibold" : "text-gray-400"}>{label}</span>
      </div>
      <span className={`font-mono ${color} ${bold ? "font-bold" : ""}`}>{fmt(value)} ₴</span>
    </div>
  );
}

function SummaryRow({
  label, value, color = "text-gray-300", bold
}: {
  label: string; value: number; color?: string; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? "text-gray-200 font-semibold" : "text-gray-400"}>{label}</span>
      <span className={`font-mono ${color} ${bold ? "font-bold" : ""}`}>{fmt(value)} ₴</span>
    </div>
  );
}
