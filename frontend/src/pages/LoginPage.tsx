import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope, Mail, CheckCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/client";

type Tab = "login" | "register";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Register state ──
  const [regEmail, setRegEmail] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");
  const [regFopGroup, setRegFopGroup] = useState(3);
  const [regTaxRate, setRegTaxRate] = useState(5);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<{ email: string; emailSent: boolean } | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      navigate("/");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "";
      if (detail.includes("підтвердьте")) {
        setLoginError("Ваш email ще не підтверджено. Перевірте пошту та перейдіть за посиланням.");
      } else {
        setLoginError("Невірний email або пароль");
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegError("");

    if (regPassword !== regPassword2) {
      setRegError("Паролі не збігаються");
      return;
    }
    if (regPassword.length < 6) {
      setRegError("Пароль має містити щонайменше 6 символів");
      return;
    }

    setRegLoading(true);
    try {
      const res = await api.post("/auth/register", {
        email: regEmail,
        password: regPassword,
        full_name: regFullName,
        fop_group: regFopGroup,
        tax_rate: regTaxRate / 100,
      });
      setRegSuccess({ email: res.data.email, emailSent: res.data.email_sent });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setRegError(detail ?? "Помилка реєстрації. Спробуйте ще раз.");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-700
                    px-4 py-8 pt-[calc(2rem+env(safe-area-inset-top))]
                    pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 via-transparent to-transparent pointer-events-none" />
      {/* Мобільне фонове коло */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md card-neo p-6 lg:p-10 animate-enter-up shadow-elevation-3">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-500/10 flex items-center justify-center
                          shadow-glow-accent shadow-lg mb-4">
            <Stethoscope size={32} className="text-accent-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MedFlow</h1>
          <p className="text-sm text-gray-500 mt-1">
            Фінансовий менеджер для медичної практики
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-dark-300/50 rounded-xl p-1 mb-7 border border-dark-50/10" role="tablist">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t);
                setLoginError("");
                setRegError("");
                setRegSuccess(null);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                       focus-visible:outline-2 focus-visible:outline-accent-400 ${
                tab === t
                  ? "bg-accent-500/20 text-accent-400 border border-accent-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "login" ? "Вхід" : "Реєстрація"}
            </button>
          ))}
        </div>

        {/* ── Вхід ── */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20" role="alert">
                {loginError}
              </div>
            )}
            <div>
              <label className="label-dark">Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="input-dark"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="label-dark">Пароль</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="input-dark"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full btn-accent py-3 text-base disabled:opacity-50 active:scale-[0.98]"
            >
              {loginLoading ? "Входимо…" : "Увійти"}
            </button>
          </form>
        )}

        {/* ── Реєстрація ── */}
        {tab === "register" && (
          <>
            {regSuccess ? (
              /* Успішна реєстрація */
              <div className="flex flex-col items-center text-center gap-5 py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  {regSuccess.emailSent ? (
                    <Mail size={28} className="text-green-400" />
                  ) : (
                    <CheckCircle size={28} className="text-green-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {regSuccess.emailSent ? "Перевірте пошту!" : "Реєстрацію завершено!"}
                  </h3>
                  {regSuccess.emailSent ? (
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Ми надіслали лист підтвердження на{" "}
                      <span className="text-accent-400 font-mono">{regSuccess.email}</span>.
                      <br />
                      Перейдіть за посиланням у листі, щоб активувати обліковий запис.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Обліковий запис для{" "}
                      <span className="text-accent-400 font-mono">{regSuccess.email}</span>{" "}
                      створено та активовано автоматично.
                      <br />
                      Тепер ви можете увійти.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    const email = regSuccess.email;
                    setRegSuccess(null);
                    setTab("login");
                    setLoginEmail(email);
                  }}
                  className="btn-accent px-8 py-2.5 text-sm active:scale-[0.98]"
                >
                  Перейти до входу
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {regError && (
                  <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20" role="alert">
                    {regError}
                  </div>
                )}

                <div>
                  <label className="label-dark">Email</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="input-dark"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="label-dark">Повне ім'я (ПІБ)</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="input-dark"
                    placeholder="Іванов Іван Іванович"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-dark">Група ФОП</label>
                    <select
                      value={regFopGroup}
                      onChange={(e) => setRegFopGroup(Number(e.target.value))}
                      className="input-dark"
                    >
                      <option value={1}>1 група</option>
                      <option value={2}>2 група</option>
                      <option value={3}>3 група</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-dark">Ставка ЄП (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      value={regTaxRate}
                      onChange={(e) => setRegTaxRate(Number(e.target.value))}
                      className="input-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="label-dark">Пароль</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="input-dark"
                    placeholder="Мінімум 6 символів"
                  />
                </div>

                <div>
                  <label className="label-dark">Повторіть пароль</label>
                  <input
                    type="password"
                    required
                    value={regPassword2}
                    onChange={(e) => setRegPassword2(e.target.value)}
                    className="input-dark"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full btn-accent py-3 text-base disabled:opacity-50 mt-2 active:scale-[0.98]"
                >
                  {regLoading ? "Реєструємось…" : "Зареєструватись"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
