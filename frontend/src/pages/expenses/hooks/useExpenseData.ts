import { useState, useCallback, useEffect } from "react";
import api from "../../../api/client";
import type { MonthlyExpenseData, StaffMember, Doctor, PeriodSummary } from "../../../types";
import type { OtherExpense, SalaryFormState, AnnualMonthData } from "../types";
import { initSalaryForm } from "../utils/salaryCalculations";

export function useExpenseData(year: number, month: number, viewMode: "all" | "month") {
  const [data, setData] = useState<MonthlyExpenseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [salaryForms, setSalaryForms] = useState<Record<number, SalaryFormState>>({});
  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>([]);
  const [otherLoading, setOtherLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [periods, setPeriods] = useState<PeriodSummary[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [annualMonths, setAnnualMonths] = useState<AnnualMonthData[]>([]);
  const [annualLoading, setAnnualLoading] = useState(false);

  // Previous month data for copy feature
  const [prevMonthData, setPrevMonthData] = useState<MonthlyExpenseData | null>(null);
  const [prevOtherExpenses, setPrevOtherExpenses] = useState<OtherExpense[]>([]);
  const [prevMonthLoaded, setPrevMonthLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: resp } = await api.get<MonthlyExpenseData>("/monthly-expenses/", {
        params: { year, month },
      });
      setData(resp);
      const sf: Record<number, SalaryFormState> = {};
      for (const row of resp.salary) {
        sf[row.staff_member_id] = initSalaryForm(row);
      }
      setSalaryForms(sf);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const loadOther = useCallback(async () => {
    setOtherLoading(true);
    try {
      const { data: resp } = await api.get<OtherExpense[]>("/monthly-expenses/other", {
        params: { year, month },
      });
      setOtherExpenses(resp);
    } catch (e) {
      console.error(e);
    } finally {
      setOtherLoading(false);
    }
  }, [year, month]);

  const loadStaff = useCallback(async () => {
    try {
      const { data: resp } = await api.get<StaffMember[]>("/staff/");
      setStaffList(resp);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadDoctors = useCallback(async () => {
    try {
      const { data: resp } = await api.get<Doctor[]>("/nhsu/doctors/");
      setDoctorsList(resp);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadPeriods = useCallback(async () => {
    setPeriodsLoading(true);
    try {
      const { data: resp } = await api.get<PeriodSummary[]>("/monthly-expenses/periods", {
        params: { year },
      });
      setPeriods(resp);
    } catch (e) {
      console.error(e);
    } finally {
      setPeriodsLoading(false);
    }
  }, [year]);

  const loadPrevMonth = useCallback(async () => {
    let pY = year;
    let pM = month - 1;
    if (pM < 1) { pM = 12; pY--; }
    setPrevMonthLoaded(false);
    try {
      const [expResp, otherResp] = await Promise.all([
        api.get<MonthlyExpenseData>("/monthly-expenses/", { params: { year: pY, month: pM } }).then(r => r.data).catch(() => null),
        api.get<OtherExpense[]>("/monthly-expenses/other", { params: { year: pY, month: pM } }).then(r => r.data).catch(() => []),
      ]);
      setPrevMonthData(expResp);
      setPrevOtherExpenses(otherResp);
    } catch {
      setPrevMonthData(null);
      setPrevOtherExpenses([]);
    } finally {
      setPrevMonthLoaded(true);
    }
  }, [year, month]);

  const loadAnnualData = useCallback(async () => {
    setAnnualLoading(true);
    try {
      const promises = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return Promise.all([
          api.get<MonthlyExpenseData>("/monthly-expenses/", { params: { year, month: m } }).then(r => r.data).catch(() => null),
          api.get<OtherExpense[]>("/monthly-expenses/other", { params: { year, month: m } }).then(r => r.data).catch(() => []),
        ]);
      });
      const results = await Promise.all(promises);
      const annual: AnnualMonthData[] = results.map(([d, others], i) => {
        const otherSum = (others as OtherExpense[]).reduce((s, e) => s + e.amount, 0);
        if (!d) return { month: i + 1, fixed: 0, salary: 0, taxes: 0, other: 0, income: 0, total: 0, remaining: 0 };
        const md = d as MonthlyExpenseData;
        const total = md.totals.fixed_total + md.totals.salary_total + md.totals.tax_total + otherSum;
        return {
          month: i + 1,
          fixed: md.totals.fixed_total,
          salary: md.totals.salary_total,
          taxes: md.totals.tax_total,
          other: otherSum,
          income: md.totals.income,
          total,
          remaining: md.totals.income - total,
        };
      });
      setAnnualMonths(annual);
    } catch (e) {
      console.error(e);
    } finally {
      setAnnualLoading(false);
    }
  }, [year]);

  // Load all data on year/month change
  useEffect(() => {
    load(); loadOther(); loadStaff(); loadDoctors(); loadPeriods(); loadPrevMonth();
  }, [load, loadOther, loadStaff, loadDoctors, loadPeriods, loadPrevMonth]);

  // Load annual data when switching to "all" mode
  useEffect(() => {
    if (viewMode === "all") loadAnnualData();
  }, [viewMode, loadAnnualData]);

  return {
    data, loading, setData,
    salaryForms, setSalaryForms,
    otherExpenses, otherLoading,
    staffList, doctorsList,
    periods, periodsLoading,
    annualMonths, annualLoading,
    prevMonthData, prevOtherExpenses, prevMonthLoaded,
    load, loadOther, loadStaff, loadPeriods,
  };
}
