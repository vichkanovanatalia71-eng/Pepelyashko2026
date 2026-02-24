import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  ChevronLeft, ChevronRight, TrendingUp, BadgeDollarSign,
  HeartPulse, Users, AlertCircle, Info,
  Lightbulb, ShieldAlert, X, ChevronDown,
} from "lucide-react";
import api from "../api/client";
import type {
  Doctor,
  RevenueAnalytics,
} from "../types";
import { MONTH_NAMES } from "../components/shared/MonthNavigator";
import { LoadingSpinner, EmptyState } from "../components/shared";
import MedFlowLogo from "../components/shared/MedFlowLogo";

const TT = { background: "#1a1a2e", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 12 };
const PIE_COLORS = ["#818cf8", "#34d399"];

// ─── Helpers ────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmt2 = (n: number) => n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctColor = (v: number) => v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : "text-gray-500";
const pctLabel = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

const REC_CONFIG: Record<string, { icon: typeof AlertCircle; color: string; bg: string; border: string }> = {
  risk:        { icon: ShieldAlert,  color: "text-red-400",    bg: "bg-red-500/5",    border: "border-red-500/20" },
  warning:     { icon: AlertCircle,  color: "text-amber-400",  bg: "bg-amber-500/5",  border: "border-amber-500/20" },
  opportunity: { icon: Lightbulb,    color: "text-emerald-400",bg: "bg-emerald-500/5",border: "border-emerald-500/20" },
  insight:     { icon: Info,         color: "text-blue-400",   bg: "bg-blue-500/5",   border: "border-blue-500/20" },
};
const REC_LABEL: Record<string, string> = {
  risk: "Ризик", warning: "Попередження", opportunity: "Можливість", insight: "Інсайт",
};

