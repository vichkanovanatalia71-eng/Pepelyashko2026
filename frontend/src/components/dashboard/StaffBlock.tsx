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

const TT_STYLE: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  fontSize: 12,
  color: "#e2e8f0",
  padding: "8px 12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};

interface StaffBlockProps {
  data: DashboardReport;
}

export function StaffBlock({ data }: StaffBlockProps) {
  if (data.staff_by_role.length === 0) {
    return (
      <div className="card-neo card-3d-hover p-5">
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

  const chartData = data.staff_by_role.map((role) => ({
    name: role.role_label,
    "Брутто": role.salary_brutto_total,
    "ЄСВ 22%": role.esv_employer_total,
    "Доплати": role.individual_bonus_total + role.supplement_total,
  }));

  const fopStatus =
    data.fop_pct < 40 ? "ok" : data.fop_pct < 55 ? "warn" : "crit";

  const statusCfg = {
    ok:   { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Нормально", Icon: CheckCircle },
    warn: { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "Увага",      Icon: AlertTriangle },
    crit: { bg: "bg-red-500/10",     text: "text-red-400",     label: "Критично",   Icon: AlertTriangle },
  }[fopStatus];

  const totalStaff = data.staff_by_role.reduce((s, r) => s + r.count, 0);

  return (
    <div className="card-neo card-3d-hover p-5 stagger-enter">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <Users size={16} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Працівники & ФОП
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Розбивка витрат на персонал
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-[11px] text-gray-500 mb-1">Працівників</p>
          <p className="text-lg font-bold text-white">{totalStaff}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-[11px] text-gray-500 mb-1">Загальний ФОП</p>
          <p className="text-lg font-bold text-white">{fmtUAH(data.fop_total)}</p>
          <p className="text-[10px] text-gray-600">грн</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-[11px] text-gray-500 mb-1">% від доходу</p>
          <p className={`text-lg font-bold ${statusCfg.text}`}>
            {data.fop_pct.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center justify-center">
          <div className={`p-1.5 rounded-full ${statusCfg.bg} mb-1`}>
            <statusCfg.Icon size={16} className={statusCfg.text} />
          </div>
          <p className={`text-[11px] font-semibold ${statusCfg.text}`}>
            {statusCfg.label}
          </p>
        </div>
      </div>

      {/* ── Chart + Legend ───────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-3 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400" />
          <span className="text-gray-400">Брутто</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400" />
          <span className="text-gray-400">ЄСВ 22%</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-400" />
          <span className="text-gray-400">Доплати</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={60}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            contentStyle={TT_STYLE}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            formatter={(v: number, name: string) => [`${fmtUAH(v)} ₴`, name]}
          />
          <Bar
            dataKey="Брутто"
            stackId="cost"
            fill="#34d399"
            radius={[0, 0, 0, 0]}
            maxBarSize={52}
          />
          <Bar
            dataKey="ЄСВ 22%"
            stackId="cost"
            fill="#60a5fa"
            radius={[0, 0, 0, 0]}
            maxBarSize={52}
          />
          <Bar
            dataKey="Доплати"
            stackId="cost"
            fill="#f97316"
            radius={[6, 6, 0, 0]}
            maxBarSize={52}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="mt-5 border-t border-white/5 pt-4">
        <h4 className="text-xs font-semibold text-gray-400 mb-3">
          Розбивка по ролях
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                  Роль
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium">
                  К-сть
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium">
                  Брутто
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium">
                  ЄСВ 22%
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium">
                  Доплати
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium">
                  Доп. до суми
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium">
                  <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">
                    Витрати
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.staff_by_role.map((role, i) => (
                <tr
                  key={role.role}
                  className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${
                    i % 2 === 0 ? "bg-white/[0.01]" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 text-white font-medium">
                    {role.role_label}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-300">
                    {role.count}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                    {fmtUAH(role.salary_brutto_total)} ₴
                  </td>
                  <td className="py-2.5 px-3 text-right text-blue-400 font-medium">
                    {fmtUAH(role.esv_employer_total)} ₴
                  </td>
                  <td className="py-2.5 px-3 text-right text-purple-400 font-medium">
                    {fmtUAH(role.individual_bonus_total)} ₴
                  </td>
                  <td className="py-2.5 px-3 text-right text-cyan-400 font-medium">
                    {fmtUAH(role.supplement_total)} ₴
                  </td>
                  <td className="py-2.5 px-3 text-right text-orange-400 font-bold">
                    {fmtUAH(role.total_employer_cost)} ₴
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10">
                <td className="py-2.5 px-3 text-white font-bold">Разом</td>
                <td className="py-2.5 px-3 text-right text-white font-bold">
                  {totalStaff}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                  {fmtUAH(
                    data.staff_by_role.reduce(
                      (s, r) => s + r.salary_brutto_total,
                      0,
                    ),
                  )}{" "}
                  ₴
                </td>
                <td className="py-2.5 px-3 text-right text-blue-400 font-bold">
                  {fmtUAH(
                    data.staff_by_role.reduce(
                      (s, r) => s + r.esv_employer_total,
                      0,
                    ),
                  )}{" "}
                  ₴
                </td>
                <td className="py-2.5 px-3 text-right text-purple-400 font-bold">
                  {fmtUAH(
                    data.staff_by_role.reduce(
                      (s, r) => s + r.individual_bonus_total,
                      0,
                    ),
                  )}{" "}
                  ₴
                </td>
                <td className="py-2.5 px-3 text-right text-cyan-400 font-bold">
                  {fmtUAH(
                    data.staff_by_role.reduce(
                      (s, r) => s + r.supplement_total,
                      0,
                    ),
                  )}{" "}
                  ₴
                </td>
                <td className="py-2.5 px-3 text-right text-orange-400 font-bold">
                  {fmtUAH(
                    data.staff_by_role.reduce(
                      (s, r) => s + r.total_employer_cost,
                      0,
                    ),
                  )}{" "}
                  ₴
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
