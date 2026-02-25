import { useState, useRef } from "react";
import api from "../../../api/client";
import type { MonthlyExpenseData, AiParsedExpense } from "../../../types";
import type {
  FixedModalState, StaffModalState, OtherModalState, CopyModalState,
  AiModalState, ShareModalState, SalaryFormState,
  ConfirmDlgState, AlertDlgState, OtherExpense, DrawerSection,
} from "../types";
import { MONTH_NAMES } from "../../../components/shared/MonthNavigator";

interface UseExpenseActionsParams {
  year: number;
  month: number;
  data: MonthlyExpenseData | null;
  salaryForms: Record<number, SalaryFormState>;
  setSalaryForms: React.Dispatch<React.SetStateAction<Record<number, SalaryFormState>>>;
  otherExpenses: OtherExpense[];
  prevMonthData: MonthlyExpenseData | null;
  prevOtherExpenses: OtherExpense[];
  load: () => Promise<void>;
  loadOther: () => Promise<void>;
  loadStaff: () => Promise<void>;
  loadPeriods: () => Promise<void>;
}

export function useExpenseActions({
  year, month, data: _data, salaryForms, setSalaryForms,
  otherExpenses: _otherExpenses, prevMonthData, prevOtherExpenses,
  load, loadOther, loadStaff, loadPeriods,
}: UseExpenseActionsParams) {
  // Modal states
  const [fixedModal, setFixedModal] = useState<FixedModalState>(
    { open: false, isEdit: false, id: null, name: "", desc: "", amount: "", recurring: true, saving: false }
  );
  const [staffModal, setStaffModal] = useState<StaffModalState>(
    { open: false, isEdit: false, id: null, fullName: "", position: "", role: "other", doctorId: null, saving: false }
  );
  const [otherModal, setOtherModal] = useState<OtherModalState>(
    { open: false, isEdit: false, id: null, name: "", desc: "", amount: "", category: "general", saving: false }
  );
  const [copyModal, setCopyModal] = useState<CopyModalState>(
    { open: false, srcYear: 0, srcMonth: 0, copyFixed: true, copySalary: true, saving: false }
  );
  const [aiModal, setAiModal] = useState<AiModalState>(
    { open: false, text: "", file: null, loading: false, result: null }
  );
  const aiFileRef = useRef<HTMLInputElement>(null);

  const [kpiModal, setKpiModal] = useState<{ open: boolean; type: string; title: string }>(
    { open: false, type: "", title: "" }
  );

  const [shareLoading, setShareLoading] = useState(false);
  const [shareModal, setShareModal] = useState<ShareModalState>({ open: false, url: "", expiresAt: "" });
  const [accReqLoading, setAccReqLoading] = useState(false);
  const [accReqModal, setAccReqModal] = useState<ShareModalState>({ open: false, url: "", expiresAt: "" });
  const [lockLoading, setLockLoading] = useState(false);

  const [confirmDlg, setConfirmDlg] = useState<ConfirmDlgState | null>(null);
  const [alertDlg, setAlertDlg] = useState<AlertDlgState | null>(null);

  // Section copy state
  const [sectionCopyLoading, setSectionCopyLoading] = useState<Record<string, boolean>>({});
  const [sectionCopied, setSectionCopied] = useState<Record<string, boolean>>({});

  // ── Delete fixed ──
  function deleteFixed(id: number, name: string) {
    setConfirmDlg({
      title: `Видалити витрату «${name}»?`,
      variant: "danger",
      confirmLabel: "Видалити",
      action: async () => {
        try {
          await api.delete(`/monthly-expenses/fixed/${id}`);
          await load();
        } catch (e: any) {
          console.error(e);
          setAlertDlg({ title: "Помилка", description: e?.response?.data?.detail || "Не вдалося видалити витрату." });
        }
      },
    });
  }

  // ── Save salary ──
  async function saveSalary(staffId: number) {
    const form = salaryForms[staffId];
    if (!form) return;
    setSalaryForms(s => ({ ...s, [staffId]: { ...s[staffId], saving: true } }));
    try {
      await api.put("/monthly-expenses/salary", {
        year, month,
        staff_member_id: staffId,
        brutto: parseFloat(form.brutto) || 0,
        has_supplement: form.has_supplement,
        target_net: form.has_supplement && form.target_net ? parseFloat(form.target_net) : null,
        individual_bonus: parseFloat(form.individual_bonus) || 0,
        paid_services_from_module: form.paid_services_from_module,
      });
      await load();
    } catch (e) {
      console.error(e);
      setSalaryForms(s => ({ ...s, [staffId]: { ...s[staffId], saving: false } }));
    }
  }

  // ── Staff CRUD ──
  async function saveStaff() {
    if (!staffModal.fullName.trim()) return;
    setStaffModal(s => ({ ...s, saving: true }));
    try {
      if (staffModal.isEdit && staffModal.id != null) {
        await api.put(`/staff/${staffModal.id}`, {
          full_name: staffModal.fullName, position: staffModal.position,
          role: staffModal.role, doctor_id: staffModal.role === "doctor" ? staffModal.doctorId : null,
        });
      } else {
        await api.post("/staff/", {
          full_name: staffModal.fullName, position: staffModal.position,
          role: staffModal.role, doctor_id: staffModal.role === "doctor" ? staffModal.doctorId : null,
        });
      }
      setStaffModal(s => ({ ...s, open: false, saving: false }));
      await Promise.all([loadStaff(), load()]);
    } catch (e) {
      console.error(e);
      setStaffModal(s => ({ ...s, saving: false }));
    }
  }

  function deleteStaff(id: number, name: string) {
    setConfirmDlg({
      title: `Видалити співробітника «${name}»?`,
      description: "Дані місяця залишаться.",
      variant: "danger",
      confirmLabel: "Видалити",
      action: async () => {
        try {
          await api.delete(`/staff/${id}`);
          await Promise.all([loadStaff(), load()]);
        } catch (e) { console.error(e); }
      },
    });
  }

  // ── Other expenses CRUD ──
  async function saveOther() {
    if (!otherModal.name.trim()) return;
    setOtherModal(s => ({ ...s, saving: true }));
    try {
      const payload = {
        name: otherModal.name, description: otherModal.desc,
        amount: parseFloat(otherModal.amount) || 0, category: otherModal.category, year, month,
      };
      if (otherModal.isEdit && otherModal.id != null) {
        await api.put(`/monthly-expenses/other/${otherModal.id}`, payload);
      } else {
        await api.post("/monthly-expenses/other", payload);
      }
      setOtherModal(s => ({ ...s, open: false, saving: false }));
      await loadOther();
    } catch (e: any) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: e?.response?.data?.detail || "Не вдалося зберегти витрату." });
      setOtherModal(s => ({ ...s, saving: false }));
    }
  }

  function deleteOther(id: number, name: string) {
    setConfirmDlg({
      title: `Видалити витрату «${name}»?`,
      variant: "danger",
      confirmLabel: "Видалити",
      action: async () => {
        try {
          await api.delete(`/monthly-expenses/other/${id}`);
          await loadOther();
        } catch (e: any) {
          console.error(e);
          setAlertDlg({ title: "Помилка", description: e?.response?.data?.detail || "Не вдалося видалити витрату." });
        }
      },
    });
  }

  // ── Lock / Unlock ──
  async function lockPeriod() {
    setLockLoading(true);
    try {
      await api.post("/monthly-expenses/lock", { year, month });
      await Promise.all([load(), loadPeriods()]);
    } catch (e) { console.error(e); }
    finally { setLockLoading(false); }
  }

  function unlockPeriod() {
    setConfirmDlg({
      title: "Розблокувати місяць для редагування?",
      confirmLabel: "Розблокувати",
      action: async () => {
        setLockLoading(true);
        try {
          await api.delete("/monthly-expenses/lock", { params: { year, month } });
          await Promise.all([load(), loadPeriods()]);
        } catch (e) { console.error(e); }
        finally { setLockLoading(false); }
      },
    });
  }

  // ── Copy from period ──
  async function copyFromPeriod() {
    if (!copyModal.srcYear || !copyModal.srcMonth) return;
    setCopyModal(s => ({ ...s, saving: true }));
    try {
      await api.post("/monthly-expenses/copy-from", {
        source_year: copyModal.srcYear, source_month: copyModal.srcMonth,
        target_year: year, target_month: month,
        copy_fixed: copyModal.copyFixed, copy_salary: copyModal.copySalary,
      });
      setCopyModal(s => ({ ...s, open: false, saving: false }));
      await Promise.all([load(), loadPeriods()]);
    } catch (e) {
      console.error(e);
      setCopyModal(s => ({ ...s, saving: false }));
    }
  }

  function openCopyModal() {
    let srcYear = year;
    let srcMonth = month - 1;
    if (srcMonth < 1) { srcMonth = 12; srcYear--; }
    setCopyModal({ open: true, srcYear, srcMonth, copyFixed: true, copySalary: true, saving: false });
  }

  // ── AI parse ──
  async function submitAiParse() {
    setAiModal(s => ({ ...s, loading: true }));
    try {
      const formData = new FormData();
      if (aiModal.text) formData.append("text", aiModal.text);
      if (aiModal.file) formData.append("file", aiModal.file);
      const { data: result } = await api.post<AiParsedExpense>("/monthly-expenses/ai-parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAiModal(s => ({ ...s, loading: false, result }));
    } catch (e) {
      console.error(e);
      setAiModal(s => ({ ...s, loading: false }));
    }
  }

  async function applyAiResult(setActiveDrawer: (s: DrawerSection) => void) {
    if (!aiModal.result) return;
    const r = aiModal.result;
    if (r.category === "fixed") {
      try {
        await api.post("/monthly-expenses/fixed", {
          year, month, name: r.name, amount: r.amount, is_recurring: r.is_recurring,
        });
        await load();
      } catch (e) { console.error(e); }
    }
    setAiModal({ open: false, text: "", file: null, loading: false, result: null });
    setActiveDrawer("fixed");
  }

  // ── Share ──
  async function handleOwnerShare(selectedHiredDoctorId: number | null, selectedHiredNurseId: number | null) {
    setShareLoading(true);
    try {
      const res = await api.post("/monthly-expenses/owner-share", {
        year, month, hired_doctor_id: selectedHiredDoctorId, hired_nurse_id: selectedHiredNurseId,
      });
      const shareUrl = `${window.location.origin}${res.data.url}`;
      setShareModal({
        open: true, url: shareUrl,
        expiresAt: new Date(res.data.expires_at).toLocaleDateString("uk-UA"),
      });
    } catch (e) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: "Помилка створення посилання" });
    }
    setShareLoading(false);
  }

  async function handleAccountantRequest() {
    setAccReqLoading(true);
    try {
      const res = await api.post("/monthly-expenses/accountant-request", { year, month });
      const accUrl = `${window.location.origin}${res.data.url}`;
      setAccReqModal({
        open: true, url: accUrl,
        expiresAt: new Date(res.data.expires_at).toLocaleDateString("uk-UA"),
      });
    } catch (e) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: "Помилка створення запиту до бухгалтера" });
    }
    setAccReqLoading(false);
  }

  // ── Section copy from prev ──
  function getPrevMonthLabel(): string {
    let pM = month - 1;
    let pY = year;
    if (pM < 1) { pM = 12; pY--; }
    return `${MONTH_NAMES[pM - 1]} ${pY}`;
  }

  function isPrevMonthLocked(): boolean {
    return prevMonthData?.is_locked === true;
  }

  function hasPrevFixed(): boolean {
    return (prevMonthData?.fixed?.length ?? 0) > 0 && prevMonthData!.fixed.some(r => r.amount > 0);
  }

  function hasPrevSalary(): boolean {
    return (prevMonthData?.salary?.length ?? 0) > 0 && prevMonthData!.salary.some(r => r.brutto > 0);
  }

  function hasPrevOther(): boolean {
    return prevOtherExpenses.length > 0;
  }

  async function copySectionFromPrev(section: "fixed" | "salary" | "other") {
    setSectionCopyLoading(s => ({ ...s, [section]: true }));
    let pY = year;
    let pM = month - 1;
    if (pM < 1) { pM = 12; pY--; }
    try {
      if (section === "fixed" || section === "salary") {
        await api.post("/monthly-expenses/copy-from", {
          source_year: pY, source_month: pM, target_year: year, target_month: month,
          copy_fixed: section === "fixed", copy_salary: section === "salary",
        });
        await load();
      } else {
        for (const exp of prevOtherExpenses) {
          await api.post("/monthly-expenses/other", {
            name: exp.name, description: exp.description, amount: exp.amount, category: exp.category, year, month,
          });
        }
        await loadOther();
      }
      setSectionCopied(s => ({ ...s, [section]: true }));
    } catch (e) {
      console.error(e);
      setAlertDlg({ title: "Помилка", description: "Не вдалося перенести дані. Спробуйте ще раз." });
    } finally {
      setSectionCopyLoading(s => ({ ...s, [section]: false }));
    }
  }

  function resetSectionCopied() {
    setSectionCopied({});
  }

  return {
    // Modal states
    fixedModal, setFixedModal,
    staffModal, setStaffModal,
    otherModal, setOtherModal,
    copyModal, setCopyModal,
    aiModal, setAiModal, aiFileRef,
    kpiModal, setKpiModal,
    shareModal, setShareModal, shareLoading,
    accReqModal, setAccReqModal, accReqLoading,
    lockLoading,
    confirmDlg, setConfirmDlg,
    alertDlg, setAlertDlg,
    sectionCopyLoading, sectionCopied, resetSectionCopied,

    // Actions
    deleteFixed, saveSalary, saveStaff, deleteStaff,
    saveOther, deleteOther,
    lockPeriod, unlockPeriod,
    copyFromPeriod, openCopyModal,
    submitAiParse, applyAiResult,
    handleOwnerShare, handleAccountantRequest,
    getPrevMonthLabel, isPrevMonthLocked,
    hasPrevFixed, hasPrevSalary, hasPrevOther,
    copySectionFromPrev,
  };
}
