import { useEffect, useState, FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import api from "../api/client";
import type { Income } from "../types";

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Доходи</h2>
          <p className="text-gray-500 text-sm mt-1">
            Всього: {total.toLocaleString("uk-UA", { minimumFractionDigits: 2 })} &#8372;
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          Додати дохід
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сума</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Джерело</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Пацієнт, страхова..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Спосіб оплати
            </label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="cash">Готівка</option>
              <option value="card">Картка</option>
              <option value="bank_transfer">Банківський переказ</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Зберегти
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Дата</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Сума</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Джерело</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Оплата</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Опис</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {incomes.map((income) => (
              <tr key={income.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">{income.date}</td>
                <td className="px-4 py-3 font-medium text-green-600">
                  {income.amount.toLocaleString("uk-UA", { minimumFractionDigits: 2 })} &#8372;
                </td>
                <td className="px-4 py-3">{income.source}</td>
                <td className="px-4 py-3">{income.payment_method}</td>
                <td className="px-4 py-3 text-gray-500">{income.description}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(income.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {incomes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Доходів поки немає
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
