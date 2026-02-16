from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.models.income import Income
from app.models.user import User
from app.schemas.report import TaxSummary

router = APIRouter()

QUARTER_MONTHS = {1: (1, 3), 2: (4, 6), 3: (7, 9), 4: (10, 12)}


@router.get("/quarterly", response_model=list[TaxSummary])
async def quarterly_taxes(
    year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    summaries = []
    for quarter, (month_start, month_end) in QUARTER_MONTHS.items():
        d_start = date(year, month_start, 1)
        if month_end == 12:
            d_end = date(year, 12, 31)
        else:
            d_end = date(year, month_end + 1, 1)

        result = await db.execute(
            select(func.coalesce(func.sum(Income.amount), 0)).where(
                Income.user_id == user.id,
                Income.date >= d_start,
                Income.date < d_end,
            )
        )
        income = float(result.scalar())

        single_tax = round(income * user.tax_rate, 2)
        months_in_quarter = 3
        esv = round(settings.esv_monthly * months_in_quarter, 2)

        summaries.append(
            TaxSummary(
                quarter=f"Q{quarter} {year}",
                income=income,
                single_tax=single_tax,
                esv=esv,
                total=round(single_tax + esv, 2),
            )
        )
    return summaries
