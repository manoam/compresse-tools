from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import CompressionHistory
from auth import get_current_user

router = APIRouter()


@router.get("/")
async def get_history(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CompressionHistory)
        .where(CompressionHistory.user_id == user["user_id"])
        .order_by(CompressionHistory.created_at.desc())
        .limit(100)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    return [
        {
            "id": r.id,
            "filename": r.filename,
            "original_size": r.original_size,
            "compressed_size": r.compressed_size,
            "compression_type": r.compression_type,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]
