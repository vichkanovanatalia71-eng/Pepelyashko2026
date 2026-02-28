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
  AlertTriangle,
} from "lucide-react";
import { ConfirmDialog } from "../components/shared";

const fmt = (v: number) =>
  v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Interfaces ── */

interface LiveSalary {
  staff_member_id: number;
  full_name: string;
  role: string;
  position: string;
  current_brutto: number;
  prev_brutto: number;
  edited_by: string | null;
  edited_at: string | null;
}

interface LiveFixedExpense {
  id: number;
  name: string;
  amount: number;
  is_recurring: boolean;
  category_key: string;
  edited_by: string | null;
  edited_at: string | null;
}

interface LiveOtherExpense {
  id: number;
  name: string;
  amount: number;
  category: string;
  edited_by: string | null;
  edited_at: string | null;
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
    fixed_expenses: { name: string; amount: number; category: string }[];
    other_expenses: { name: string; amount: number; category: string }[];
    submitted_at: string;
  } | null;
  data: {
    salary_staff: { staff_member_id: number; full_name: string; role: string; position: string; prev_brutto: number }[];
    recurring_expenses?: { name: string; amount: number; category_key?: string; is_recurring?: boolean }[];
  };
  live_data: {
    salaries: LiveSalary[];
    fixed_expenses: LiveFixedExpense[];
    other_expenses: LiveOtherExpense[];
  };
}

interface SalaryRow {
  staff_member_id: number;
  full_name: string;
  role: string;
  position: string;
  brutto: number;
  prev_brutto: number;
  edited_by?: string | null;
  edited_at?: string | null;
}

interface ExpenseRow {
  id: number;
  backendId?: number;
  source?: "fixed" | "other";
  name: string;
  amount: number | string;
  is_recurring: boolean;
  fromPrev: boolean;
  prevAmount: number;
  edited_by?: string | null;
  edited_at?: string | null;
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
  const [resubmitConfirmOpen, setResubmitConfirmOpen] = useState(false);

