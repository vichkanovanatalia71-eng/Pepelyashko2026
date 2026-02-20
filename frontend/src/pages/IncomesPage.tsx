import { useEffect, useState, FormEvent } from "react";
import { Plus, Trash2, X, Pencil, Search, ArrowUpDown, ChevronDown } from "lucide-react";
import api from "../api/client";
import type { Income } from "../types";

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
  date: new Date().toISOString().split("T")[0],
});

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  // #2 — Фільтрація за датою
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickFilter, setQuickFilter] = useState<string>("all");

  // #8 — Пошук і сортування
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function loadIncomes() {
    const params: Record<string, string> = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const { data } = await api.get("/incomes/", { params });
    setIncomes(data);
  }

  useEffect(() => {
    loadIncomes();
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
  function handleEdit(income: Income) {
    setEditingId(income.id);
    setForm({
      amount: String(income.amount),
      description: income.description || "",
      source: income.source || "",
      payment_method: income.payment_method,
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
    const payload = { ...form, amount: parseFloat(form.amount) };
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
        <div>
          <h2 className="text-2xl font-bold text-white">Доходи</h2>
          <p className="text-gray-500 text-sm mt-1">
            Всього: <span className="text-emerald-400 font-semibold">{fmt(total)} &#8372;</span>
            {filtered.length !== incomes.length && (
              <span className="text-gray-600 ml-1">({filtered.length} з {incomes.length})</span>
            )}
          </p>
        </div>
        <button
          onClick={() => showForm ? closeForm() : openCreateForm()}
          className="btn-accent flex items-center gap-2"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span className="hidden sm:inline">{showForm ? "Закрити" : "Додати дохід"}</span>
          <span className="sm:hidden">{showForm ? "Закрити" : "Додати"}</span>
        </button>
      </div>

      {/* #2 — Фільтри за датою + #8 Пошук */}
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
            placeholder="Пошук по джерелу, опису..."
            className="w-full bg-dark-300 border border-dark-50/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600" />
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
          <div className="md:col-span-2">
            <label className="label-dark">Опис</label>
            <input type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-dark" placeholder="Додатковий опис..." />
          </div>
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
            {search ? "Нічого не знайдено" : "Доходів поки немає. Натисніть «Додати» щоб почати."}
          </div>
        )}
        {filtered.map((income) => (
          <div key={income.id} className="card-neo p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0" onClick={() => handleEdit(income)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{income.date}</span>
                  <span className="font-bold text-emerald-400 tabular-nums">+{fmt(income.amount)} &#8372;</span>
                </div>
                <p className="text-sm text-gray-200 font-medium truncate">{income.source || "—"}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                    {PAYMENT_LABELS[income.payment_method] || income.payment_method}
                  </span>
                  {income.description && (
                    <span className="text-xs text-gray-600 truncate">{income.description}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => handleEdit(income)}
                  className="p-2 rounded-xl text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all tap-target">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(income.id)}
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
        <table className="w-full text-sm min-w-[560px]">
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
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Джерело</th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Оплата</th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Опис</th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((income) => (
              <tr key={income.id}
                className="border-b border-dark-50/5 hover:bg-dark-200/50 transition-colors">
                <td className="px-5 py-4 text-gray-300">{income.date}</td>
                <td className="px-5 py-4 font-semibold text-emerald-400">+{fmt(income.amount)} &#8372;</td>
                <td className="px-5 py-4 text-gray-300">{income.source || "—"}</td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                    {PAYMENT_LABELS[income.payment_method] || income.payment_method}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-500">{income.description || "—"}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(income)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(income.id)}
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
