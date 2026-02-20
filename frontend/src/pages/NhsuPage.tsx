import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ChevronLeft, ChevronRight, ChevronDown, Upload, X, Save,
  RefreshCw, Sparkles, Users, BadgeDollarSign, TrendingDown,
  ShieldAlert, FileImage, Plus, CheckCircle2, AlertCircle,
  Download, History, TrendingUp, Bell, Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../api/client";
import type {
  AgeGroup, Doctor, DoctorSummary,
  NhsuMonthlyReport, NhsuSettings,
} from "../types";

// ─── Constants ───────────────────────────────────────────────────────
const MONTH_NAMES = [
  "Січень","Лютий","Березень","Квітень","Травень","Червень",
  "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень",
];
const PIE_COLORS   = ["#6366f1","#22d3ee","#f59e0b","#10b981","#f43f5e"];
const TT_STYLE     = { background:"#1a1a2e", border:"1px solid #ffffff15", borderRadius:8 };
const AI_HIST_KEY  = "nhsu_ai_history_v1";

// ─── Interfaces ──────────────────────────────────────────────────────
interface RecordInput {
  doctor_id: number; age_group: string;
  patient_count: string; non_verified: string;
}
interface UploadedImage {
  file: File; preview: string; doctorId: number | null;
  analyzed: boolean; error?: string; result?: Record<string, number>;
}
interface TrendPoint {
  label: string; year: number; month: number; has_data: boolean;
  total_patients: number; total_amount: number;
  net_amount: number; total_ep_vz: number;
}
interface AiHistoryEntry {
  id: string; date: string; filename: string;
  doctorId: number | null; doctorName: string;
  confidence: string; notes: string;
  totals: { age_0_5:number; age_6_17:number; age_18_39:number; age_40_64:number; age_65_plus:number };
}
interface MonthRangeEntry {
  year: number; month: number; label: string; has_data: boolean;
  amount: number; ep: number; vz: number; epVz: number; net: number;
}
interface RangeSummary {
  totalAmount: number; totalEp: number; totalVz: number;
  totalEpVz: number; totalNet: number;
  monthsWithData: number; months: MonthRangeEntry[];
  ep_rate: number; vz_rate: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString("uk-UA",{minimumFractionDigits:1,maximumFractionDigits:1});
const fmt2 = (n: number) => n.toLocaleString("uk-UA",{minimumFractionDigits:2,maximumFractionDigits:2});

function loadHistory(): AiHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(AI_HIST_KEY)??"[]"); } catch { return []; }
}
function saveHistory(e: AiHistoryEntry[]) {
  localStorage.setItem(AI_HIST_KEY, JSON.stringify(e.slice(-100)));
}

