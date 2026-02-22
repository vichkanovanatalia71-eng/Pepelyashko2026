import { Users, AlertTriangle, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DashboardReport } from "../../types";
import { fmtUAH } from "../../lib/utils";

const TT_STYLE = {
  backgroundColor: "transparent",
  border: "1px solid #ffffff15",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
  padding: "8px",
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

      {/* Stacked bar chart with legend */}
      <div className="mb-4">
        <div className="grid grid-cols-4 gap-2 text-xs mb-3 p-2 bg-dark-400/20 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-400"></div>
            <span className="text-gray-300">Нетто</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-400"></div>
            <span className="text-gray-300">ПДФО 18%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-400"></div>
            <span className="text-gray-300">ВЗ 5%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-400"></div>
            <span className="text-gray-300">ЄСВ роб. 22%</span>
          </div>
        </div>
      </div>

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
            labelStyle={{ color: "#e2e8f0" }}
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
            <div key={role.role} className="p-3 bg-dark-400/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{role.role_label}</p>
                  <p className="text-xs text-gray-500">{role.count} осіб</p>
                </div>
                <p className="text-sm font-bold text-emerald-400">
                  {fmtUAH(role.salary_brutto_total)} ₴
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Нетто</p>
                  <p className="text-gray-300">{fmtUAH(role.salary_netto_total)} ₴</p>
                </div>
                <div>
                  <p className="text-gray-500">ПДФО</p>
                  <p className="text-amber-300">{fmtUAH(role.pdfo_total)} ₴</p>
                </div>
                <div>
                  <p className="text-gray-500">ВЗ</p>
                  <p className="text-red-300">{fmtUAH(role.vz_total)} ₴</p>
                </div>
                <div>
                  <p className="text-gray-500">ЄСВ роб.</p>
                  <p className="text-blue-300">{fmtUAH(role.esv_employer_total)} ₴</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
