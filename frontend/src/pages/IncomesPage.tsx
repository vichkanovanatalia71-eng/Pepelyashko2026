import { useEffect, useState, FormEvent } from "react";
import { Plus, Trash2, X, Pencil, Search, ArrowUpDown, Wallet } from "lucide-react";
import api from "../api/client";
import type { Income, IncomeCategory } from "../types";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Готівка",
  card: "Картка",
  bank_transfer: "Переказ",
};

const emptyForm = () => ({
  amount: "",
  description: "",
  source: "",
  payment_method: "cash",
  category_id: "" as string,
  date: new Date().toISOString().split("T")[0],
});

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  // #2 — Фільтрація за датою
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // #8 — Пошук і сортування
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function loadIncomes() {
    const params: Record<string, string> = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (categoryFilter) params.category_id = categoryFilter;
    const { data } = await api.get("/incomes/", { params });
    setIncomes(data);
  }

  async function loadCategories() {
    const { data } = await api.get("/incomes/categories");
    setCategories(data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadIncomes();
  }, [dateFrom, dateTo, categoryFilter]);

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

  // Мапа категорій для відображення
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  // Відкрити форму для редагування
  function handleEdit(income: Income) {
    setEditingId(income.id);
    setForm({
      amount: String(income.amount),
      description: income.description || "",
      source: income.source || "",
      payment_method: income.payment_method,
      category_id: income.category_id ? String(income.category_id) : "",
      date: income.date,
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
    };
    if (editingId) {
      await api.put(`/incomes/${editingId}`, payload);
    } else {
      await api.post("/incomes/", payload);
    }
    closeForm();
    loadIncomes();
  }

  async function handleDelete(id: number) {
    await api.delete(`/incomes/${id}`);
    loadIncomes();
  }

  // Сортування
  function toggleSort(field: "date" | "amount") {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  // Фільтрація + сортування
  const filtered = incomes
    .filter(i => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (i.source || "").toLowerCase().includes(q) ||
             (i.description || "").toLowerCase().includes(q) ||
             (i.category_id ? (catMap.get(i.category_id) || "").toLowerCase().includes(q) : false) ||
             String(i.amount).includes(q);
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "date") return (a.date > b.date ? 1 : -1) * dir;
      return (a.amount - b.amount) * dir;
    });

  const total = filtered.reduce((sum, i) => sum + i.amount, 0);
  const fmt = (n: number) =>
    n.toLocaleString("uk-UA", { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 lg:mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <Wallet size={22} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Доходи</h2>
            <p className="text-gray-500 text-sm mt-1">
              Всього: <span className="text-emerald-400 font-semibold tabular-nums">{fmt(total)} &#8372;</span>
              {filtered.length !== incomes.length && (
                <span className="text-gray-600 ml-1">({filtered.length} з {incomes.length})</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => showForm ? closeForm() : openCreateForm()}
          className="btn-accent flex items-center gap-2 active:scale-[0.98]"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span className="hidden sm:inline">{showForm ? "Закрити" : "Додати дохід"}</span>
          <span className="sm:hidden">{showForm ? "Закрити" : "Додати"}</span>
        </button>
      </div>

      {/* #2 — Фільтри за датою + #8 Пошук + #10 Фільтр категорій */}
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
          <div className="flex items-center gap-1.5 ml-auto max-sm:ml-0 max-sm:w-full">
            <input type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setQuickFilter("custom"); }}
              className="bg-dark-300 border border-dark-50/20 rounded-xl px-2 py-1.5 text-xs text-white w-[120px] max-sm:flex-1" />
            <span className="text-gray-600 text-xs">—</span>
            <input type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); setQuickFilter("custom"); }}
              className="bg-dark-300 border border-dark-50/20 rounded-xl px-2 py-1.5 text-xs text-white w-[120px] max-sm:flex-1" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Пошук по джерелу, опису, категорії..."
              className="w-full bg-dark-300 border border-dark-50/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600" />
          </div>
          {categories.length > 0 && (
            <select value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white min-w-[140px]">
              <option value="">Всі категорії</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-neo p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          <div className="md:col-span-2 text-sm font-semibold text-white">
            {editingId ? "Редагування доходу" : "Новий дохід"}
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
            <label className="label-dark">Джерело</label>
            <input type="text" value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Пацієнт, страхова..." className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Спосіб оплати</label>
            <select value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="select-dark">
              <option value="cash">Готівка</option>
              <option value="card">Картка</option>
              <option value="bank_transfer">Банківський переказ</option>
            </select>
          </div>
          <div>
            <label className="label-dark">Категорія</label>
            <select value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="select-dark">
              <option value="">Без категорії</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-dark">Опис</label>
            <input type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-dark" placeholder="Додатковий опис..." />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" className="btn-accent active:scale-[0.98]">
              {editingId ? "Оновити" : "Зберегти"}
            </button>
            <button type="button" onClick={closeForm} className="btn-ghost">
              Скасувати
            </button>
          </div>
        </form>
      )}

      {/* Sort buttons (mobile) */}
      <div className="flex items-center gap-2 mb-3 sm:hidden">
        <span className="text-xs text-gray-500">Сортувати:</span>
        <button onClick={() => toggleSort("date")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${sortField === "date" ? "bg-accent-500/15 text-accent-400 border-accent-500/30" : "bg-dark-400/50 text-gray-400 border-dark-50/10"}`}>
          Дата <ArrowUpDown size={10} />
        </button>
        <button onClick={() => toggleSort("amount")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${sortField === "amount" ? "bg-accent-500/15 text-accent-400 border-accent-500/30" : "bg-dark-400/50 text-gray-400 border-dark-50/10"}`}>
          Сума <ArrowUpDown size={10} />
        </button>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {filtered.map((income) => (
          <div key={income.id} className="card-neo p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-400 tabular-nums">+{fmt(income.amount)} &#8372;</p>
                <p className="text-xs text-gray-500 mt-0.5">{income.date}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => handleEdit(income)} aria-label="Редагувати"
                  className="p-2 rounded-lg text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all active:scale-90">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(income.id)} aria-label="Видалити"
                  className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {income.source && (
                <span className="text-xs text-gray-300">{income.source}</span>
              )}
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-dark-400 text-gray-400 border border-dark-50/10">
                {PAYMENT_LABELS[income.payment_method] || income.payment_method}
              </span>
              {income.category_id && catMap.get(income.category_id) && (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-accent-500/10 text-accent-400 border border-accent-500/20">
                  {catMap.get(income.category_id)}
                </span>
              )}
            </div>
            {income.description && (
              <p className="text-xs text-gray-500">{income.description}</p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card-neo p-8 text-center text-gray-600 text-sm">
            {search ? "Нічого не знайдено" : "Доходів поки немає. Натисніть «Додати» щоб почати."}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="card-neo overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[660px]">
          <thead>
            <tr className="border-b border-dark-50/10 bg-dark-300/50">
              <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap cursor-pointer select-none hover:text-gray-200 transition-colors"
                onClick={() => toggleSort("date")}
                aria-label="Сортувати за датою">
                <span className="flex items-center gap-1">Дата {sortField === "date" && <ArrowUpDown size={11}/>}</span>
              </th>
              <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap cursor-pointer select-none hover:text-gray-200 transition-colors"
                onClick={() => toggleSort("amount")}
                aria-label="Сортувати за сумою">
                <span className="flex items-center gap-1">Сума {sortField === "amount" && <ArrowUpDown size={11}/>}</span>
              </th>
              <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Джерело</th>
              <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Категорія</th>
              <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Оплата</th>
              <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Опис</th>
              <th scope="col" className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((income) => (
              <tr key={income.id}
                className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                <td className="px-3 py-2.5 text-gray-300">{income.date}</td>
                <td className="px-3 py-2.5 font-semibold text-emerald-400 tabular-nums">+{fmt(income.amount)} &#8372;</td>
                <td className="px-3 py-2.5 text-gray-300">{income.source || "—"}</td>
                <td className="px-3 py-2.5">
                  {income.category_id && catMap.get(income.category_id) ? (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-accent-500/10 text-accent-400 border border-accent-500/20">
                      {catMap.get(income.category_id)}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                    {PAYMENT_LABELS[income.payment_method] || income.payment_method}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-gray-500">{income.description || "—"}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(income)}
                      aria-label="Редагувати"
                      className="p-1.5 rounded-lg text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(income.id)}
                      aria-label="Видалити"
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-600">
                  {search ? "Нічого не знайдено" : "Доходів поки немає. Натисніть «Додати дохід» щоб почати."}
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
