"""
AI Financial Consultant - handles detailed analysis and Q&A about clinic finances.
Responds to user queries with context-aware insights.
"""

from app.schemas.report import DashboardData
from app.ai.financial_analyst_prompt import get_analyst_prompt, get_analysis_guidance


class FinancialConsultant:
    """AI consultant for detailed financial analysis and Q&A."""

    def __init__(self, dashboard_data: DashboardData):
        """
        Initialize consultant with current dashboard data.

        Args:
            dashboard_data: Current period DashboardData with all metrics
        """
        self.data = dashboard_data
        self.system_prompt = get_analyst_prompt()

    def get_context_summary(self) -> str:
        """Build a summary of current financial state for context."""
        return f"""
        КОНТЕКСТ ПОТОЧНОГО ПЕРІОДУ ({self.data.period_label}):

        ДОХОДИ:
        - Всього: {self.data.total_income:,.0f} грн
        - НСЗУ: {self.data.nhsu_income:,.0f} грн ({self.data.nhsu_pct:.0f}%)
        - Платні послуги: {self.data.paid_income:,.0f} грн ({self.data.paid_pct:.0f}%)

        ВИТРАТИ:
        - Всього: {self.data.total_expenses:,.0f} грн
        - Постійні: {self.data.fixed_expenses:,.0f} грн
        - Зарплата: {self.data.salary_expenses:,.0f} грн
        - Коефіцієнт витрат: {(self.data.total_expenses / self.data.total_income * 100):.0f}%

        РЕЗУЛЬТАТ:
        - Чистий прибуток: {self.data.net_profit:,.0f} грн
        - Маржа: {(self.data.net_profit / self.data.total_income * 100):.0f}%

        КАСОВЕ СТАНОВИЩЕ:
        - Готівка: {self.data.opening_balance:,.0f} грн
        - Банк: {self.data.bank_balance:,.0f} грн

        ОПЕРАЦІЇ:
        - Пацієнтів: {self.data.total_patients}
        - Неверифіковано: {self.data.total_non_verified} ({self.data.total_non_verified_pct:.0f}%)
        - Лікарів: {self.data.active_doctors_count}
        - Послуг: {self.data.total_services_count}

        ПЛАТНІ ПОСЛУГИ (ТОП):
        - Послуг у каталозі: {len(self.data.top_paid_services)}
        - Виручка: {self.data.paid_services_total_revenue:,.0f} грн
        - Кількість: {self.data.paid_services_total_qty}
        """

    def prepare_prompt_for_user_query(self, user_query: str) -> str:
        """
        Prepare a detailed prompt for answering user's specific question.

        Args:
            user_query: User's natural language question

        Returns:
            Full prompt for LLM
        """
        context = self.get_context_summary()

        return f"""{self.system_prompt}

{context}

ЗАПИТАННЯ КОРИСТУВАЧА:
{user_query}

ВИМОГИ ДО ВІДПОВІДІ:
- Максимум 1500 символів
- Українська мова
- Посилання на конкретні цифри з контексту
- Якщо запитання потребує розширеного аналізу - обговорити обмеження даних
- Пропозиції наступних дій та метрик для моніторингу

ВІДПОВІДЬ:"""

    def get_insights_summary(self) -> str:
        """Get summary of recent insights for context."""
        if not self.data.ai_insights:
            return "Немає актуальних інсайтів"

        summary = "ОСТАННІ ІНСАЙТИ:\n"
        for insight in self.data.ai_insights[:5]:  # Top 5 insights
            summary += f"- {insight.type.upper()}: {insight.title}\n"
        return summary

    def format_response(self, llm_response: str) -> dict:
        """
        Format LLM response for API.

        Args:
            llm_response: Response from language model

        Returns:
            Structured response
        """
        return {
            "response": llm_response,
            "period": self.data.period_label,
            "context_summary": {
                "total_income": self.data.total_income,
                "total_expenses": self.data.total_expenses,
                "net_profit": self.data.net_profit,
                "expense_ratio": round((self.data.total_expenses / self.data.total_income * 100), 1) if self.data.total_income > 0 else 0,
            },
            "insights_count": len(self.data.ai_insights),
        }


# Query examples and recommended responses
QUERY_TEMPLATES = {
    "детальніше платні послуги": {
        "hint": "Розповідає про платні послуги: ТОП послуги, маржинальність, потенціал",
        "focus_on": ["top_paid_services", "paid_services_total_revenue", "materials_cost"]
    },
    "чому витрати виросли": {
        "hint": "Аналізує причини зростання видатків порівняно з попереднім періодом",
        "focus_on": ["expense_change", "salary_expenses", "materials_cost"]
    },
    "як збільшити дохід": {
        "hint": "Дає рекомендації по зростанню доходу з расчетом потенціалу",
        "focus_on": ["paid_services_potential", "patient_verification", "doctor_utilization"]
    },
    "верифікація пацієнтів": {
        "hint": "Обговорює вплив неверифікованих пацієнтів на дохід",
        "focus_on": ["total_non_verified", "lost_revenue", "verification_process"]
    },
    "касова позиція": {
        "hint": "Аналізує достатність готівки, дні операцій, ризики",
        "focus_on": ["opening_balance", "bank_balance", "expenses"]
    },
}
