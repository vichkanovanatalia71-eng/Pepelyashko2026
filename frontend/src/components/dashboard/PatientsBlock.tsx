import { Users, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { DashboardReport } from "../../types";

const DECL_LIMIT = 1800;

const TT_STYLE: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  fontSize: 12,
  color: "#e2e8f0",
  padding: "8px 12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};

/* Truncate long names for chart axis labels */
const truncName = (name: string, max = 18) =>
  name.length > max ? name.slice(0, max) + "…" : name;

interface PatientsBlockProps {
  data: DashboardReport;
}

export function PatientsBlock({ data }: PatientsBlockProps) {
  if (data.total_patients === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3 card-neo card-3d-hover p-5">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Users size={16} className="text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Пацієнти</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
            Немає даних про пацієнтів
          </div>
        </div>
      </div>
    );
  }

  const hasOverlimit = data.patients_by_doctor.some(
    (d) => d.patient_count > DECL_LIMIT,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 stagger-enter">
      {/* ── Left: Age distribution (70 %) ─────────────────────── */}
      <div className="lg:col-span-7 card-neo card-3d-hover p-5">
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-white">
              Розподіл пацієнтів
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">По вікових групах</p>
          </div>
        </div>

        {data.patients_by_age.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.patients_by_age}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="age_label"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={TT_STYLE}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(v: number) => [`${v} пац.`, "Кількість"]}
              />
              <Bar
                dataKey="patient_count"
                fill="#34d399"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-gray-600 text-sm">
            Немає даних
          </div>
        )}

        {/* KPI row */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
          <div className="text-center">
            <p className="text-[11px] text-gray-500 mb-1">Всього</p>
            <p className="text-base font-bold text-white">
              {data.total_patients.toLocaleString("uk-UA")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-500 mb-1">Неверифіковано</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-base font-bold text-orange-400">
                {data.total_non_verified_pct}%
              </p>
              {data.total_non_verified_pct > 10 && (
                <AlertCircle size={13} className="text-orange-400" />
              )}
            </div>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-500 mb-1">Динаміка</p>
            <div className="flex items-center justify-center gap-1">
              {data.total_patients_change_pct > 0 ? (
                <>
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-base font-bold text-emerald-400">
                    +{data.total_patients_change_pct}%
                  </span>
                </>
              ) : data.total_patients_change_pct < 0 ? (
                <>
                  <TrendingDown size={14} className="text-red-400" />
                  <span className="text-base font-bold text-red-400">
                    {data.total_patients_change_pct}%
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">0%</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Doctor workload (30 %) ─────────────────────── */}
      <div className="lg:col-span-3 card-neo card-3d-hover p-5 flex flex-col">
        <div className="flex items-center justify-center mb-3">
          <div className="text-center">
            <h3 className="text-sm font-semibold text-white">
              Завантаженість лікарів
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">Декларації</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            <span className="text-gray-400">Норма</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 bar-overlimit-pulse" />
            <span className="text-gray-400">&gt; {DECL_LIMIT}</span>
          </span>
        </div>

        {data.patients_by_doctor.length > 0 ? (
          <ResponsiveContainer
            width="100%"
            height={Math.max(220, data.patients_by_doctor.slice(0, 10).length * 36)}
          >
            <BarChart
              data={data.patients_by_doctor.slice(0, 10).map((d) => ({
                ...d,
                short_name: truncName(d.doctor_name),
              }))}
              layout="vertical"
              margin={{ left: 5, right: 45, top: 0, bottom: 0 }}
              barCategoryGap="18%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="short_name"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                width={110}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TT_STYLE}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(v: number) => [`${v} пац.`, "Декларації"]}
                labelFormatter={(_label: string, payload: any[]) =>
                  payload?.[0]?.payload?.doctor_name ?? _label
                }
              />
              <ReferenceLine
                x={DECL_LIMIT}
                stroke="#ef4444"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: `${DECL_LIMIT}`,
                  position: "top",
                  fill: "#ef4444",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              <Bar
                dataKey="patient_count"
                name="Пацієнти"
                radius={[0, 6, 6, 0]}
                maxBarSize={22}
              >
                {data.patients_by_doctor.slice(0, 10).map((doc, i) => {
                  const over = doc.patient_count > DECL_LIMIT;
                  return (
                    <Cell
                      key={`dc-${i}`}
                      fill={over ? "#ef4444" : "#34d399"}
                      className={over ? "bar-overlimit-pulse" : ""}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
            Немає даних про лікарів
          </div>
        )}

        {data.patients_by_doctor.length > 10 && (
          <p className="text-[11px] text-gray-600 mt-2">
            + ще {data.patients_by_doctor.length - 10} лікарів
          </p>
        )}

        {/* Bottom KPI */}
        {data.patients_by_doctor.length > 0 && (
          <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Сер. дохід/пац.</p>
              <p className="text-sm font-semibold text-emerald-400">
                {data.total_patients > 0
                  ? Math.round(data.nhsu_income / data.total_patients).toLocaleString("uk-UA")
                  : "0"}{" "}
                грн
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Макс. навант.</p>
              <p
                className={`text-sm font-semibold truncate ${
                  hasOverlimit ? "text-red-400" : "text-blue-400"
                }`}
              >
                {data.patients_by_doctor.reduce((m, d) =>
                  d.patient_count > m.patient_count ? d : m,
                )?.doctor_name || "—"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