// ─── Detail Modal ────────────────────────────────────────────────────
interface DetailModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}
function DetailModal({ title, onClose, children }: DetailModalProps) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-dark-600 rounded-none sm:rounded-2xl w-full max-w-3xl min-h-full sm:min-h-0 sm:my-8 animate-modal-in pb-20 sm:pb-0 modal-glow">
        <div className="flex items-center justify-between p-5 border-b border-dark-50/10">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} aria-label="Закрити" className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-dark-300 transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function RevenuePage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [doctorId, setDoctorId] = useState<number | "">("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [data, setData]     = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  // Drill-down modals
  const [drillModal, setDrillModal] = useState<null | "total" | "nhsu" | "paid" | "doctors" | "services">(null);

  // Month nav
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Load doctors once
  useEffect(() => {
    api.get("/nhsu/doctors").then(r => setDoctors(r.data)).catch(() => {});
  }, []);

  // Load analytics
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/revenue/analytics", {
        params: { year, month, ...(doctorId ? { doctor_id: doctorId } : {}) },
      });
      setData(d);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [year, month, doctorId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Pie chart data
  const pieData = data
    ? [
        { name: "НСЗУ", value: data.nhsu },
        { name: "Платні", value: data.paid_services },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div className="space-y-5 max-w-full">

      {/* ── Header & filters ── */}
      <div className="card-neo card-3d-hover p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Аналітика доходів</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Агрегація НСЗУ + Платних послуг</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Doctor filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Лікар</label>
              <div className="relative">
                <select
                  value={doctorId}
                  onChange={e => setDoctorId(e.target.value ? Number(e.target.value) : "")}
                  className="bg-dark-300 border border-dark-50/20 rounded-xl pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-accent-500/50 appearance-none min-w-[160px]"
                >
                  <option value="">Всі лікарі</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Month nav */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Місяць</label>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="p-2 rounded-xl bg-dark-300 border border-dark-50/10 text-gray-400 hover:text-white hover:bg-dark-200 transition-all">
                  <ChevronLeft size={15} />
                </button>
                <span className="px-3 py-2 rounded-xl bg-dark-300 border border-dark-50/10 text-white font-bold text-sm min-w-[140px] text-center">
                  {MONTH_NAMES[month - 1]} {year}
                </span>
                <button onClick={nextMonth} disabled={isCurrentMonth}
                  className={`p-2 rounded-xl bg-dark-300 border border-dark-50/10 transition-all ${isCurrentMonth ? "text-gray-700 cursor-not-allowed" : "text-gray-400 hover:text-white hover:bg-dark-200"}`}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Integrity warnings ── */}
      {data?.warnings?.length ? (
        <div className="space-y-2">
          {data.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm text-amber-300">
              <AlertCircle size={15} className="shrink-0" />
              {w.message}
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Loading ── */}
      {loading && <LoadingSpinner label="Завантаження…" />}

      {!loading && !data && (
        <EmptyState title={`Немає даних за ${MONTH_NAMES[month - 1].toLowerCase()} ${year}`} />
      )}

      {!loading && data && (<>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 stagger-enter">

          {/* Total */}
          <button onClick={() => setDrillModal("total")}
            className="card-neo kpi-3d-hover card-tap p-4 lg:p-5 border border-emerald-500/15 text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/10"><BadgeDollarSign size={18} className="text-emerald-400" /></div>
              <span className={`text-xs font-bold ${pctColor(data.mom_pct)}`}>{pctLabel(data.mom_pct)}</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Загальний дохід</p>
            <p className="text-lg lg:text-2xl font-bold text-emerald-400 tabular-nums">{fmt(data.total)} <span className="text-sm font-normal">₴</span></p>
            <p className="text-xs text-gray-600 mt-1">попередній: {fmt(data.prev_total)} ₴</p>
          </button>

          {/* NHSU */}
          <button onClick={() => setDrillModal("nhsu")}
            className="card-neo kpi-3d-hover card-tap p-4 lg:p-5 border border-indigo-500/15 text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-indigo-500/10"><HeartPulse size={18} className="text-indigo-400" /></div>
              <span className="text-xs font-medium text-gray-500">{data.nhsu_pct}%</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">НСЗУ (грязний)</p>
            <p className="text-lg lg:text-2xl font-bold text-indigo-400 tabular-nums">{fmt(data.nhsu)} <span className="text-sm font-normal">₴</span></p>
            <p className="text-xs text-gray-600 mt-1">попередній: {fmt(data.prev_nhsu)} ₴</p>
          </button>

          {/* Paid services */}
          <button onClick={() => setDrillModal("paid")}
            className="card-neo kpi-3d-hover card-tap p-4 lg:p-5 border border-teal-500/15 text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-teal-500/10"><MedFlowLogo size={18} className="text-teal-400" /></div>
              <span className="text-xs font-medium text-gray-500">{data.paid_pct}%</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Платні послуги</p>
            <p className="text-lg lg:text-2xl font-bold text-teal-400 tabular-nums">{fmt(data.paid_services)} <span className="text-sm font-normal">₴</span></p>
            <p className="text-xs text-gray-600 mt-1">попередній: {fmt(data.prev_paid)} ₴</p>
          </button>

          {/* Avg per doctor */}
          <button onClick={() => setDrillModal("doctors")}
            className="card-neo kpi-3d-hover card-tap p-4 lg:p-5 border border-violet-500/15 text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-violet-500/10"><Users size={18} className="text-violet-400" /></div>
              <TrendingUp size={14} className="text-violet-400" />
            </div>
            <p className="text-xs text-gray-500 mb-1">Серед. на лікаря</p>
            <p className="text-lg lg:text-2xl font-bold text-violet-400 tabular-nums">{fmt(data.avg_per_doctor)} <span className="text-sm font-normal">₴</span></p>
            <p className="text-xs text-gray-600 mt-1">{data.by_doctor.length} лікар(ів)</p>
          </button>
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Line chart — monthly trend */}
          <div className="xl:col-span-2 card-neo card-3d-hover p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Динаміка доходів по місяцях</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="month_name" tick={{ fill: "#6b7280", fontSize: 10 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [`${fmt2(v)} ₴`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="nhsu"          name="НСЗУ"       stroke="#818cf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="paid_services" name="Платні"      stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total"         name="Загальний"   stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart — structure */}
          <div className="card-neo card-3d-hover p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Структура доходу</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "#4b5563" }}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={(v: number) => [`${fmt2(v)} ₴`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">Немає даних</div>
            )}
          </div>
        </div>

        {/* ── By doctor bar chart ── */}
        {data.by_doctor.length > 0 && (
          <div className="card-neo card-3d-hover p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Доходи по лікарях</h3>
            <ResponsiveContainer width="100%" height={Math.max(160, data.by_doctor.length * 44)}>
              <BarChart
                data={data.by_doctor.map(d => ({
                  name: d.doctor_name.split(" ").slice(0, 2).join(" "),
                  НСЗУ: d.nhsu,
                  Платні: d.paid_services,
                }))}
                layout="vertical"
                margin={{ left: 20, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} width={130} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [`${fmt2(v)} ₴`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="НСЗУ"   fill="#818cf8" radius={[0,4,4,0]} stackId="a" />
                <Bar dataKey="Платні" fill="#34d399" radius={[0,4,4,0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Top services + Doctor table ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top services */}
          {data.top_services.length > 0 && (
            <button onClick={() => setDrillModal("services")} className="card-neo card-3d-hover p-5 text-left">
              <h3 className="text-sm font-semibold text-white mb-3">ТОП послуг за доходом</h3>
              <div className="space-y-2">
                {data.top_services.slice(0, 5).map((s, i) => (
                  <div key={s.service_id} className="flex items-center gap-3 text-xs">
                    <span className="text-gray-600 w-4">{i + 1}.</span>
                    <span className="font-mono text-accent-400 w-10 shrink-0">{s.code}</span>
                    <span className="text-gray-300 flex-1 truncate">{s.name}</span>
                    <span className="text-teal-400 font-medium tabular-nums">{fmt(s.revenue)} ₴</span>
                  </div>
                ))}
                {data.top_services.length > 5 && (
                  <p className="text-xs text-gray-600 pt-1">+ ще {data.top_services.length - 5} послуг</p>
                )}
              </div>
            </button>
          )}

          {/* Doctor table */}
          {data.by_doctor.length > 0 && (
            <div className="card-neo card-3d-hover p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Деталізація по лікарях</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-dark-50/10">
                      <th className="text-left py-2 text-gray-500">Лікар</th>
                      <th className="text-right py-2 text-gray-500">НСЗУ</th>
                      <th className="text-right py-2 text-gray-500">Платні</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Всього</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_doctor.map(d => (
                      <tr key={d.doctor_id} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
                        <td className="py-2 text-gray-300 truncate max-w-[120px]">{d.doctor_name}</td>
                        <td className="py-2 text-right text-indigo-400 tabular-nums">{fmt(d.nhsu)}</td>
                        <td className="py-2 text-right text-teal-400 tabular-nums">{fmt(d.paid_services)}</td>
                        <td className="py-2 text-right text-white font-semibold tabular-nums">{fmt(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── AI Recommendations ── */}
        {data.recommendations.length > 0 && (
          <div className="card-neo card-3d-hover p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-400" />
              Рекомендації системи
            </h3>
            <div className="space-y-3 stagger-enter">
              {data.recommendations.map((rec, i) => {
                const cfg = REC_CONFIG[rec.type] ?? REC_CONFIG.insight;
                const Icon = cfg.icon;
                return (
                  <div key={i} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-start gap-3">
                      <Icon size={16} className={`${cfg.color} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>
                            {REC_LABEL[rec.type] ?? rec.type}
                          </span>
                          <span className="text-sm font-semibold text-white">{rec.title}</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{rec.description}</p>
                        <p className="text-xs text-gray-600 mt-2 italic">Дані: {rec.data_basis}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </>)}

      {/* ═══════ DRILL-DOWN MODALS ═══════ */}

      {/* Total income detail */}
      {drillModal === "total" && data && (
        <DetailModal title={`Загальний грязний дохід — ${data.period_label}`} onClose={() => setDrillModal(null)}>
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Формула: Загальний дохід = НСЗУ (грязний) + Платні послуги (грязний)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Загальний", value: data.total, color: "text-emerald-400" },
                { label: "НСЗУ", value: data.nhsu, color: "text-indigo-400" },
                { label: "Платні", value: data.paid_services, color: "text-teal-400" },
              ].map(k => (
                <div key={k.label} className="tile-neo p-3">
                  <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                  <p className={`text-base font-bold font-mono ${k.color}`}>{fmt2(k.value)} ₴</p>
                </div>
              ))}
            </div>
            <DrillTable
              headers={["Лікар", "НСЗУ", "Платні", "Всього"]}
              rows={data.by_doctor.map(d => [d.doctor_name, fmt2(d.nhsu), fmt2(d.paid_services), fmt2(d.total)])}
            />
          </div>
        </DetailModal>
      )}

      {/* NHSU detail */}
      {drillModal === "nhsu" && data && (
        <DetailModal title={`Дохід НСЗУ — ${data.period_label}`} onClose={() => setDrillModal(null)}>
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Джерело: модуль НСЗУ → капітаційні надходження per-лікар</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="tile-neo p-3">
                <p className="text-xs text-gray-500 mb-1">Поточний місяць</p>
                <p className="text-xl font-bold text-indigo-400 font-mono">{fmt2(data.nhsu)} ₴</p>
              </div>
              <div className="tile-neo p-3">
                <p className="text-xs text-gray-500 mb-1">MoM зміна</p>
                <p className={`text-xl font-bold font-mono ${pctColor(data.nhsu - data.prev_nhsu)}`}>
                  {data.prev_nhsu > 0 ? pctLabel((data.nhsu - data.prev_nhsu) / data.prev_nhsu * 100) : "—"}
                </p>
              </div>
            </div>
            <DrillTable
              headers={["Лікар", "НСЗУ"]}
              rows={data.by_doctor.filter(d => d.nhsu > 0).map(d => [d.doctor_name, fmt2(d.nhsu)])}
            />
          </div>
        </DetailModal>
      )}

      {/* Paid services detail */}
      {drillModal === "paid" && data && (
        <DetailModal title={`Платні послуги — ${data.period_label}`} onClose={() => setDrillModal(null)}>
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Джерело: модуль «Платні послуги» → сума (кількість × ціна) по всіх звітах місяця</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="tile-neo p-3">
                <p className="text-xs text-gray-500 mb-1">Поточний місяць</p>
                <p className="text-xl font-bold text-teal-400 font-mono">{fmt2(data.paid_services)} ₴</p>
              </div>
              <div className="tile-neo p-3">
                <p className="text-xs text-gray-500 mb-1">Частка загального доходу</p>
                <p className="text-xl font-bold text-teal-400 font-mono">{data.paid_pct}%</p>
              </div>
            </div>
            {data.top_services.length > 0 && (
              <DrillTable
                headers={["Код", "Послуга", "К-ть", "Дохід"]}
                rows={data.top_services.map(s => [s.code, s.name, String(s.quantity), fmt2(s.revenue)])}
              />
            )}
          </div>
        </DetailModal>
      )}

      {/* Doctors detail */}
      {drillModal === "doctors" && data && (
        <DetailModal title={`Деталізація по лікарях — ${data.period_label}`} onClose={() => setDrillModal(null)}>
          <DrillTable
            headers={["Лікар", "НСЗУ", "Платні", "Всього", "Частка %"]}
            rows={data.by_doctor.map(d => [
              d.doctor_name,
              fmt2(d.nhsu),
              fmt2(d.paid_services),
              fmt2(d.total),
              data.total > 0 ? `${(d.total / data.total * 100).toFixed(1)}%` : "—",
            ])}
          />
        </DetailModal>
      )}

      {/* Services detail */}
      {drillModal === "services" && data && (
        <DetailModal title={`Деталізація платних послуг — ${data.period_label}`} onClose={() => setDrillModal(null)}>
          <DrillTable
            headers={["Код", "Назва", "К-ть", "Дохід", "Частка %"]}
            rows={data.top_services.map(s => [
              s.code,
              s.name,
              String(s.quantity),
              fmt2(s.revenue),
              data.paid_services > 0 ? `${(s.revenue / data.paid_services * 100).toFixed(1)}%` : "—",
            ])}
          />
        </DetailModal>
      )}
    </div>
  );
}

// ─── Drill Table helper ────────────────────────────────────────────
function DrillTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-dark-50/10">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-dark-300/50 border-b border-dark-50/10">
            {headers.map(h => (
              <th key={h} scope="col" className="text-left px-3 py-2.5 text-gray-500 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-gray-600">Немає даних</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-gray-300 max-w-[200px] truncate">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