// ─── Main Component ──────────────────────────────────────────────────
export default function NhsuPage() {
  const now = new Date();

  // Period & filter state
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()+1);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<Set<number>>(new Set());
  const [doctorDropOpen,    setDoctorDropOpen]     = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Data state
  const [doctors,      setDoctors]      = useState<Doctor[]>([]);
  const [ageGroups,    setAgeGroups]    = useState<AgeGroup[]>([]);
  const [settings,     setSettings]     = useState<NhsuSettings | null>(null);
  const [report,       setReport]       = useState<NhsuMonthlyReport | null>(null);
  const [trendData,    setTrendData]    = useState<TrendPoint[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [records,   setRecords]   = useState<RecordInput[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState("");

  // Images & AI state
  const [images,      setImages]      = useState<UploadedImage[]>([]);
  const [analyzing,   setAnalyzing]   = useState(false);
  const [aiHistory,   setAiHistory]   = useState<AiHistoryEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Range period state
  const [rangeMode,     setRangeMode]     = useState(false);
  const [rangeEndYear,  setRangeEndYear]  = useState(now.getFullYear());
  const [rangeEndMonth, setRangeEndMonth] = useState(now.getMonth() + 1);
  const [rangeData,     setRangeData]     = useState<RangeSummary | null>(null);
  const [rangeLoading,  setRangeLoading]  = useState(false);

  // Close doctor dropdown on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDoctorDropOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Load static data once
  useEffect(() => {
    (async () => {
      try {
        const [d,a,s] = await Promise.all([
          api.get("/nhsu/doctors"),
          api.get("/nhsu/age-groups"),
          api.get("/nhsu/settings"),
        ]);
        setDoctors(d.data); setAgeGroups(a.data); setSettings(s.data);
      } catch {}
    })();
  }, []);

  // Load monthly report
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/nhsu/monthly", { params:{ year, month } });
      setReport(data);
    } catch { setReport(null); }
    finally  { setLoading(false); }
  }, [year, month]);

  useEffect(() => { loadReport(); }, [loadReport]);

  // Load trend (last 6 months) once
  const loadTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const { data } = await api.get("/nhsu/monthly-summary", { params:{ months:6 } });
      setTrendData(data);
    } catch {} finally { setTrendLoading(false); }
  }, []);

  useEffect(() => { loadTrend(); }, [loadTrend]);

  // Load and aggregate range data
  const loadRangeData = useCallback(async () => {
    if (!rangeMode) { setRangeData(null); return; }
    setRangeLoading(true);
    try {
      const months: {year:number; month:number}[] = [];
      let y = year, m = month;
      while ((y < rangeEndYear || (y === rangeEndYear && m <= rangeEndMonth)) && months.length < 24) {
        months.push({year:y, month:m});
        if (++m > 12) { m = 1; y++; }
      }
      if (!months.length) { setRangeData(null); return; }

      const results = await Promise.all(
        months.map(({year,month}) =>
          api.get("/nhsu/monthly", {params:{year,month}})
             .then(r => r.data as NhsuMonthlyReport)
             .catch(() => null),
        ),
      );

      const ep_rate = results.find(Boolean)?.ep_rate ?? 5;
      const vz_rate = results.find(Boolean)?.vz_rate ?? 1.5;
      let totalAmount=0, totalEp=0, totalVz=0, totalEpVz=0, totalNet=0, monthsWithData=0;

      const monthEntries: MonthRangeEntry[] = months.map(({year,month}, i) => {
        const r = results[i];
        if (!r) return {year,month,label:`${MONTH_NAMES[month-1]} ${year}`,has_data:false,amount:0,ep:0,vz:0,epVz:0,net:0};
        monthsWithData++;
        const filtered = selectedDoctorIds.size===0 ? r.doctors : r.doctors.filter(d=>selectedDoctorIds.has(d.doctor_id));
        const amt  = filtered.reduce((s,d)=>s+d.total_amount,0);
        const ep   = filtered.reduce((s,d)=>s+d.total_ep,0);
        const vz   = filtered.reduce((s,d)=>s+d.total_vz,0);
        const epVz = filtered.reduce((s,d)=>s+d.total_ep_vz,0);
        totalAmount+=amt; totalEp+=ep; totalVz+=vz; totalEpVz+=epVz; totalNet+=amt-epVz;
        return {year,month,label:`${MONTH_NAMES[month-1]} ${year}`,has_data:true,amount:amt,ep,vz,epVz,net:amt-epVz};
      });

      setRangeData({totalAmount,totalEp,totalVz,totalEpVz,totalNet,monthsWithData,months:monthEntries,ep_rate,vz_rate});
    } finally { setRangeLoading(false); }
  }, [rangeMode, year, month, rangeEndYear, rangeEndMonth, selectedDoctorIds]);

  useEffect(() => { loadRangeData(); }, [loadRangeData]);

  // Period nav
  const prevMonth = () => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  // Range end nav
  const prevRangeEnd = () => { if(rangeEndMonth===1){setRangeEndMonth(12);setRangeEndYear(y=>y-1);}else setRangeEndMonth(m=>m-1); };
  const nextRangeEnd = () => { if(rangeEndMonth===12){setRangeEndMonth(1);setRangeEndYear(y=>y+1);}else setRangeEndMonth(m=>m+1); };

  // Doctor multi-select
  const toggleDoctor = (id: number) => setSelectedDoctorIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const doctorLabel = selectedDoctorIds.size === 0
    ? "Всі лікарі"
    : selectedDoctorIds.size === 1
      ? doctors.find(d => selectedDoctorIds.has(d.id))?.full_name ?? "1 лікар"
      : `${selectedDoctorIds.size} лікарів`;

  // Filtered & computed
  const filteredDoctors: DoctorSummary[] = report
    ? selectedDoctorIds.size === 0
      ? report.doctors
      : report.doctors.filter(d => selectedDoctorIds.has(d.doctor_id))
    : [];

  const totals = filteredDoctors.reduce(
    (a,d) => ({
      patients: a.patients + d.total_patients,
      nonVer:   a.nonVer   + d.total_non_verified,
      amount:   a.amount   + d.total_amount,
      ep:       a.ep       + d.total_ep,
      vz:       a.vz       + d.total_vz,
      epVz:     a.epVz     + d.total_ep_vz,
    }),
    { patients:0, nonVer:0, amount:0, ep:0, vz:0, epVz:0 },
  );

  // Chart data
  const ageBarData = ageGroups.map(ag => ({
    name: ag.label.replace("від ","").replace("понад ",""),
    patients: filteredDoctors.reduce((s,d) => {
      const r = d.rows.find(x => x.age_group === ag.key);
      return s + (r ? r.patient_count : 0);
    }, 0),
  }));
  const doctorBarData = filteredDoctors.map(d => ({
    name: d.doctor_name.split(" ")[0],
    amount: Math.round(d.total_amount),
  }));
  const pieData = filteredDoctors.map(d => ({
    name: d.doctor_name.split(" ")[0], value: d.total_patients,
  }));

  // Forecast: avg net of last 3 months that have data
  const withData   = trendData.filter(t => t.has_data);
  const last3      = withData.slice(-3);
  const forecastNet = last3.length > 0
    ? Math.round(last3.reduce((s,t) => s+t.net_amount, 0) / last3.length)
    : null;

  // Notification for current month
  const isCurrentMonth  = year===now.getFullYear() && month===now.getMonth()+1;
  const showNotification = !loading && !report && isCurrentMonth;

  // Excel export
  const exportExcel = () => {
    if (!report) return;
    const rows: (string | number)[][] = [
      [`Звіт НСЗУ — ${MONTH_NAMES[month-1]} ${year}`],
      [],
      ["Лікар","Вікова група","Пацієнти","Не верифіковані","Сума","ЄП","ВЗ","ЄП+ВЗ"],
      ...filteredDoctors.flatMap(d => d.rows.map(r => [
        d.doctor_name, r.age_group_label,
        r.patient_count, r.non_verified,
        r.amount, r.ep_amount, r.vz_amount, r.ep_vz_amount,
      ])),
      [],
      ["Всього","",totals.patients,totals.nonVer,totals.amount,totals.ep,totals.vz,totals.epVz],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Звіт");
    XLSX.writeFile(wb, `НСЗУ_${MONTH_NAMES[month-1]}_${year}.xlsx`);
  };

  // Open fill modal
  const openModal = () => {
    const recs: RecordInput[] = [];
    for (const doc of doctors) for (const ag of ageGroups) {
      const ex = report?.doctors.find(d=>d.doctor_id===doc.id)?.rows.find(r=>r.age_group===ag.key);
      recs.push({ doctor_id:doc.id, age_group:ag.key,
        patient_count: ex ? String(ex.patient_count) : "0",
        non_verified:  ex ? String(ex.non_verified)  : "0" });
    }
    setRecords(recs); setImages([]); setSaveMsg(""); setShowModal(true);
  };

  const updateRecord = (docId:number, ag:string, field:string, val:string) =>
    setRecords(p => p.map(r => r.doctor_id===docId && r.age_group===ag ? {...r,[field]:val} : r));

  // Image handling
  const handleFiles = (files: FileList|File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    setImages(p => [...p, ...arr.map(f => ({
      file:f, preview:URL.createObjectURL(f),
      doctorId: doctors.length===1 ? doctors[0].id : null, analyzed:false,
    }))]);
  };
  const removeImage = (i:number) =>
    setImages(p => { URL.revokeObjectURL(p[i].preview); return p.filter((_,idx)=>idx!==i); });

  // AI analysis
  const analyzeImages = async () => {
    if (!images.length) return;
    setAnalyzing(true);
    try {
      const fd = new FormData();
      const ids: string[] = [];
      images.forEach(img => { fd.append("images",img.file); ids.push(img.doctorId!=null?String(img.doctorId):""); });
      fd.append("doctor_ids", ids.join(","));
      const { data } = await api.post("/nhsu/analyze-image", fd, { headers:{"Content-Type":"multipart/form-data"} });
      const results: Record<string,unknown>[] = data.results;
      const agMap: Record<string,string> = { age_0_5:"0_5",age_6_17:"6_17",age_18_39:"18_39",age_40_64:"40_64",age_65_plus:"65_plus" };
      const newHist: AiHistoryEntry[] = [];

      setImages(p => p.map((img, i) => {
        const res = results[i];
        if (!res) return img;
        if (res.error) return { ...img, analyzed:true, error:String(res.error) };
        if (img.doctorId) {
          setRecords(prev => prev.map(r => {
            if (r.doctor_id!==img.doctorId) return r;
            const aiKey = Object.entries(agMap).find(([,v])=>v===r.age_group)?.[0];
            if (aiKey && res[aiKey]!==undefined) return {...r, patient_count:String(res[aiKey])};
            return r;
          }));
        }
        newHist.push({
          id: `${Date.now()}_${i}`, date: new Date().toLocaleString("uk-UA"),
          filename: img.file.name, doctorId: img.doctorId,
          doctorName: img.doctorId ? (doctors.find(d=>d.id===img.doctorId)?.full_name??"—") : "—",
          confidence: String(res.confidence??"low"), notes: String(res.notes??""),
          totals: {
            age_0_5:    Number(res.age_0_5)||0,
            age_6_17:   Number(res.age_6_17)||0,
            age_18_39:  Number(res.age_18_39)||0,
            age_40_64:  Number(res.age_40_64)||0,
            age_65_plus:Number(res.age_65_plus)||0,
          },
        });
        return { ...img, analyzed:true, result:{
          age_0_5:Number(res.age_0_5)||0, age_6_17:Number(res.age_6_17)||0,
          age_18_39:Number(res.age_18_39)||0, age_40_64:Number(res.age_40_64)||0,
          age_65_plus:Number(res.age_65_plus)||0,
        }};
      }));

      if (newHist.length > 0) {
        const updated = [...loadHistory(), ...newHist];
        saveHistory(updated); setAiHistory(updated);
      }
    } catch (e: unknown) {
      const msg = (e as {response?:{data?:{detail?:string}}})?.response?.data?.detail ?? "Помилка AI";
      setImages(p => p.map(img => ({...img, error:msg})));
    } finally { setAnalyzing(false); }
  };

  // Save monthly data
  const handleSave = async () => {
    setSaving(true); setSaveMsg("");
    try {
      await api.post("/nhsu/monthly", {
        year, month,
        records: records.map(r => ({
          doctor_id: r.doctor_id, age_group: r.age_group,
          patient_count: parseInt(r.patient_count)||0,
          non_verified:  parseFloat(r.non_verified)||0,
        })),
      });
      setSaveMsg("Збережено");
      await Promise.all([loadReport(), loadTrend()]);
      setTimeout(() => setShowModal(false), 700);
    } catch (e: unknown) {
      setSaveMsg((e as {response?:{data?:{detail?:string}}})?.response?.data?.detail ?? "Помилка");
    } finally { setSaving(false); }
  };

  const clearHistory = () => { saveHistory([]); setAiHistory([]); };

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── FILTER BAR ── */}
      <div className="card-neo p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[160px]">
            <h2 className="text-xl font-bold text-white">Розрахунок НСЗУ</h2>
            <p className="text-xs text-gray-500 mt-0.5">Капітаційна ставка · ПМГ</p>
          </div>

          {/* Multi-select doctor dropdown */}
          <div className="flex flex-col gap-1" ref={dropRef}>
            <label className="text-xs text-gray-500">Лікар</label>
            <div className="relative">
              <button
                onClick={() => setDoctorDropOpen(v => !v)}
                className="flex items-center gap-2 bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white min-w-[200px] hover:border-accent-500/40 transition-colors"
              >
                <span className="flex-1 text-left truncate">{doctorLabel}</span>
                <ChevronDown size={13} className={`text-gray-500 transition-transform ${doctorDropOpen?"rotate-180":""}`} />
              </button>
              {doctorDropOpen && (
                <div className="absolute top-full mt-1 left-0 w-full bg-dark-400 border border-dark-50/20 rounded-xl shadow-2xl z-30 overflow-hidden">
                  <button
                    onClick={() => { setSelectedDoctorIds(new Set()); setDoctorDropOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-dark-300 ${selectedDoctorIds.size===0?"text-accent-400":"text-gray-300"}`}
                  >
                    Всі лікарі
                  </button>
                  <div className="border-t border-dark-50/10" />
                  {doctors.map(d => (
                    <label key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-300 cursor-pointer transition-colors">
                      <input type="checkbox" checked={selectedDoctorIds.has(d.id)}
                        onChange={() => toggleDoctor(d.id)}
                        className="accent-accent-500 w-4 h-4" />
                      {d.full_name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Period */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{rangeMode ? "Від" : "Період"}</label>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2">
                <button onClick={prevMonth} className="text-gray-400 hover:text-white p-0.5"><ChevronLeft size={15}/></button>
                <span className="text-sm text-white font-medium min-w-[120px] text-center">{MONTH_NAMES[month-1]} {year}</span>
                <button onClick={nextMonth} className="text-gray-400 hover:text-white p-0.5"><ChevronRight size={15}/></button>
              </div>
              {rangeMode && (
                <>
                  <span className="text-gray-600 text-xs">—</span>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs text-gray-500">До</label>
                    <div className="flex items-center gap-1 bg-dark-300 border border-accent-500/30 rounded-xl px-3 py-2">
                      <button onClick={prevRangeEnd} className="text-gray-400 hover:text-white p-0.5"><ChevronLeft size={15}/></button>
                      <span className="text-sm text-white font-medium min-w-[120px] text-center">{MONTH_NAMES[rangeEndMonth-1]} {rangeEndYear}</span>
                      <button onClick={nextRangeEnd} className="text-gray-400 hover:text-white p-0.5"><ChevronRight size={15}/></button>
                    </div>
                  </div>
                </>
              )}
              {/* "Весь рік" button */}
              <button
                onClick={() => {
                  if (rangeMode) {
                    setRangeMode(false); setRangeData(null);
                  } else {
                    setYear(now.getFullYear()); setMonth(1);
                    setRangeEndYear(now.getFullYear()); setRangeEndMonth(now.getMonth() + 1);
                    setRangeMode(true);
                  }
                }}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-colors ${
                  rangeMode
                    ? "bg-accent-500/20 text-accent-400 border-accent-500/40 hover:bg-accent-500/30"
                    : "bg-dark-300 text-gray-400 border-dark-50/20 hover:text-white hover:border-dark-50/40"
                }`}
              >
                <TrendingUp size={12}/>
                {rangeMode ? "Скинути" : "Весь рік"}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-5">
            <button onClick={openModal} disabled={!doctors.length}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-semibold border border-accent-500/20 disabled:opacity-40">
              <Plus size={15}/>{report?"Редагувати":"Заповнити"}
            </button>
            {report && (
              <button onClick={exportExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-dark-300 hover:bg-dark-200 text-gray-300 rounded-xl text-sm border border-dark-50/20">
                <Download size={15}/>Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION ── */}
      {showNotification && (
        <div className="flex items-start gap-3 px-5 py-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
          <Bell size={18} className="text-yellow-400 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-sm font-semibold text-yellow-400">Дані за поточний місяць відсутні</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Натисніть <span className="text-accent-400">"Заповнити"</span> або завантажте скріншот НСЗУ для автоматичного AI-розпізнавання.
            </p>
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin"/>
        </div>
      )}

      {/* ── EMPTY ── */}
      {!loading && !report && !showNotification && (
        <div className="card-neo px-5 py-14 text-center">
          <p className="text-gray-500">Дані за {MONTH_NAMES[month-1].toLowerCase()} {year} не заповнені.</p>
        </div>
      )}

      {/* ── RANGE MODE DASHBOARD ── */}
      {rangeMode && (
        <div className="space-y-4">
          {rangeLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="w-7 h-7 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin"/>
            </div>
          )}
          {!rangeLoading && rangeData && (<>
            {/* Range KPI cards — без пацієнтів та не верифікованих */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                { label:"Сума (брутто)",          val:fmt2(rangeData.totalAmount),  color:"text-emerald-400", Icon:BadgeDollarSign },
                { label:`ЄП ${settings?.ep_rate ?? rangeData.ep_rate}%`, val:fmt2(rangeData.totalEp),    color:"text-red-400",     Icon:TrendingDown },
                { label:`ВЗ ${settings?.vz_rate ?? rangeData.vz_rate}%`, val:fmt2(rangeData.totalVz),    color:"text-orange-400",  Icon:ShieldAlert },
                { label:"Чистий дохід",           val:fmt2(rangeData.totalNet),     color:"text-accent-400",  Icon:BadgeDollarSign },
              ] as const).map(({ label, val, color, Icon }) => (
                <div key={label} className="card-neo kpi-3d-hover p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Icon size={13} className="text-gray-500"/>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  </div>
                  <p className={`text-xl font-bold font-mono ${color}`}>{val}</p>
                  <p className="text-xs text-gray-600">за {rangeData.monthsWithData} міс. з даними</p>
                </div>
              ))}
            </div>

            {/* Month-by-month breakdown */}
            <div className="card-neo card-3d-hover overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-50/10 flex items-center gap-2 bg-dark-400/30">
                <TrendingUp size={14} className="text-accent-400"/>
                <h4 className="text-white font-semibold text-sm">Розбивка по місяцях</h4>
                <span className="ml-auto text-xs text-gray-500">
                  {MONTH_NAMES[month-1]} {year} — {MONTH_NAMES[rangeEndMonth-1]} {rangeEndYear}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-dark-50/10">
                    {["Місяць","Сума (брутто)","ЄП","ВЗ","ЄП+ВЗ","Чистий дохід"].map(h=>
                      <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right first:text-left">{h}</th>
                    )}
                  </tr></thead>
                  <tbody>
                    {rangeData.months.map(m => (
                      <tr key={`${m.year}-${m.month}`} className={`border-b border-dark-50/5 hover:bg-dark-200/40 ${!m.has_data ? "opacity-35" : ""}`}>
                        <td className="px-4 py-2.5 text-gray-300">{m.label}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-400 font-mono">{m.has_data ? fmt2(m.amount) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-red-400/70 font-mono">{m.has_data ? fmt2(m.ep) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-orange-400/70 font-mono">{m.has_data ? fmt2(m.vz) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-red-400 font-mono">{m.has_data ? fmt2(m.epVz) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-accent-400 font-bold font-mono">{m.has_data ? fmt2(m.net) : "—"}</td>
                      </tr>
                    ))}
                    <tr className="bg-dark-400/40 font-semibold border-t border-dark-50/15">
                      <td className="px-4 py-2.5 text-white">Всього</td>
                      <td className="px-4 py-2.5 text-right text-emerald-400 font-mono">{fmt2(rangeData.totalAmount)}</td>
                      <td className="px-4 py-2.5 text-right text-red-400/70 font-mono">{fmt2(rangeData.totalEp)}</td>
                      <td className="px-4 py-2.5 text-right text-orange-400/70 font-mono">{fmt2(rangeData.totalVz)}</td>
                      <td className="px-4 py-2.5 text-right text-red-400 font-mono">{fmt2(rangeData.totalEpVz)}</td>
                      <td className="px-4 py-2.5 text-right text-accent-400 font-mono">{fmt2(rangeData.totalNet)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>)}
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {!loading && report && !rangeMode && (<>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {([
            { label:"Пацієнти",       val:totals.patients,                color:"text-white",       Icon:Users },
            { label:"Не верифіковані",val:fmt(totals.nonVer),             color:"text-yellow-400",  Icon:AlertCircle },
            { label:"Сума (брутто)",  val:fmt2(totals.amount),            color:"text-emerald-400", Icon:BadgeDollarSign },
            { label:`ЄП ${settings?.ep_rate ?? report.ep_rate}%`, val:fmt2(totals.ep),         color:"text-red-400",     Icon:TrendingDown },
            { label:`ВЗ ${settings?.vz_rate ?? report.vz_rate}%`, val:fmt2(totals.vz),         color:"text-orange-400",  Icon:ShieldAlert },
            { label:"Чистий дохід",   val:fmt2(totals.amount-totals.epVz),color:"text-accent-400",  Icon:BadgeDollarSign },
          ] as const).map(({ label, val, color, Icon }) => (
            <div key={label} className="card-neo kpi-3d-hover p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Icon size={13} className="text-gray-500"/>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              </div>
              <p className={`text-xl font-bold font-mono ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card-neo card-3d-hover p-5">
            <p className="text-sm font-semibold text-white mb-4">Пацієнти по вікових групах</p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={ageBarData} margin={{top:0,right:0,left:-20,bottom:30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                <XAxis dataKey="name" tick={{fill:"#6b7280",fontSize:11}} angle={-25} textAnchor="end"/>
                <YAxis tick={{fill:"#6b7280",fontSize:11}}/>
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={TT_STYLE}/>
                <Bar dataKey="patients" fill="#6366f1" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card-neo card-3d-hover p-5">
            <p className="text-sm font-semibold text-white mb-4">Надходження по лікарях (грн)</p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={doctorBarData} margin={{top:0,right:0,left:-10,bottom:30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                <XAxis dataKey="name" tick={{fill:"#6b7280",fontSize:11}} angle={-25} textAnchor="end"/>
                <YAxis tick={{fill:"#6b7280",fontSize:11}}/>
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={TT_STYLE} formatter={(v:number)=>[`${v.toLocaleString("uk-UA")} грн`,"Сума"]}/>
                <Bar dataKey="amount" fill="#22d3ee" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card-neo card-3d-hover p-5">
            <p className="text-sm font-semibold text-white mb-4">Розподіл пацієнтів</p>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                </Pie>
                <Legend formatter={v=><span style={{color:"#9ca3af",fontSize:12}}>{v}</span>}/>
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={TT_STYLE}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detail tables */}
        {filteredDoctors.map(doc => (
          <div key={doc.doctor_id} className="card-neo card-3d-hover overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-50/10 flex items-center gap-3 bg-dark-400/30">
              <h4 className="text-white font-semibold">{doc.doctor_name}</h4>
              {doc.is_owner && <span className="text-xs bg-accent-500/10 text-accent-400 px-2 py-0.5 rounded-full border border-accent-500/20">Власник</span>}
              <span className="ml-auto text-xs text-gray-500 font-mono">{doc.total_patients} пац. · {fmt2(doc.total_amount)} грн</span>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-dark-50/10">
                {["Вікова група","Коеф.","Пацієнти","Не вериф.","Сума","ЄП","ВЗ","ЄП+ВЗ"].map(h=>
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
                  <td className="px-4 py-2.5 text-gray-300">Всього</td><td/>
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

      {/* ── TREND + FORECAST ── */}
      {(trendData.some(t=>t.has_data) || trendLoading) && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="card-neo card-3d-hover p-5 xl:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-accent-400"/>
              <p className="text-sm font-semibold text-white">Тренд за 6 місяців</p>
              {trendLoading && <RefreshCw size={12} className="animate-spin text-gray-500 ml-1"/>}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{top:5,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                <XAxis dataKey="label" tick={{fill:"#6b7280",fontSize:11}}/>
                <YAxis tick={{fill:"#6b7280",fontSize:11}}/>
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={TT_STYLE} formatter={(v:number)=>[`${v.toLocaleString("uk-UA")} грн`]}/>
                <Legend formatter={v=><span style={{color:"#9ca3af",fontSize:11}}>{v}</span>}/>
                <Line type="monotone" dataKey="total_amount"  name="Брутто"        stroke="#10b981" strokeWidth={2} dot={{r:4,fill:"#10b981"}} connectNulls={false}/>
                <Line type="monotone" dataKey="net_amount"    name="Чистий дохід"  stroke="#6366f1" strokeWidth={2} dot={{r:4,fill:"#6366f1"}} connectNulls={false} strokeDasharray="5 3"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card-neo kpi-3d-hover p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-accent-400"/>
                <p className="text-sm font-semibold text-white">Прогноз</p>
              </div>
              <p className="text-xs text-gray-500">Очікуваний чистий дохід наступного місяця (середнє за 3 міс.)</p>
            </div>
            {forecastNet !== null ? (
              <div className="mt-4">
                <p className="text-3xl font-bold font-mono text-accent-400">{forecastNet.toLocaleString("uk-UA")}</p>
                <p className="text-xs text-gray-500 mt-1">грн / місяць</p>
                <p className="text-xs text-gray-600 mt-3">На основі {last3.length} міс. з даними</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-4">Недостатньо даних</p>
            )}
          </div>
        </div>
      )}

      {/* ── AI HISTORY ── */}
      {aiHistory.length > 0 && (
        <div className="card-neo card-3d-hover overflow-hidden">
          <button onClick={() => setShowHistory(v=>!v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-dark-300/30 transition-colors">
            <div className="flex items-center gap-2">
              <History size={15} className="text-accent-400"/>
              <span className="text-sm font-semibold text-white">Історія AI аналізів</span>
              <span className="text-xs bg-accent-500/10 text-accent-400 px-2 py-0.5 rounded-full border border-accent-500/20">
                {aiHistory.length}
              </span>
            </div>
            <ChevronDown size={15} className={`text-gray-500 transition-transform ${showHistory?"rotate-180":""}`}/>
          </button>
          {showHistory && (
            <div className="border-t border-dark-50/10">
              <div className="flex justify-end px-5 py-2 border-b border-dark-50/5">
                <button onClick={clearHistory} className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={11}/>Очистити все
                </button>
              </div>
              <div className="divide-y divide-dark-50/5 max-h-64 overflow-y-auto">
                {[...aiHistory].reverse().map(h => (
                  <div key={h.id} className="flex items-start gap-4 px-5 py-3 hover:bg-dark-300/20 transition-colors">
                    <FileImage size={15} className="text-accent-400 mt-0.5 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{h.filename}</p>
                      <p className="text-xs text-gray-500">{h.doctorName} · {h.date}</p>
                      {h.notes && <p className="text-xs text-gray-600 italic mt-0.5 truncate">{h.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-xs font-mono text-gray-400">
                        {Object.values(h.totals).reduce((a,b)=>a+b,0)} пац.
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        h.confidence==="high"  ?"text-emerald-400 bg-emerald-400/10":
                        h.confidence==="medium"?"text-yellow-400 bg-yellow-400/10":
                                                "text-red-400 bg-red-400/10"}`}>
                        {h.confidence}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ FILL MODAL ══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="bg-dark-600 border border-dark-50/10 rounded-2xl shadow-2xl w-full max-w-4xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-50/10">
              <div>
                <h3 className="text-lg font-bold text-white">Заповнення — {MONTH_NAMES[month-1]} {year}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Завантажте скріншоти НСЗУ або введіть вручну</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-500 hover:text-white hover:bg-dark-300 rounded-xl">
                <X size={20}/>
              </button>
            </div>
            <div className="p-6 space-y-6">

              {/* Image upload */}
              <div>
                <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles size={15} className="text-accent-400"/>AI аналіз зображень
                </p>
                <div onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}
                  onDragOver={e=>e.preventDefault()} onClick={()=>fileInputRef.current?.click()}
                  className="border-2 border-dashed border-dark-50/20 hover:border-accent-500/40 rounded-xl p-6 text-center cursor-pointer transition-all group">
                  <Upload size={26} className="mx-auto text-gray-600 group-hover:text-accent-400 mb-2"/>
                  <p className="text-sm text-gray-500">Перетягніть скріншоти або <span className="text-accent-400 underline">оберіть файли</span></p>
                  <p className="text-xs text-gray-600 mt-1">PNG, JPG, WEBP · до 10 MB</p>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e=>e.target.files&&handleFiles(e.target.files)}/>
                </div>
                {images.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {images.map((img,i) => (
                      <div key={i} className="flex items-center gap-3 bg-dark-400/40 rounded-xl px-4 py-3 border border-dark-50/10">
                        <img src={img.preview} alt="" className="w-12 h-12 object-cover rounded-lg border border-dark-50/20 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300 truncate">{img.file.name}</p>
                          {img.analyzed && !img.error && (
                            <p className="text-xs text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={11}/>Проаналізовано · {img.result?Object.values(img.result).reduce((a,b)=>a+b,0):0} пац.
                            </p>
                          )}
                          {img.error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11}/>{img.error}</p>}
                        </div>
                        <select className="bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-1.5 text-sm text-white"
                          value={img.doctorId??""} onChange={e=>setImages(p=>p.map((im,idx)=>idx===i?{...im,doctorId:e.target.value?Number(e.target.value):null}:im))}>
                          <option value="">— Лікар —</option>
                          {doctors.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}
                        </select>
                        <button onClick={()=>removeImage(i)} className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg flex-shrink-0"><X size={14}/></button>
                      </div>
                    ))}
                    <button onClick={analyzeImages} disabled={analyzing||images.every(im=>!im.doctorId)}
                      className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-semibold border border-accent-500/20 disabled:opacity-40">
                      {analyzing?<><RefreshCw size={14} className="animate-spin"/>Аналізую…</>:<><Sparkles size={14}/>Аналізувати за допомогою ШІ</>}
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-dark-50/10"/>

              {/* Manual input */}
              {settings && doctors.map(doc => {
                const coeffMap: Record<string,keyof NhsuSettings> = {
                  "0_5":"coeff_0_5","6_17":"coeff_6_17","18_39":"coeff_18_39","40_64":"coeff_40_64","65_plus":"coeff_65_plus",
                };
                return (
                  <div key={doc.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileImage size={14} className="text-accent-400"/>
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
                            const rec = records.find(r=>r.doctor_id===doc.id && r.age_group===ag.key);
                            if (!rec) return null;
                            const coeff = Number(settings[coeffMap[ag.key]]??0);
                            const p  = parseInt(rec.patient_count)||0;
                            const nv = parseFloat(rec.non_verified)||0;
                            const preview = (settings.capitation_rate * coeff * (p-nv)) / 12;
                            return (
                              <tr key={ag.key} className="border-b border-dark-50/5">
                                <td className="px-4 py-2.5 text-gray-300">{ag.label}</td>
                                <td className="px-4 py-2.5 text-center text-gray-500">{coeff}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <input type="number" min={0} value={rec.patient_count}
                                    onChange={e=>updateRecord(doc.id,ag.key,"patient_count",e.target.value)}
                                    className="bg-dark-300 border border-dark-50/20 rounded-lg px-3 py-1.5 text-sm text-white text-center w-24 focus:outline-none focus:border-accent-500/50"/>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <input type="number" min={0} step={0.5} value={rec.non_verified}
                                    onChange={e=>updateRecord(doc.id,ag.key,"non_verified",e.target.value)}
                                    className="bg-dark-300 border border-dark-50/20 rounded-lg px-3 py-1.5 text-sm text-white text-center w-24 focus:outline-none focus:border-accent-500/50"/>
                                </td>
                                <td className="px-4 py-2.5 text-right text-emerald-400 font-mono text-xs">{fmt(preview)} грн</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Save */}
              <div className="flex items-center gap-4 pt-1">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-semibold border border-accent-500/20 disabled:opacity-50">
                  {saving?<><RefreshCw size={14} className="animate-spin"/>Збереження…</>:<><Save size={14}/>Зберегти</>}
                </button>
                {saveMsg && <span className={`text-sm ${saveMsg==="Збережено"?"text-emerald-400":"text-red-400"}`}>{saveMsg}</span>}
                <button onClick={()=>setShowModal(false)} className="ml-auto text-sm text-gray-500 hover:text-gray-300">Скасувати</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
