import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
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
    salary_staff: StaffItem[];
    recurring_expenses: RecurringExpense[];
  };
}

interface SalaryRow {
  staff_member_id: number;
  full_name: string;
  role: string;
  position: string;
  brutto: number;
}

interface ExpenseRow {
  id: number;
  name: string;
  amount: number | string;
  is_recurring: boolean;
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

  async function loadData() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const r = await axios.get(`/api/monthly-expenses/accountant-request/${token}/view`);
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

  function initForm(d: ShareData) {
    if (d.submitted && d.submitted_data && !editMode) {
      setSubmitted(true);
      setSavedResult(d.submitted_data);
    }

    // Init salaries from payload
    const rows: SalaryRow[] = (d.data.salary_staff || []).map((s) => ({
      staff_member_id: s.staff_member_id,
      full_name: s.full_name,
      role: s.role,
      position: s.position,
      brutto: s.prev_brutto,
    }));
    setSalaries(rows);

    // Init recurring expenses from previous month
    const recExp: ExpenseRow[] = (d.data.recurring_expenses || []).map((re, idx) => ({
      id: idx + 1,
      name: re.name,
      amount: re.amount,
      is_recurring: true,
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
      { id: nextExpId, name: "", amount: "", is_recurring: false },
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
    setSubmitting(true);
    try {
      const res = await axios.post(`/api/monthly-expenses/accountant-request/${token}/submit`, {
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
          })),
      });
      setSavedResult(res.data.saved);
      setSubmitted(true);
      setEditMode(false);
    } catch (e) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: "Помилка надсилання даних" });
    }
    setSubmitting(false);
  }

  function handleEdit() {
    setSubmitted(false);
    setEditMode(true);
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
                Записані зарплати
              </h2>
              <div className="space-y-2">
                {savedResult.salaries.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-dark-400/30 rounded-lg">
                    <span className="text-sm text-gray-300">{s.full_name}</span>
                    <span className="text-sm font-semibold text-white tabular-nums">{fmt(s.brutto)} грн</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Розділ: Зарплатні витрати</p>
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
              <p className="text-xs text-gray-500 mt-3">Розділ: Постійні витрати (Інші витрати)</p>
            </div>
          )}

          {/* Saved other expenses */}
          {savedResult.other_expenses && savedResult.other_expenses.length > 0 && (
            <div className="card-neo p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <Receipt size={16} className="text-purple-400" />
                Записані інші витрати
              </h2>
              <div className="space-y-2">
                {savedResult.other_expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-dark-400/30 rounded-lg">
                    <span className="text-sm text-gray-300">{e.name}</span>
                    <span className="text-sm font-semibold text-white tabular-nums">{fmt(e.amount)} грн</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Розділ: Інші витрати</p>
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
      </div>
    );
  }

  // ── Form view ──
  return (
    <div className="min-h-screen bg-dark-700 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="card-neo p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <ClipboardList size={22} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MedFlow · Запит до бухгалтера</h1>
              <p className="text-sm text-gray-400">{data.filter_label}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Заповніть дані по зарплатах та витратах за вказаний місяць і натисніть «Надіслати звіт».
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
            <Clock size={12} />
            <span>Доступно до {expiresDate}</span>
          </div>
        </div>

        {/* ── Section 1: Salaries ── */}
        <div className="card-neo p-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Users size={16} className="text-blue-400" />
            Зарплати
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Вкажіть офіційну зарплату (брутто) кожного працівника. Дані з попереднього місяця підставлені автоматично.
          </p>

          {salaries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Немає працівників для відображення</p>
          ) : (
            <div className="space-y-3">
              {salaries.map((s, idx) => (
                <div key={s.staff_member_id} className="flex items-center gap-3 py-3 px-4 bg-dark-400/30 rounded-xl">
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
                      className="w-36 px-3 py-2 rounded-lg bg-dark-500/60 border border-dark-50/20 text-white text-sm text-right tabular-nums outline-none focus:border-blue-500/50 transition-all"
                    />
                    <span className="text-xs text-gray-500">грн</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 2: Expenses ── */}
        <div className="card-neo p-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Receipt size={16} className="text-orange-400" />
            Витрати за рахунком
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Вкажіть назву, суму та позначте прапорцем постійні витрати. Постійні витрати зберігаються для наступних місяців.
          </p>

          {expenses.length > 0 && (
            <div className="space-y-3 mb-4">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-start gap-3 py-3 px-4 bg-dark-400/30 rounded-xl">
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
                          value={exp.amount || ""}
                          onChange={(e) => updateExpense(exp.id, "amount", e.target.value === "" ? "" : (parseFloat(e.target.value) || 0))}
                          placeholder="0.00"
                          className="w-32 px-3 py-2 rounded-lg bg-dark-500/60 border border-dark-50/20 text-white text-sm text-right tabular-nums outline-none focus:border-orange-500/50 transition-all"
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
                        <span className="text-xs text-gray-400">Постійна витрата</span>
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={() => removeExpense(exp.id)}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all mt-1"
                    title="Видалити"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addExpense}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-dark-50/20 text-gray-400 text-sm hover:border-orange-500/30 hover:text-orange-300 transition-all w-full justify-center"
          >
            <Plus size={14} />
            Додати витрату
          </button>
        </div>

        {/* ── Submit button ── */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-lg shadow-orange-500/20"
          >
            {submitting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Надіслати звіт
          </button>
        </div>
      </div>

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
