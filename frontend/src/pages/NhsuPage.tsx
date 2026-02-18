import { useEffect, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ChevronLeft, ChevronRight, Upload, X, Save, RefreshCw,
  Sparkles, Users, BadgeDollarSign, TrendingDown, ShieldAlert,
  FileImage, Plus, CheckCircle2, AlertCircle,
} from "lucide-react";
import api from "../api/client";
import type {
  AgeGroup, Doctor, DoctorSummary,
  NhsuMonthlyReport, NhsuSettings,
} from "../types";

const MONTH_NAMES = [
  "Січень","Лютий","Березень","Квітень","Травень","Червень",
  "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень",
];
const PIE_COLORS = ["#6366f1","#22d3ee","#f59e0b","#10b981","#f43f5e"];

interface RecordInput {
  doctor_id: number;
  age_group: string;
  patient_count: string;
  non_verified: string;
}
interface UploadedImage {
  file: File;
  preview: string;
  doctorId: number | null;
  analyzed: boolean;
  error?: string;
  result?: Record<string, number>;
}

const fmt = (n: number) =>
  n.toLocaleString("uk-UA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt2 = (n: number) =>
  n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function NhsuPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | "all">("all");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [settings, setSettings] = useState<NhsuSettings | null>(null);
  const [report, setReport] = useState<NhsuMonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [records, setRecords] = useState<RecordInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { loadReport(); }, [year, month]);

  async function loadInitialData() {
    try {
      const [d, a, s] = await Promise.all([
        api.get("/nhsu/doctors"),
        api.get("/nhsu/age-groups"),
        api.get("/nhsu/settings"),
      ]);
      setDoctors(d.data); setAgeGroups(a.data); setSettings(s.data);
    } catch {}
  }

  async function loadReport() {
    setLoading(true);
    try {
      const { data } = await api.get("/nhsu/monthly", { params: { year, month } });
      setReport(data);
    } catch { setReport(null); }
    finally { setLoading(false); }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  /* filtered data */
  const filteredDoctors: DoctorSummary[] = report
    ? selectedDoctorId === "all"
      ? report.doctors
      : report.doctors.filter(d => d.doctor_id === selectedDoctorId)
    : [];

  const totals = filteredDoctors.reduce(
    (a, d) => ({
      patients: a.patients + d.total_patients,
      nonVer: a.nonVer + d.total_non_verified,
      amount: a.amount + d.total_amount,
      ep: a.ep + d.total_ep,
      vz: a.vz + d.total_vz,
      epVz: a.epVz + d.total_ep_vz,
    }),
    { patients: 0, nonVer: 0, amount: 0, ep: 0, vz: 0, epVz: 0 },
  );

  /* chart data */
  const ageBarData = ageGroups.map(ag => ({
    name: ag.label.replace("від ", "").replace("понад ", ""),
    patients: filteredDoctors.reduce((s, d) => {
      const r = d.rows.find(x => x.age_group === ag.key);
      return s + (r ? r.patient_count : 0);
    }, 0),
  }));

  const doctorBarData = filteredDoctors.map(d => ({
    name: d.doctor_name.split(" ")[0],
    amount: Math.round(d.total_amount),
  }));

  const pieData = filteredDoctors.map(d => ({
    name: d.doctor_name.split(" ")[0],
    value: d.total_patients,
  }));

  /* modal */
  function openModal() {
    const recs: RecordInput[] = [];
    for (const doc of doctors) {
      for (const ag of ageGroups) {
        const ex = report?.doctors.find(d => d.doctor_id === doc.id)?.rows.find(r => r.age_group === ag.key);
        recs.push({
          doctor_id: doc.id, age_group: ag.key,
          patient_count: ex ? String(ex.patient_count) : "0",
          non_verified: ex ? String(ex.non_verified) : "0",
        });
      }
    }
    setRecords(recs); setImages([]); setSaveMsg(""); setShowModal(true);
  }

  function updateRecord(docId: number, ag: string, field: string, val: string) {
    setRecords(p => p.map(r => r.doctor_id === docId && r.age_group === ag ? { ...r, [field]: val } : r));
  }

  /* images */
  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    setImages(p => [...p, ...arr.map(f => ({
      file: f, preview: URL.createObjectURL(f),
      doctorId: doctors.length === 1 ? doctors[0].id : null,
      analyzed: false,
    }))]);
  }

  function removeImage(i: number) {
    setImages(p => { URL.revokeObjectURL(p[i].preview); return p.filter((_, idx) => idx !== i); });
  }

  /* AI analyze */
  async function analyzeImages() {
    if (!images.length) return;
    setAnalyzing(true);
    try {
      const fd = new FormData();
      const ids: string[] = [];
      images.forEach(img => { fd.append("images", img.file); ids.push(img.doctorId != null ? String(img.doctorId) : ""); });
      fd.append("doctor_ids", ids.join(","));
      const { data } = await api.post("/nhsu/analyze-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const results: Record<string, unknown>[] = data.results;
      const mapping: Record<string, string> = { age_0_5: "0_5", age_6_17: "6_17", age_18_39: "18_39", age_40_64: "40_64", age_65_plus: "65_plus" };
      setImages(p => p.map((img, i) => {
        const res = results[i];
        if (!res) return img;
        if (res.error) return { ...img, analyzed: true, error: String(res.error) };
        if (img.doctorId) {
          setRecords(prev => prev.map(r => {
            if (r.doctor_id !== img.doctorId) return r;
            const aiKey = Object.entries(mapping).find(([, v]) => v === r.age_group)?.[0];
            if (aiKey && res[aiKey] !== undefined) return { ...r, patient_count: String(res[aiKey]) };
            return r;
          }));
        }
        return { ...img, analyzed: true, result: {
          age_0_5: Number(res.age_0_5) || 0, age_6_17: Number(res.age_6_17) || 0,
          age_18_39: Number(res.age_18_39) || 0, age_40_64: Number(res.age_40_64) || 0,
          age_65_plus: Number(res.age_65_plus) || 0,
        }};
      }));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Помилка AI";
      setImages(p => p.map(img => ({ ...img, error: msg })));
    } finally { setAnalyzing(false); }
  }

  /* save */
  async function handleSave() {
    setSaving(true); setSaveMsg("");
    try {
      await api.post("/nhsu/monthly", {
        year, month,
        records: records.map(r => ({
          doctor_id: r.doctor_id, age_group: r.age_group,
          patient_count: parseInt(r.patient_count) || 0,
          non_verified: parseFloat(r.non_verified) || 0,
        })),
      });
      setSaveMsg("Збережено"); await loadReport();
      setTimeout(() => setShowModal(false), 600);
    } catch (e: unknown) {
      setSaveMsg((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Помилка");
    } finally { setSaving(false); }
  }

  const tooltipStyle = { background: "#1a1a2e", border: "1px solid #ffffff15", borderRadius: 8 };

  return (
    <div className="space-y-6">
      {/* ── FILTER BAR ── */}
      <div className="card-neo p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[180px]">
            <h2 className="text-xl font-bold text-white">Розрахунок НСЗУ</h2>
            <p className="text-xs text-gray-500 mt-0.5">Капітаційна ставка &middot; ПМГ</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Лікар</label>
            <select
              className="bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50 min-w-[200px]"
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">Всі лікарі</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Період</label>
            <div className="flex items-center gap-2 bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2">
              <button onClick={prevMonth} className="text-gray-400 hover:text-white"><ChevronLeft size={16} /></button>
              <span className="text-sm text-white font-medium min-w-[130px] text-center">{MONTH_NAMES[month-1]} {year}</span>
              <button onClick={nextMonth} className="text-gray-400 hover:text-white"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <button onClick={openModal} disabled={!doctors.length}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-semibold border border-accent-500/20 disabled:opacity-40 mt-5">
              <Plus size={16} />{report ? "Редагувати" : "Заповнити"}
            </button>
          </div>
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        </div>
      )}

      {/* ── EMPTY ── */}
      {!loading && !report && (
        <div className="card-neo px-5 py-16 text-center">
          <p className="text-gray-500">Дані за {MONTH_NAMES[month-1].toLowerCase()} {year} ще не заповнені.</p>
          {!doctors.length && <p className="text-xs text-gray-600 mt-2">Додайте лікарів у <span className="text-accent-400">Налаштуваннях</span>.</p>}
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {!loading && report && (<>
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Пацієнти", value: totals.patients, color: "text-white", Icon: Users },
            { label: "Не верифіковані", value: fmt(totals.nonVer), color: "text-yellow-400", Icon: AlertCircle },
            { label: "Сума (брутто)", value: fmt2(totals.amount), color: "text-emerald-400", Icon: BadgeDollarSign },
            { label: `ЄП (${report.ep_rate}%)`, value: fmt2(totals.ep), color: "text-red-400", Icon: TrendingDown },
            { label: `ВЗ (${report.vz_rate}%)`, value: fmt2(totals.vz), color: "text-orange-400", Icon: ShieldAlert },
            { label: "Чистий дохід", value: fmt2(totals.amount - totals.epVz), color: "text-accent-400", Icon: BadgeDollarSign },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="card-neo p-4 space-y-2">
              <div className="flex items-center gap-1.5"><Icon size={14} className="text-gray-500" /><p className="text-xs text-gray-500 uppercase">{label}</p></div>
              <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card-neo p-5">
            <p className="text-sm font-semibold text-white mb-4">Пацієнти по вікових групах</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ageBarData} margin={{ top: 0, right: 0, left: -20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="patients" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card-neo p-5">
            <p className="text-sm font-semibold text-white mb-4">Надходження по лікарях (грн)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={doctorBarData} margin={{ top: 0, right: 0, left: -10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString("uk-UA")} грн`, "Сума"]} />
                <Bar dataKey="amount" fill="#22d3ee" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card-neo p-5">
            <p className="text-sm font-semibold text-white mb-4">Розподіл пацієнтів</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend formatter={v => <span style={{ color: "#9ca3af", fontSize: 12 }}>{v}</span>} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DETAIL TABLES */}
        {filteredDoctors.map(doc => (
          <div key={doc.doctor_id} className="card-neo overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-50/10 flex items-center gap-3 bg-dark-400/30">
              <h4 className="text-white font-semibold">{doc.doctor_name}</h4>
              {doc.is_owner && <span className="text-xs bg-accent-500/10 text-accent-400 px-2 py-0.5 rounded-full border border-accent-500/20">Власник</span>}
              <span className="ml-auto text-xs text-gray-500 font-mono">{doc.total_patients} пац. &middot; {fmt2(doc.total_amount)} грн</span>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-dark-50/10">
                {["Вікова група","Коеф.","Пацієнти","Не вериф.","Сума","ЄП","ВЗ","ЄП+ВЗ"].map(h =>
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right first:text-left">{h}</th>
                )}
              </tr></thead>
              <tbody>
                {doc.rows.map(r => (
                  <tr key={r.age_group} className="border-b border-dark-50/5 hover:bg-dark-200/40">
                    <td className="px-4 py-2.5 text-gray-300">{r.age_group_label}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{r.age_coefficient}</td>
                    <td className="px-4 py-2.5 text-right text-gray-200 font-mono">{r.patient_count}</td>
                    <td className="px-4 py-2.5 text-right text-yellow-400/70 font-mono">{r.non_verified}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400 font-mono">{fmt(r.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-red-400/70 font-mono">{fmt(r.ep_amount)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-400/70 font-mono">{fmt(r.vz_amount)}</td>
                    <td className="px-4 py-2.5 text-right text-red-400 font-mono">{fmt(r.ep_vz_amount)}</td>
                  </tr>
                ))}
                <tr className="bg-dark-400/40 font-semibold">
                  <td className="px-4 py-2.5 text-gray-300">Всього</td><td />
                  <td className="px-4 py-2.5 text-right text-white font-mono">{doc.total_patients}</td>
                  <td className="px-4 py-2.5 text-right text-yellow-400/70 font-mono">{fmt(doc.total_non_verified)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-400 font-mono">{fmt(doc.total_amount)}</td>
                  <td className="px-4 py-2.5 text-right text-red-400/70 font-mono">{fmt(doc.total_ep)}</td>
                  <td className="px-4 py-2.5 text-right text-orange-400/70 font-mono">{fmt(doc.total_vz)}</td>
                  <td className="px-4 py-2.5 text-right text-red-400 font-mono">{fmt(doc.total_ep_vz)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </>)}

      {/* ══ MODAL ══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="bg-dark-600 border border-dark-50/10 rounded-2xl shadow-2xl w-full max-w-4xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-50/10">
              <div>
                <h3 className="text-lg font-bold text-white">Заповнення — {MONTH_NAMES[month-1]} {year}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Завантажте скріншоти НСЗУ або введіть вручну</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-500 hover:text-white hover:bg-dark-300 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* IMAGE UPLOAD */}
              <div>
                <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-accent-400" />AI аналіз зображень
                </p>
                <div
                  onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-dark-50/20 hover:border-accent-500/40 rounded-xl p-6 text-center cursor-pointer transition-all group"
                >
                  <Upload size={28} className="mx-auto text-gray-600 group-hover:text-accent-400 mb-2" />
                  <p className="text-sm text-gray-500">Перетягніть скріншоти або <span className="text-accent-400 underline">оберіть файли</span></p>
                  <p className="text-xs text-gray-600 mt-1">PNG, JPG, WEBP &middot; до 10 MB</p>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => e.target.files && handleFiles(e.target.files)} />
                </div>
                {images.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {images.map((img, i) => (
                      <div key={i} className="flex items-center gap-3 bg-dark-400/40 rounded-xl px-4 py-3 border border-dark-50/10">
                        <img src={img.preview} alt="" className="w-12 h-12 object-cover rounded-lg border border-dark-50/20" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300 truncate">{img.file.name}</p>
                          {img.analyzed && !img.error && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} />Проаналізовано</p>}
                          {img.error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{img.error}</p>}
                        </div>
                        <select className="bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-1.5 text-sm text-white"
                          value={img.doctorId ?? ""}
                          onChange={e => setImages(p => p.map((im, idx) => idx === i ? { ...im, doctorId: e.target.value ? Number(e.target.value) : null } : im))}>
                          <option value="">— Лікар —</option>
                          {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                        </select>
                        <button onClick={() => removeImage(i)} className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg"><X size={15} /></button>
                      </div>
                    ))}
                    <button onClick={analyzeImages} disabled={analyzing || images.every(im => !im.doctorId)}
                      className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-semibold border border-accent-500/20 disabled:opacity-40">
                      {analyzing ? <><RefreshCw size={15} className="animate-spin" />Аналізую&hellip;</> : <><Sparkles size={15} />Аналізувати за допомогою ШІ</>}
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-dark-50/10" />

              {/* MANUAL INPUT */}
              {settings && doctors.map(doc => {
                const coeffMap: Record<string, keyof NhsuSettings> = {
                  "0_5":"coeff_0_5","6_17":"coeff_6_17","18_39":"coeff_18_39","40_64":"coeff_40_64","65_plus":"coeff_65_plus",
                };
                return (
                  <div key={doc.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileImage size={15} className="text-accent-400" />
                      <p className="text-sm font-semibold text-white">{doc.full_name}</p>
                      {doc.is_owner && <span className="text-xs bg-accent-500/10 text-accent-400 px-2 py-0.5 rounded-full border border-accent-500/20">Власник</span>}
                    </div>
                    <div className="overflow-hidden rounded-xl border border-dark-50/10">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-dark-400/40 border-b border-dark-50/10">
                          <th className="text-left px-4 py-2.5 text-xs text-gray-500 uppercase">Вікова група</th>
                          <th className="text-center px-4 py-2.5 text-xs text-gray-500 uppercase">Коеф.</th>
                          <th className="text-center px-4 py-2.5 text-xs text-gray-500 uppercase">Пацієнти</th>
                          <th className="text-center px-4 py-2.5 text-xs text-gray-500 uppercase">Не верифіковані</th>
                          <th className="text-right px-4 py-2.5 text-xs text-gray-500 uppercase">Сума</th>
                        </tr></thead>
                        <tbody>
                          {ageGroups.map(ag => {
                            const rec = records.find(r => r.doctor_id === doc.id && r.age_group === ag.key);
                            if (!rec) return null;
                            const coeff = Number(settings[coeffMap[ag.key]] ?? 0);
                            const p = parseInt(rec.patient_count) || 0;
                            const nv = parseFloat(rec.non_verified) || 0;
                            const preview = (settings.capitation_rate * coeff * (p - nv)) / 12;
                            return (
                              <tr key={ag.key} className="border-b border-dark-50/5">
                                <td className="px-4 py-2.5 text-gray-300">{ag.label}</td>
                                <td className="px-4 py-2.5 text-center text-gray-500">{coeff}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <input type="number" min={0} value={rec.patient_count}
                                    onChange={e => updateRecord(doc.id, ag.key, "patient_count", e.target.value)}
                                    className="bg-dark-300 border border-dark-50/20 rounded-lg px-3 py-1.5 text-sm text-white text-center w-24 focus:outline-none focus:border-accent-500/50" />
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <input type="number" min={0} step={0.5} value={rec.non_verified}
                                    onChange={e => updateRecord(doc.id, ag.key, "non_verified", e.target.value)}
                                    className="bg-dark-300 border border-dark-50/20 rounded-lg px-3 py-1.5 text-sm text-white text-center w-24 focus:outline-none focus:border-accent-500/50" />
                                </td>
                                <td className="px-4 py-2.5 text-right text-emerald-400 font-mono">{fmt(preview)} грн</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* SAVE */}
              <div className="flex items-center gap-4 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-semibold border border-accent-500/20 disabled:opacity-50">
                  {saving ? <><RefreshCw size={15} className="animate-spin" />Збереження&hellip;</> : <><Save size={15} />Зберегти</>}
                </button>
                {saveMsg && <span className={`text-sm ${saveMsg === "Збережено" ? "text-emerald-400" : "text-red-400"}`}>{saveMsg}</span>}
                <button onClick={() => setShowModal(false)} className="ml-auto text-sm text-gray-500 hover:text-gray-300">Скасувати</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
