from fastapi import APIRouter, UploadFile, File, Form, Depends, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from services.image_compressor import compress_image
from database import get_db
from models import CompressionHistory
from auth import get_current_user
from typing import Optional

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@router.post("/")
async def compress_image_route(
    request: Request,
    file: UploadFile = File(...),
    quality: int = Form(70),
    format: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        filename = file.filename or ""
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            return Response(content="Only JPG, PNG, and WebP images are allowed", status_code=400)

        input_bytes = await file.read()

        if len(input_bytes) > 50 * 1024 * 1024:
            return Response(content="File too large (max 50MB)", status_code=400)

        quality = max(10, min(100, quality))

        result = compress_image(input_bytes, quality, format if format else None)

        out_ext = "jpg" if result["format"] == "jpeg" else result["format"]
        name = filename.rsplit(".", 1)[0] if "." in filename else "image"
        out_filename = f"{name}-compressed.{out_ext}"

        # Save history (best effort - don't fail compression if this fails)
        try:
            user = await get_current_user(request)
            record = CompressionHistory(
                user_id=user["user_id"],
                username=user["username"],
                email=user["email"],
                filename=filename,
                original_size=result["original_size"],
                compressed_size=result["compressed_size"],
                compression_type="image",
            )
            db.add(record)
            await db.commit()
        except Exception:
            pass

        return Response(
            content=result["buffer"],
            media_type=f"image/{result['format']}",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
                "X-Original-Size": str(result["original_size"]),
                "X-Compressed-Size": str(result["compressed_size"]),
            },
        )
    except Exception as e:
        print(f"Image compression error: {e}")
        return Response(content=str(e), status_code=500)
