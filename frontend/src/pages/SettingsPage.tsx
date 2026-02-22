import { useEffect, useState, FormEvent } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import api from "../api/client";
import {
  Settings,
  UserPlus,
  Trash2,
  Save,
  RefreshCw,
  Stethoscope,
  PercentCircle,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Receipt,
  ChevronDown,
  HeartHandshake,
  UserCog,
  User,
  Lock,
  Check,
} from "lucide-react";
import { Doctor, NhsuSettings, StaffMember } from "../types";

const API = "";

const AGE_LABELS: Record<string, string> = {
  coeff_0_5: "0–5 років",
  coeff_6_17: "6–17 років",
  coeff_18_39: "18–39 років",
  coeff_40_64: "40–64 роки",
  coeff_65_plus: "65+ років",
};

const FOP_LABELS: Record<number, string> = {
  1: "1 група",
  2: "2 група",
  3: "3 група",
};

export default function SettingsPage() {
  const { token, user, refreshUser } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  // ── Колапс-стан блоків ──
  const [open, setOpen] = useState<Record<string, boolean>>({
    profile: true,
    password: false,
    doctors: false,
    nurses: false,
    otherStaff: false,
    apiKeys: false,
    taxes: true,
    nhsu: false,
  });
  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  // ── Профіль ──
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [fopGroup, setFopGroup] = useState(user?.fop_group ?? 3);
  const [taxRate, setTaxRate] = useState(String((user?.tax_rate ?? 0.05) * 100));
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  // ── Зміна пароля ──
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  // ── Лікарі ──
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newIsOwner, setNewIsOwner] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorMsg, setDoctorMsg] = useState("");

  // ── Медичні сестри ──
  const [nurses, setNurses] = useState<StaffMember[]>([]);
  const [newNurseName, setNewNurseName] = useState("");
  const [newNursePosition, setNewNursePosition] = useState("");
  const [nurseLoading, setNurseLoading] = useState(false);
  const [nurseMsg, setNurseMsg] = useState("");

  // ── Інший персонал ──
  const [otherStaff, setOtherStaff] = useState<StaffMember[]>([]);
  const [newOtherName, setNewOtherName] = useState("");
  const [newOtherPosition, setNewOtherPosition] = useState("");
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherMsg, setOtherMsg] = useState("");

  // ── Налаштування НСЗУ ──
  const [nhsuSettings, setNhsuSettings] = useState<NhsuSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<Partial<NhsuSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  // ── API ключі ──
  interface ApiKeysStatus {
    anthropic_key_set: boolean;
    anthropic_key_masked: string | null;
    openai_key_set: boolean;
    openai_key_masked: string | null;
    xai_key_set: boolean;
    xai_key_masked: string | null;
  }
  const [apiKeysStatus, setApiKeysStatus] = useState<ApiKeysStatus | null>(null);
  const [anthropicInput, setAnthropicInput] = useState("");
  const [openaiInput, setOpenaiInput] = useState("");
  const [xaiInput, setXaiInput] = useState("");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showXaiKey, setShowXaiKey] = useState(false);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeysMsg, setApiKeysMsg] = useState("");

  useEffect(() => {
    loadDoctors();
    loadNurses();
    loadOtherStaff();
    loadSettings();
    loadApiKeys();
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

  async function loadNurses() {
    try {
      const res = await axios.get(`${API}/api/staff/?role=nurse`, { headers });
      setNurses(res.data);
    } catch {}
  }

  async function handleAddNurse() {
    if (!newNurseName.trim()) return;
    setNurseLoading(true);
    setNurseMsg("");
    try {
      await axios.post(
        `${API}/api/staff/`,
        { full_name: newNurseName.trim(), role: "nurse", position: newNursePosition.trim() },
        { headers }
      );
      setNewNurseName("");
      setNewNursePosition("");
      setNurseMsg("Додано");
      await loadNurses();
    } catch (e: any) {
      setNurseMsg(e?.response?.data?.detail ?? "Помилка");
    } finally {
      setNurseLoading(false);
    }
  }

  async function handleDeleteNurse(id: number) {
    try {
      await axios.delete(`${API}/api/staff/${id}`, { headers });
      await loadNurses();
    } catch {}
  }

  async function loadOtherStaff() {
    try {
      const res = await axios.get(`${API}/api/staff/?role=other`, { headers });
      setOtherStaff(res.data);
    } catch {}
  }

  async function handleAddOtherStaff() {
    if (!newOtherName.trim()) return;
    setOtherLoading(true);
    setOtherMsg("");
    try {
      await axios.post(
        `${API}/api/staff/`,
        { full_name: newOtherName.trim(), role: "other", position: newOtherPosition.trim() },
        { headers }
      );
      setNewOtherName("");
      setNewOtherPosition("");
      setOtherMsg("Додано");
      await loadOtherStaff();
    } catch (e: any) {
      setOtherMsg(e?.response?.data?.detail ?? "Помилка");
    } finally {
      setOtherLoading(false);
    }
  }

  async function handleDeleteOtherStaff(id: number) {
    try {
      await axios.delete(`${API}/api/staff/${id}`, { headers });
      await loadOtherStaff();
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

  async function loadApiKeys() {
    try {
      const res = await axios.get(`${API}/api/settings/api-keys`, { headers });
      setApiKeysStatus(res.data);
    } catch {}
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    try {
      await api.put("/auth/profile", {
        full_name: fullName,
        fop_group: fopGroup,
        tax_rate: parseFloat(taxRate) / 100,
      });
      await refreshUser();
      setProfileMsg("Профіль оновлено");
      setTimeout(() => setProfileMsg(""), 3000);
    } catch (err: any) {
      setProfileErr(err?.response?.data?.detail || "Помилка збереження");
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwdMsg("");
    setPwdErr("");
    if (newPassword.length < 6) {
      setPwdErr("Мінімум 6 символів");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErr("Паролі не збігаються");
      return;
    }
    try {
      await api.put("/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPwdMsg("Пароль змінено");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdMsg(""), 3000);
    } catch (err: any) {
      setPwdErr(err?.response?.data?.detail || "Помилка зміни пароля");
    }
  }

  async function handleSaveApiKeys() {
    setApiKeysLoading(true);
    setApiKeysMsg("");
    try {
      const payload: Record<string, string | null> = {};
      if (anthropicInput !== "") payload.anthropic_key = anthropicInput;
      if (openaiInput !== "") payload.openai_key = openaiInput;
      if (xaiInput !== "") payload.xai_key = xaiInput;
      await axios.put(`${API}/api/settings/api-keys`, payload, { headers });
      setApiKeysMsg("Ключі збережено");
      setAnthropicInput("");
      setOpenaiInput("");
      setXaiInput("");
      await loadApiKeys();
    } catch (e: any) {
      setApiKeysMsg(e?.response?.data?.detail ?? "Помилка збереження");
    } finally {
      setApiKeysLoading(false);
    }
  }

  async function handleClearApiKey(field: "anthropic_key" | "openai_key" | "xai_key") {
    try {
      await axios.put(`${API}/api/settings/api-keys`, { [field]: "" }, { headers });
      await loadApiKeys();
    } catch {}
  }

  /* ── Заголовок блоку (клікабельний, 3D-ховер, шеврон) ── */
  function SectionHeader({
    sectionKey,
    icon: Icon,
    title,
    subtitle,
  }: {
    sectionKey: string;
    icon: React.ElementType;
    title: string;
    subtitle?: string;
  }) {
    const isOpen = open[sectionKey];
    return (
      <button
        type="button"
        onClick={() => toggle(sectionKey)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-2 group"
      >
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-accent-400" />
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle && <span className="text-xs text-gray-500 ml-1">{subtitle}</span>}
        </div>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`text-gray-500 group-hover:text-accent-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
    );
  }

  return (
    <div className="space-y-8 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
          <Settings size={22} className="text-accent-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Налаштування сервісу</h1>
          <p className="text-sm text-gray-500">
            Профіль, персонал та коефіцієнти розрахунку
          </p>
        </div>
      </div>

      {/* ── Профіль ── */}
      <div className="card-neo card-3d-hover p-6 space-y-5">
        <SectionHeader sectionKey="profile" icon={User} title="Профіль" />

        {open.profile && (
          <>
            <div className="flex items-center gap-4 mb-1">
              <div className="w-14 h-14 rounded-2xl bg-accent-500/10 flex items-center justify-center" aria-hidden="true">
                <User size={28} className="text-accent-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{user?.full_name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {FOP_LABELS[user?.fop_group ?? 3]} &bull; Ставка {((user?.tax_rate ?? 0.05) * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">ПІБ</label>
                <input type="text" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Група ФОП</label>
                  <select value={fopGroup}
                    onChange={e => setFopGroup(Number(e.target.value))}
                    className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500/50">
                    <option value={1}>1 група</option>
                    <option value={2}>2 група</option>
                    <option value={3}>3 група</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ставка податку (%)</label>
                  <input type="number" step="0.1" min="0" max="100"
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                    className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50" />
                </div>
              </div>

              {profileMsg && (
                <div className="flex items-center gap-2 text-sm text-emerald-400" role="status">
                  <Check size={16} aria-hidden="true" /> {profileMsg}
                </div>
              )}
              {profileErr && (
                <p className="text-sm text-red-400" role="alert">{profileErr}</p>
              )}

              <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20">
                <Save size={16} aria-hidden="true" /> Зберегти
              </button>
            </form>
          </>
        )}
      </div>

      {/* ── Зміна пароля ── */}
      <div className="card-neo card-3d-hover p-6 space-y-5">
        <SectionHeader sectionKey="password" icon={Lock} title="Зміна пароля" />

        {open.password && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Поточний пароль</label>
              <input type="password" value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50" required autoComplete="current-password" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Новий пароль</label>
              <input type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50" required minLength={6} autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Підтвердження нового пароля</label>
              <input type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50" required autoComplete="new-password" />
            </div>

            {pwdMsg && (
              <div className="flex items-center gap-2 text-sm text-emerald-400" role="status">
                <Check size={16} aria-hidden="true" /> {pwdMsg}
              </div>
            )}
            {pwdErr && (
              <p className="text-sm text-red-400" role="alert">{pwdErr}</p>
            )}

            <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20">
              <Lock size={16} aria-hidden="true" /> Змінити пароль
            </button>
          </form>
        )}
      </div>

      {/* ── Лікарі ── */}
      <div className="card-neo card-3d-hover p-6 space-y-5">
        <SectionHeader sectionKey="doctors" icon={Stethoscope} title="Список лікарів" />

        {open.doctors && (
          <>
            {/* Форма додавання */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
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
                    <th scope="col" className="text-left px-4 py-3 text-gray-400 font-medium">ПІБ</th>
                    <th scope="col" className="text-center px-4 py-3 text-gray-400 font-medium">Власник</th>
                    <th scope="col" className="px-4 py-3" />
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
                          aria-label="Видалити"
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
          </>
        )}
      </div>

      {/* ── Медичні сестри ── */}
      <div className="card-neo card-3d-hover p-6 space-y-5">
        <SectionHeader sectionKey="nurses" icon={HeartHandshake} title="Медичні сестри" />

        {open.nurses && (
          <>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-gray-400 mb-1">ПІБ</label>
                <input
                  className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
                  placeholder="Петренко Марія Іванівна"
                  value={newNurseName}
                  onChange={(e) => setNewNurseName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNurse()}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs text-gray-400 mb-1">Посада</label>
                <input
                  className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
                  placeholder="Медична сестра"
                  value={newNursePosition}
                  onChange={(e) => setNewNursePosition(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNurse()}
                />
              </div>
              <button
                onClick={handleAddNurse}
                disabled={nurseLoading || !newNurseName.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20 disabled:opacity-50"
              >
                <UserPlus size={16} />
                Додати
              </button>
            </div>

            {nurseMsg && <p className="text-xs text-accent-400">{nurseMsg}</p>}

            <div className="overflow-hidden rounded-xl border border-dark-50/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-50/10 bg-dark-300/50">
                    <th scope="col" className="text-left px-4 py-3 text-gray-400 font-medium">ПІБ</th>
                    <th scope="col" className="text-left px-4 py-3 text-gray-400 font-medium">Посада</th>
                    <th scope="col" className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {nurses.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-gray-600 text-sm">
                        Медичних сестер ще немає. Додайте першу.
                      </td>
                    </tr>
                  )}
                  {nurses.map((s) => (
                    <tr key={s.id} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                      <td className="px-4 py-3 text-gray-200">{s.full_name}</td>
                      <td className="px-4 py-3 text-gray-400">{s.position || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteNurse(s.id)}
                          aria-label="Видалити"
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
          </>
        )}
      </div>

      {/* ── Інший персонал ── */}
      <div className="card-neo card-3d-hover p-6 space-y-5">
        <SectionHeader sectionKey="otherStaff" icon={UserCog} title="Інший персонал" />

        {open.otherStaff && (
          <>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-gray-400 mb-1">ПІБ</label>
                <input
                  className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
                  placeholder="Коваленко Олег Петрович"
                  value={newOtherName}
                  onChange={(e) => setNewOtherName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddOtherStaff()}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs text-gray-400 mb-1">Посада</label>
                <input
                  className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
                  placeholder="Адміністратор"
                  value={newOtherPosition}
                  onChange={(e) => setNewOtherPosition(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddOtherStaff()}
                />
              </div>
              <button
                onClick={handleAddOtherStaff}
                disabled={otherLoading || !newOtherName.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20 disabled:opacity-50"
              >
                <UserPlus size={16} />
                Додати
              </button>
            </div>

            {otherMsg && <p className="text-xs text-accent-400">{otherMsg}</p>}

            <div className="overflow-hidden rounded-xl border border-dark-50/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-50/10 bg-dark-300/50">
                    <th scope="col" className="text-left px-4 py-3 text-gray-400 font-medium">ПІБ</th>
                    <th scope="col" className="text-left px-4 py-3 text-gray-400 font-medium">Посада</th>
                    <th scope="col" className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {otherStaff.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-gray-600 text-sm">
                        Персоналу ще немає. Додайте першого.
                      </td>
                    </tr>
                  )}
                  {otherStaff.map((s) => (
                    <tr key={s.id} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                      <td className="px-4 py-3 text-gray-200">{s.full_name}</td>
                      <td className="px-4 py-3 text-gray-400">{s.position || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteOtherStaff(s.id)}
                          aria-label="Видалити"
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
          </>
        )}
      </div>

      {/* ── API ключі ── */}
      <div className="card-neo card-3d-hover p-6 space-y-5">
        <SectionHeader sectionKey="apiKeys" icon={KeyRound} title="API ключі" subtitle="для AI-аналізу зображень" />

        {open.apiKeys && (
          <>
            {[
              {
                label: "Claude (Anthropic)",
                field: "anthropic_key" as const,
                input: anthropicInput,
                setInput: setAnthropicInput,
                show: showAnthropicKey,
                setShow: setShowAnthropicKey,
                isSet: apiKeysStatus?.anthropic_key_set,
                masked: apiKeysStatus?.anthropic_key_masked,
                placeholder: "sk-ant-…",
              },
              {
                label: "ChatGPT (OpenAI)",
                field: "openai_key" as const,
                input: openaiInput,
                setInput: setOpenaiInput,
                show: showOpenaiKey,
                setShow: setShowOpenaiKey,
                isSet: apiKeysStatus?.openai_key_set,
                masked: apiKeysStatus?.openai_key_masked,
                placeholder: "sk-…",
              },
              {
                label: "Grok (xAI)",
                field: "xai_key" as const,
                input: xaiInput,
                setInput: setXaiInput,
                show: showXaiKey,
                setShow: setShowXaiKey,
                isSet: apiKeysStatus?.xai_key_set,
                masked: apiKeysStatus?.xai_key_masked,
                placeholder: "xai-…",
              },
            ].map(({ label, field, input, setInput, show, setShow, isSet, masked, placeholder }) => (
              <div key={field} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300 font-medium">{label}</label>
                  {isSet ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle2 size={12} />
                      Налаштовано: <span className="font-mono text-gray-400">{masked}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <XCircle size={12} />
                      Не налаштовано
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={show ? "text" : "password"}
                      className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50 pr-10 font-mono"
                      placeholder={isSet ? "Введіть новий ключ для заміни" : placeholder}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "Сховати ключ" : "Показати ключ"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {isSet && (
                    <button
                      onClick={() => handleClearApiKey(field)}
                      aria-label="Видалити ключ"
                      className="px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-all"
                      title="Видалити ключ"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSaveApiKeys}
                disabled={apiKeysLoading || (!anthropicInput && !openaiInput && !xaiInput)}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20 disabled:opacity-50"
              >
                {apiKeysLoading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Зберегти ключі
              </button>
              {apiKeysMsg && (
                <span className="text-xs text-accent-400">{apiKeysMsg}</span>
              )}
            </div>

            <p className="text-xs text-gray-600">
              Ключі зберігаються в зашифрованому вигляді та використовуються лише для AI-аналізу зображень НСЗУ.
              Ключ Claude (Anthropic) є пріоритетним для аналізу скріншотів.
            </p>
          </>
        )}
      </div>

      {/* ── Податки ── */}
      <div className="card-neo card-3d-hover p-6 space-y-5">
        <SectionHeader sectionKey="taxes" icon={Receipt} title="Податки" />

        {open.taxes && (
          <>
            {!nhsuSettings ? (
              <div className="text-gray-500 text-sm py-4">Завантаження…</div>
            ) : (
              <>
                {/* Податки від доходу ФОП */}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Від доходу ФОП</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">ЄСВ власника (грн/місяць)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50"
                      value={settingsForm.esv_monthly ?? ""}
                      onChange={(e) =>
                        setSettingsForm((p) => ({ ...p, esv_monthly: parseFloat(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Єдиний податок — ЄП (%)</label>
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
                    <label className="block text-xs text-gray-400 mb-1">Військовий збір від доходу — ВЗ (%)</label>
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

                {/* Зарплатні ставки */}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Зарплатні ставки</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">ПДФО із зарплати (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50"
                      value={settingsForm.pdfo_rate ?? ""}
                      onChange={(e) =>
                        setSettingsForm((p) => ({ ...p, pdfo_rate: parseFloat(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">ВЗ із зарплати (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50"
                      value={settingsForm.vz_zp_rate ?? ""}
                      onChange={(e) =>
                        setSettingsForm((p) => ({ ...p, vz_zp_rate: parseFloat(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">ЄСВ роботодавця (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50"
                      value={settingsForm.esv_employer_rate ?? ""}
                      onChange={(e) =>
                        setSettingsForm((p) => ({ ...p, esv_employer_rate: parseFloat(e.target.value) }))
                      }
                    />
                  </div>
                </div>

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
                    Зберегти
                  </button>
                  {settingsMsg && (
                    <span className="text-xs text-accent-400">{settingsMsg}</span>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Параметри розрахунку НСЗУ ── */}
      <div className="card-neo card-3d-hover p-6 space-y-5">
        <SectionHeader sectionKey="nhsu" icon={PercentCircle} title="Параметри розрахунку НСЗУ" />

        {open.nhsu && (
          <>
            {!nhsuSettings ? (
              <div className="text-gray-500 text-sm py-4">Завантаження…</div>
            ) : (
              <>
                {/* Капітаційна ставка */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                </div>

                {/* Вікові коефіцієнти */}
                <div>
                  <p className="text-xs text-gray-400 mb-3">Вікові коефіцієнти</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
          </>
        )}
      </div>

    </div>
  );
}
