from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import CompressionHistory
from auth import get_current_user
from typing import Optional

router = APIRouter()


@router.get("/")
async def get_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, description="Filter by type: pdf or image"),
    search: Optional[str] = Query(None, description="Search by filename"),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Base filter
    base_filter = CompressionHistory.user_id == user["user_id"]

    # Additional filters
    filters = [base_filter]
    if type and type in ("pdf", "image"):
        filters.append(CompressionHistory.compression_type == type)
    if search:
        filters.append(CompressionHistory.filename.ilike(f"%{search}%"))

    # Count total
    count_stmt = (
        select(func.count())
        .select_from(CompressionHistory)
        .where(*filters)
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    # Fetch page
    offset = (page - 1) * per_page
    stmt = (
        select(CompressionHistory)
        .where(*filters)
        .order_by(CompressionHistory.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    return {
        "data": [
            {
                "id": r.id,
                "filename": r.filename,
                "original_size": r.original_size,
                "compressed_size": r.compressed_size,
                "compression_type": r.compression_type,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if total > 0 else 1,
    }
