import { useEffect, useState, FormEvent } from "react";
import { Plus, Trash2, X, Pencil, Search, ArrowUpDown, Zap, ChevronDown, ChevronUp } from "lucide-react";
import api from "../api/client";
import type { Expense, ExpenseCategory, ExpenseTemplate, StaffMember } from "../types";

const emptyForm = () => ({
  amount: "",
  description: "",
  category_id: "",
  staff_member_id: "",
  date: new Date().toISOString().split("T")[0],
});

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  // Фільтрація за датою
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickFilter, setQuickFilter] = useState<string>("all");

  // Пошук і сортування
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Персонал
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  // Templates
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", amount: "", description: "", category_id: "" });
  const [showTplForm, setShowTplForm] = useState(false);

  async function loadStaff() {
    try {
      const { data } = await api.get("/staff/");
      setStaffMembers(data);
    } catch {}
  }

  async function loadTemplates() {
    const { data } = await api.get("/expenses/templates");
    setTemplates(data);
  }

  async function handleApplyTemplate(tpl: ExpenseTemplate) {
    await api.post(`/expenses/templates/${tpl.id}/apply`);
    loadData();
  }

  async function handleDeleteTemplate(id: number) {
    await api.delete(`/expenses/templates/${id}`);
    loadTemplates();
  }

  async function handleSaveTemplate(e: FormEvent) {
    e.preventDefault();
    await api.post("/expenses/templates", {
      name: tplForm.name,
      amount: parseFloat(tplForm.amount),
      description: tplForm.description,
      category_id: tplForm.category_id ? parseInt(tplForm.category_id) : null,
    });
    setTplForm({ name: "", amount: "", description: "", category_id: "" });
    setShowTplForm(false);
    loadTemplates();
  }

  async function loadData() {
    const params: Record<string, string> = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const [expRes, catRes] = await Promise.all([
      api.get("/expenses/", { params }),
      api.get("/expenses/categories"),
    ]);
    setExpenses(expRes.data);
    setCategories(catRes.data);
  }

  useEffect(() => {
    loadData();
    loadTemplates();
    loadStaff();
  }, [dateFrom, dateTo]);

  // Швидкі фільтри
  function applyQuickFilter(key: string) {
    setQuickFilter(key);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (key === "all") { setDateFrom(""); setDateTo(""); }
    else if (key === "month") {
      setDateFrom(`${y}-${String(m + 1).padStart(2, "0")}-01`);
      const last = new Date(y, m + 1, 0).getDate();
      setDateTo(`${y}-${String(m + 1).padStart(2, "0")}-${last}`);
    } else if (key === "prev") {
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      setDateFrom(`${py}-${String(pm + 1).padStart(2, "0")}-01`);
      const last = new Date(py, pm + 1, 0).getDate();
      setDateTo(`${py}-${String(pm + 1).padStart(2, "0")}-${last}`);
    } else if (key === "year") {
      setDateFrom(`${y}-01-01`);
      setDateTo(`${y}-12-31`);
    }
  }

  // Відкрити форму для редагування
  function handleEdit(expense: Expense) {
    setEditingId(expense.id);
    setForm({
      amount: String(expense.amount),
      description: expense.description || "",
      category_id: expense.category_id != null ? String(expense.category_id) : "",
      staff_member_id: expense.staff_member_id != null ? String(expense.staff_member_id) : "",
      date: expense.date,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      category_id: form.category_id ? parseInt(form.category_id) : null,
      staff_member_id: form.staff_member_id ? parseInt(form.staff_member_id) : null,
    };
    if (editingId) {
      await api.put(`/expenses/${editingId}`, payload);
    } else {
      await api.post("/expenses/", payload);
    }
    closeForm();
    loadData();
  }

  async function handleDelete(id: number) {
    await api.delete(`/expenses/${id}`);
    loadData();
  }

  // Сортування
  function toggleSort(field: "date" | "amount") {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  const categoryName = (id: number | null) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  const staffName = (id: number | null) =>
    staffMembers.find((s) => s.id === id)?.full_name ?? null;

  // Фільтрація + сортування
  const filtered = expenses
    .filter(e => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (e.description || "").toLowerCase().includes(q) ||
             categoryName(e.category_id).toLowerCase().includes(q) ||
             String(e.amount).includes(q);
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "date") return (a.date > b.date ? 1 : -1) * dir;
      return (a.amount - b.amount) * dir;
    });

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);
  const fmt = (n: number) =>
    n.toLocaleString("uk-UA", { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 lg:mb-8 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Витрати</h2>
          <p className="text-gray-500 text-sm mt-1">
            Всього: <span className="text-red-400 font-semibold">{fmt(total)} &#8372;</span>
            {filtered.length !== expenses.length && (
              <span className="text-gray-600 ml-1">({filtered.length} з {expenses.length})</span>
            )}
          </p>
        </div>
        <button
          onClick={() => showForm ? closeForm() : openCreateForm()}
          className="btn-accent flex items-center gap-2"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span className="hidden sm:inline">{showForm ? "Закрити" : "Додати витрату"}</span>
          <span className="sm:hidden">{showForm ? "Закрити" : "Додати"}</span>
        </button>
      </div>

      {/* Фільтри за датою + Пошук */}
      <div className="card-neo p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "Всі" },
            { key: "month", label: "Цей місяць" },
            { key: "prev", label: "Минулий" },
            { key: "year", label: "Цей рік" },
          ].map(f => (
            <button key={f.key} onClick={() => applyQuickFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                quickFilter === f.key
                  ? "bg-accent-500/15 text-accent-400 border-accent-500/30"
                  : "bg-dark-400/50 text-gray-400 border-dark-50/10 hover:text-white"
              }`}>
              {f.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <input type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setQuickFilter("custom"); }}
              className="bg-dark-300 border border-dark-50/20 rounded-xl px-2 py-1.5 text-xs text-white w-[120px]" />
            <span className="text-gray-600 text-xs">—</span>
            <input type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); setQuickFilter("custom"); }}
              className="bg-dark-300 border border-dark-50/20 rounded-xl px-2 py-1.5 text-xs text-white w-[120px]" />
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Пошук по категорії, опису..."
            className="w-full bg-dark-300 border border-dark-50/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600" />
        </div>
      </div>

      {/* Templates panel */}
      <div className="card-neo mb-4">
        <button
          onClick={() => setShowTemplates(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Zap size={15} className="text-amber-400" />
            Шаблони повторюваних витрат
            {templates.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {templates.length}
              </span>
            )}
          </span>
          {showTemplates ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
        </button>

        {showTemplates && (
          <div className="border-t border-dark-50/10 p-4 space-y-3">
            {templates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {templates.map(tpl => (
                  <div key={tpl.id} className="flex items-center gap-1.5 bg-dark-300/60 border border-dark-50/10 rounded-xl px-3 py-2">
                    <div className="mr-1">
                      <p className="text-xs font-medium text-gray-200">{tpl.name}</p>
                      <p className="text-xs text-amber-400 font-mono">{tpl.amount.toLocaleString("uk-UA")} ₴</p>
                    </div>
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      title="Застосувати (створити витрату сьогодні)"
                      className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-all"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      title="Видалити шаблон"
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Шаблонів поки немає.</p>
            )}

            <button
              onClick={() => setShowTplForm(v => !v)}
              className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
            >
              <Plus size={13} /> Новий шаблон
            </button>

            {showTplForm && (
              <form onSubmit={handleSaveTemplate} className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="label-dark">Назва шаблону</label>
                  <input type="text" required value={tplForm.name}
                    onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))}
                    className="input-dark" placeholder="Оренда, зв'язок..." />
                </div>
                <div>
                  <label className="label-dark">Сума</label>
                  <input type="number" step="0.01" required value={tplForm.amount}
                    onChange={e => setTplForm(f => ({ ...f, amount: e.target.value }))}
                    className="input-dark" placeholder="0.00" />
                </div>
                <div>
                  <label className="label-dark">Категорія</label>
                  <select value={tplForm.category_id}
                    onChange={e => setTplForm(f => ({ ...f, category_id: e.target.value }))}
                    className="select-dark">
                    <option value="">Без категорії</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Опис</label>
                  <input type="text" value={tplForm.description}
                    onChange={e => setTplForm(f => ({ ...f, description: e.target.value }))}
                    className="input-dark" placeholder="Необов'язково" />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className="btn-accent text-sm py-2">Зберегти шаблон</button>
                  <button type="button" onClick={() => setShowTplForm(false)} className="btn-ghost text-sm py-2">Скасувати</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-neo p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          <div className="md:col-span-2 text-sm font-semibold text-white">
            {editingId ? "Редагування витрати" : "Нова витрата"}
          </div>
          <div>
            <label className="label-dark">Сума</label>
            <input type="number" step="0.01" required value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="input-dark" placeholder="0.00" />
          </div>
          <div>
            <label className="label-dark">Дата</label>
            <input type="date" required value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Категорія</label>
            <select value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="select-dark">
              <option value="">Без категорії</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-dark">Опис</label>
            <input type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-dark" placeholder="Додатковий опис..." />
          </div>
          {staffMembers.length > 0 && (
            <div>
              <label className="label-dark">Співробітник</label>
              <select value={form.staff_member_id}
                onChange={(e) => setForm({ ...form, staff_member_id: e.target.value })}
                className="select-dark">
                <option value="">Не прив'язано</option>
                {staffMembers.filter(s => s.role === "nurse").length > 0 && (
                  <optgroup label="Медичні сестри">
                    {staffMembers.filter(s => s.role === "nurse").map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}{s.position ? ` (${s.position})` : ""}</option>
                    ))}
                  </optgroup>
                )}
                {staffMembers.filter(s => s.role === "other").length > 0 && (
                  <optgroup label="Інший персонал">
                    {staffMembers.filter(s => s.role === "other").map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}{s.position ? ` (${s.position})` : ""}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" className="btn-accent">
              {editingId ? "Оновити" : "Зберегти"}
            </button>
            <button type="button" onClick={closeForm} className="btn-ghost">
              Скасувати
            </button>
          </div>
        </form>
      )}

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2.5">
        {filtered.length === 0 && (
          <div className="card-neo p-10 text-center text-gray-600 text-sm">
            {search ? "Нічого не знайдено" : "Витрат поки немає. Натисніть «Додати» щоб почати."}
          </div>
        )}
        {filtered.map((expense) => (
          <div key={expense.id} className="card-neo p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0" onClick={() => handleEdit(expense)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{expense.date}</span>
                  <span className="font-bold text-red-400 tabular-nums">-{fmt(expense.amount)} &#8372;</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                    {categoryName(expense.category_id)}
                  </span>
                  {staffName(expense.staff_member_id) && (
                    <span className="px-2 py-0.5 text-xs rounded-lg bg-accent-500/10 text-accent-400 border border-accent-500/20">
                      {staffName(expense.staff_member_id)}
                    </span>
                  )}
                  {expense.description && (
                    <span className="text-xs text-gray-600 truncate">{expense.description}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => handleEdit(expense)}
                  className="p-2 rounded-xl text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all tap-target">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(expense.id)}
                  className="p-2 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all tap-target">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block card-neo overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-dark-50/10">
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300"
                onClick={() => toggleSort("date")}>
                <span className="flex items-center gap-1">Дата {sortField === "date" && <ArrowUpDown size={11}/>}</span>
              </th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300"
                onClick={() => toggleSort("amount")}>
                <span className="flex items-center gap-1">Сума {sortField === "amount" && <ArrowUpDown size={11}/>}</span>
              </th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Категорія</th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Співробітник</th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Опис</th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((expense) => (
              <tr key={expense.id}
                className="border-b border-dark-50/5 hover:bg-dark-200/50 transition-colors">
                <td className="px-5 py-4 text-gray-300">{expense.date}</td>
                <td className="px-5 py-4 font-semibold text-red-400">-{fmt(expense.amount)} &#8372;</td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                    {categoryName(expense.category_id)}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-400 text-sm">
                  {staffName(expense.staff_member_id) ?? "—"}
                </td>
                <td className="px-5 py-4 text-gray-500">{expense.description || "—"}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(expense)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(expense.id)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-600">
                  {search ? "Нічого не знайдено" : "Витрат поки немає. Натисніть «Додати витрату» щоб почати."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
