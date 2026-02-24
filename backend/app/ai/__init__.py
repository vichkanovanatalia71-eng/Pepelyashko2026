"""AI analytics module for financial analysis and consultation."""

from .financial_analyst_prompt import get_analyst_prompt, get_analysis_guidance
from .analytics_engine import FinancialAnalyticsEngine, generate_dashboard_insights
from .consultant import FinancialConsultant

__all__ = [
    "get_analyst_prompt",
    "get_analysis_guidance",
    "FinancialAnalyticsEngine",
    "generate_dashboard_insights",
    "FinancialConsultant",
]
