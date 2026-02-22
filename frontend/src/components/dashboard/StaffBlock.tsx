import { Users, AlertTriangle, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardReport } from "../../types";
import { fmtUAH } from "../../lib/utils";

const TT_STYLE = {
  background: "#1a1a2e",
  border: "1px solid #ffffff15",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

interface StaffBlockProps {
  data: DashboardReport;
}

export function StaffBlock({ data }: StaffBlockProps) {
  if (data.staff_by_role.length === 0) {
    return (
      <div className="card-neo p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <Users size={16} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Працівники & ФОП</h3>
        </div>
        <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
          Немає даних про персонал
        </div>
      </div>
    );
  }

  // Prepare data for stacked bar chart
  const chartData = data.staff_by_role.map((role) => ({
    name: role.role_label,
    "Нетто": role.salary_netto_total,
    "ПДФО": role.pdfo_total,
    "ВЗ": role.vz_total,
    "ЄСВ роб.": role.esv_employer_total,
    total: role.salary_brutto_total,
  }));

  // Determine FOP status color
  const getFopStatusColor = () => {
    if (data.fop_pct < 40) return "text-emerald-400";
    if (data.fop_pct < 55) return "text-amber-400";
    return "text-red-400";
  };

  const getFopStatusLabel = () => {
    if (data.fop_pct < 40) return "Нормально";
    if (data.fop_pct < 55) return "Увага";
    return "Критично";
  };

  return (
    <div className="card-neo p-5 stagger-enter">
      {/* Header with KPI */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <Users size={16} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Працівники & ФОП</h3>
            <p className="text-xs text-gray-600 mt-0.5">Розбивка витрат на персонал</p>
          </div>
        </div>

        {/* FOP KPI Card */}
        <div className="flex items-center gap-4 ml-auto pl-4 border-l border-dark-50/20">
          <div>
            <p className="text-xs text-gray-500 mb-1">Загальний ФОП</p>
            <p className="text-lg font-bold text-white">
              {fmtUAH(data.fop_total)}
              <span className="text-xs text-gray-500 ml-1">грн</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {data.fop_pct.toFixed(1)}% від доходу
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex flex-col items-center">
            <div
              className={`p-2 rounded-full ${
                data.fop_pct < 40
                  ? "bg-emerald-500/10"
                  : data.fop_pct < 55
                    ? "bg-amber-500/10"
                    : "bg-red-500/10"
              }`}
            >
              {data.fop_pct < 40 ? (
                <CheckCircle size={20} className="text-emerald-400" />
              ) : data.fop_pct < 55 ? (
                <AlertTriangle size={20} className="text-amber-400" />
              ) : (
                <AlertTriangle size={20} className="text-red-400" />
              )}
            </div>
            <p className={`text-xs font-semibold mt-1 ${getFopStatusColor()}`}>
              {getFopStatusLabel()}
            </p>
          </div>
        </div>
      </div>

      {/* Stacked bar chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 100, right: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={TT_STYLE}
            formatter={(v: number) => [`${fmtUAH(v)} ₴`]}
          />
          <Bar dataKey="Нетто" stackId="a" fill="#34d399" />
          <Bar dataKey="ПДФО" stackId="a" fill="#fbbf24" />
          <Bar dataKey="ВЗ" stackId="a" fill="#f87171" />
          <Bar dataKey="ЄСВ роб." stackId="a" fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>

      {/* Staff breakdown table */}
      <div className="mt-6 border-t border-dark-50/10 pt-4">
        <h4 className="text-xs font-semibold text-gray-400 mb-3">Розбивка по ролях</h4>
        <div className="space-y-2">
          {data.staff_by_role.map((role) => (
            <div key={role.role} className="flex items-center justify-between p-2 bg-dark-400/20 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-white">{role.role_label}</p>
                <p className="text-xs text-gray-500">{role.count} осіб</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-400">
                  {fmtUAH(role.salary_brutto_total)}
                  {" "}грн
                </p>
                <p className="text-xs text-gray-500">{role.pct}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Owner info (if available) */}
      {data.owner_info && (
        <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <p className="text-xs font-semibold text-blue-400 mb-2">Власник ФОП</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">ім'я:</span>
              <span className="text-white">{data.owner_info.doctor_name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">НСЗУ дохід:</span>
              <span className="text-emerald-400">{fmtUAH(data.owner_info.nhsu_income)} ₴</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Платні послуги:</span>
              <span className="text-blue-400">{fmtUAH(data.owner_info.paid_services_income)} ₴</span>
            </div>
            <div className="flex justify-between text-xs border-t border-blue-500/20 pt-1 mt-1">
              <span className="text-gray-500">Податки:</span>
              <span className="text-amber-400">{fmtUAH(data.owner_info.total_taxes)} ₴</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
