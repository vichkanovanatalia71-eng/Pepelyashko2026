"""
AI Consultant API - handles user queries about financial data.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.report import DashboardData
from app.api.routes.reports import dashboard_report
from app.ai.consultant import FinancialConsultant, QUERY_TEMPLATES

router = APIRouter(prefix="/ai-consultant", tags=["ai-consultant"])


class ConsultantQuery:
    """Schema for consultant query."""
    query: str
    year: int
    month: int
    context: str | None = None


class ConsultantResponse:
    """Schema for consultant response."""
    response: str
    period: str
    suggestions: list[str]
    context_summary: dict


@router.post("/ask")
async def ask_consultant(
    query: str = Query(..., description="Запитання до AI-асистента"),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Ask the AI consultant a question about clinic finances.

    Args:
        query: User's question in Ukrainian
        year: Year for analysis
        month: Month for analysis
        db: Database session
        user: Current user

    Returns:
        Consultant's response with analysis
    """
    try:
        # Get dashboard data (current financial state)
        dashboard_data: DashboardData = await dashboard_report(
            year=year,
            month=month,
            db=db,
            user=user,
        )

        # Initialize consultant with current data
        consultant = FinancialConsultant(dashboard_data)

        # Prepare prompt for LLM
        prompt = consultant.prepare_prompt_for_user_query(query)

        # For now, return a structured response with consultant context
        # In production, integrate with LLM API (Claude API, etc.)
        response = {
            "query": query,
            "response": _generate_mock_response(query, consultant),
            "period": dashboard_data.period_label,
            "context": consultant.get_context_summary(),
            "related_insights": [
                {
                    "type": i.type,
                    "title": i.title,
                    "description": i.description,
                }
                for i in dashboard_data.ai_insights[:3]
            ],
            "suggestions": _get_query_suggestions(),
            "status": "success",
        }

        return response

    except Exception as e:
        logger.exception("AI consultant error")
        raise HTTPException(status_code=502, detail="Помилка AI-консультанта. Спробуйте пізніше.")


@router.get("/suggestions")
async def get_suggestions(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
) -> dict:
    """Get suggested questions for the consultant."""
    return {
        "suggestions": [
            {
                "query": "Розкажи детальніше про платні послуги",
                "hint": "Аналіз платних послуг: ТОП послуги, маржинальність, потенціал розвитку"
            },
            {
                "query": "Чому витрати виросли на стільки?",
                "hint": "Аналіз причин зростання видатків та рекомендації по оптимізації"
            },
            {
                "query": "Як мені збільшити дохід на 20%?",
                "hint": "Детальний план дій з кількісною оцінкою потенціалу"
            },
            {
                "query": "Яка касова позиція та ризики?",
                "hint": "Аналіз готівки, днів операцій, ризиків касового розриву"
            },
            {
                "query": "Яка проблема з неверифікованими пацієнтами?",
                "hint": "Розрахунок втрат від неверифікації та план дій"
            },
        ],
        "templates": QUERY_TEMPLATES,
    }


def _get_query_suggestions() -> list[str]:
    """Get follow-up query suggestions."""
    return [
        "Розширено про це",
        "Які дані потрібні для точнішого аналізу?",
        "Який план дій?",
        "Який очікуваний ефект?",
    ]


