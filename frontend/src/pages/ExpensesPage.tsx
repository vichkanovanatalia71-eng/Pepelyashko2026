import { useEffect, useState, FormEvent } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Landmark,
  Layers,
  Plus,
  Receipt,
  Save,
  Trash2,
  TrendingDown,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../api/client";
import type {
  Employee,
  Expense,
  ExpenseCategory,
  ExpenseDashboard,
} from "../types";

// ── Constants ──────────────────────────────────────────────────────

type ExpenseTab = "fixed" | "salary" | "other" | "tax" | "summary";

const TABS: { key: ExpenseTab; label: string; icon: typeof Layers }[] = [
  { key: "fixed", label: "Постійні витрати", icon: Landmark },
  { key: "salary", label: "Зарплатні витрати", icon: Users },
  { key: "other", label: "Інші витрати", icon: Layers },
  { key: "tax", label: "Податки", icon: Receipt },
  { key: "summary", label: "Підсумки", icon: BarChart3 },
];

const STAFF_TYPES: Record<string, string> = {
  doctor: "Лікар",
  nurse: "Медсестра",
  other: "Інший персонал",
};

const CHART_COLORS = ["#f97316", "#3b82f6", "#10b981", "#ef4444"];

const MONTH_NAMES = [
  "Січ", "Лют", "Бер", "Кві", "Тра", "Чер",
  "Лип", "Сер", "Вер", "Жов", "Лис", "Гру",
];

const fmt = (n: number) =>
  n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Component ──────────────────────────────────────────────────────

