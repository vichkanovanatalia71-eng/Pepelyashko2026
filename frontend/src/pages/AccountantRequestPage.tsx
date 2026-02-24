import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import {
  ClipboardList,
  Clock,
  AlertCircle,
  Users,
  Receipt,
  Send,
  Check,
  Edit2,
  Plus,
  Trash2,
  RefreshCw,
  Info,
  History,
} from "lucide-react";
import { ConfirmDialog } from "../components/shared";

const fmt = (v: number) =>
  v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface StaffItem {
  staff_member_id: number;
  full_name: string;
  role: string;
  position: string;
  prev_brutto: number;
}

interface RecurringExpense {
  name: string;
  amount: number;
  category_key?: string;
  is_recurring?: boolean;
}

interface ShareData {
  token: string;
  filter_label: string;
  year: number;
  month: number;
  expires_at: string;
  submitted: boolean;
  submitted_data: {
    salaries: { staff_member_id: number; full_name: string; brutto: number }[];
    fixed_expenses: { name: string; amount: number; category: string; category_key?: string }[];
    other_expenses: { name: string; amount: number; category: string }[];
    submitted_at: string;
  } | null;
  data: {
    salary_staff: StaffItem[];
    recurring_expenses: RecurringExpense[];
    salary_from_previous?: boolean;
    salary_source_period?: string | null;
  };
}

interface SalaryRow {
  staff_member_id: number;
  full_name: string;
  role: string;
  position: string;
  brutto: number;
  prev_brutto: number;
}

interface ExpenseRow {
  id: number;
  name: string;
  amount: number | string;
  is_recurring: boolean;
  fromPrev: boolean;
  prevAmount: number;
  category_key?: string;
}

const MONTHS_UA = [
  "", "Січень", "Лютий", "Березень", "Квітень",
  "Травень", "Червень", "Липень", "Серпень",
  "Вересень", "Жовтень", "Листопад", "Грудень",
];

function prevPeriodLabel(year: number, month: number): string {
  const py = month > 1 ? year : year - 1;
  const pm = month > 1 ? month - 1 : 12;
  return `${MONTHS_UA[pm]} ${py}`;
}

