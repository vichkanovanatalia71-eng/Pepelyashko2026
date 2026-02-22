import { Users, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DashboardReport } from "../../types";

const TT_STYLE = {
  background: "#1a1a2e",
  border: "1px solid #ffffff15",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

interface PatientsBlockProps {
  data: DashboardReport;
}

export function PatientsBlock({ data }: PatientsBlockProps) {
  if (data.total_patients === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3 card-neo p-5">
          <div className="flex items-center gap-3 mb-4">
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-enter">
      {/* Left: Age distribution bar chart */}
      <div className="lg:col-span-1 card-neo p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Users size={16} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Розподіл пацієнтів</h3>
            <p className="text-xs text-gray-600 mt-0.5">По вікових групах</p>
          </div>
        </div>

        {data.patients_by_age.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={data.patients_by_age}
              layout="vertical"
              margin={{ left: 70, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis type="category" dataKey="age_label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                contentStyle={TT_STYLE}
                formatter={(v: number) => `${v} пац.`}
              />
              <Bar dataKey="patient_count" fill="#34d399" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-gray-600 text-sm">
            Немає даних
          </div>
        )}

        {/* KPI Summary below pie */}
        <div className="mt-6 space-y-2 border-t border-dark-50/10 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Всього:</span>
            <span className="text-sm font-semibold text-white">{data.total_patients}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Неверифіковано:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-orange-400">
                {data.total_non_verified} ({data.total_non_verified_pct}%)
              </span>
              {data.total_non_verified_pct > 10 && (
                <AlertCircle size={14} className="text-orange-400" />
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Динаміка:</span>
            <div className="flex items-center gap-1">
              {data.total_patients_change_pct > 0 ? (
                <>
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">
                    +{data.total_patients_change_pct}%
                  </span>
                </>
              ) : data.total_patients_change_pct < 0 ? (
                <>
                  <TrendingDown size={14} className="text-red-400" />
                  <span className="text-sm font-semibold text-red-400">
                    {data.total_patients_change_pct}%
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Без змін</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Doctor bars */}
      <div className="lg:col-span-2 card-neo p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Завантаженість лікарів</h3>
            <p className="text-xs text-gray-600 mt-0.5">Пацієнти та послуги</p>
          </div>
        </div>

        {data.patients_by_doctor.length > 0 ? (
          <ResponsiveContainer
            width="100%"
            height={Math.max(200, data.patients_by_doctor.length * 40)}
          >
            <BarChart
              data={data.patients_by_doctor.slice(0, 10).map((doc) => ({
                ...doc,
                // Include paid services in services_count
                total_services: (doc.services_count || 0) + (
                  data.top_paid_services
                    ?.flatMap(s => s.by_doctor)
                    ?.filter(d => d.doctor_id === doc.doctor_id)
                    ?.reduce((sum, d) => sum + d.quantity, 0) || 0
                ),
              }))}
              layout="vertical"
              margin={{ left: 100, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis type="category" dataKey="doctor_name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                contentStyle={TT_STYLE}
                formatter={(v: number, name: string) => {
                  if (name === "patient_count") return [`${v} пац.`, "Пацієнти"];
                  if (name === "total_services") return [`${v} послуг`, "Послуги (НСЗУ + платні)"];
                  return [v, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="patient_count" fill="#34d399" name="Пацієнти" />
              <Bar dataKey="total_services" fill="#60a5fa" name="Послуги (НСЗУ + платні)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
            Немає даних про лікарів
          </div>
        )}

        {data.patients_by_doctor.length > 10 && (
          <p className="text-xs text-gray-600 mt-2">
            + ще {data.patients_by_doctor.length - 10} лікарів
          </p>
        )}

        {/* Revenue per patient stats */}
        {data.patients_by_doctor.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dark-50/10 pt-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Середній дохід/пац.</p>
              <p className="text-sm font-semibold text-emerald-400">
                {(() => {
                  // Calculate total revenue from all doctors
                  const totalRevenue = data.patients_by_doctor.reduce(
                    (sum, doc) => sum + (doc.revenue_per_patient * doc.patient_count),
                    0
                  );
                  const avgPerPatient = data.total_patients > 0
                    ? Math.round(totalRevenue / data.total_patients)
                    : 0;
                  return avgPerPatient.toLocaleString("uk-UA", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  });
                })()}
                {" "}грн
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Макс. завантаженість</p>
              <p className="text-sm font-semibold text-blue-400">
                {data.patients_by_doctor.reduce((max, doc) =>
                  doc.patient_count > max.patient_count ? doc : max
                )?.doctor_name || "—"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
