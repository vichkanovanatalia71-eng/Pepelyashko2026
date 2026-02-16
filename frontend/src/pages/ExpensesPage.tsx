import { useEffect, useState, FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import api from "../api/client";
import type { Expense, ExpenseCategory } from "../types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
  });

  async function loadData() {
    const [expRes, catRes] = await Promise.all([
      api.get("/expenses/"),
      api.get("/expenses/categories"),
    ]);
    setExpenses(expRes.data);
    setCategories(catRes.data);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/expenses/", {
      ...form,
      amount: parseFloat(form.amount),
      category_id: form.category_id ? parseInt(form.category_id) : null,
    });
    setForm({
      amount: "",
      description: "",
      category_id: "",
      date: new Date().toISOString().split("T")[0],
    });
    setShowForm(false);
    loadData();
  }

  async function handleDelete(id: number) {
    await api.delete(`/expenses/${id}`);
    loadData();
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryName = (id: number | null) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Витрати</h2>
          <p className="text-gray-500 text-sm mt-1">
            Всього: {total.toLocaleString("uk-UA", { minimumFractionDigits: 2 })} &#8372;
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          Додати витрату
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категорія
            </label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">Без категорії</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
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
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Категорія</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Опис</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">{expense.date}</td>
                <td className="px-4 py-3 font-medium text-red-600">
                  {expense.amount.toLocaleString("uk-UA", { minimumFractionDigits: 2 })}{" "}
                  &#8372;
                </td>
                <td className="px-4 py-3">{categoryName(expense.category_id)}</td>
                <td className="px-4 py-3 text-gray-500">{expense.description}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Витрат поки немає
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