export default function AccountantRequestPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [alertDlg, setAlertDlg] = useState<{ title: string; description?: string } | null>(null);

  // Form state
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [nextExpId, setNextExpId] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedResult, setSavedResult] = useState<ShareData["submitted_data"]>(null);
  const [editMode, setEditMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.get(`/monthly-expenses/accountant-request/${token}/view`);
      setData(r.data);
      initForm(r.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      console.error("AccountantRequest load error:", status, detail, err);
      if (status === 404) {
        setError(detail || "Посилання не знайдено або термін дії закінчився.");
      } else if (!err?.response) {
        setError("Не вдалося з'єднатися з сервером. Спробуйте оновити сторінку.");
      } else {
        setError(detail || `Помилка завантаження (${status}).`);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [token]);

  function initForm(d: ShareData, forceEditMode = false) {
    const isEditing = editMode || forceEditMode;

    if (d.submitted && d.submitted_data && !isEditing) {
      setSubmitted(true);
      setSavedResult(d.submitted_data);
    }

    // ── При редагуванні після надсилання: завантажуємо надіслані дані ──
    if (isEditing && d.submitted && d.submitted_data) {
      const sd = d.submitted_data;

      // Зарплати: дані працівників з payload + brutto з надісланих даних
      const submittedBrutto = new Map(
        sd.salaries.map((s) => [s.staff_member_id, s.brutto])
      );
      const rows: SalaryRow[] = (d.data.salary_staff || []).map((s) => ({
        staff_member_id: s.staff_member_id,
        full_name: s.full_name,
        role: s.role,
        position: s.position,
        brutto: submittedBrutto.get(s.staff_member_id) ?? s.prev_brutto,
        prev_brutto: s.prev_brutto,
      }));
      setSalaries(rows);

      // Витрати: об'єднуємо постійні + інші з надісланих даних
      let nextId = 1;
      const allExp: ExpenseRow[] = [
        ...(sd.fixed_expenses || []).map((fe) => ({
          id: nextId++,
          name: fe.name,
          amount: fe.amount,
          is_recurring: true,
          fromPrev: true,
          prevAmount: fe.amount,
          category_key: fe.category_key,
        })),
        ...(sd.other_expenses || []).map((oe) => ({
          id: nextId++,
          name: oe.name,
          amount: oe.amount,
          is_recurring: false,
          fromPrev: false,
          prevAmount: 0,
        })),
      ];
      setExpenses(allExp);
      setNextExpId(nextId);
      return;
    }

    // ── Перший візит: завантажуємо дані з payload ──
    const rows: SalaryRow[] = (d.data.salary_staff || []).map((s) => ({
      staff_member_id: s.staff_member_id,
      full_name: s.full_name,
      role: s.role,
      position: s.position,
      brutto: s.prev_brutto,
      prev_brutto: s.prev_brutto,
    }));
    setSalaries(rows);

    const recExp: ExpenseRow[] = (d.data.recurring_expenses || []).map((re, idx) => ({
      id: idx + 1,
      name: re.name,
      amount: re.amount,
      is_recurring: true,
      fromPrev: true,
      prevAmount: re.amount,
      category_key: re.category_key,
    }));
    setExpenses(recExp);
    setNextExpId(recExp.length + 1);
  }

  function handleSalaryChange(idx: number, val: string) {
    setSalaries((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], brutto: parseFloat(val) || 0 };
      return copy;
    });
  }

  function addExpense() {
    setExpenses((prev) => [
      ...prev,
      { id: nextExpId, name: "", amount: "", is_recurring: false, fromPrev: false, prevAmount: 0 },
    ]);
    setNextExpId((p) => p + 1);
  }

  function removeExpense(id: number) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function updateExpense(id: number, field: keyof ExpenseRow, val: string | boolean | number) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    );
  }

  async function handleSubmit() {
    if (!token) return;
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const res = await api.post(`/monthly-expenses/accountant-request/${token}/submit`, {
        salaries: salaries.map((s) => ({
          staff_member_id: s.staff_member_id,
          brutto: s.brutto,
        })),
        expenses: expenses
          .filter((e) => e.name.trim() && (parseFloat(String(e.amount)) || 0) > 0)
          .map((e) => ({
            name: e.name,
            amount: e.amount,
            is_recurring: e.is_recurring,
            category_key: e.category_key || undefined,
          })),
      });
      setSavedResult(res.data.saved);
      setEditMode(false);

      // Show success animation for ~5s before revealing result
      setSuccessAnim(true);
      setTimeout(() => {
        setSuccessAnim(false);
        setSubmitted(true);
      }, 5000);
    } catch (e) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: "Помилка надсилання даних" });
    }
    setSubmitting(false);
  }

  function handleEdit() {
    setSubmitted(false);
    setEditMode(true);
    if (data) initForm(data, true);
  }

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-700 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
          <span className="text-sm">Завантаження…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dark-700 flex items-center justify-center">
        <div className="card-neo p-8 text-center max-w-md">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-xl font-bold text-white mb-2">Посилання недійсне</h1>
          <p className="text-gray-400 text-sm mb-4">{error || "Термін дії закінчився."}</p>
          <button
            onClick={loadData}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium hover:bg-orange-500/20 transition-all"
          >
            <RefreshCw size={14} />
            Спробувати знову
          </button>
        </div>
      </div>
    );
  }

  const expiresDate = new Date(data.expires_at).toLocaleDateString("uk-UA");
  const prevLabel = prevPeriodLabel(data.year, data.month);
  const salaryTotal = salaries.reduce((sum, s) => sum + s.brutto, 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);

  // ── Submitted confirmation view — summary only ──
  if (submitted && savedResult) {
    const totalSalaries = (savedResult.salaries || []).reduce((s, r) => s + r.brutto, 0);
    const totalFixed = (savedResult.fixed_expenses || []).reduce((s, r) => s + r.amount, 0);
    const totalOther = (savedResult.other_expenses || []).reduce((s, r) => s + r.amount, 0);
    const grandTotal = totalSalaries + totalFixed + totalOther;
    const submittedAt = savedResult.submitted_at
      ? new Date(savedResult.submitted_at).toLocaleString("uk-UA", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : null;

    return (
      <div className="min-h-screen bg-dark-700 flex items-center justify-center py-8 px-4">
        <div className="w-[85vw] max-w-4xl space-y-6" style={{ animation: "fadeSlideUp 0.5s ease both" }}>
          {/* Success header card */}
          <div className="card-neo p-8 text-center relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4"
              style={{ boxShadow: "0 0 30px rgba(16, 185, 129, 0.2)" }}
            >
              <Check size={30} className="text-emerald-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">Звіт успішно надіслано</h1>
            <p className="text-sm text-gray-400 mb-1">{data.filter_label} — {MONTHS_UA[data.month]} {data.year}</p>
            {submittedAt && (
              <p className="text-xs text-gray-500">{submittedAt}</p>
            )}
            <p className="text-xs text-gray-500 mt-3 max-w-md mx-auto">
              Дані збережено у системі MedFlow. Власник побачить ваші зміни на сторінці Витрат з позначкою «Бухгалтер».
            </p>
          </div>

          {/* Summary card */}
          <div className="card-neo p-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

            <h2 className="text-base font-bold text-white text-center mb-5">Загальна інформація</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {/* Salaries summary */}
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 text-center">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <Users size={18} className="text-blue-400" />
                </div>
                <p className="text-xs text-gray-500 mb-1">Зарплати (брутто)</p>
                <p className="text-lg font-bold text-blue-400 tabular-nums">{fmt(totalSalaries)} грн</p>
                <p className="text-[10px] text-gray-600 mt-1">{(savedResult.salaries || []).length} працівників</p>
              </div>

              {/* Fixed expenses summary */}
              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/15 text-center">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
                  <Receipt size={18} className="text-orange-400" />
                </div>
                <p className="text-xs text-gray-500 mb-1">Постійні витрати</p>
                <p className="text-lg font-bold text-orange-400 tabular-nums">{fmt(totalFixed)} грн</p>
                <p className="text-[10px] text-gray-600 mt-1">{(savedResult.fixed_expenses || []).length} позицій</p>
              </div>

              {/* Other expenses summary */}
              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15 text-center">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                  <Receipt size={18} className="text-purple-400" />
                </div>
                <p className="text-xs text-gray-500 mb-1">Разові витрати</p>
                <p className="text-lg font-bold text-purple-400 tabular-nums">{fmt(totalOther)} грн</p>
                <p className="text-[10px] text-gray-600 mt-1">{(savedResult.other_expenses || []).length} позицій</p>
              </div>
            </div>

            {/* Grand total */}
            <div className="p-4 rounded-xl bg-dark-400/40 border border-dark-50/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 font-medium">Загальна сума</span>
                <span className="text-xl font-bold text-white tabular-nums">{fmt(grandTotal)} грн</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-semibold hover:bg-orange-500/20 transition-all"
            >
              <Edit2 size={16} />
              Редагувати та відправити повторно
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 pb-4">
            <Clock size={12} />
            <span>Посилання дійсне до {expiresDate}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ──
  return (
    <div className="min-h-screen bg-dark-700 py-8 px-4 flex flex-col items-center">
      <div className="w-[85vw] max-w-5xl space-y-6">
        {/* Header */}
        <div className="card-neo p-6 sm:p-8 relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0"
              style={{ boxShadow: "0 0 20px rgba(249, 115, 22, 0.15)" }}
            >
              <ClipboardList size={24} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">MedFlow · Запит до бухгалтера</h1>
              <p className="text-sm text-gray-400 mt-0.5">{data.filter_label} — {MONTHS_UA[data.month]} {data.year}</p>
            </div>
          </div>

          {/* Instructions banner */}
          <div className="p-4 rounded-xl bg-blue-500/8 border border-blue-500/15 space-y-2">
            <div className="flex items-start gap-2.5">
              <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300 space-y-2">
                <p className="font-semibold text-blue-300">Інструкція:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-400 text-xs sm:text-sm">
                  <li>Перевірте та оновіть <strong className="text-white">зарплати (брутто)</strong> кожного працівника</li>
                  <li>Перевірте <strong className="text-white">постійні витрати</strong> — змініть суми за потреби</li>
                  <li>Додайте нові витрати, якщо є</li>
                  <li>Натисніть <strong className="text-orange-300">«Надіслати звіт»</strong></li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-4">
            <Clock size={12} />
            <span>Посилання дійсне до {expiresDate}</span>
          </div>
        </div>

        {/* ── Section 1: Salaries ── */}
        <div className="card-neo p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users size={16} className="text-blue-400" />
            </div>
            Зарплати (брутто)
          </h2>
          {data.data.salary_from_previous ? (
            <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-5 ml-0.5">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  <strong>Увага:</strong> Зарплатні дані за поточний місяць відсутні. Підтягнуто дані з попереднього періоду
                  {data.data.salary_source_period ? ` (${data.data.salary_source_period})` : ""}. Перевірте та відредагуйте за потреби.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mb-5 ml-10.5">
              <History size={11} className="text-gray-600" />
              <p className="text-xs text-gray-500">
                Суми за поточний місяць. Відредагуйте за потреби.
              </p>
            </div>
          )}

          {salaries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Немає працівників для відображення</p>
          ) : (
            <div className="space-y-3">
              {salaries.map((s, idx) => {
                const changed = s.brutto !== s.prev_brutto;
                return (
                  <div key={s.staff_member_id} className="py-3.5 px-4 sm:px-5 bg-dark-400/30 rounded-xl border border-dark-50/5 hover:border-dark-50/10 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{s.full_name}</p>
                        <p className="text-xs text-gray-500">{s.position || s.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={s.brutto || ""}
                          onChange={(e) => handleSalaryChange(idx, e.target.value)}
                          placeholder="0.00"
                          className={`w-full sm:w-40 px-3 py-2.5 rounded-lg bg-dark-500/60 border text-white text-sm text-right tabular-nums outline-none transition-all ${
                            changed ? "border-blue-500/50 bg-blue-500/5" : "border-dark-50/20"
                          } focus:border-blue-500/50`}
                        />
                        <span className="text-xs text-gray-500 shrink-0">грн</span>
                      </div>
                    </div>
                    {s.prev_brutto > 0 && (
                      <div className="flex items-center justify-end gap-1.5 mt-2">
                        <span className="text-[10px] text-gray-600">
                          {prevLabel}: {fmt(s.prev_brutto)} грн
                        </span>
                        {changed && (
                          <span className={`text-[10px] font-medium ${s.brutto > s.prev_brutto ? "text-emerald-500" : "text-red-400"}`}>
                            ({s.brutto > s.prev_brutto ? "+" : ""}{fmt(s.brutto - s.prev_brutto)})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Salary total */}
              <div className="flex items-center justify-between pt-3 px-2 border-t border-dark-50/10">
                <span className="text-sm text-gray-400 font-medium">Разом брутто</span>
                <span className="text-base font-bold text-blue-400 tabular-nums">{fmt(salaryTotal)} грн</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Expenses ── */}
        <div className="card-neo p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Receipt size={16} className="text-orange-400" />
            </div>
            Постійні та інші витрати
          </h2>
          <div className="flex items-center gap-1.5 mb-5 ml-10.5">
            <History size={11} className="text-gray-600" />
            <p className="text-xs text-gray-500">
              Постійні витрати за поточний місяць. Перевірте суми та додайте нові.
            </p>
          </div>

          {expenses.length > 0 && (
            <div className="space-y-3 mb-4">
              {expenses.map((exp) => {
                const numAmount = parseFloat(String(exp.amount)) || 0;
                const amountChanged = exp.fromPrev && numAmount !== exp.prevAmount;
                return (
                  <div key={exp.id} className="py-3.5 px-4 sm:px-5 bg-dark-400/30 rounded-xl border border-dark-50/5 hover:border-dark-50/10 transition-colors">
                    {exp.fromPrev && (
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-400 border border-accent-500/20">
                          з попереднього місяця
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2.5">
                        <input
                          type="text"
                          value={exp.name}
                          onChange={(e) => updateExpense(exp.id, "name", e.target.value)}
                          placeholder="Назва витрати"
                          className="w-full px-3 py-2.5 rounded-lg bg-dark-500/60 border border-dark-50/20 text-white text-sm outline-none focus:border-orange-500/50 transition-all"
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={exp.amount === 0 ? "" : exp.amount}
                              onChange={(e) => updateExpense(exp.id, "amount", e.target.value === "" ? "" : (parseFloat(e.target.value) || 0))}
                              placeholder="0.00"
                              className={`w-32 sm:w-36 px-3 py-2.5 rounded-lg bg-dark-500/60 border text-white text-sm text-right tabular-nums outline-none transition-all ${
                                amountChanged ? "border-orange-500/50 bg-orange-500/5" : "border-dark-50/20"
                              } focus:border-orange-500/50`}
                            />
                            <span className="text-xs text-gray-500">грн</span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={exp.is_recurring}
                              onChange={(e) => updateExpense(exp.id, "is_recurring", e.target.checked)}
                              className="w-4 h-4 rounded border-dark-50/30 bg-dark-500 text-orange-500 focus:ring-orange-500/50"
                            />
                            <span className="text-xs text-gray-400">Постійна</span>
                          </label>
                        </div>
                        {exp.fromPrev && exp.prevAmount > 0 && amountChanged && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-600">
                              Було: {fmt(exp.prevAmount)} грн
                            </span>
                            <span className={`text-[10px] font-medium ${numAmount > exp.prevAmount ? "text-red-400" : "text-emerald-500"}`}>
                              ({numAmount > exp.prevAmount ? "+" : ""}{fmt(numAmount - exp.prevAmount)})
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeExpense(exp.id)}
                        className="p-2.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all mt-1"
                        title="Видалити"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={addExpense}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-dark-50/20 text-gray-400 text-sm hover:border-orange-500/30 hover:text-orange-300 hover:bg-orange-500/5 transition-all w-full justify-center"
          >
            <Plus size={15} />
            Додати витрату
          </button>

          {/* Expense total */}
          {expenses.length > 0 && (
            <div className="flex items-center justify-between pt-3 px-2 mt-3 border-t border-dark-50/10">
              <span className="text-sm text-gray-400 font-medium">Разом витрати</span>
              <span className="text-base font-bold text-orange-400 tabular-nums">{fmt(expenseTotal)} грн</span>
            </div>
          )}
        </div>

        {/* ── Grand total summary ── */}
        <div className="card-neo p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base text-gray-300 font-semibold">Загальна сума</span>
            <span className="text-lg sm:text-xl font-bold text-white tabular-nums">{fmt(salaryTotal + expenseTotal)} грн</span>
          </div>
        </div>

        {/* ── Submit button ── */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            className="flex items-center gap-2.5 px-10 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 text-white text-sm sm:text-base font-bold transition-all disabled:opacity-60 hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ boxShadow: "0 0 20px rgba(249, 115, 22, 0.3), 0 8px 24px rgba(249, 115, 22, 0.2)" }}
          >
            {submitting ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            Надіслати звіт
          </button>
        </div>

        {/* Info footer */}
        <div className="text-center text-xs text-gray-600 pb-6">
          Після надсилання дані будуть записані у систему MedFlow. Власник побачить зміни з позначкою «Бухгалтер».
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          Модальне вікно підтвердження надсилання звіту
      ══════════════════════════════════════════════ */}
      {confirmOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            style={{ animation: "fadeIn 0.2s ease forwards" }}
            onClick={() => setConfirmOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="relative w-full max-w-md bg-dark-600 rounded-2xl border border-orange-500/25 overflow-hidden"
              style={{
                animation: "modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, modalGlow 2.5s ease-in-out infinite",
                boxShadow: "0 0 30px rgba(249, 115, 22, 0.3), 0 0 60px rgba(249, 115, 22, 0.15), 0 0 100px rgba(249, 115, 22, 0.08), 0 8px 32px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Top glow line */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

              <div className="p-6">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <Send size={24} className="text-orange-400" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white text-center mb-2">
                  Надіслати звіт?
                </h3>

                {/* Description */}
                <div className="space-y-2 mb-6">
                  <p className="text-sm text-gray-400 text-center">
                    Ви збираєтесь надіслати фінансовий звіт за{" "}
                    <strong className="text-white">{MONTHS_UA[data.month]} {data.year}</strong>
                  </p>
                  <div className="p-3 rounded-xl bg-dark-400/40 border border-dark-50/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Зарплати (брутто)</span>
                      <span className="text-blue-400 font-semibold tabular-nums">{fmt(salaryTotal)} грн</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Витрати</span>
                      <span className="text-orange-400 font-semibold tabular-nums">{fmt(expenseTotal)} грн</span>
                    </div>
                    <div className="h-px bg-dark-50/10 my-1" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-medium">Разом</span>
                      <span className="text-white font-bold tabular-nums">{fmt(salaryTotal + expenseTotal)} грн</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Дані будуть записані в систему MedFlow. Ви зможете відредагувати та надіслати повторно.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-400/50 border border-dark-50/15 text-gray-400 text-sm font-medium hover:bg-dark-400/80 hover:text-gray-300 transition-all"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-400 transition-all disabled:opacity-60 shadow-lg shadow-orange-500/20"
                  >
                    {submitting ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    Надіслати
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════
          Анімація успішного надсилання (~5с)
      ══════════════════════════════════════════════ */}
      {successAnim && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-dark-700/95 backdrop-blur-md"
          style={{ animation: "fadeIn 0.3s ease forwards" }}
        >
          <div className="flex flex-col items-center gap-6 px-6"
            style={{ animation: "modalScaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
          >
            {/* Animated check circle */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center"
                style={{
                  animation: "successPulse 2s ease-in-out infinite",
                  boxShadow: "0 0 50px rgba(16, 185, 129, 0.3), 0 0 100px rgba(16, 185, 129, 0.15)",
                }}
              >
                <Check size={42} className="text-emerald-400" style={{ animation: "checkMark 0.6s ease 0.3s both" }} />
              </div>
            </div>

            <div className="text-center space-y-2.5">
              <h2 className="text-2xl font-bold text-white" style={{ animation: "fadeSlideUp 0.4s ease 0.4s both" }}>
                Звіт надіслано!
              </h2>
              <p className="text-sm text-gray-400 max-w-sm" style={{ animation: "fadeSlideUp 0.4s ease 0.6s both" }}>
                Дані за {MONTHS_UA[data.month]} {data.year} успішно записані у систему MedFlow
              </p>
              <p className="text-xs text-gray-500" style={{ animation: "fadeSlideUp 0.4s ease 0.8s both" }}>
                Зачекайте, відбувається збереження…
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-56 h-1.5 rounded-full bg-dark-400/50 overflow-hidden mt-2">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ animation: "progressFill 4.6s ease-in-out forwards", animationDelay: "0.2s", width: "0%" }}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!alertDlg}
        title={alertDlg?.title ?? ""}
        description={alertDlg?.description}
        confirmLabel="Зрозуміло"
        cancelLabel="Закрити"
        onConfirm={() => setAlertDlg(null)}
        onCancel={() => setAlertDlg(null)}
      />
    </div>
  );
}
