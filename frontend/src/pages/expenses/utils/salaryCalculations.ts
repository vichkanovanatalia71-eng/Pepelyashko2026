import type { MonthlyExpenseData, SalaryExpenseRow } from "../../../types";
import type { SalaryFormState } from "../types";

export function initSalaryForm(row: SalaryExpenseRow): SalaryFormState {
  return {
    brutto: row.brutto > 0 ? String(row.brutto) : "",
    has_supplement: row.has_supplement,
    target_net: row.target_net != null ? String(row.target_net) : "",
    individual_bonus: row.individual_bonus > 0 ? String(row.individual_bonus) : "",
    paid_services_from_module: row.paid_services_from_module,
    saving: false,
  };
}

export function calcSalary(
  form: SalaryFormState,
  settings: MonthlyExpenseData["settings"] | undefined,
) {
  if (!settings) return { pdfo: 0, vz_zp: 0, esv: 0, netto: 0, supplement: 0, total_employer: 0 };

  const brutto = parseFloat(form.brutto) || 0;
  const pdfo = Math.round((brutto * settings.pdfo_rate) / 100 * 100) / 100;
  const vz_zp = Math.round((brutto * settings.vz_zp_rate) / 100 * 100) / 100;
  const esv = Math.round((brutto * settings.esv_employer_rate) / 100 * 100) / 100;
  const netto = Math.round((brutto - pdfo - vz_zp) * 100) / 100;
  const targetNet = form.has_supplement && form.target_net ? parseFloat(form.target_net) : null;
  const supplement = targetNet != null ? Math.max(0, Math.round((targetNet - netto) * 100) / 100) : 0;
  const indBonus = parseFloat(form.individual_bonus) || 0;
  const total_employer = Math.round((brutto + esv + supplement + indBonus) * 100) / 100;

  return { pdfo, vz_zp, esv, netto, supplement, total_employer };
}

export function calcOwnerSalary(
  data: MonthlyExpenseData | null,
  selectedHiredDoctorId: number | null,
  selectedHiredNurseId: number | null,
) {
  const owner = data?.owner;
  if (!owner) return { ownDeclarations: 0, hiredDeclarations: 0, paidServices: 0, total: 0 };

  const ownDeclarations = Math.max(
    0,
    Math.round(((owner.nhsu_brutto / 2) - (owner.ep_all + owner.vz_all + owner.esv_owner)) * 0.9 * 100) / 100,
  );

  let hiredDeclarations = 0;
  if (selectedHiredDoctorId !== null && selectedHiredNurseId !== null) {
    const hd = owner.hired_doctors.find(d => d.doctor_id === selectedHiredDoctorId);
    const nurseRow = data?.salary.find(s => s.staff_member_id === selectedHiredNurseId);
    if (hd && nurseRow) {
      hiredDeclarations = Math.max(
        0,
        Math.round(
          (hd.nhsu_brutto
            - hd.staff_total_employer_cost
            - nurseRow.total_employer_cost) / 2 * 0.9 * 100,
        ) / 100,
      );
    }
  }

  const paidServices = owner.paid_services_income;
  const total = Math.round((ownDeclarations + hiredDeclarations + paidServices) * 100) / 100;

  return { ownDeclarations, hiredDeclarations, paidServices, total };
}

export function isSalaryDirty(
  staffId: number,
  row: SalaryExpenseRow,
  salaryForms: Record<number, SalaryFormState>,
): boolean {
  const f = salaryForms[staffId];
  if (!f) return false;
  return (
    (parseFloat(f.brutto) || 0) !== row.brutto ||
    f.has_supplement !== row.has_supplement ||
    (parseFloat(f.target_net) || 0) !== (row.target_net ?? 0) ||
    (parseFloat(f.individual_bonus) || 0) !== row.individual_bonus ||
    f.paid_services_from_module !== row.paid_services_from_module
  );
}
