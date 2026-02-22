import { Pill, TrendingUp } from "lucide-react";
import type { DashboardReport } from "../../types";
import { fmtUAH } from "../../lib/utils";

interface PaidServicesBlockProps {
  data: DashboardReport;
}

export function PaidServicesBlock({ data }: PaidServicesBlockProps) {
  if (data.top_paid_services.length === 0) {
    return (
      <div className="card-neo p-5">
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

  // Calculate total revenue for the top 5
  const totalRevenue = data.top_paid_services.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <div className="card-neo p-5 stagger-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-dark-400/20 rounded-lg">
        <div>
          <p className="text-xs text-gray-500">Загальна виручка</p>
          <p className="text-sm font-bold text-emerald-400">
            {fmtUAH(totalRevenue)}
            {" "}грн
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Загальна маржа</p>
          <p className="text-sm font-bold text-blue-400">
            {data.services_margin_pct}%
            {" "}
            <span className="text-xs text-gray-500">
              ({fmtUAH(data.services_total_margin)} ₴)
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Послуг наданих</p>
          <p className="text-sm font-bold text-cyan-400">
            {data.top_paid_services.reduce((sum, s) => sum + s.quantity, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Середній чек</p>
          <p className="text-sm font-bold text-purple-400">
            {fmtUAH(totalRevenue / data.top_paid_services.reduce((sum, s) => sum + s.quantity, 1))}
            {" "}грн
          </p>
        </div>
      </div>

      {/* Services table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-dark-50/20">
            <tr>
              <th className="text-left py-2 px-2 text-gray-500 font-medium">Послуга</th>
              <th className="text-right py-2 px-2 text-gray-500 font-medium">Код</th>
              <th className="text-right py-2 px-2 text-gray-500 font-medium">Кільк.</th>
              <th className="text-right py-2 px-2 text-gray-500 font-medium">Виручка</th>
              <th className="text-right py-2 px-2 text-gray-500 font-medium">Матер.</th>
              <th className="text-right py-2 px-2 text-gray-500 font-medium">Маржа</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-50/10">
            {data.top_paid_services.map((service, idx) => (
              <tr key={idx} className="hover:bg-dark-400/20 transition-colors">
                <td className="py-2.5 px-2">
                  <p className="text-white font-medium truncate">{service.name}</p>
                  {service.by_doctor.length > 0 && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      {service.by_doctor.map((d) => d.doctor_name).join(", ")}
                    </p>
                  )}
                </td>
                <td className="text-right py-2.5 px-2 text-gray-500">{service.code}</td>
                <td className="text-right py-2.5 px-2 text-gray-300">{service.quantity}</td>
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
                    <span className={service.margin_pct > 50 ? "text-emerald-400 font-semibold" : "text-yellow-400"}>
                      {service.margin_pct}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Doctor breakdown (if needed) */}
      {data.top_paid_services[0]?.by_doctor.length > 0 && (
        <div className="mt-4 pt-4 border-t border-dark-50/10">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">
            Розподіл послуг по лікарям
          </h4>
          <div className="space-y-1">
            {Array.from(
              new Map(
                data.top_paid_services
                  .flatMap((s) => s.by_doctor)
                  .map((d) => [d.doctor_id, d])
              ).values()
            ).map((doctor) => (
              <div
                key={doctor.doctor_id}
                className="flex items-center justify-between p-2 bg-dark-400/20 rounded-lg"
              >
                <p className="text-sm text-white">{doctor.doctor_name}</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-gray-500">
                    {doctor.quantity} послуг
                  </span>
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