  async function loadData(isEdit = false) {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.get(`/monthly-expenses/accountant-request/${token}/view`);
      setData(r.data);
      initForm(r.data, isEdit);
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

  function initForm(d: ShareData, isEdit = false) {
    if (d.submitted && d.submitted_data && !editMode && !isEdit) {
      setSubmitted(true);
      setSavedResult(d.submitted_data);
    }

    // Use live_data if available, fallback to payload_snapshot
    const live = d.live_data;

    // Init salaries from live_data (current values)
    if (live?.salaries?.length) {
      const rows: SalaryRow[] = live.salaries.map((s) => ({
        staff_member_id: s.staff_member_id,
        full_name: s.full_name,
        role: s.role,
        position: s.position,
        brutto: s.current_brutto,
        prev_brutto: s.prev_brutto,
        edited_by: s.edited_by,
        edited_at: s.edited_at,
      }));
      setSalaries(rows);
    } else {
      // Fallback to old payload
      const rows: SalaryRow[] = (d.data.salary_staff || []).map((s) => ({
        staff_member_id: s.staff_member_id,
        full_name: s.full_name,
        role: s.role,
        position: s.position,
        brutto: s.prev_brutto,
        prev_brutto: s.prev_brutto,
      }));
      setSalaries(rows);
    }

    // Init expenses from live_data (fixed + other)
    let nextId = 1;
    const allExpenses: ExpenseRow[] = [];

    if (live?.fixed_expenses?.length || live?.other_expenses?.length) {
      for (const fe of live.fixed_expenses || []) {
        allExpenses.push({
          id: nextId++,
          backendId: fe.id,
          source: "fixed",
          name: fe.name,
          amount: fe.amount,
          is_recurring: fe.is_recurring,
          fromPrev: false,
          prevAmount: fe.amount,
          edited_by: fe.edited_by,
          edited_at: fe.edited_at,
        });
      }
      for (const oe of live.other_expenses || []) {
        allExpenses.push({
          id: nextId++,
          backendId: oe.id,
          source: "other",
          name: oe.name,
          amount: oe.amount,
          is_recurring: false,
          fromPrev: false,
          prevAmount: oe.amount,
          edited_by: oe.edited_by,
          edited_at: oe.edited_at,
        });
      }
    } else {
      // Fallback to old payload (recurring_expenses)
      for (const re of d.data.recurring_expenses || []) {
        allExpenses.push({
          id: nextId++,
          name: re.name,
          amount: re.amount,
          is_recurring: true,
          fromPrev: true,
          prevAmount: re.amount,
        });
      }
    }

    setExpenses(allExpenses);
    setNextExpId(nextId);
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
            backend_id: e.backendId ?? null,
            source: e.source ?? "fixed",
          })),
      });
      setSavedResult(res.data.saved);
      setEditMode(false);

      // Show success animation for ~2.5s before revealing result
      setSuccessAnim(true);
      setTimeout(() => {
        setSuccessAnim(false);
        setSubmitted(true);
      }, 2500);
    } catch (e) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: "Помилка надсилання даних" });
    }
    setSubmitting(false);
  }

  function handleEdit() {
    // Show resubmit confirmation before editing
    setResubmitConfirmOpen(true);
  }

  function confirmResubmit() {
    setResubmitConfirmOpen(false);
    setSubmitted(false);
    setEditMode(true);
    // Re-fetch live data when entering edit mode (isEdit=true skips submitted check)
    loadData(true);
  }

  // Helper: badge for edited_by
  function CreatorBadge({ editedBy, editedAt }: { editedBy?: string | null; editedAt?: string | null }) {
    if (editedBy === "accountant") {
      return (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20 shrink-0"
          title={editedAt ? `Оновлено: ${new Date(editedAt).toLocaleDateString("uk-UA")}` : undefined}
        >
          Бухгалтер
        </span>
      );
    }
    if (editedBy === "user" || !editedBy) {
      return (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 shrink-0"
          title={editedAt ? `Оновлено: ${new Date(editedAt).toLocaleDateString("uk-UA")}` : undefined}
        >
          Власник
        </span>
      );
    }
    return null;
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

  // ── Submitted confirmation view ──
  if (submitted && savedResult) {
    return (
      <div className="min-h-screen bg-dark-700 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="card-neo p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Check size={22} className="text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Дані прийняті та записані</h1>
                <p className="text-sm text-gray-400">{data.filter_label}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Дані збережено у системі. Власник побачить ваші зміни на сторінці Витрат з позначкою «Бухгалтер».
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
              <Clock size={12} />
              <span>Доступно до {expiresDate}</span>
            </div>
          </div>

          {/* Saved salaries */}
          {savedResult.salaries && savedResult.salaries.length > 0 && (
            <div className="card-neo p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <Users size={16} className="text-blue-400" />
                Записані зарплати (брутто)
              </h2>
              <div className="space-y-2">
                {savedResult.salaries.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-dark-400/30 rounded-lg">
                    <span className="text-sm text-gray-300">{s.full_name}</span>
                    <span className="text-sm font-semibold text-white tabular-nums">{fmt(s.brutto)} грн</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved fixed expenses */}
          {savedResult.fixed_expenses && savedResult.fixed_expenses.length > 0 && (
            <div className="card-neo p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <Receipt size={16} className="text-orange-400" />
                Записані постійні витрати
              </h2>
              <div className="space-y-2">
                {savedResult.fixed_expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-dark-400/30 rounded-lg">
                    <span className="text-sm text-gray-300">{e.name}</span>
                    <span className="text-sm font-semibold text-white tabular-nums">{fmt(e.amount)} грн</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved other expenses */}
          {savedResult.other_expenses && savedResult.other_expenses.length > 0 && (
            <div className="card-neo p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <Receipt size={16} className="text-purple-400" />
                Записані разові витрати
              </h2>
              <div className="space-y-2">
                {savedResult.other_expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-dark-400/30 rounded-lg">
                    <span className="text-sm text-gray-300">{e.name}</span>
                    <span className="text-sm font-semibold text-white tabular-nums">{fmt(e.amount)} грн</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit button */}
          <div className="flex justify-center">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-semibold hover:bg-orange-500/20 transition-all"
            >
              <Edit2 size={16} />
              Редагувати та відправити повторно
            </button>
          </div>
        </div>

        {/* Resubmit confirmation dialog */}
        <ConfirmDialog
          open={resubmitConfirmOpen}
          icon={<AlertTriangle size={22} className="text-amber-400" />}
          title="Звіт уже подано"
          description={`За ${data.filter_label} звіт уже було подано раніше. Бажаєте подати повторно? Попередні дані буде замінено.`}
          confirmLabel="Так, редагувати"
          cancelLabel="Скасувати"
          onConfirm={confirmResubmit}
          onCancel={() => setResubmitConfirmOpen(false)}
        />

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

  // ── Form view ──
  return (
    <div className="min-h-screen bg-dark-700 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="card-neo p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <ClipboardList size={22} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MedFlow · Запит до бухгалтера</h1>
              <p className="text-sm text-gray-400">{data.filter_label}</p>
            </div>
          </div>

          {/* Instructions banner */}
          <div className="p-3.5 rounded-xl bg-blue-500/8 border border-blue-500/15 space-y-2">
            <div className="flex items-start gap-2">
              <Info size={15} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 space-y-1.5">
                <p className="font-medium text-blue-300">Що потрібно зробити:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li>Перевірте та оновіть <strong className="text-white">зарплати (брутто)</strong> кожного працівника за поточний місяць</li>
                  <li>Перевірте <strong className="text-white">постійні витрати</strong> — змініть суми якщо вони відрізняються від попереднього місяця</li>
                  <li>Додайте нові витрати, якщо є</li>
                  <li>Натисніть <strong className="text-orange-300">«Надіслати звіт»</strong></li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
            <Clock size={12} />
            <span>Доступно до {expiresDate}</span>
          </div>
        </div>

        {/* ── Section 1: Salaries ── */}
        <div className="card-neo p-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <Users size={16} className="text-blue-400" />
            Зарплати (брутто)
          </h2>
          <div className="flex items-center gap-1.5 mb-4">
            <History size={11} className="text-gray-600" />
            <p className="text-xs text-gray-500">
              Суми підставлені з поточних даних системи. Відредагуйте якщо зарплата змінилась.
            </p>
          </div>

          {salaries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Немає працівників для відображення</p>
          ) : (
            <div className="space-y-3">
              {salaries.map((s, idx) => {
                const changed = s.brutto !== s.prev_brutto;
                return (
                  <div key={s.staff_member_id} className="py-3 px-4 bg-dark-400/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">{s.full_name}</p>
                          <CreatorBadge editedBy={s.edited_by} editedAt={s.edited_at} />
                        </div>
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
                          className={`w-36 px-3 py-2 rounded-lg bg-dark-500/60 border text-white text-sm text-right tabular-nums outline-none transition-all ${
                            changed ? "border-blue-500/50" : "border-dark-50/20"
                          } focus:border-blue-500/50`}
                        />
                        <span className="text-xs text-gray-500">грн</span>
                      </div>
                    </div>
                    {/* Show previous period reference */}
                    {s.prev_brutto > 0 && (
                      <div className="flex items-center justify-end gap-1.5 mt-1.5">
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
              <div className="flex items-center justify-between pt-2 px-1">
                <span className="text-xs text-gray-500 font-medium">Разом брутто</span>
                <span className="text-sm font-bold text-blue-400 tabular-nums">{fmt(salaryTotal)} грн</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Expenses ── */}
        <div className="card-neo p-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <Receipt size={16} className="text-orange-400" />
            Постійні та інші витрати
          </h2>
          <div className="flex items-center gap-1.5 mb-4">
            <History size={11} className="text-gray-600" />
            <p className="text-xs text-gray-500">
              Витрати завантажені з поточних даних системи. Перевірте суми та додайте нові витрати.
            </p>
          </div>

          {expenses.length > 0 && (
            <div className="space-y-3 mb-4">
              {expenses.map((exp) => {
                const numAmount = parseFloat(String(exp.amount)) || 0;
                const amountChanged = exp.fromPrev && numAmount !== exp.prevAmount;
                return (
                  <div key={exp.id} className="py-3 px-4 bg-dark-400/30 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      {exp.fromPrev && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/15 text-accent-400 border border-accent-500/20">
                          з попереднього місяця
                        </span>
                      )}
                      {exp.is_recurring && !exp.fromPrev && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/15 text-accent-400 border border-accent-500/20">
                          щомісячно
                        </span>
                      )}
                      <CreatorBadge editedBy={exp.edited_by} editedAt={exp.edited_at} />
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={exp.name}
                          onChange={(e) => updateExpense(exp.id, "name", e.target.value)}
                          placeholder="Назва витрати"
                          className="w-full px-3 py-2 rounded-lg bg-dark-500/60 border border-dark-50/20 text-white text-sm outline-none focus:border-orange-500/50 transition-all"
                        />
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={exp.amount === 0 ? "" : exp.amount}
                              onChange={(e) => updateExpense(exp.id, "amount", e.target.value === "" ? "" : (parseFloat(e.target.value) || 0))}
                              placeholder="0.00"
                              className={`w-32 px-3 py-2 rounded-lg bg-dark-500/60 border text-white text-sm text-right tabular-nums outline-none transition-all ${
                                amountChanged ? "border-orange-500/50" : "border-dark-50/20"
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
                        {/* Show previous amount reference */}
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
                        className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all mt-1"
                        title="Видалити"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={addExpense}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-dark-50/20 text-gray-400 text-sm hover:border-orange-500/30 hover:text-orange-300 transition-all w-full justify-center"
          >
            <Plus size={14} />
            Додати витрату
          </button>

          {/* Expense total */}
          {expenses.length > 0 && (
            <div className="flex items-center justify-between pt-3 px-1 mt-3 border-t border-dark-50/10">
              <span className="text-xs text-gray-500 font-medium">Разом витрати</span>
              <span className="text-sm font-bold text-orange-400 tabular-nums">{fmt(expenseTotal)} грн</span>
            </div>
          )}
        </div>

        {/* ── Submit button ── */}
        <div className="flex justify-center">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            {submitting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Надіслати звіт
          </button>
        </div>

        {/* Info footer */}
        <div className="text-center text-xs text-gray-600 pb-4">
          Після надсилання дані будуть записані у систему MedFlow. Власник побачить ваші зміни на сторінці Витрат.
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
              className="relative w-full max-w-md bg-dark-600 rounded-2xl border border-dark-50/15 shadow-2xl overflow-hidden"
              style={{ animation: "modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
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
          Анімація успішного надсилання (~2.5с)
      ══════════════════════════════════════════════ */}
      {successAnim && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-dark-700/95 backdrop-blur-md"
          style={{ animation: "fadeIn 0.3s ease forwards" }}
        >
          <div className="flex flex-col items-center gap-5"
            style={{ animation: "modalScaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
          >
            {/* Animated check circle */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center"
                style={{
                  animation: "successPulse 1.5s ease-in-out infinite",
                  boxShadow: "0 0 40px rgba(16, 185, 129, 0.25), 0 0 80px rgba(16, 185, 129, 0.1)",
                }}
              >
                <Check size={36} className="text-emerald-400" style={{ animation: "checkMark 0.5s ease 0.3s both" }} />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-white" style={{ animation: "fadeSlideUp 0.4s ease 0.4s both" }}>
                Звіт надіслано!
              </h2>
              <p className="text-sm text-gray-400 max-w-xs" style={{ animation: "fadeSlideUp 0.4s ease 0.6s both" }}>
                Дані за {MONTHS_UA[data.month]} {data.year} записані у систему MedFlow
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-48 h-1 rounded-full bg-dark-400/50 overflow-hidden mt-2">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ animation: "progressFill 2.3s ease-in-out forwards", animationDelay: "0.2s", width: "0%" }}
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
