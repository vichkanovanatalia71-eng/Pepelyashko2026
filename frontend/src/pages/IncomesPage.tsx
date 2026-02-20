import { useEffect, useState, FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import api from "../api/client";
import type { Income } from "../types";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Готівка",
  card: "Картка",
  bank_transfer: "Переказ",
};

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    source: "",
    payment_method: "cash",
    date: new Date().toISOString().split("T")[0],
  });

  async function loadIncomes() {
    const { data } = await api.get("/incomes/");
    setIncomes(data);
  }

  useEffect(() => {
    loadIncomes();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/incomes/", { ...form, amount: parseFloat(form.amount) });
    setForm({
      amount: "",
      description: "",
      source: "",
      payment_method: "cash",
      date: new Date().toISOString().split("T")[0],
    });
    setShowForm(false);
    loadIncomes();
  }

  async function handleDelete(id: number) {
    await api.delete(`/incomes/${id}`);
    loadIncomes();
  }

  const total = incomes.reduce((sum, i) => sum + i.amount, 0);
  const fmt = (n: number) =>
    n.toLocaleString("uk-UA", { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 lg:mb-8 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Доходи</h2>
          <p className="text-gray-500 text-sm mt-1">
            Всього: <span className="text-emerald-400 font-semibold">{fmt(total)} &#8372;</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-accent flex items-center gap-2"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span className="hidden sm:inline">{showForm ? "Закрити" : "Додати дохід"}</span>
          <span className="sm:hidden">{showForm ? "Закрити" : "Додати"}</span>
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-neo p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          <div>
            <label className="label-dark">Сума</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="input-dark"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label-dark">Дата</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-dark"
            />
          </div>
          <div>
            <label className="label-dark">Джерело</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Пацієнт, страхова..."
              className="input-dark"
            />
          </div>
          <div>
            <label className="label-dark">Спосіб оплати</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="select-dark"
            >
              <option value="cash">Готівка</option>
              <option value="card">Картка</option>
              <option value="bank_transfer">Банківський переказ</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label-dark">Опис</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-dark"
              placeholder="Додатковий опис..."
            />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" className="btn-accent">
              Зберегти
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-ghost"
            >
              Скасувати
            </button>
          </div>
        </form>
      )}

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2.5">
        {incomes.length === 0 && (
          <div className="card-neo p-10 text-center text-gray-600 text-sm">
            Доходів поки немає. Натисніть «Додати» щоб почати.
          </div>
        )}
        {incomes.map((income) => (
          <div key={income.id} className="card-neo p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
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
              <button
                onClick={() => handleDelete(income.id)}
                className="p-2 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 tap-target"
              >
                <Trash2 size={16} />
              </button>
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
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Дата
              </th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Сума
              </th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Джерело
              </th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Оплата
              </th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Опис
              </th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {incomes.map((income) => (
              <tr
                key={income.id}
                className="border-b border-dark-50/5 hover:bg-dark-200/50 transition-colors"
              >
                <td className="px-5 py-4 text-gray-300">{income.date}</td>
                <td className="px-5 py-4 font-semibold text-emerald-400">
                  +{fmt(income.amount)} &#8372;
                </td>
                <td className="px-5 py-4 text-gray-300">{income.source || "—"}</td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-dark-400 text-gray-400 border border-dark-50/10">
                    {PAYMENT_LABELS[income.payment_method] || income.payment_method}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-500">{income.description || "—"}</td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => handleDelete(income.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {incomes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-600">
                  Доходів поки немає. Натисніть «Додати дохід» щоб почати.
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