def _generate_mock_response(query: str, consultant: FinancialConsultant) -> str:
    """
    Generate a structured response for the consultant query.
    In production, this would call Claude API or another LLM.

    For now, returns a template response based on query type.
    """
    query_lower = query.lower()

    context = consultant.get_context_summary()

    # Template responses based on query type
    if "платні послуги" in query_lower or "платные услуги" in query_lower:
        return f"""На основі поточних даних:

АНАЛІЗ ПЛАТНИХ ПОСЛУГ:
- Виручка: {consultant.data.paid_services_total_revenue:,.0f} грн
- Послуг наданих: {consultant.data.paid_services_total_qty}
- ТОП послуги: {len(consultant.data.top_paid_services)}

МАРЖИНАЛЬНІСТЬ:
Матеріали складають значну частину видатків. Рекомендації:
1. Переговори з постачальниками для зниження вартості матеріалів
2. Перегляд цінової політики для збільшення маржи
3. Розширення каталогу послуг з вищою маржою

ПОТЕНЦІАЛ:
Якщо платні послуги зростуть на 10%, дохід збільшиться на {consultant.data.total_income * 0.10 * (consultant.data.paid_pct / 100):,.0f} грн/місяць"""

    elif "витрати" in query_lower or "расходы" in query_lower or "видатки" in query_lower:
        expense_ratio = (consultant.data.total_expenses / consultant.data.total_income * 100) if consultant.data.total_income else 0
        return f"""АНАЛІЗ ВИТРАТ ДЛЯ {consultant.data.period_label}:

СТРУКТУРА:
- Всього видатків: {consultant.data.total_expenses:,.0f} грн
- Коефіцієнт до доходів: {expense_ratio:.0f}%
- Постійні видатки: {consultant.data.fixed_expenses:,.0f} грн
- Зарплата: {consultant.data.salary_expenses:,.0f} грн

АНАЛІЗ:
При коефіцієнту {expense_ratio:.0f}% залишається {100 - expense_ratio:.0f}% чистого доходу.

РЕКОМЕНДАЦІЇ ПО ОПТИМІЗАЦІЇ:
1. Аналіз постійних видатків - можлива економія
2. Перегляд графіка роботи лікарів - оптимізація зарплати
3. Переговори з постачальниками матеріалів"""

    elif "дохід" in query_lower or "доход" in query_lower:
        paid_potential = consultant.data.total_income * 0.15  # 15% потенціалу
        return f"""ПЛАН ЗБІЛЬШЕННЯ ДОХОДУ НА 20%:

ПОТОЧНИЙ ДОХІД: {consultant.data.total_income:,.0f} грн
ПОТЕНЦІАЛЬНИЙ (+20%): {consultant.data.total_income * 1.2:,.0f} грн
ПОТРІБНО ДОДАТИ: {consultant.data.total_income * 0.2:,.0f} грн

ОПЦІЇ ДЛЯ РЕАЛІЗАЦІЇ:

1. РОЗВИТОК ПЛАТНИХ ПОСЛУГ (+{paid_potential:,.0f}/місяць):
   - Розширити каталог на 5-10 нових послуг
   - Встановити більш привабливі ціни
   - Активна реклама

2. ПОЛІПШЕННЯ ВЕРИФІКАЦІЇ (+{consultant.data.total_income * 0.03:,.0f}/місяць):
   - Верифікувати неверифіковані пацієнти
   - Кожен верифікований = ~1000 грн/рік

3. ЗБІЛЬШЕННЯ ЗАВАНТАЖЕНОСТІ (+{consultant.data.total_income * 0.05:,.0f}/місяць):
   - Розширити часи прийому
   - Залучити нових пацієнтів

КОМПЛЕКСНИЙ ПІДХІД: комбінація всіх трьох дасть +20% до доходу"""

    elif "касо" in query_lower or "готівка" in query_lower or "банк" in query_lower:
        total_liquid = consultant.data.opening_balance + consultant.data.bank_balance
        days_of_ops = (total_liquid / consultant.data.total_expenses * 30) if consultant.data.total_expenses > 0 else 0
        return f"""АНАЛІЗ КАСОВОЇ ПОЗИЦІЇ:

ПОТОЧНА ПОЗИЦІЯ:
- Готівка: {consultant.data.opening_balance:,.0f} грн
- Банк: {consultant.data.bank_balance:,.0f} грн
- Всього: {total_liquid:,.0f} грн

ПОКАЗНИКИ:
- Днів операцій на касі: {days_of_ops:.0f} днів
- Норма: 45-60 днів
- Статус: {'КРИТИЧНО' if days_of_ops < 15 else 'УВАГА' if days_of_ops < 45 else 'ДОБРЕ'}

РЕКОМЕНДАЦІЇ:
1. Цільовий рівень готівки: {consultant.data.total_expenses * 1.5:,.0f} грн (45 днів видатків)
2. Розгляньте кредитну лінію для страховки
3. Оптимізація готівкових потоків"""

    else:
        return f"""ЗАГАЛЬНИЙ АНАЛІЗ ФІНАНСОВОЇ СИТУАЦІЇ:

На основі даних за {consultant.data.period_label}:

ДОХОДИ: {consultant.data.total_income:,.0f} грн
ВИДАТКИ: {consultant.data.total_expenses:,.0f} грн
РЕЗУЛЬТАТ: {consultant.data.net_profit:,.0f} грн

Більш детальна відповідь на ваше запитання вимагає додаткового контексту.
Спробуйте одну з пропонованих тем для детальнішого аналізу."""


@router.get("/chat-history/{period}")
async def get_chat_history(
    period: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Get chat history for a specific period (placeholder for future implementation).

    Args:
        period: Period in format YYYY-MM
        db: Database session
        user: Current user

    Returns:
        Chat history
    """
    # Placeholder - in future, store/retrieve conversation history
    return {
        "period": period,
        "messages": [],
        "note": "Chat history storage will be implemented in next phase"
    }
