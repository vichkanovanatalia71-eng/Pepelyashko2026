import { useEffect, useState, FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Save,
  Settings,
  Table2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import api from "../api/client";
import type {
  AgeGroup,
  Doctor,
  NhsuMonthlyReport,
  NhsuSettings,
} from "../types";

const MONTH_NAMES = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
];

type Tab = "data" | "settings";

interface RecordInput {
  doctor_id: number;
  age_group: string;
  patient_count: string;
  non_verified: string;
}

export default function NhsuPage() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("data");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [settings, setSettings] = useState<NhsuSettings | null>(null);
  const [report, setReport] = useState<NhsuMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [records, setRecords] = useState<RecordInput[]>([]);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    capitation_rate: "",
    coeff_0_5: "", coeff_6_17: "", coeff_18_39: "", coeff_40_64: "", coeff_65_plus: "",
    ep_rate: "", vz_rate: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Doctor form
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newDoctorIsOwner, setNewDoctorIsOwner] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const fmt = (n: number) =>
    n.toLocaleString("uk-UA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const fmt2 = (n: number) =>
    n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Load data ────────────────────────────────────────────────────

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (tab === "data") loadReport();
  }, [year, month, tab]);

  async function loadInitialData() {
    try {
      const [docRes, agRes, setRes] = await Promise.all([
        api.get("/nhsu/doctors"),
        api.get("/nhsu/age-groups"),
        api.get("/nhsu/settings"),
      ]);
      setDoctors(docRes.data);
      setAgeGroups(agRes.data);
      setSettings(setRes.data);
      fillSettingsForm(setRes.data);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  }

  function fillSettingsForm(s: NhsuSettings) {
    setSettingsForm({
      capitation_rate: String(s.capitation_rate),
      coeff_0_5: String(s.coeff_0_5),
      coeff_6_17: String(s.coeff_6_17),
      coeff_18_39: String(s.coeff_18_39),
      coeff_40_64: String(s.coeff_40_64),
      coeff_65_plus: String(s.coeff_65_plus),
      ep_rate: String(s.ep_rate),
      vz_rate: String(s.vz_rate),
    });
  }

  async function loadReport() {
    setLoading(true);
    try {
      const { data } = await api.get("/nhsu/monthly", { params: { year, month } });
      setReport(data);
      setEditMode(false);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  // ── Settings handlers ────────────────────────────────────────────

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const { data } = await api.put("/nhsu/settings", {
        capitation_rate: parseFloat(settingsForm.capitation_rate),
        coeff_0_5: parseFloat(settingsForm.coeff_0_5),
        coeff_6_17: parseFloat(settingsForm.coeff_6_17),
        coeff_18_39: parseFloat(settingsForm.coeff_18_39),
        coeff_40_64: parseFloat(settingsForm.coeff_40_64),
        coeff_65_plus: parseFloat(settingsForm.coeff_65_plus),
        ep_rate: parseFloat(settingsForm.ep_rate),
        vz_rate: parseFloat(settingsForm.vz_rate),
      });
      setSettings(data);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSettingsSaving(false);
    }
  }

  // ── Doctor handlers ──────────────────────────────────────────────

  async function handleAddDoctor(e: FormEvent) {
    e.preventDefault();
    if (!newDoctorName.trim()) return;
    try {
      await api.post("/nhsu/doctors", {
        full_name: newDoctorName.trim(),
        is_owner: newDoctorIsOwner,
      });
      setNewDoctorName("");
      setNewDoctorIsOwner(false);
      setShowDoctorForm(false);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to add doctor:", error);
    }
  }

  async function handleUpdateDoctor(e: FormEvent) {
    e.preventDefault();
    if (!editingDoctor) return;
    try {
      await api.put(`/nhsu/doctors/${editingDoctor.id}`, {
        full_name: editingDoctor.full_name,
        is_owner: editingDoctor.is_owner,
      });
      setEditingDoctor(null);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to update doctor:", error);
    }
  }

  async function handleDeleteDoctor(id: number) {
    if (!confirm("Видалити лікаря?")) return;
    try {
      await api.delete(`/nhsu/doctors/${id}`);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to delete doctor:", error);
    }
  }

  // ── Monthly data handlers ────────────────────────────────────────

  function initEditForm() {
    if (report) {
      const recs: RecordInput[] = [];
      for (const doc of report.doctors) {
        for (const row of doc.rows) {
          recs.push({
            doctor_id: doc.doctor_id,
            age_group: row.age_group,
            patient_count: String(row.patient_count),
            non_verified: String(row.non_verified),
          });
        }
      }
      setRecords(recs);
    } else {
      const recs: RecordInput[] = [];
      for (const doc of doctors) {
        for (const ag of ageGroups) {
          recs.push({
            doctor_id: doc.id,
            age_group: ag.key,
            patient_count: "0",
            non_verified: "0",
          });
        }
      }
      setRecords(recs);
    }
    setEditMode(true);
  }

  function updateRecord(doctorId: number, ageGroup: string, field: string, value: string) {
    setRecords((prev) =>
      prev.map((r) =>
        r.doctor_id === doctorId && r.age_group === ageGroup
          ? { ...r, [field]: value }
          : r
      )
    );
  }

  async function handleSaveMonthly(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post("/nhsu/monthly", {
        year,
        month,
        records: records.map((r) => ({
          doctor_id: r.doctor_id,
          age_group: r.age_group,
          patient_count: parseInt(r.patient_count) || 0,
          non_verified: parseFloat(r.non_verified) || 0,
        })),
      });
      await loadReport();
    } catch (error) {
      console.error("Failed to save:", error);
    }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }

  // Коефіцієнт для вікової групи з налаштувань
  function getCoeff(ageGroup: string): number {
    if (!settings) return 0;
    const map: Record<string, number> = {
      "0_5": settings.coeff_0_5,
      "6_17": settings.coeff_6_17,
      "18_39": settings.coeff_18_39,
      "40_64": settings.coeff_40_64,
      "65_plus": settings.coeff_65_plus,
    };
    return map[ageGroup] ?? 0;
  }

  // Обчислення для попереднього перегляду
  function calcAmount(patients: number, nonVer: number, ageGroup: string) {
    if (!settings) return 0;
    return (settings.capitation_rate * getCoeff(ageGroup) * (patients - nonVer)) / 12;
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Розрахунок НСЗУ</h2>
          <p className="text-gray-500 text-sm mt-1">
            Капітаційна ставка, коефіцієнти та розрахунки за договором ПМГ
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-500 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("data")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "data"
              ? "bg-dark-300 text-white shadow-neo-sm"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Table2 size={16} />
          Дані
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "settings"
              ? "bg-dark-300 text-white shadow-neo-sm"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Settings size={16} />
          Налаштування
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB: SETTINGS
          ═══════════════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <>
          {/* Doctors Management */}
          <div className="card-neo p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Лікарі</h3>
              <button
                onClick={() => { setShowDoctorForm(!showDoctorForm); setEditingDoctor(null); }}
                className="btn-ghost flex items-center gap-2 text-sm"
              >
                {showDoctorForm ? <X size={16} /> : <UserPlus size={16} />}
                {showDoctorForm ? "Закрити" : "Додати лікаря"}
              </button>
            </div>

            {/* Add doctor form */}
            {showDoctorForm && (
              <form onSubmit={handleAddDoctor} className="flex items-end gap-3 mb-4 p-4 bg-dark-400/50 rounded-xl">
                <div className="flex-1">
                  <label className="label-dark">ПІБ лікаря</label>
                  <input
                    type="text" value={newDoctorName}
                    onChange={(e) => setNewDoctorName(e.target.value)}
                    className="input-dark" placeholder="Прізвище І.П." required
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer pb-2">
                  <input
                    type="checkbox" checked={newDoctorIsOwner}
                    onChange={(e) => setNewDoctorIsOwner(e.target.checked)}
                    className="rounded border-dark-50/20"
                  />
                  Власник ФОП
                </label>
                <button type="submit" className="btn-accent">Додати</button>
              </form>
            )}

            {/* Edit doctor form */}
            {editingDoctor && (
              <form onSubmit={handleUpdateDoctor} className="flex items-end gap-3 mb-4 p-4 bg-dark-400/50 rounded-xl">
                <div className="flex-1">
                  <label className="label-dark">ПІБ лікаря</label>
                  <input
                    type="text" value={editingDoctor.full_name}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, full_name: e.target.value })}
                    className="input-dark" required
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer pb-2">
                  <input
                    type="checkbox" checked={editingDoctor.is_owner}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, is_owner: e.target.checked })}
                    className="rounded border-dark-50/20"
                  />
                  Власник ФОП
                </label>
                <button type="submit" className="btn-accent">Зберегти</button>
                <button type="button" onClick={() => setEditingDoctor(null)} className="btn-ghost">
                  Скасувати
                </button>
              </form>
            )}

            {/* Doctors list */}
            {doctors.length === 0 ? (
              <p className="text-gray-600 text-sm">Лікарів ще не додано.</p>
            ) : (
              <div className="space-y-2">
                {doctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-4 py-3 bg-dark-400/30 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-200">{doc.full_name}</span>
                      {doc.is_owner && (
                        <span className="text-xs bg-accent-500/10 text-accent-400 px-2 py-0.5 rounded-lg">
                          Власник ФОП
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingDoctor(doc); setShowDoctorForm(false); }}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-accent-400 hover:bg-accent-500/10 transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDoctor(doc.id)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings Form */}
          <form onSubmit={handleSaveSettings}>
            <div className="card-neo p-5 mb-6">
              <h3 className="text-white font-semibold mb-4">Капітаційна ставка</h3>
              <div className="max-w-xs">
                <label className="label-dark">Ставка (грн)</label>
                <input
                  type="number" step="0.1"
                  value={settingsForm.capitation_rate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, capitation_rate: e.target.value })}
                  className="input-dark" required
                />
              </div>
            </div>

            <div className="card-neo p-5 mb-6">
              <h3 className="text-white font-semibold mb-4">Вікові коефіцієнти</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {ageGroups.map((ag) => {
                  const fieldKey = `coeff_${ag.key}` as keyof typeof settingsForm;
                  return (
                    <div key={ag.key}>
                      <label className="label-dark text-xs">{ag.label}</label>
                      <input
                        type="number" step="0.001"
                        value={settingsForm[fieldKey]}
                        onChange={(e) => setSettingsForm({ ...settingsForm, [fieldKey]: e.target.value })}
                        className="input-dark" required
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-neo p-5 mb-6">
              <h3 className="text-white font-semibold mb-4">Податкові ставки</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                <div>
                  <label className="label-dark">Єдиний податок (ЄП), %</label>
                  <input
                    type="number" step="0.01"
                    value={settingsForm.ep_rate}
                    onChange={(e) => setSettingsForm({ ...settingsForm, ep_rate: e.target.value })}
                    className="input-dark" required
                  />
                </div>
                <div>
                  <label className="label-dark">Військовий збір (ВЗ), %</label>
                  <input
                    type="number" step="0.01"
                    value={settingsForm.vz_rate}
                    onChange={(e) => setSettingsForm({ ...settingsForm, vz_rate: e.target.value })}
                    className="input-dark" required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit" disabled={settingsSaving}
              className="btn-accent flex items-center gap-2"
            >
              <Save size={18} />
              {settingsSaving ? "Збереження..." : "Зберегти налаштування"}
            </button>
          </form>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: DATA
          ═══════════════════════════════════════════════════════════════ */}
      {tab === "data" && (
        <>
          {/* Month Selector */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-300 transition-all">
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-lg font-semibold text-white min-w-[200px] text-center">
              {MONTH_NAMES[month - 1]} {year}
            </h3>
            <button onClick={nextMonth} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-300 transition-all">
              <ChevronRight size={20} />
            </button>
            <div className="ml-4">
              {!editMode ? (
                <button onClick={initEditForm} className="btn-accent flex items-center gap-2 text-sm">
                  <Plus size={16} />
                  {report ? "Редагувати" : "Заповнити"}
                </button>
              ) : (
                <button onClick={() => setEditMode(false)} className="btn-ghost flex items-center gap-2 text-sm">
                  <X size={16} />
                  Скасувати
                </button>
              )}
            </div>
          </div>

          {/* ── Edit Mode ──────────────────────────────────────────── */}
          {editMode && settings && (
            <form onSubmit={handleSaveMonthly}>
              <div className="card-neo-inset px-4 py-3 mb-4 text-sm text-gray-400">
                Ставка: <span className="text-white font-medium">{fmt2(settings.capitation_rate)} грн</span>
                {" | "}ЄП: <span className="text-white">{settings.ep_rate}%</span>
                {" | "}ВЗ: <span className="text-white">{settings.vz_rate}%</span>
                <span className="ml-2 text-gray-600">(змінити у Налаштуваннях)</span>
              </div>

              {doctors.map((doc) => (
                <div key={doc.id} className="card-neo p-5 mb-4">
                  <h4 className="text-white font-semibold mb-3">
                    {doc.full_name}
                    {doc.is_owner && (
                      <span className="ml-2 text-xs bg-accent-500/10 text-accent-400 px-2 py-1 rounded-lg">
                        Власник ФОП
                      </span>
                    )}
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-50/10">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Вікова група</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Коеф.</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">К-ть пацієнтів</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Не верифіковані</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Сума</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">ЄП ({settings.ep_rate}%)</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">ВЗ ({settings.vz_rate}%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ageGroups.map((ag) => {
                        const rec = records.find((r) => r.doctor_id === doc.id && r.age_group === ag.key);
                        if (!rec) return null;
                        const patients = parseInt(rec.patient_count) || 0;
                        const nonVer = parseFloat(rec.non_verified) || 0;
                        const amount = calcAmount(patients, nonVer, ag.key);
                        const ep = amount * settings.ep_rate / 100;
                        const vz = amount * settings.vz_rate / 100;
                        return (
                          <tr key={ag.key} className="border-b border-dark-50/5">
                            <td className="px-3 py-2 text-gray-400">{ag.label}</td>
                            <td className="px-3 py-2 text-center text-gray-500">{getCoeff(ag.key)}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number" value={rec.patient_count}
                                onChange={(e) => updateRecord(doc.id, ag.key, "patient_count", e.target.value)}
                                className="input-dark w-24"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number" step="0.5" value={rec.non_verified}
                                onChange={(e) => updateRecord(doc.id, ag.key, "non_verified", e.target.value)}
                                className="input-dark w-24"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-400 font-mono">{fmt(amount)}</td>
                            <td className="px-3 py-2 text-right text-red-400/70 font-mono">{fmt(ep)}</td>
                            <td className="px-3 py-2 text-right text-yellow-400/70 font-mono">{fmt(vz)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

              <button type="submit" className="btn-accent flex items-center gap-2">
                <Save size={18} />
                Зберегти дані за {MONTH_NAMES[month - 1].toLowerCase()}
              </button>
            </form>
          )}

          {/* ── Loading ────────────────────────────────────────────── */}
          {!editMode && loading && (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
            </div>
          )}

          {/* ── Empty State ────────────────────────────────────────── */}
          {!editMode && !loading && !report && (
            <div className="card-neo px-5 py-12 text-center text-gray-600">
              Дані за {MONTH_NAMES[month - 1].toLowerCase()} {year} ще не заповнені.
            </div>
          )}

          {/* ── Report View ────────────────────────────────────────── */}
          {!editMode && !loading && report && (
            <>
              {/* Info badge */}
              <div className="card-neo-inset px-4 py-3 mb-6 text-sm text-gray-400">
                Ставка: <span className="text-white font-medium">{fmt2(report.capitation_rate)} грн</span>
                {" | "}ЄП: <span className="text-white">{report.ep_rate}%</span>
                {" | "}ВЗ: <span className="text-white">{report.vz_rate}%</span>
              </div>

              {/* Per-doctor tables */}
              {report.doctors.map((doc) => (
                <div key={doc.doctor_id} className="card-neo overflow-hidden mb-6">
                  <div className="px-5 py-4 border-b border-dark-50/10 flex items-center gap-3">
                    <h4 className="text-white font-semibold">{doc.doctor_name}</h4>
                    {doc.is_owner && (
                      <span className="text-xs bg-accent-500/10 text-accent-400 px-2 py-1 rounded-lg">
                        Власник ФОП
                      </span>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-50/10">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Вікова група</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Коеф.</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Пацієнти</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Не вериф.</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Сума</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ЄП ({report.ep_rate}%)</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ВЗ ({report.vz_rate}%)</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">ЄП+ВЗ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.rows.map((row) => (
                        <tr key={row.age_group} className="border-b border-dark-50/5 hover:bg-dark-200/50">
                          <td className="px-5 py-3 text-gray-300">{row.age_group_label}</td>
                          <td className="px-3 py-3 text-center text-gray-500">{row.age_coefficient}</td>
                          <td className="px-3 py-3 text-center text-gray-300 font-mono">{row.patient_count}</td>
                          <td className="px-3 py-3 text-center text-yellow-400/70 font-mono">{row.non_verified}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-mono">{fmt(row.amount)}</td>
                          <td className="px-4 py-3 text-right text-red-400/70 font-mono">{fmt(row.ep_amount)}</td>
                          <td className="px-4 py-3 text-right text-yellow-400/70 font-mono">{fmt(row.vz_amount)}</td>
                          <td className="px-5 py-3 text-right text-red-400 font-mono">{fmt(row.ep_vz_amount)}</td>
                        </tr>
                      ))}
                      {/* Doctor total row */}
                      <tr className="bg-dark-400/50 font-semibold">
                        <td className="px-5 py-3 text-gray-300">Всього</td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-center text-white font-mono">{doc.total_patients}</td>
                        <td className="px-3 py-3 text-center text-yellow-400/70 font-mono">{fmt(doc.total_non_verified)}</td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-mono">{fmt(doc.total_amount)}</td>
                        <td className="px-4 py-3 text-right text-red-400/70 font-mono">{fmt(doc.total_ep)}</td>
                        <td className="px-4 py-3 text-right text-yellow-400/70 font-mono">{fmt(doc.total_vz)}</td>
                        <td className="px-5 py-3 text-right text-red-400 font-mono">{fmt(doc.total_ep_vz)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Summary by age groups */}
              {report.age_group_totals.length > 0 && (
                <div className="card-neo overflow-hidden mb-6">
                  <div className="px-5 py-4 border-b border-dark-50/10">
                    <h4 className="text-white font-semibold">Підсумок по вікових групах (всі лікарі)</h4>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-50/10">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Вікова група</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Коеф.</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Пацієнти</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Не вериф.</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Сума</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ЄП</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ВЗ</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">ЄП+ВЗ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.age_group_totals.map((ag) => (
                        <tr key={ag.age_group} className="border-b border-dark-50/5 hover:bg-dark-200/50">
                          <td className="px-5 py-3 text-gray-300">{ag.age_group_label}</td>
                          <td className="px-3 py-3 text-center text-gray-500">{ag.age_coefficient}</td>
                          <td className="px-3 py-3 text-center text-gray-300 font-mono">{ag.total_patients}</td>
                          <td className="px-3 py-3 text-center text-yellow-400/70 font-mono">{fmt(ag.total_non_verified)}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-mono">{fmt(ag.total_amount)}</td>
                          <td className="px-4 py-3 text-right text-red-400/70 font-mono">{fmt(ag.total_ep)}</td>
                          <td className="px-4 py-3 text-right text-yellow-400/70 font-mono">{fmt(ag.total_vz)}</td>
                          <td className="px-5 py-3 text-right text-red-400 font-mono">{fmt(ag.total_ep_vz)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Grand Total Cards */}
              <div className="card-neo p-5 mb-6">
                <h4 className="text-white font-semibold mb-4">Всього за договором ПМГ</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="card-neo-inset p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Пацієнти</p>
                    <p className="text-xl font-bold text-white font-mono">{report.grand_total_patients}</p>
                  </div>
                  <div className="card-neo-inset p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Не вериф.</p>
                    <p className="text-xl font-bold text-yellow-400 font-mono">{fmt(report.grand_total_non_verified)}</p>
                  </div>
                  <div className="card-neo-inset p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Сума</p>
                    <p className="text-xl font-bold text-emerald-400 font-mono">{fmt(report.grand_total_amount)}</p>
                  </div>
                  <div className="card-neo-inset p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">ЄП ({report.ep_rate}%)</p>
                    <p className="text-xl font-bold text-red-400/80 font-mono">{fmt(report.grand_total_ep)}</p>
                  </div>
                  <div className="card-neo-inset p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">ВЗ ({report.vz_rate}%)</p>
                    <p className="text-xl font-bold text-yellow-400/80 font-mono">{fmt(report.grand_total_vz)}</p>
                  </div>
                  <div className="card-neo-inset p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">ЄП+ВЗ</p>
                    <p className="text-xl font-bold text-red-400 font-mono">{fmt(report.grand_total_ep_vz)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
