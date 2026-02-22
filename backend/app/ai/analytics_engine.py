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

        # Revenue composition analysis
        nhsu_pct = (self.nhsu_income / self.income * 100) if self.income > 0 else 0
        paid_pct = (self.paid_income / self.income * 100) if self.income > 0 else 0

        # NSZU concentration risk
        if nhsu_pct > 85:
            insights.append(AiInsight(
                type="risk",
                title=f"Критична залежність від НСЗУ ({nhsu_pct:.0f}%)",
                description=f"Майже весь дохід ({self.nhsu_income:,.0f} грн) від одного джерела. Ризик: зміни в ПМГ матимуть критичний вплив. ПРІОРИТЕТ: масивно розвивати платні послуги.",
                data_basis=f"НСЗУ {nhsu_pct:.0f}%, платні {paid_pct:.0f}%"
            ))
        elif nhsu_pct > 75:
            insights.append(AiInsight(
                type="warning",
                title=f"Висока залежність від НСЗУ ({nhsu_pct:.0f}%)",
                description=f"Більшість доходу ({self.nhsu_income:,.0f} грн) з ПМГ. Розвиток платних послуг критичний для стійкості.",
                data_basis=f"НСЗУ {nhsu_pct:.0f}%, платні {paid_pct:.0f}%"
            ))

        # Paid services potential
        if self.paid_income > 0 and paid_pct < 15 and self.nhsu_income > 0:
            insights.append(AiInsight(
                type="opportunity",
                title=f"Великий потенціал платних послуг (лише {paid_pct:.0f}%)",
                description=f"Платні послуги приносять {self.paid_income:,.0f} грн. Аналогічні клініки мають 20-30% від платних. Збільшення на 5% = +{self.income * 0.05:,.0f} грн/місяць.",
                data_basis=f"Платні послуги: {self.paid_income:,.0f} грн (потенціал: +{self.income * 0.1:,.0f})"
            ))

        # Revenue growth/decline trend
        if self.prev_period_income > 0:
            income_change_pct = ((self.income - self.prev_period_income) / self.prev_period_income) * 100
            if income_change_pct < -20:
                insights.append(AiInsight(
                    type="risk",
                    title=f"Критичне падіння доходу ({income_change_pct:.0f}%)",
                    description=f"Дохід впав на {abs(income_change_pct):.0f}%! ({self.prev_period_income:,.0f} → {self.income:,.0f} грн). Актуально: верифікація пацієнтів, утримання лікарів, якість послуг.",
                    data_basis=f"Попередній: {self.prev_period_income:,.0f} грн, поточний: {self.income:,.0f} грн"
                ))
            elif income_change_pct < -5:
                insights.append(AiInsight(
                    type="warning",
                    title=f"Падіння доходу ({income_change_pct:.0f}%)",
                    description=f"Дохід зменшився на {abs(income_change_pct):.1f}%. Причини: хворобі лікарів, неверифіковані пацієнти, сезонність?",
                    data_basis=f"Попередній: {self.prev_period_income:,.0f}, поточний: {self.income:,.0f}"
                ))
            elif income_change_pct > 25:
                insights.append(AiInsight(
                    type="opportunity",
                    title=f"Значне зростання доходу (+{income_change_pct:.0f}%)",
                    description=f"Дохід виріс на {income_change_pct:.0f}% до {self.income:,.0f} грн! Причини успіху: больше пацієнтів? нові послуги? Масштабуйте це!",
                    data_basis=f"Мінус: {self.prev_period_income:,.0f}, плюс: {self.income:,.0f}"
                ))
            elif income_change_pct > 10:
                insights.append(AiInsight(
                    type="insight",
                    title=f"Здорове зростання доходу (+{income_change_pct:.0f}%)",
                    description=f"Тренд вгору: {self.prev_period_income:,.0f} → {self.income:,.0f} грн. Продовжуйте.",
                    data_basis=f"Ріст: +{income_change_pct:.1f}%"
                ))

        # NSZU income per patient (rough estimate)
        if self.patients_total > 0 and self.nhsu_income > 0:
            income_per_patient = self.nhsu_income / self.patients_total
            if income_per_patient < 500:
                insights.append(AiInsight(
                    type="warning",
                    title=f"Низький дохід на пацієнта ({income_per_patient:.0f} грн)",
                    description=f"Середній дохід {income_per_patient:.0f} грн/пацієнта від НСЗУ. Це нижче норми (мін. 700-1000 грн). Перевірте: верифікація, вікова структура, коефіцієнти.",
                    data_basis=f"НСЗУ {self.nhsu_income:,.0f} ÷ {self.patients_total} пацієнтів = {income_per_patient:.0f} грн"
                ))

        return insights

    def _expense_insights(self) -> list[AiInsight]:
        """Generate expense-related insights."""
        insights = []

        if self.income <= 0:
            return insights

        # Expense ratio analysis (critical metric)
        expense_ratio = (self.expenses / self.income) * 100
        net_margin = 100 - expense_ratio

        if expense_ratio > 90:
            insights.append(AiInsight(
                type="risk",
                title=f"КРИТИЧНО: Витрати {expense_ratio:.0f}% > Доходи",
                description=f"Витрати ({self.expenses:,.0f} грн) перевищують доходи ({self.income:,.0f} грн). Убитки: {self.expenses - self.income:,.0f} грн/місяць. ЕКСТРЕНА АКЦІЯ: скоротити витрати на 20-30% або збільшити доходи.",
                data_basis=f"Дохід {self.income:,.0f}, видатки {self.expenses:,.0f}"
            ))
        elif expense_ratio > 75:
            insights.append(AiInsight(
                type="risk",
                title=f"Дуже високі витрати ({expense_ratio:.0f}% доходу)",
                description=f"На кожен гривень доходу йде {expense_ratio:.0f}% витрат, залишається {net_margin:.0f}% чистого. Це нижче норми (30-40%). Основні статті: постійні {self.fixed_expenses:,.0f} грн, матеріали {self.materials_cost:,.0f} грн, зарплата {self.payroll_expenses:,.0f} грн.",
                data_basis=f"Дохід {self.income:,.0f}, видатки {self.expenses:,.0f}, маржа {net_margin:.0f}%"
            ))
        elif expense_ratio > 60:
            insights.append(AiInsight(
                type="warning",
                title=f"Підвищена витратність ({expense_ratio:.0f}%)",
                description=f"Витрати складають {expense_ratio:.0f}% доходу. Норма 40-50%. Аналіз: найбільші видатки - постійні ({self.fixed_expenses:,.0f}) та матеріали ({self.materials_cost:,.0f}). Можливість: переговори з постачальниками.",
                data_basis=f"Дохід {self.income:,.0f}, видатки {self.expenses:,.0f}"
            ))

        # Expense trend - dangerous growth
        if self.prev_period_expenses > 0:
            expense_change_pct = ((self.expenses - self.prev_period_expenses) / self.prev_period_expenses) * 100
            if expense_change_pct > 30:
                insights.append(AiInsight(
                    type="risk",
                    title=f"ВИБУХ видатків (+{expense_change_pct:.0f}%)",
                    description=f"Витрати виросли на {expense_change_pct:.0f}%! ({self.prev_period_expenses:,.0f} → {self.expenses:,.0f} грн). Причини: нові матеріали? збільшена зарплата? непередбачені видатки? Проаналізуйте статті.",
                    data_basis=f"Було {self.prev_period_expenses:,.0f}, стало {self.expenses:,.0f}, ріст +{expense_change_pct:.0f}%"
                ))
            elif expense_change_pct > 15 and self.income < self.prev_period_income:
                insights.append(AiInsight(
                    type="warning",
                    title=f"Видатки ростуть, доходи падають",
                    description=f"Видатки +{expense_change_pct:.0f}%, доходи {((self.income - self.prev_period_income) / self.prev_period_income) * 100:.0f}%. Це еліміноване падіння прибутку! Спеціально потрібні дії по оптимізації.",
                    data_basis=f"Видатки: +{expense_change_pct:.0f}%, доходи: {((self.income - self.prev_period_income) / self.prev_period_income) * 100:.0f}%"
                ))

        # Material costs analysis
        if self.paid_income > 0:
            materials_pct = (self.materials_cost / self.paid_income) * 100
            if materials_pct > 40:
                insights.append(AiInsight(
                    type="risk",
                    title=f"Матеріали з'їдають маржу ({materials_pct:.0f}% платних послуг)",
                    description=f"На матеріали йде {materials_pct:.0f}% від доходу платних послуг ({self.materials_cost:,.0f} грн з {self.paid_income:,.0f}). Це дуже високо. Дії: переговори з постачальниками, пошук дешевших аналогів, або підняття цін на послуги.",
                    data_basis=f"Матеріали {self.materials_cost:,.0f} ÷ платні послуги {self.paid_income:,.0f} = {materials_pct:.0f}%"
                ))
            elif materials_pct > 25:
                insights.append(AiInsight(
                    type="insight",
                    title=f"Матеріали ймовірно занадто дорогі ({materials_pct:.0f}%)",
                    description=f"Середнестатистична клініка витрачає 15-20% на матеріали. У вас {materials_pct:.0f}%. Можливість заощадити: {self.paid_income * 0.05:,.0f} грн/місяць через переговори з постачальниками.",
                    data_basis=f"Матеріали: {materials_pct:.0f}% від платних послуг"
                ))

        # Payroll analysis
        if self.payroll_expenses > 0:
            payroll_pct = (self.payroll_expenses / self.income) * 100
            if payroll_pct > 50:
                insights.append(AiInsight(
                    type="warning",
                    title=f"Зарплата дуже висока ({payroll_pct:.0f}%)",
                    description=f"Зарплатні видатки ({self.payroll_expenses:,.0f}) становлять {payroll_pct:.0f}% доходу. Норма 30-40%. Розумна оптимізація складу команди або збільшення доходу.",
                    data_basis=f"Зарплата {self.payroll_expenses:,.0f} ÷ дохід {self.income:,.0f} = {payroll_pct:.0f}%"
                ))

        return insights

    def _patient_insights(self) -> list[AiInsight]:
        """Generate patient-related insights."""
        insights = []

        if self.patients_total == 0:
            return insights

        # Unverified patients analysis
        unverified_pct = (self.patients_unverified / self.patients_total) * 100 if self.patients_total > 0 else 0
        verified_count = self.patients_total - self.patients_unverified

        if unverified_pct > 25:
            # Rough estimate: average capitation is ~1000 UAH/year per verified patient
            lost_revenue_est = self.patients_unverified * (1000 / 12)  # rough monthly estimate
            insights.append(AiInsight(
                type="risk",
                title=f"КРИТИЧНО: {unverified_pct:.0f}% пацієнтів неверифіковано",
                description=f"{self.patients_unverified} з {self.patients_total} пацієнтів не верифіковано (отримують коеф. 0, НУЛЬОВА оплата). Орієнтовні втрачені доходи: {lost_revenue_est:,.0f} грн/місяць. ЕКСТРЕНА ДІЯ: прискорити верифікацію в реєстрах НСЗУ.",
                data_basis=f"Верифіковано: {verified_count}, неверифіковано: {self.patients_unverified} ({unverified_pct:.0f}%)"
            ))
        elif unverified_pct > 15:
            lost_revenue_est = self.patients_unverified * (1000 / 12)
            insights.append(AiInsight(
                type="warning",
                title=f"Висока частка неверифікованих ({unverified_pct:.0f}%)",
                description=f"{self.patients_unverified} неверифікованих пацієнтів = орієнтовно {lost_revenue_est:,.0f} грн/місяць втрачених доходів. Пріоритет: посилити роботу з верифікацією.",
                data_basis=f"Неверифіковано: {self.patients_unverified} ({unverified_pct:.0f}%)"
            ))
        elif unverified_pct > 5:
            insights.append(AiInsight(
                type="insight",
                title=f"Помірна частка неверифікованих ({unverified_pct:.0f}%)",
                description=f"{self.patients_unverified} пацієнтів чекають верифікації. Це нормально, але потрібен моніторинг. Скорочуйте цей відсоток.",
                data_basis=f"Неверифіковано: {unverified_pct:.0f}%"
            ))
        else:
            insights.append(AiInsight(
                type="insight",
                title=f"Гарна верифікація ({100 - unverified_pct:.0f}%)",
                description=f"Більшість пацієнтів верифіковано ({verified_count} з {self.patients_total}). Продовжувати цей рівень якості.",
                data_basis=f"Верифіковано: {100 - unverified_pct:.1f}%"
            ))

        return insights

    def _liquidity_insights(self) -> list[AiInsight]:
        """Generate liquidity-related insights."""
        insights = []

        total_liquid = self.cash_balance + self.bank_balance

        # Liquidity analysis (critical for operations)
        if self.income > 0:
            liquid_ratio = total_liquid / self.income  # portion of monthly income in liquid assets

            if total_liquid < self.expenses:
                days_of_operations = (total_liquid / self.expenses * 30) if self.expenses > 0 else 0
                insights.append(AiInsight(
                    type="risk",
                    title=f"КРИТИЧНО: Касова подушка менше місячних видатків ({days_of_operations:.0f} днів)",
                    description=f"Готівка+банк ({total_liquid:,.0f} грн) менше одного місяця видатків ({self.expenses:,.0f} грн). Залишилось готівки на {days_of_operations:.0f} днів операцій. РИЗИК касового розриву - будуть затримки з лікарями/постачальниками!",
                    data_basis=f"Готівка: {self.cash_balance:,.0f}, банк: {self.bank_balance:,.0f}, видатки: {self.expenses:,.0f}"
                ))
            elif total_liquid < self.expenses * 0.5:
                days_of_operations = (total_liquid / self.expenses * 30) if self.expenses > 0 else 0
                insights.append(AiInsight(
                    type="warning",
                    title=f"Низька касова подушка ({days_of_operations:.0f} днів видатків)",
                    description=f"Готівка ({total_liquid:,.0f}) достатня лише на {days_of_operations:.0f} днів видатків. Норма 45-60 днів. Розгляньте кредит, ліни фінансування або прискорення сборів від дебіторів.",
                    data_basis=f"Каса: {total_liquid:,.0f} грн, місячні видатки: {self.expenses:,.0f}"
                ))
            elif total_liquid < self.expenses:
                insights.append(AiInsight(
                    type="warning",
                    title="Помірна касова позиція",
                    description=f"Готівки достатньо на {(total_liquid / self.expenses * 30):.0f} днів видатків. Рекомендується мати 45+ днів запасу.",
                    data_basis=f"Готівка: {total_liquid:,.0f} грн, видатки: {self.expenses:,.0f}"
                ))
            else:
                insights.append(AiInsight(
                    type="insight",
                    title=f"Здорова касова позиція ({(total_liquid / self.expenses * 30):.0f} днів)",
                    description=f"Готівки достатньо на {(total_liquid / self.expenses * 30):.0f} днів видатків. Це хороший буфер для операцій. Продовжувати накопичення.",
                    data_basis=f"Готівка: {total_liquid:,.0f} грн"
                ))

        # Cash vs Bank split
        if total_liquid > 0:
            cash_pct = (self.cash_balance / total_liquid * 100) if total_liquid > 0 else 0
            if cash_pct > 50:
                insights.append(AiInsight(
                    type="insight",
                    title=f"Велика частка готівки ({cash_pct:.0f}%)",
                    description=f"Більше половини коштів у касі ({self.cash_balance:,.0f} грн). Розгляньте розміщення у короткострокові депозити для отримання процентів.",
                    data_basis=f"Каса: {cash_pct:.0f}%, банк: {100 - cash_pct:.0f}%"
                ))

        return insights

    def _operations_insights(self) -> list[AiInsight]:
        """Generate operations-related insights."""
        insights = []

        # Doctor utilization analysis
        if self.doctors_count > 0 and self.services_count > 0:
            avg_services_per_doctor = self.services_count / self.doctors_count

            if avg_services_per_doctor < 10:
                insights.append(AiInsight(
                    type="risk",
                    title=f"ДУЖЕ НИЗЬКА завантаженість ({avg_services_per_doctor:.0f} послуг/лікар)",
                    description=f"У середньому {avg_services_per_doctor:.0f} послуг на лікаря за період. Норма 30-50+. Причини: лікарі на лікарні? низький приплив пацієнтів? неоптимальний графік? Глибокий аналіз потрібен!",
                    data_basis=f"Послуг: {self.services_count}, лікарів: {self.doctors_count}"
                ))
            elif avg_services_per_doctor < 20:
                insights.append(AiInsight(
                    type="warning",
                    title=f"Низька завантаженість ({avg_services_per_doctor:.0f} послуг/лікар)",
                    description=f"Лікарі недозавантажені ({avg_services_per_doctor:.0f} послуг). Потенціал: більш активна реклама, розширення послуг, залучення нових пацієнтів.",
                    data_basis=f"Послуг: {self.services_count}, лікарів: {self.doctors_count}, середнє {avg_services_per_doctor:.0f}"
                ))
            elif avg_services_per_doctor > 100:
                insights.append(AiInsight(
                    type="warning",
                    title=f"ПЕРЕГРУЗ лікарів ({avg_services_per_doctor:.0f} послуг/лікар)",
                    description=f"Лікарі мають надто багато послуг ({avg_services_per_doctor:.0f}). Ризик: вигоранням, помилки, якість. Рішення: наймання підтримуючого персоналу або розподіл навантаження.",
                    data_basis=f"Послуг: {self.services_count}, лікарів: {self.doctors_count}"
                ))
            else:
                insights.append(AiInsight(
                    type="insight",
                    title=f"Здорова завантаженість ({avg_services_per_doctor:.0f} послуг/лікар)",
                    description=f"Лікарі добре завантажені ({avg_services_per_doctor:.0f} послуг). Це нормальний рівень. Продовжувати.",
                    data_basis=f"Послуг: {self.services_count}, лікарів: {self.doctors_count}"
                ))

        # Paid services development potential
        if self.income > 0:
            paid_pct = (self.paid_income / self.income) * 100

            if paid_pct < 5 and self.nhsu_income > 0:
                potential_increase = self.income * 0.15  # 15% потенціалу
                insights.append(AiInsight(
                    type="risk",
                    title=f"Платні послуги практично відсутні ({paid_pct:.0f}%)",
                    description=f"Платні послуги - це всього {self.paid_income:,.0f} грн з {self.income:,.0f} грн дохідуо. Це критично слабке місце. ПРІОРИТЕТ: розробити портфель платних послуг. Потенціал доп. доходу: +{potential_increase:,.0f} грн/місяць.",
                    data_basis=f"Платні послуги: {paid_pct:.0f}% дохода, потенціал: {potential_increase:,.0f} грн"
                ))
            elif paid_pct < 15 and self.nhsu_income > 0:
                potential_increase = self.income * 0.10  # 10% потенціалу
                insights.append(AiInsight(
                    type="opportunity",
                    title=f"Недовикористаний потенціал платних послуг ({paid_pct:.0f}%)",
                    description=f"Лідируючи клініки мають 25-35% від платних послуг. У вас {paid_pct:.0f}%. Збільшення на 10% = {potential_increase:,.0f} грн доп. дохода/місяць + вища маржа!",
                    data_basis=f"Платні: {self.paid_income:,.0f}, потенціал: +{potential_increase:,.0f}/місяць"
                ))

        # Services count analysis
        if self.paid_services_count > 0 and self.services_count > 0:
            paid_service_pct = (self.paid_services_count / self.services_count) * 100
            if paid_service_pct < 5:
                insights.append(AiInsight(
                    type="warning",
                    title=f"Мало платних послуг у каталозі ({paid_service_pct:.0f}%)",
                    description=f"В системі {self.paid_services_count} платних послуг з {self.services_count} доступних. Розширіть каталог платних послуг на базі популярних послуг.",
                    data_basis=f"Платних: {self.paid_services_count}, всього: {self.services_count}"
                ))

        return insights

    def _compliance_insights(self) -> list[AiInsight]:
        """Generate compliance-related insights."""
        insights = []

        # Operational losses
        if self.income > 0:
            if self.expenses > self.income:
                loss = self.expenses - self.income
                loss_monthly = loss
                insights.append(AiInsight(
                    type="risk",
                    title="УБИТКИ: Видатки > Доходи",
                    description=f"Витрати ({self.expenses:,.0f} грн) на {loss:,.0f} грн більше доходів ({self.income:,.0f} грн). При такому коефіцієнту буде дефіцит каси за {(self.cash_balance / loss if loss > 0 else 99):.0f} місяців. КРИТИЧНО необхідні дії: збільшити доходи або скоротити видатки.",
                    data_basis=f"Дохід {self.income:,.0f}, видатки {self.expenses:,.0f}, дефіцит {loss:,.0f}/місяць"
                ))

        # Break-even analysis
        if self.fixed_expenses > 0 and self.income > 0:
            # Contribution margin approximation
            variable_costs = self.materials_cost + (self.payroll_expenses * 0.2)  # rough estimate
            contribution = self.income - variable_costs
            if contribution > 0:
                breakeven_revenue = (self.fixed_expenses / contribution * self.income) if contribution > 0 else float('inf')
                current_margin = ((self.income - self.fixed_expenses) / self.income * 100) if self.income > 0 else 0

                if breakeven_revenue > self.income * 0.85:
                    safety_margin = ((self.income - breakeven_revenue) / self.income * 100)
                    insights.append(AiInsight(
                        type="warning",
                        title=f"Невеликий запас міцності ({safety_margin:.0f}%)",
                        description=f"Точка беззбитковості на рівні {breakeven_revenue:,.0f} грн. Поточні доходи {self.income:,.0f}. Запас міцності лише {safety_margin:.0f}%. Якщо доходи впадуть на {100 - safety_margin:.0f}%, будуть убитки. Хеджування: більш стійкі дохідні потоки.",
                        data_basis=f"Точка беззбитковості: {breakeven_revenue:,.0f}, запас: {safety_margin:.0f}%"
                    ))

        # NSZU compliance hints
        if self.nhsu_income > 0 and self.patients_unverified > 0:
            insights.append(AiInsight(
                type="warning",
                title="Комплаєнс ПМГ: неверифіковані пацієнти",
                description=f"Неверифіковані пацієнти - це коефіцієнт 0 в ПМГ (нульова оплата). За постановою КМУ №1808: верифікація критична. Проконтролюйте дані в реєстрах НСЗУ та ЕСОЗ.",
                data_basis=f"Неверифіковано: {self.patients_unverified} пацієнтів"
            ))

        # Tax compliance hint
        if self.income > 0:
            insights.append(AiInsight(
                type="insight",
                title="Податкова дисципліна",
                description=f"Переконайтеся в точності розрахунків ЄП, ВЗ, ЕСВ. При ФОП 3 група: 5% ЄП або 3%+ПДВ, ВЗ 1% від доходу. Розрахунки мають відповідати вашому режиму оподаткування.",
                data_basis=f"Дохід: {self.income:,.0f} грн"
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
