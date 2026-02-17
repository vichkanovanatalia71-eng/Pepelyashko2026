import { useEffect, useState, FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  UserPlus,
  X,
} from "lucide-react";
import api from "../api/client";
import type {
  AgeGroup,
  Doctor,
  NhsuMonthlyReport,
} from "../types";

const MONTH_NAMES = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

interface RecordInput {
  doctor_id: number;
  age_group: string;
  age_coefficient: number;
  patient_count: string;
  non_verified: string;
}

interface ExtraInput {
  esv_amount: string;
  paid_services_amount: string;
  owner_declaration_income: string;
  owner_other_doctor_income: string;
}

export default function NhsuPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [report, setReport] = useState<NhsuMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [capRate, setCapRate] = useState("1007.3");
  const [records, setRecords] = useState<RecordInput[]>([]);
  const [extra, setExtra] = useState<ExtraInput>({
    esv_amount: "1902.34",
    paid_services_amount: "0",
    owner_declaration_income: "0",
    owner_other_doctor_income: "0",
  });

  // Doctor form
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newDoctorIsOwner, setNewDoctorIsOwner] = useState(false);

  const fmt = (n: number) =>
    n.toLocaleString("uk-UA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadReport();
  }, [year, month]);

  async function loadInitialData() {
    try {
      const [docRes, agRes] = await Promise.all([
        api.get("/nhsu/doctors"),
        api.get("/nhsu/age-groups"),
      ]);
      setDoctors(docRes.data);
      setAgeGroups(agRes.data);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  }

  async function loadReport() {
    setLoading(true);
    try {
      const { data } = await api.get("/nhsu/monthly", {
        params: { year, month },
      });
      setReport(data);
      setEditMode(false);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function initEditForm() {
    if (report) {
      // Pre-fill from existing report
      setCapRate(String(report.capitation_rate));
      const recs: RecordInput[] = [];
      for (const doc of report.doctors) {
        for (const row of doc.rows) {
          recs.push({
            doctor_id: doc.doctor_id,
            age_group: row.age_group,
            age_coefficient: row.age_coefficient,
            patient_count: String(row.patient_count),
            non_verified: String(row.non_verified),
          });
        }
      }
      setRecords(recs);
      setExtra({
        esv_amount: String(report.esv_amount),
        paid_services_amount: String(report.paid_services_amount),
        owner_declaration_income: String(report.owner_declaration_income),
        owner_other_doctor_income: String(report.owner_other_doctor_income),
      });
    } else {
      // Create empty records for all doctors × age groups
      const recs: RecordInput[] = [];
      for (const doc of doctors) {
        for (const ag of ageGroups) {
          recs.push({
            doctor_id: doc.id,
            age_group: ag.key,
            age_coefficient: ag.default_coefficient,
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

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post("/nhsu/monthly", {
        year,
        month,
        capitation_rate: parseFloat(capRate),
        records: records.map((r) => ({
          ...r,
          age_coefficient: r.age_coefficient,
          patient_count: parseInt(r.patient_count) || 0,
          non_verified: parseFloat(r.non_verified) || 0,
        })),
        extra: {
          esv_amount: parseFloat(extra.esv_amount) || 0,
          paid_services_amount: parseFloat(extra.paid_services_amount) || 0,
          owner_declaration_income: parseFloat(extra.owner_declaration_income) || 0,
          owner_other_doctor_income: parseFloat(extra.owner_other_doctor_income) || 0,
        },
      });
      await loadReport();
    } catch (error) {
      console.error("Failed to save:", error);
    }
  }

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

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  // Calculate live preview in edit mode
  function calcAmount(rate: number, coeff: number, patients: number, nonVer: number) {
    return (rate * coeff * (patients - nonVer)) / 12;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Розрахунок НСЗУ</h2>
          <p className="text-gray-500 text-sm mt-1">
            Капітаційна ставка та розрахунки за договором ПМГ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDoctorForm(!showDoctorForm)}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <UserPlus size={18} />
            Додати лікаря
          </button>
          {!editMode ? (
            <button onClick={initEditForm} className="btn-accent flex items-center gap-2">
              <Plus size={18} />
              {report ? "Редагувати" : "Заповнити дані"}
            </button>
          ) : (
            <button
              onClick={() => setEditMode(false)}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <X size={18} />
              Скасувати
            </button>
          )}
        </div>
      </div>

      {/* Add Doctor Form */}
      {showDoctorForm && (
        <form
          onSubmit={handleAddDoctor}
          className="card-neo p-5 mb-6 flex items-end gap-4"
        >
          <div className="flex-1">
            <label className="label-dark">ПІБ лікаря</label>
            <input
              type="text"
              value={newDoctorName}
              onChange={(e) => setNewDoctorName(e.target.value)}
              className="input-dark"
              placeholder="Прізвище І.П."
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={newDoctorIsOwner}
              onChange={(e) => setNewDoctorIsOwner(e.target.checked)}
              className="rounded border-dark-50/20"
            />
            Власник ФОП
          </label>
          <button type="submit" className="btn-accent">
            Додати
          </button>
        </form>
      )}

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-300 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-lg font-semibold text-white min-w-[200px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-300 transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Edit Mode */}
      {editMode && (
        <form onSubmit={handleSave}>
          {/* Capitation rate */}
          <div className="card-neo p-5 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="label-dark">Капітаційна ставка</label>
                <input
                  type="number"
                  step="0.1"
                  value={capRate}
                  onChange={(e) => setCapRate(e.target.value)}
                  className="input-dark"
                  required
                />
              </div>
            </div>
          </div>

          {/* Per-doctor data */}
          {doctors.map((doc) => (
            <div key={doc.id} className="card-neo p-5 mb-4">
              <h4 className="text-white font-semibold mb-4">
                {doc.full_name}
                {doc.is_owner && (
                  <span className="ml-2 text-xs bg-accent-500/10 text-accent-400 px-2 py-1 rounded-lg">
                    Власник ФОП
                  </span>
                )}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-50/10">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Вікова група
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Коефіцієнт
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Пацієнти
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Не верифіковані
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Сума
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ageGroups.map((ag) => {
                      const rec = records.find(
                        (r) => r.doctor_id === doc.id && r.age_group === ag.key
                      );
                      if (!rec) return null;
                      const rate = parseFloat(capRate) || 0;
                      const patients = parseInt(rec.patient_count) || 0;
                      const nonVer = parseFloat(rec.non_verified) || 0;
                      const amount = calcAmount(rate, rec.age_coefficient, patients, nonVer);
                      return (
                        <tr key={ag.key} className="border-b border-dark-50/5">
                          <td className="px-3 py-2 text-gray-400">{ag.label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.001"
                              value={rec.age_coefficient}
                              onChange={(e) =>
                                updateRecord(doc.id, ag.key, "age_coefficient", e.target.value)
                              }
                              className="input-dark w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={rec.patient_count}
                              onChange={(e) =>
                                updateRecord(doc.id, ag.key, "patient_count", e.target.value)
                              }
                              className="input-dark w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.5"
                              value={rec.non_verified}
                              onChange={(e) =>
                                updateRecord(doc.id, ag.key, "non_verified", e.target.value)
                              }
                              className="input-dark w-24"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-mono">
                            {fmt(amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Extra financial data */}
          <div className="card-neo p-5 mb-4">
            <h4 className="text-white font-semibold mb-4">Додаткові фінансові дані</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-dark">ЄСВ (фіксований)</label>
                <input
                  type="number"
                  step="0.01"
                  value={extra.esv_amount}
                  onChange={(e) => setExtra({ ...extra, esv_amount: e.target.value })}
                  className="input-dark"
                />
              </div>
              <div>
                <label className="label-dark">Дохід за платні послуги</label>
                <input
                  type="number"
                  step="0.01"
                  value={extra.paid_services_amount}
                  onChange={(e) =>
                    setExtra({ ...extra, paid_services_amount: e.target.value })
                  }
                  className="input-dark"
                />
              </div>
              <div>
                <label className="label-dark">Кошти власника за власні декларації</label>
                <input
                  type="number"
                  step="0.01"
                  value={extra.owner_declaration_income}
                  onChange={(e) =>
                    setExtra({ ...extra, owner_declaration_income: e.target.value })
                  }
                  className="input-dark"
                />
              </div>
              <div>
                <label className="label-dark">Дохід власника від декларацій іншого лікаря</label>
                <input
                  type="number"
                  step="0.01"
                  value={extra.owner_other_doctor_income}
                  onChange={(e) =>
                    setExtra({ ...extra, owner_other_doctor_income: e.target.value })
                  }
                  className="input-dark"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-accent flex items-center gap-2">
            <Save size={18} />
            Зберегти дані
          </button>
        </form>
      )}

      {/* View Mode - Report */}
      {!editMode && loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        </div>
      )}

      {!editMode && !loading && !report && (
        <div className="card-neo px-5 py-12 text-center text-gray-600">
          Дані за {MONTH_NAMES[month - 1].toLowerCase()} {year} ще не заповнені.
          <br />
          Натисніть &laquo;Заповнити дані&raquo; щоб почати.
        </div>
      )}

      {!editMode && !loading && report && (
        <>
          {/* Per-doctor tables */}
          {report.doctors.map((doc) => (
            <div key={doc.doctor_id} className="card-neo overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-dark-50/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="text-white font-semibold">{doc.doctor_name}</h4>
                  {doc.is_owner && (
                    <span className="text-xs bg-accent-500/10 text-accent-400 px-2 py-1 rounded-lg">
                      Власник ФОП
                    </span>
                  )}
                </div>
                <span className="text-gray-500 text-sm">
                  Ставка: {fmt(report.capitation_rate)} грн
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-50/10">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Вікова група
                    </th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Коефіцієнт
                    </th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Пацієнти
                    </th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Не вериф.
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Сума
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      ЄП+ВЗ (6%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {doc.rows.map((row) => (
                    <tr
                      key={row.age_group}
                      className="border-b border-dark-50/5 hover:bg-dark-200/50"
                    >
                      <td className="px-5 py-3 text-gray-300">{row.age_group_label}</td>
                      <td className="px-3 py-3 text-center text-gray-400">
                        {row.age_coefficient}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-300 font-mono">
                        {row.patient_count}
                      </td>
                      <td className="px-3 py-3 text-center text-yellow-400/70 font-mono">
                        {row.non_verified}
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-400 font-mono">
                        {fmt(row.amount)}
                      </td>
                      <td className="px-5 py-3 text-right text-red-400/70 font-mono">
                        {fmt(row.ep_vz)}
                      </td>
                    </tr>
                  ))}
                  {/* Doctor Total */}
                  <tr className="bg-dark-400/50 font-semibold">
                    <td className="px-5 py-3 text-gray-300">Всього</td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-center text-white font-mono">
                      {doc.total_patients}
                    </td>
                    <td className="px-3 py-3"></td>
                    <td className="px-5 py-3 text-right text-emerald-400 font-mono">
                      {fmt(doc.total_amount)}
                    </td>
                    <td className="px-5 py-3 text-right text-red-400 font-mono">
                      {fmt(doc.total_ep_vz)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {/* Grand Total */}
          <div className="card-neo p-5 mb-6">
            <h4 className="text-white font-semibold mb-4">Всього за договором ПМГ</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-neo-inset p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">Пацієнти</p>
                <p className="text-xl font-bold text-white font-mono">
                  {report.grand_total_patients}
                </p>
              </div>
              <div className="card-neo-inset p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">Не вериф.</p>
                <p className="text-xl font-bold text-yellow-400 font-mono">
                  {fmt(report.grand_total_non_verified)}
                </p>
              </div>
              <div className="card-neo-inset p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">Сума</p>
                <p className="text-xl font-bold text-emerald-400 font-mono">
                  {fmt(report.grand_total_amount)}
                </p>
              </div>
              <div className="card-neo-inset p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">ЄП+ВЗ</p>
                <p className="text-xl font-bold text-red-400 font-mono">
                  {fmt(report.grand_total_ep_vz)}
                </p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card-neo p-5">
            <h4 className="text-white font-semibold mb-4">Фінансовий підсумок</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-dark-50/5">
                  <td className="py-3 text-gray-400">ЄСВ (фіксований)</td>
                  <td className="py-3 text-right text-red-400 font-mono">
                    {fmt(report.esv_amount)} грн
                  </td>
                </tr>
                <tr className="border-b border-dark-50/5">
                  <td className="py-3 text-gray-400">Кошти за власні декларації</td>
                  <td className="py-3 text-right text-emerald-400 font-mono">
                    {fmt(report.owner_declaration_income)} грн
                  </td>
                </tr>
                <tr className="border-b border-dark-50/5">
                  <td className="py-3 text-gray-400">Дохід від декларацій іншого лікаря</td>
                  <td className="py-3 text-right text-emerald-400 font-mono">
                    {fmt(report.owner_other_doctor_income)} грн
                  </td>
                </tr>
                <tr className="border-b border-dark-50/5">
                  <td className="py-3 text-gray-400">Дохід за платні послуги</td>
                  <td className="py-3 text-right text-emerald-400 font-mono">
                    {fmt(report.paid_services_amount)} грн
                  </td>
                </tr>
                <tr className="border-b border-dark-50/10 font-semibold">
                  <td className="py-3 text-white">Разом</td>
                  <td className="py-3 text-right text-accent-400 font-mono">
                    {fmt(report.total_income)} грн
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-3 text-white">Виведення на картку</td>
                  <td className="py-3 text-right text-emerald-400 text-lg font-mono">
                    {fmt(report.withdrawal_amount)} грн
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
