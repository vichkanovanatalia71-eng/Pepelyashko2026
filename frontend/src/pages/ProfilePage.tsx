import { useState, FormEvent } from "react";
import { User, Lock, Save, Check } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";

const FOP_LABELS: Record<number, string> = {
  1: "1 група",
  2: "2 група",
  3: "3 група",
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [fopGroup, setFopGroup] = useState(user?.fop_group ?? 3);
  const [taxRate, setTaxRate] = useState(String((user?.tax_rate ?? 0.05) * 100));
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  // Password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
          <User size={22} className="text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Профіль</h2>
      </div>

      {/* User info card */}
      <div className="card-neo p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
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
            <label className="label-dark">ПІБ</label>
            <input type="text" value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="input-dark" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-dark">Група ФОП</label>
              <select value={fopGroup}
                onChange={e => setFopGroup(Number(e.target.value))}
                className="select-dark">
                <option value={1}>1 група</option>
                <option value={2}>2 група</option>
                <option value={3}>3 група</option>
              </select>
            </div>
            <div>
              <label className="label-dark">Ставка податку (%)</label>
              <input type="number" step="0.1" min="0" max="100"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                className="input-dark" />
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

          <button type="submit" className="btn-accent flex items-center gap-2">
            <Save size={16} aria-hidden="true" /> Зберегти
          </button>
        </form>
      </div>

      {/* Password change card */}
      <div className="card-neo p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center" aria-hidden="true">
            <Lock size={20} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Зміна пароля</h3>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label-dark">Поточний пароль</label>
            <input type="password" value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              className="input-dark" required autoComplete="current-password" />
          </div>
          <div>
            <label className="label-dark">Новий пароль</label>
            <input type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input-dark" required minLength={6} autoComplete="new-password" />
          </div>
          <div>
            <label className="label-dark">Підтвердження нового пароля</label>
            <input type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input-dark" required autoComplete="new-password" />
          </div>

          {pwdMsg && (
            <div className="flex items-center gap-2 text-sm text-emerald-400" role="status">
              <Check size={16} aria-hidden="true" /> {pwdMsg}
            </div>
          )}
          {pwdErr && (
            <p className="text-sm text-red-400" role="alert">{pwdErr}</p>
          )}

          <button type="submit" className="btn-accent flex items-center gap-2">
            <Lock size={16} aria-hidden="true" /> Змінити пароль
          </button>
        </form>
      </div>
    </div>
  );
}
