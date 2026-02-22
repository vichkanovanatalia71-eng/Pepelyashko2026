"""
Analytics engine for generating financial insights.
Uses structured data and generates AiInsight objects based on rules and heuristics.
"""

from typing import Optional
from decimal import Decimal
from app.schemas.report import AiInsight


class FinancialAnalyticsEngine:
    """Engine for generating financial insights from clinic data."""

    def __init__(
        self,
        income: float = 0.0,
        nhsu_income: float = 0.0,
        paid_income: float = 0.0,
        expenses: float = 0.0,
        fixed_expenses: float = 0.0,
        payroll_expenses: float = 0.0,
        materials_cost: float = 0.0,
        cash_balance: float = 0.0,
        bank_balance: float = 0.0,
        patients_total: int = 0,
        patients_unverified: int = 0,
        doctors_count: int = 0,
        services_count: int = 0,
        paid_services_count: int = 0,
        top_service_revenue: float = 0.0,
        prev_period_income: float = 0.0,
        prev_period_expenses: float = 0.0,
    ):
        self.income = income
        self.nhsu_income = nhsu_income
        self.paid_income = paid_income
        self.expenses = expenses
        self.fixed_expenses = fixed_expenses
        self.payroll_expenses = payroll_expenses
        self.materials_cost = materials_cost
        self.cash_balance = cash_balance
        self.bank_balance = bank_balance
        self.patients_total = patients_total
        self.patients_unverified = patients_unverified
        self.doctors_count = doctors_count
        self.services_count = services_count
        self.paid_services_count = paid_services_count
        self.top_service_revenue = top_service_revenue
        self.prev_period_income = prev_period_income
        self.prev_period_expenses = prev_period_expenses

    def generate_insights(self) -> list[AiInsight]:
        """Generate all insights."""
        insights = []

        # Add revenue insights
        insights.extend(self._revenue_insights())

        # Add expense insights
        insights.extend(self._expense_insights())

        # Add patient insights
        insights.extend(self._patient_insights())

        # Add liquidity insights
        insights.extend(self._liquidity_insights())

        # Add operations insights
        insights.extend(self._operations_insights())

        # Add compliance insights
        insights.extend(self._compliance_insights())

        return insights

    def _revenue_insights(self) -> list[AiInsight]:
        """Generate revenue-related insights."""
        insights = []

        if self.income <= 0:
            return insights

        # Revenue concentration
        nhsu_pct = (self.nhsu_income / self.income * 100) if self.income > 0 else 0
        if nhsu_pct > 80:
            insights.append(AiInsight(
                type="warning",
                title="Висока залежність від НСЗУ (>80%)",
                description=f"НСЗУ становить {nhsu_pct:.0f}% доходу ({self.nhsu_income:,.0f} грн). Рекомендується розвивати платні послуги для диверсифікації доходу.",
                data_basis=f"Доходи: НСЗУ {self.nhsu_income:,.0f} грн, платні {self.paid_income:,.0f} грн"
            ))

        # Revenue growth/decline
        if self.prev_period_income > 0:
            income_change_pct = ((self.income - self.prev_period_income) / self.prev_period_income) * 100
            if income_change_pct < -15:
                insights.append(AiInsight(
                    type="risk",
                    title=f"Різке падіння доходу ({income_change_pct:.0f}%)",
                    description=f"Дохід зменшився на {abs(income_change_pct):.0f}% порівняно з попереднім періодом. Перевірте верифікацію пацієнтів та активність лікарів.",
                    data_basis=f"Поточний період: {self.income:,.0f} грн, попередній: {self.prev_period_income:,.0f} грн"
                ))
            elif income_change_pct > 20:
                insights.append(AiInsight(
                    type="opportunity",
                    title=f"Позитивна динаміка доходу (+{income_change_pct:.0f}%)",
                    description=f"Дохід виріс на {income_change_pct:.0f}%. Продовжуйте поточну стратегію розвитку.",
                    data_basis=f"Поточний період: {self.income:,.0f} грн, попередній: {self.prev_period_income:,.0f} грн"
                ))

        return insights

    def _expense_insights(self) -> list[AiInsight]:
        """Generate expense-related insights."""
        insights = []

        if self.income <= 0:
            return insights

        # Expense ratio
        expense_ratio = (self.expenses / self.income) * 100

        if expense_ratio > 80:
            insights.append(AiInsight(
                type="risk",
                title="Високі витрати (>80% доходу)",
                description=f"Витрати становлять {expense_ratio:.0f}% доходу. Пріоритет: аналіз постійних витрат ({self.fixed_expenses:,.0f} грн) та матеріалів ({self.materials_cost:,.0f} грн).",
                data_basis=f"Доходи: {self.income:,.0f} грн, витрати: {self.expenses:,.0f} грн"
            ))
        elif expense_ratio > 60:
            insights.append(AiInsight(
                type="warning",
                title="Підвищена витратність (60-80% доходу)",
                description=f"Витрати: {expense_ratio:.0f}% доходу. Перевірте обґрунтованість основних статей витрат.",
                data_basis=f"Доходи: {self.income:,.0f} грн, витрати: {self.expenses:,.0f} грн"
            ))

        # Expense trend
        if self.prev_period_expenses > 0:
            expense_change_pct = ((self.expenses - self.prev_period_expenses) / self.prev_period_expenses) * 100
            if expense_change_pct > 25 and self.income <= self.prev_period_income:
                insights.append(AiInsight(
                    type="warning",
                    title=f"Витрати ростуть швидше ніж доходи (+{expense_change_pct:.0f}%)",
                    description=f"Витрати виросли на {expense_change_pct:.0f}%, але доходи стагнують. Потрібна оптимізація витрат.",
                    data_basis=f"Видатки: {self.expenses:,.0f} грн (було {self.prev_period_expenses:,.0f})"
                ))

        # Materials cost impact
        if self.paid_income > 0:
            materials_pct = (self.materials_cost / self.paid_income) * 100
            if materials_pct > 30:
                insights.append(AiInsight(
                    type="insight",
                    title=f"Матеріали займають {materials_pct:.0f}% доходу від платних послуг",
                    description=f"Рассмотрите переговоры с поставщиками или пересмотр ценообразования услуг. Це впливає на маржинальність послуг.",
                    data_basis=f"Доход від платних послуг: {self.paid_income:,.0f} грн, матеріали: {self.materials_cost:,.0f} грн"
                ))

        return insights

    def _patient_insights(self) -> list[AiInsight]:
        """Generate patient-related insights."""
        insights = []

        if self.patients_total == 0:
            return insights

        # Unverified patients
        unverified_pct = (self.patients_unverified / self.patients_total) * 100 if self.patients_total > 0 else 0

        if unverified_pct > 10:
            lost_revenue_est = self.nhsu_income * (unverified_pct / 100)  # rough estimate
            insights.append(AiInsight(
                type="risk",
                title=f"Висока частка неверифікованих пацієнтів ({unverified_pct:.0f}%)",
                description=f"Неверифіковані пацієнти (коеф. 0) коштують близько {lost_revenue_est:,.0f} грн втрачених доходів. Пріоритет: прискорити верифікацію.",
                data_basis=f"Верифіковано: {self.patients_total - self.patients_unverified}, неверифіковано: {self.patients_unverified}"
            ))

        return insights

    def _liquidity_insights(self) -> list[AiInsight]:
        """Generate liquidity-related insights."""
        insights = []

        total_liquid = self.cash_balance + self.bank_balance

        # Low cash warning
        if self.income > 0:
            liquid_ratio = total_liquid / self.income  # months of operating capital
            if liquid_ratio < 0.5 and self.income > 10000:  # less than 2 weeks of income
                insights.append(AiInsight(
                    type="warning",
                    title="Низька касова подушка",
                    description=f"Готівка ({total_liquid:,.0f} грн) становить менше 2 тиж. операцій. Розгляньте кредит або скорочення витрат.",
                    data_basis=f"Каса: {self.cash_balance:,.0f} грн, банк: {self.bank_balance:,.0f} грн"
                ))

        return insights

    def _operations_insights(self) -> list[AiInsight]:
        """Generate operations-related insights."""
        insights = []

        if self.doctors_count > 0 and self.services_count > 0:
            avg_services_per_doctor = self.services_count / self.doctors_count

            if avg_services_per_doctor < 15:
                insights.append(AiInsight(
                    type="opportunity",
                    title=f"Можливість збільшити завантаженість",
                    description=f"Середня кількість послуг: {avg_services_per_doctor:.0f} на лікаря. Потенціал: нові послуги, розширення часу роботи.",
                    data_basis=f"Послуг: {self.services_count}, лікарів: {self.doctors_count}"
                ))

        # Paid services development
        if self.income > 0 and self.paid_income > 0:
            paid_pct = (self.paid_income / self.income) * 100
            if paid_pct < 10 and self.nhsu_income > 0:
                insights.append(AiInsight(
                    type="opportunity",
                    title="Недовикористаний потенціал платних послуг",
                    description=f"Платні послуги становлять лише {paid_pct:.0f}% доходу. Розвиток платних послуг підвищить маржинальність та страхуватиме від нестабільності НСЗУ.",
                    data_basis=f"НСЗУ: {self.nhsu_income:,.0f} грн, платні: {self.paid_income:,.0f} грн"
                ))

        return insights

    def _compliance_insights(self) -> list[AiInsight]:
        """Generate compliance-related insights."""
        insights = []

        # Basic compliance checks
        if self.income > 0 and self.expenses > self.income:
            insights.append(AiInsight(
                type="risk",
                title="Операційні збитки",
                description=f"Витрати перевищують доходи на {(self.expenses - self.income):,.0f} грн. Без змін буде дефіцит.",
                data_basis=f"Доходи: {self.income:,.0f} грн, витрати: {self.expenses:,.0f} грн"
            ))

        return insights


