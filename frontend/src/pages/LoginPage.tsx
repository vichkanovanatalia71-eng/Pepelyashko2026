import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Невірний email або пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-700">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-md card-neo p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-500/10 flex items-center justify-center shadow-glow-accent mb-4">
            <Stethoscope size={32} className="text-accent-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pepelyashko</h1>
          <p className="text-sm text-gray-500 mt-1">
            Фінансовий менеджер для медичної практики
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label className="label-dark">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="label-dark">Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-accent py-3 text-base disabled:opacity-50"
          >
            {loading ? "Входимо..." : "Увійти"}
          </button>
        </form>
      </div>
    </div>
  );
}
