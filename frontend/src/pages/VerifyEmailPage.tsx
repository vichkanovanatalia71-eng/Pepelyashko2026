import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader, Stethoscope } from "lucide-react";
import axios from "axios";

const API = "";

type Status = "loading" | "success" | "error" | "already";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Токен підтвердження відсутній у посиланні.");
      return;
    }

    axios
      .get(`${API}/api/auth/verify-email`, { params: { token } })
      .then((res) => {
        const detail: string = res.data?.detail ?? "";
        if (detail.includes("вже підтверджено")) {
          setStatus("already");
        } else {
          setStatus("success");
        }
        setMessage(detail);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.response?.data?.detail ?? "Не вдалося підтвердити email. Посилання недійсне або застаріло."
        );
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-700">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-md card-neo p-10 flex flex-col items-center text-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
          <Stethoscope size={16} className="text-accent-500" />
          <span className="text-white font-semibold">Pepelyashko</span>
        </div>

        {status === "loading" && (
          <>
            <div className="w-16 h-16 rounded-full bg-accent-500/10 flex items-center justify-center border border-accent-500/20">
              <Loader size={28} className="text-accent-400 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Підтвердження…</h2>
              <p className="text-sm text-gray-500">Зачекайте, перевіряємо ваш токен.</p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Email підтверджено!</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Ваш обліковий запис успішно активовано.
                <br />
                Тепер ви можете увійти в систему.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="btn-accent px-8 py-2.5 text-sm"
            >
              Увійти
            </button>
          </>
        )}

        {status === "already" && (
          <>
            <div className="w-16 h-16 rounded-full bg-accent-500/10 flex items-center justify-center border border-accent-500/20">
              <CheckCircle size={28} className="text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Email вже підтверджено</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Цей обліковий запис вже був активований раніше.
                <br />
                Ви можете увійти в систему.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="btn-accent px-8 py-2.5 text-sm"
            >
              Перейти до входу
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <XCircle size={28} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Помилка підтвердження</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="btn-accent px-8 py-2.5 text-sm"
            >
              На сторінку входу
            </button>
          </>
        )}
      </div>
    </div>
  );
}