async def generate_dashboard_insights(
    income: float,
    nhsu_income: float,
    paid_income: float,
    expenses: float,
    fixed_expenses: float = 0.0,
    payroll_expenses: float = 0.0,
    materials_cost: float = 0.0,
    cash_balance: float = 0.0,
    bank_balance: float = 0.0,
    patients_total: int = 0,
    patients_unverified: int = 0,
    doctors_count: int = 0,
    services_count: int = 0,
    paid_services_count: int = 0,
    top_service_revenue: float = 0.0,
    prev_period_income: float = 0.0,
    prev_period_expenses: float = 0.0,
) -> list[AiInsight]:
    """
    Generate dashboard insights for a given period.

    Args:
        income: Total income for period
        nhsu_income: NHSU/NSZU income
        paid_income: Paid services income
        expenses: Total expenses
        ... (other parameters)

    Returns:
        List of AiInsight objects
    """
    engine = FinancialAnalyticsEngine(
        income=income,
        nhsu_income=nhsu_income,
        paid_income=paid_income,
        expenses=expenses,
        fixed_expenses=fixed_expenses,
        payroll_expenses=payroll_expenses,
        materials_cost=materials_cost,
        cash_balance=cash_balance,
        bank_balance=bank_balance,
        patients_total=patients_total,
        patients_unverified=patients_unverified,
        doctors_count=doctors_count,
        services_count=services_count,
        paid_services_count=paid_services_count,
        top_service_revenue=top_service_revenue,
        prev_period_income=prev_period_income,
        prev_period_expenses=prev_period_expenses,
    )

    return engine.generate_insights()
