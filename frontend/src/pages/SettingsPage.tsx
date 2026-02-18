import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import {
  Settings,
  UserPlus,
  Trash2,
  Save,
  RefreshCw,
  Stethoscope,
  PercentCircle,
} from "lucide-react";
import { Doctor, NhsuSettings } from "../types";

const API = import.meta.env.VITE_API_URL ?? "";

const AGE_LABELS: Record<string, string> = {
  coeff_0_5: "0–5 років",
  coeff_6_17: "6–17 років",
  coeff_18_39: "18–39 років",
  coeff_40_64: "40–64 роки",
  coeff_65_plus: "65+ років",
};

export default function SettingsPage() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  // ── Лікарі ──
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newIsOwner, setNewIsOwner] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorMsg, setDoctorMsg] = useState("");

  // ── Налаштування НСЗУ ──
  const [nhsuSettings, setNhsuSettings] = useState<NhsuSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<Partial<NhsuSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  useEffect(() => {
    loadDoctors();
    loadSettings();
  }, []);

  async function loadDoctors() {
    try {
      const res = await axios.get(`${API}/api/nhsu/doctors`, { headers });
      setDoctors(res.data);
    } catch {}
  }

  async function loadSettings() {
    try {
      const res = await axios.get(`${API}/api/nhsu/settings`, { headers });
      setNhsuSettings(res.data);
      setSettingsForm(res.data);
    } catch {}
  }

  async function handleAddDoctor() {
    if (!newDoctorName.trim()) return;
    setDoctorLoading(true);
    setDoctorMsg("");
    try {
      await axios.post(
        `${API}/api/nhsu/doctors`,
        { full_name: newDoctorName.trim(), is_owner: newIsOwner },
        { headers }
      );
      setNewDoctorName("");
      setNewIsOwner(false);
      setDoctorMsg("Лікаря додано");
      await loadDoctors();
    } catch (e: any) {
      setDoctorMsg(e?.response?.data?.detail ?? "Помилка");
    } finally {
      setDoctorLoading(false);
    }
  }

  async function handleDeleteDoctor(id: number) {
    try {
      await axios.delete(`${API}/api/nhsu/doctors/${id}`, { headers });
      await loadDoctors();
    } catch {}
  }

  async function handleSaveSettings() {
    setSettingsLoading(true);
    setSettingsMsg("");
    try {
      await axios.put(`${API}/api/nhsu/settings`, settingsForm, { headers });
      setSettingsMsg("Збережено");
      await loadSettings();
    } catch (e: any) {
      setSettingsMsg(e?.response?.data?.detail ?? "Помилка збереження");
    } finally {
      setSettingsLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
          <Settings size={22} className="text-accent-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Налаштування сервісу</h1>
          <p className="text-sm text-gray-500">
            Лікарі та коефіцієнти розрахунку НСЗУ
          </p>
        </div>
      </div>

      {/* ── Лікарі ── */}
      <div className="card-neo p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope size={18} className="text-accent-400" />
          <h2 className="text-lg font-semibold text-white">Список лікарів</h2>
        </div>

        {/* Форма додавання */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">ПІБ лікаря</label>
            <input
              className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
              placeholder="Іванов Іван Іванович"
              value={newDoctorName}
              onChange={(e) => setNewDoctorName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDoctor()}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400 pb-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newIsOwner}
              onChange={(e) => setNewIsOwner(e.target.checked)}
              className="accent-accent-500 w-4 h-4"
            />
            Власник
          </label>
          <button
            onClick={handleAddDoctor}
            disabled={doctorLoading || !newDoctorName.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20 disabled:opacity-50"
          >
            <UserPlus size={16} />
            Додати
          </button>
        </div>

        {doctorMsg && (
          <p className="text-xs text-accent-400">{doctorMsg}</p>
        )}

        {/* Таблиця лікарів */}
        <div className="overflow-hidden rounded-xl border border-dark-50/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-50/10 bg-dark-300/50">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">ПІБ</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Власник</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {doctors.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-gray-600 text-sm">
                    Лікарів ще немає. Додайте першого.
                  </td>
                </tr>
              )}
              {doctors.map((d) => (
                <tr key={d.id} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                  <td className="px-4 py-3 text-gray-200">{d.full_name}</td>
                  <td className="px-4 py-3 text-center">
                    {d.is_owner ? (
                      <span className="text-xs px-2 py-0.5 bg-accent-500/10 text-accent-400 rounded-full border border-accent-500/20">
                        Власник
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteDoctor(d.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Налаштування НСЗУ ── */}
      <div className="card-neo p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <PercentCircle size={18} className="text-accent-400" />
          <h2 className="text-lg font-semibold text-white">Параметри розрахунку НСЗУ</h2>
        </div>

        {!nhsuSettings ? (
          <div className="text-gray-500 text-sm py-4">Завантаження…</div>
        ) : (
          <>
            {/* Капітаційна ставка та податки */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Капітаційна ставка (грн)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50"
                  value={settingsForm.capitation_rate ?? ""}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, capitation_rate: parseFloat(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Єдиний податок (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50"
                  value={settingsForm.ep_rate ?? ""}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, ep_rate: parseFloat(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Військовий збір (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50"
                  value={settingsForm.vz_rate ?? ""}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, vz_rate: parseFloat(e.target.value) }))
                  }
                />
              </div>
            </div>

            {/* Вікові коефіцієнти */}
            <div>
              <p className="text-xs text-gray-400 mb-3">Вікові коефіцієнти</p>
              <div className="grid grid-cols-5 gap-3">
                {(Object.keys(AGE_LABELS) as (keyof NhsuSettings)[]).map((key) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{AGE_LABELS[key as string]}</label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50"
                      value={(settingsForm[key] as number) ?? ""}
                      onChange={(e) =>
                        setSettingsForm((p) => ({ ...p, [key]: parseFloat(e.target.value) }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSaveSettings}
                disabled={settingsLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20 disabled:opacity-50"
              >
                {settingsLoading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Зберегти налаштування
              </button>
              {settingsMsg && (
                <span className="text-xs text-accent-400">{settingsMsg}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
