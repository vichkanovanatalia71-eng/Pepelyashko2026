import { Pill, TrendingUp } from "lucide-react";
import type { DashboardReport } from "../../types";
import { fmtUAH } from "../../lib/utils";

interface PaidServicesBlockProps {
  data: DashboardReport;
}

export function PaidServicesBlock({ data }: PaidServicesBlockProps) {
  if (data.top_paid_services.length === 0) {
    return (
      <div className="card-neo card-3d-hover p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Pill size={16} className="text-cyan-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Платні послуги</h3>
        </div>
        <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
          Немає даних про платні послуги
        </div>
      </div>
    );
  }

  const totalRevenue = data.paid_services_total_revenue;
  const totalQty = data.paid_services_total_qty;
  const avgCheck = totalQty > 0 ? totalRevenue / totalQty : 0;

  return (
    <div className="card-neo card-3d-hover p-5 stagger-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Pill size={16} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Платні послуги</h3>
            <p className="text-xs text-gray-600 mt-0.5">ТОП-5 за виручкою</p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-[11px] text-gray-500 mb-1">Загальна виручка</p>
          <p className="text-lg font-bold text-emerald-400">
            {fmtUAH(totalRevenue)}
          </p>
          <p className="text-[10px] text-gray-600">грн</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-[11px] text-gray-500 mb-1">Послуг наданих</p>
          <p className="text-lg font-bold text-cyan-400">{totalQty}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-[11px] text-gray-500 mb-1">Загальна маржа</p>
          <p className="text-lg font-bold text-blue-400">
            {data.services_margin_pct}%
          </p>
          <p className="text-[10px] text-gray-600">
            {fmtUAH(data.services_total_margin)} ₴
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-[11px] text-gray-500 mb-1">Середній чек</p>
          <p className="text-lg font-bold text-purple-400">
            {fmtUAH(avgCheck)}
          </p>
          <p className="text-[10px] text-gray-600">грн</p>
        </div>
      </div>

      {/* Services table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[520px]">
          <thead>
            <tr className="border-b border-dark-50/10 bg-dark-300/50">
              <th className="text-left py-2.5 px-3 text-gray-400 font-medium whitespace-nowrap">Послуга</th>
              <th className="text-right py-2.5 px-3 text-gray-400 font-medium whitespace-nowrap">Код</th>
              <th className="text-right py-2.5 px-3 text-gray-400 font-medium whitespace-nowrap">К-сть</th>
              <th className="text-right py-2.5 px-3 text-gray-400 font-medium whitespace-nowrap">Виручка</th>
              <th className="text-right py-2.5 px-3 text-gray-400 font-medium whitespace-nowrap">Матер.</th>
              <th className="text-right py-2.5 px-3 text-gray-400 font-medium whitespace-nowrap">Маржа</th>
            </tr>
          </thead>
          <tbody>
            {data.top_paid_services.map((service, idx) => (
              <tr
                key={idx}
                className="border-b border-dark-50/5 hover:bg-dark-300/30 transition-colors"
              >
                <td className="py-2.5 px-2">
                  <p className="text-white font-medium truncate max-w-[200px]">
                    {service.name}
                  </p>
                </td>
                <td className="text-right py-2.5 px-2 text-gray-500">
                  {service.code}
                </td>
                <td className="text-right py-2.5 px-2 text-gray-300">
                  {service.quantity}
                </td>
                <td className="text-right py-2.5 px-2 text-emerald-400 font-semibold">
                  {fmtUAH(service.revenue)} ₴
                </td>
                <td className="text-right py-2.5 px-2 text-orange-400">
                  {fmtUAH(service.materials_cost)} ₴
                </td>
                <td className="text-right py-2.5 px-2">
                  <div className="flex items-center justify-end gap-1">
                    {service.margin_pct > 0 && (
                      <TrendingUp size={12} className="text-emerald-400" />
                    )}
                    <span
                      className={
                        service.margin_pct > 50
                          ? "text-emerald-400 font-semibold"
                          : "text-yellow-400"
                      }
                    >
                      {service.margin_pct}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Doctor breakdown */}
      {data.top_paid_services[0]?.by_doctor.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/5">
          <h4 className="text-xs font-semibold text-gray-400 mb-3">
            Розподіл по лікарям
          </h4>
          <div className="space-y-1.5">
            {Array.from(
              new Map(
                data.top_paid_services
                  .flatMap((s) => s.by_doctor)
                  .map((d) => [d.doctor_id, d]),
              ).values(),
            ).map((doctor) => (
              <div
                key={doctor.doctor_id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5"
              >
                <p className="text-sm text-white">{doctor.doctor_name}</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-gray-500">{doctor.quantity} послуг</span>
                  <span className="text-emerald-400 font-semibold">
                    {fmtUAH(doctor.revenue)} ₴
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