export default function ExpensesPage() {
  const now = new Date();
  const [tab, setTab] = useState<ExpenseTab>("fixed");

  // Period filter
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | null>(null); // null = весь рік

  // Data
  const [dashboard, setDashboard] = useState<ExpenseDashboard | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Expense form
  const [expForm, setExpForm] = useState({
    amount: "",
    description: "",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
    is_recurring: false,
    employee_id: "",
  });

  // Employee form
  const [empForm, setEmpForm] = useState({
    full_name: "",
    position: "",
    staff_type: "other",
    salary: "",
  });

  // ── Data loading ─────────────────────────────────────────────────

  function getDateRange(): { date_from: string; date_to: string } {
    if (filterMonth !== null) {
      const m = String(filterMonth).padStart(2, "0");
      const lastDay = new Date(filterYear, filterMonth, 0).getDate();
      return {
        date_from: `${filterYear}-${m}-01`,
        date_to: `${filterYear}-${m}-${lastDay}`,
      };
    }
    return {
      date_from: `${filterYear}-01-01`,
      date_to: `${filterYear}-12-31`,
    };
  }

  async function loadAll() {
    setLoading(true);
    try {
      const range = getDateRange();
      const [dashRes, expRes, empRes, catRes] = await Promise.all([
        api.get("/expenses/dashboard", { params: range }),
        api.get("/expenses/", { params: range }),
        api.get("/expenses/employees"),
        api.get("/expenses/categories"),
      ]);
      setDashboard(dashRes.data);
      setExpenses(expRes.data);
      setEmployees(empRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error("Failed to load expenses data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [filterYear, filterMonth]);

  // ── Expense CRUD handlers ────────────────────────────────────────

  function resetExpForm() {
    setExpForm({
      amount: "",
      description: "",
      category_id: "",
      date: new Date().toISOString().split("T")[0],
      is_recurring: false,
      employee_id: "",
    });
    setEditingExpense(null);
    setShowExpenseForm(false);
  }

  function startEditExpense(exp: Expense) {
    setExpForm({
      amount: String(exp.amount),
      description: exp.description,
      category_id: exp.category_id ? String(exp.category_id) : "",
      date: exp.date,
      is_recurring: exp.is_recurring,
      employee_id: exp.employee_id ? String(exp.employee_id) : "",
    });
    setEditingExpense(exp);
    setShowExpenseForm(true);
  }

  async function handleSaveExpense(e: FormEvent, expenseType: string) {
    e.preventDefault();
    const payload = {
      amount: parseFloat(expForm.amount),
      description: expForm.description,
      category_id: expForm.category_id ? parseInt(expForm.category_id) : null,
      date: expForm.date,
      expense_type: expenseType,
      is_recurring: expForm.is_recurring,
      employee_id: expForm.employee_id ? parseInt(expForm.employee_id) : null,
    };

    if (editingExpense) {
      await api.put(`/expenses/${editingExpense.id}`, payload);
    } else {
      await api.post("/expenses/", payload);
    }
    resetExpForm();
    loadAll();
  }

  async function handleDeleteExpense(id: number) {
    if (!confirm("Видалити витрату?")) return;
    await api.delete(`/expenses/${id}`);
    loadAll();
  }

  // ── Employee CRUD handlers ───────────────────────────────────────

  function resetEmpForm() {
    setEmpForm({ full_name: "", position: "", staff_type: "other", salary: "" });
    setEditingEmployee(null);
    setShowEmployeeForm(false);
  }

  function startEditEmployee(emp: Employee) {
    setEmpForm({
      full_name: emp.full_name,
      position: emp.position,
      staff_type: emp.staff_type,
      salary: String(emp.salary),
    });
    setEditingEmployee(emp);
    setShowEmployeeForm(true);
  }

  async function handleSaveEmployee(e: FormEvent) {
    e.preventDefault();
    const payload = {
      full_name: empForm.full_name,
      position: empForm.position,
      staff_type: empForm.staff_type,
      salary: parseFloat(empForm.salary) || 0,
    };

    if (editingEmployee) {
      await api.put(`/expenses/employees/${editingEmployee.id}`, payload);
    } else {
      await api.post("/expenses/employees", payload);
    }
    resetEmpForm();
    loadAll();
  }

  async function handleDeleteEmployee(id: number) {
    if (!confirm("Видалити працівника та всі пов'язані витрати?")) return;
    await api.delete(`/expenses/employees/${id}`);
    loadAll();
  }

  // ── Filtered expenses per tab ────────────────────────────────────

  const filteredExpenses = expenses.filter((e) => {
    if (tab === "summary") return true;
    return e.expense_type === tab;
  });

  // ── Pie chart data ───────────────────────────────────────────────

  const pieData = dashboard
    ? [
        { name: "Постійні", value: dashboard.summary.total_fixed },
        { name: "Зарплатні", value: dashboard.summary.total_salary },
        { name: "Інші", value: dashboard.summary.total_other },
        { name: "Податки", value: dashboard.summary.total_tax },
      ].filter((d) => d.value > 0)
    : [];

  // ── Bar chart data ───────────────────────────────────────────────

  const barData = (dashboard?.by_month || []).map((m) => ({
    ...m,
    month: (() => {
      const parts = m.month.split("-");
      const mi = parseInt(parts[1]) - 1;
      return MONTH_NAMES[mi] || m.month;
    })(),
  }));

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Витрати</h2>
          <p className="text-gray-500 text-sm mt-1">
            Аналітика, управління та розподіл витрат
          </p>
        </div>
      </div>

      {/* ═══ Period Filter ═══ */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterYear(filterYear - 1)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-300 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 py-2 rounded-lg bg-dark-300 border border-dark-50/10 text-white font-bold min-w-[70px] text-center">
            {filterYear}
          </span>
          <button
            onClick={() => setFilterYear(filterYear + 1)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-300 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex gap-1 bg-dark-500 p-1 rounded-xl flex-wrap">
          <button
            onClick={() => setFilterMonth(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMonth === null
                ? "bg-dark-300 text-white shadow-neo-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Рік
          </button>
          {MONTH_NAMES.map((name, idx) => (
            <button
              key={idx}
              onClick={() => setFilterMonth(idx + 1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMonth === idx + 1
                  ? "bg-dark-300 text-white shadow-neo-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Dashboard KPI Cards ═══ */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : dashboard ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Постійні", value: dashboard.summary.total_fixed, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
              { label: "Зарплатні", value: dashboard.summary.total_salary, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
              { label: "Інші", value: dashboard.summary.total_other, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { label: "Податки", value: dashboard.summary.total_tax, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
              { label: "Загалом", value: dashboard.summary.grand_total, color: "text-white", bg: "bg-accent-500/10", border: "border-accent-500/20" },
            ].map((card) => (
              <div key={card.label} className={`card-neo p-5 border ${card.border}`}>
                <div className={`p-2 rounded-lg ${card.bg} w-fit mb-2`}>
                  <TrendingDown size={16} className={card.color} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className={`text-lg font-bold ${card.color} font-mono`}>
                  {fmt(card.value)} <span className="text-xs font-normal">&#8372;</span>
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          {(barData.length > 0 || pieData.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {/* Bar Chart */}
              {barData.length > 0 && (
                <div className="card-neo p-5">
                  <h4 className="text-white font-semibold mb-4 text-sm">Динаміка витрат по місяцях</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData}>
                      <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#1e1e2e",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="fixed" name="Постійні" fill="#f97316" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="salary" name="Зарплатні" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="other" name="Інші" fill="#10b981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="tax" name="Податки" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pie Chart */}
              {pieData.length > 0 && (
                <div className="card-neo p-5">
                  <h4 className="text-white font-semibold mb-4 text-sm">Структура витрат</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#1e1e2e",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => `${fmt(value)} \u20B4`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      {/* ═══ Horizontal Tabs ═══ */}
      <div className="flex gap-1 mb-6 bg-dark-500 p-1 rounded-xl overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setShowExpenseForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === key
                ? "bg-dark-300 text-white shadow-neo-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB: FIXED EXPENSES
          ═══════════════════════════════════════════════════════════════ */}
      {tab === "fixed" && (
        <TabSection
          title="Постійні витрати"
          subtitle="Оренда, комунальні, абонентські платежі"
          onAdd={() => { resetExpForm(); setShowExpenseForm(!showExpenseForm); }}
          showForm={showExpenseForm}
        >
          {showExpenseForm && (
            <form
              onSubmit={(e) => handleSaveExpense(e, "fixed")}
              className="card-neo p-5 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="label-dark">Сума</label>
                <input
                  type="number" step="0.01" required
                  value={expForm.amount}
                  onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                  className="input-dark" placeholder="0.00"
                />
              </div>
              <div>
                <label className="label-dark">Дата</label>
                <input
                  type="date" required value={expForm.date}
                  onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                  className="input-dark"
                />
              </div>
              <div>
                <label className="label-dark">Назва / Опис</label>
                <input
                  type="text" value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="input-dark" placeholder="Оренда приміщення..."
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox" checked={expForm.is_recurring}
                    onChange={(e) => setExpForm({ ...expForm, is_recurring: e.target.checked })}
                    className="rounded border-dark-50/20"
                  />
                  Щомісячна (постійна)
                </label>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="btn-accent flex items-center gap-2">
                  <Save size={16} />
                  {editingExpense ? "Оновити" : "Додати"}
                </button>
                <button type="button" onClick={resetExpForm} className="btn-ghost">
                  Скасувати
                </button>
              </div>
            </form>
          )}

          <ExpenseTable
            expenses={filteredExpenses}
            onEdit={startEditExpense}
            onDelete={handleDeleteExpense}
            showRecurring
          />
        </TabSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: SALARY EXPENSES
          ═══════════════════════════════════════════════════════════════ */}
      {tab === "salary" && (
        <div>
          {/* Employees Management */}
          <div className="card-neo p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Працівники</h3>
              <button
                onClick={() => { resetEmpForm(); setShowEmployeeForm(!showEmployeeForm); }}
                className="btn-ghost flex items-center gap-2 text-sm"
              >
                {showEmployeeForm ? <X size={16} /> : <UserPlus size={16} />}
                {showEmployeeForm ? "Закрити" : "Додати працівника"}
              </button>
            </div>

            {showEmployeeForm && (
              <form
                onSubmit={handleSaveEmployee}
                className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-dark-400/50 rounded-xl"
              >
                <div className="flex-1 min-w-[180px]">
                  <label className="label-dark">ПІБ</label>
                  <input
                    type="text" required value={empForm.full_name}
                    onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
                    className="input-dark" placeholder="Прізвище І.П."
                  />
                </div>
                <div className="w-40">
                  <label className="label-dark">Посада</label>
                  <input
                    type="text" value={empForm.position}
                    onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                    className="input-dark" placeholder="Лікар-терапевт"
                  />
                </div>
                <div className="w-40">
                  <label className="label-dark">Тип</label>
                  <select
                    value={empForm.staff_type}
                    onChange={(e) => setEmpForm({ ...empForm, staff_type: e.target.value })}
                    className="select-dark"
                  >
                    <option value="doctor">Лікар</option>
                    <option value="nurse">Медсестра</option>
                    <option value="other">Інший персонал</option>
                  </select>
                </div>
                <div className="w-36">
                  <label className="label-dark">Зарплата</label>
                  <input
                    type="number" step="0.01" value={empForm.salary}
                    onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })}
                    className="input-dark" placeholder="0.00"
                  />
                </div>
                <button type="submit" className="btn-accent">
                  {editingEmployee ? "Оновити" : "Додати"}
                </button>
                {editingEmployee && (
                  <button type="button" onClick={resetEmpForm} className="btn-ghost">
                    Скасувати
                  </button>
                )}
              </form>
            )}

            {employees.length === 0 ? (
              <p className="text-gray-600 text-sm">Працівників ще не додано.</p>
            ) : (
              <div className="space-y-2">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between px-4 py-3 bg-dark-400/30 rounded-xl"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-gray-200">{emp.full_name}</span>
                      <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-lg">
                        {STAFF_TYPES[emp.staff_type] || emp.staff_type}
                      </span>
                      {emp.position && (
                        <span className="text-xs text-gray-500">{emp.position}</span>
                      )}
                      <span className="text-xs text-gray-400 font-mono">
                        {fmt(emp.salary)} &#8372;
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditEmployee(emp)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Salary expense form + table */}
          <TabSection
            title="Зарплатні нарахування"
            subtitle="Витрати на оплату праці працівників"
            onAdd={() => { resetExpForm(); setShowExpenseForm(!showExpenseForm); }}
            showForm={showExpenseForm}
          >
            {showExpenseForm && (
              <form
                onSubmit={(e) => handleSaveExpense(e, "salary")}
                className="card-neo p-5 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="label-dark">Сума</label>
                  <input
                    type="number" step="0.01" required
                    value={expForm.amount}
                    onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                    className="input-dark" placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label-dark">Дата</label>
                  <input
                    type="date" required value={expForm.date}
                    onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="label-dark">Працівник</label>
                  <select
                    value={expForm.employee_id}
                    onChange={(e) => setExpForm({ ...expForm, employee_id: e.target.value })}
                    className="select-dark"
                  >
                    <option value="">Оберіть працівника</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({STAFF_TYPES[emp.staff_type]})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Опис</label>
                  <input
                    type="text" value={expForm.description}
                    onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                    className="input-dark" placeholder="Зарплата за місяць..."
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="btn-accent flex items-center gap-2">
                    <Save size={16} />
                    {editingExpense ? "Оновити" : "Додати"}
                  </button>
                  <button type="button" onClick={resetExpForm} className="btn-ghost">
                    Скасувати
                  </button>
                </div>
              </form>
            )}

            <ExpenseTable
              expenses={filteredExpenses}
              employees={employees}
              onEdit={startEditExpense}
              onDelete={handleDeleteExpense}
              showEmployee
            />
          </TabSection>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: OTHER EXPENSES
          ═══════════════════════════════════════════════════════════════ */}
      {tab === "other" && (
        <TabSection
          title="Інші витрати"
          subtitle="Змінні та нерегулярні витрати"
          onAdd={() => { resetExpForm(); setShowExpenseForm(!showExpenseForm); }}
          showForm={showExpenseForm}
        >
          {showExpenseForm && (
            <form
              onSubmit={(e) => handleSaveExpense(e, "other")}
              className="card-neo p-5 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="label-dark">Сума</label>
                <input
                  type="number" step="0.01" required
                  value={expForm.amount}
                  onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                  className="input-dark" placeholder="0.00"
                />
              </div>
              <div>
                <label className="label-dark">Дата</label>
                <input
                  type="date" required value={expForm.date}
                  onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                  className="input-dark"
                />
              </div>
              <div>
                <label className="label-dark">Категорія</label>
                <select
                  value={expForm.category_id}
                  onChange={(e) => setExpForm({ ...expForm, category_id: e.target.value })}
                  className="select-dark"
                >
                  <option value="">Без категорії</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-dark">Опис</label>
                <input
                  type="text" value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="input-dark" placeholder="Опис витрати..."
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="btn-accent flex items-center gap-2">
                  <Save size={16} />
                  {editingExpense ? "Оновити" : "Додати"}
                </button>
                <button type="button" onClick={resetExpForm} className="btn-ghost">
                  Скасувати
                </button>
              </div>
            </form>
          )}

          <ExpenseTable
            expenses={filteredExpenses}
            categories={categories}
            onEdit={startEditExpense}
            onDelete={handleDeleteExpense}
            showCategory
          />
        </TabSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: TAXES
          ═══════════════════════════════════════════════════════════════ */}
      {tab === "tax" && (
        <TabSection
          title="Податки"
          subtitle="Автоматичні та ручні податкові нарахування"
          onAdd={() => { resetExpForm(); setShowExpenseForm(!showExpenseForm); }}
          showForm={showExpenseForm}
        >
          {/* Info */}
          <div className="card-neo-inset px-4 py-3 mb-4 text-sm text-gray-400">
            Автоматичні податки відображаються лише для читання. Ви можете додавати ручні податкові позиції.
          </div>

          {showExpenseForm && (
            <form
              onSubmit={(e) => handleSaveExpense(e, "tax")}
              className="card-neo p-5 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="label-dark">Сума</label>
                <input
                  type="number" step="0.01" required
                  value={expForm.amount}
                  onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                  className="input-dark" placeholder="0.00"
                />
              </div>
              <div>
                <label className="label-dark">Дата</label>
                <input
                  type="date" required value={expForm.date}
                  onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                  className="input-dark"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label-dark">Опис</label>
                <input
                  type="text" value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="input-dark" placeholder="Єдиний податок, ЄСВ..."
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="btn-accent flex items-center gap-2">
                  <Save size={16} />
                  {editingExpense ? "Оновити" : "Додати"}
                </button>
                <button type="button" onClick={resetExpForm} className="btn-ghost">
                  Скасувати
                </button>
              </div>
            </form>
          )}

          <ExpenseTable
            expenses={filteredExpenses}
            onEdit={startEditExpense}
            onDelete={handleDeleteExpense}
          />
        </TabSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: SUMMARY
          ═══════════════════════════════════════════════════════════════ */}
      {tab === "summary" && dashboard && (
        <div>
          {/* Grand totals */}
          <div className="card-neo p-5 mb-6">
            <h3 className="text-white font-semibold mb-4">
              Загальний підсумок{" "}
              <span className="text-gray-500 font-normal text-sm">
                ({filterMonth !== null ? `${MONTH_NAMES[filterMonth - 1]} ${filterYear}` : filterYear})
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <SummaryCard label="Постійні витрати" value={dashboard.summary.total_fixed} share={dashboard.fixed_share} color="text-orange-400" />
              <SummaryCard label="Зарплатні витрати" value={dashboard.summary.total_salary} share={dashboard.salary_share} color="text-blue-400" />
              <SummaryCard label="Інші витрати" value={dashboard.summary.total_other} share={dashboard.other_share} color="text-emerald-400" />
              <SummaryCard label="Податки" value={dashboard.summary.total_tax} share={dashboard.tax_share} color="text-red-400" />
              <div className="card-neo-inset p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">Всього витрат</p>
                <p className="text-xl font-bold text-white font-mono">
                  {fmt(dashboard.summary.grand_total)}
                </p>
                <p className="text-xs text-gray-600 mt-1">&#8372;</p>
              </div>
            </div>
          </div>

          {/* Detailed table of all expenses */}
          <div className="card-neo overflow-hidden">
            <div className="px-5 py-4 border-b border-dark-50/10">
              <h4 className="text-white font-semibold">Деталізація витрат</h4>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-50/10">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Опис</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Категорія</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Сума</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-dark-50/5 hover:bg-dark-200/50 transition-colors">
                    <td className="px-5 py-3 text-gray-300">{exp.date}</td>
                    <td className="px-5 py-3 text-gray-300">{exp.description || "\u2014"}</td>
                    <td className="px-5 py-3">
                      {exp.category_id
                        ? <span className="px-2 py-0.5 text-xs rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                            {categories.find((c) => c.id === exp.category_id)?.name || "\u2014"}
                          </span>
                        : <span className="text-gray-600">\u2014</span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      <ExpenseTypeBadge type={exp.expense_type} />
                    </td>
                    <td className="px-5 py-3 text-right text-red-400 font-mono font-semibold">
                      -{fmt(exp.amount)} &#8372;
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-600">
                      Витрат за обраний період немає.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-Components ─────────────────────────────────────────────────

function TabSection({
  title,
  subtitle,
  onAdd,
  showForm,
  children,
}: {
  title: string;
  subtitle: string;
  onAdd: () => void;
  showForm: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
        </div>
        <button onClick={onAdd} className="btn-accent flex items-center gap-2 text-sm">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Закрити" : "Додати"}
        </button>
      </div>
      {children}
    </div>
  );
}

function ExpenseTable({
  expenses,
  employees,
  categories,
  onEdit,
  onDelete,
  showRecurring,
  showEmployee,
  showCategory,
}: {
  expenses: Expense[];
  employees?: Employee[];
  categories?: ExpenseCategory[];
  onEdit: (exp: Expense) => void;
  onDelete: (id: number) => void;
  showRecurring?: boolean;
  showEmployee?: boolean;
  showCategory?: boolean;
}) {
  return (
    <div className="card-neo overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dark-50/10">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Дата</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Сума</th>
            {showEmployee && (
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Працівник</th>
            )}
            {showCategory && (
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Категорія</th>
            )}
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Опис</th>
            {showRecurring && (
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Постійна</th>
            )}
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id} className="border-b border-dark-50/5 hover:bg-dark-200/50 transition-colors">
              <td className="px-5 py-3 text-gray-300">{exp.date}</td>
              <td className="px-5 py-3 font-semibold text-red-400 font-mono">-{fmt(exp.amount)} &#8372;</td>
              {showEmployee && (
                <td className="px-5 py-3 text-gray-300">
                  {exp.employee_id
                    ? employees?.find((e) => e.id === exp.employee_id)?.full_name || "\u2014"
                    : "\u2014"}
                </td>
              )}
              {showCategory && (
                <td className="px-5 py-3">
                  {exp.category_id ? (
                    <span className="px-2 py-0.5 text-xs rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                      {categories?.find((c) => c.id === exp.category_id)?.name || "\u2014"}
                    </span>
                  ) : (
                    <span className="text-gray-600">{"\u2014"}</span>
                  )}
                </td>
              )}
              <td className="px-5 py-3 text-gray-500">{exp.description || "\u2014"}</td>
              {showRecurring && (
                <td className="px-5 py-3 text-center">
                  {exp.is_recurring ? (
                    <span className="text-xs bg-accent-500/10 text-accent-400 px-2 py-0.5 rounded-lg">Так</span>
                  ) : (
                    <span className="text-gray-600 text-xs">Ні</span>
                  )}
                </td>
              )}
              <td className="px-5 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(exp)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(exp.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr>
              <td colSpan={10} className="px-5 py-12 text-center text-gray-600">
                Витрат у цій категорії ще немає.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ExpenseTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; className: string }> = {
    fixed: { label: "Постійна", className: "bg-orange-500/10 text-orange-400" },
    salary: { label: "Зарплата", className: "bg-blue-500/10 text-blue-400" },
    other: { label: "Інша", className: "bg-emerald-500/10 text-emerald-400" },
    tax: { label: "Податок", className: "bg-red-500/10 text-red-400" },
  };
  const cfg = map[type] || { label: type, className: "bg-dark-400 text-gray-400" };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  share,
  color,
}: {
  label: string;
  value: number;
  share: number;
  color: string;
}) {
  return (
    <div className="card-neo-inset p-4">
      <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
      <p className={`text-lg font-bold ${color} font-mono`}>{fmt(value)}</p>
      <p className="text-xs text-gray-600 mt-1">{share}% від загальних</p>
    </div>
  );
}
