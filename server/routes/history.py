from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct
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
    user_id: Optional[str] = Query(None, description="Filter by user (admin only)"),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = []

    # Admin can see all or filter by user, normal users see only their own
    if user["is_admin"]:
        if user_id:
            filters.append(CompressionHistory.user_id == user_id)
    else:
        filters.append(CompressionHistory.user_id == user["user_id"])

    if type and type in ("pdf", "image"):
        filters.append(CompressionHistory.compression_type == type)
    if search:
        filters.append(CompressionHistory.filename.ilike(f"%{search}%"))

    # Count total + total saved bytes
    count_stmt = select(func.count()).select_from(CompressionHistory)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = (await db.execute(count_stmt)).scalar() or 0

    saved_stmt = select(
        func.coalesce(func.sum(CompressionHistory.original_size - CompressionHistory.compressed_size), 0)
    ).select_from(CompressionHistory)
    if filters:
        saved_stmt = saved_stmt.where(*filters)
    total_saved = (await db.execute(saved_stmt)).scalar() or 0

    # Fetch page
    offset = (page - 1) * per_page
    stmt = (
        select(CompressionHistory)
        .order_by(CompressionHistory.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    if filters:
        stmt = stmt.where(*filters)
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
                "username": r.username,
                "user_id": r.user_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ],
        "total": total,
        "total_saved": total_saved,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if total > 0 else 1,
        "is_admin": user["is_admin"],
    }


@router.get("/users")
async def get_users(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users who have compression records (admin only)."""
    if not user["is_admin"]:
        return []

    stmt = (
        select(
            CompressionHistory.user_id,
            CompressionHistory.username,
        )
        .group_by(CompressionHistory.user_id, CompressionHistory.username)
        .order_by(CompressionHistory.username)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [{"user_id": r.user_id, "username": r.username} for r in rows]
