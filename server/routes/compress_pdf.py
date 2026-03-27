from fastapi import APIRouter, UploadFile, File, Form, Depends, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from services.pdf_compressor import compress_pdf
from database import get_db
from models import CompressionHistory
from auth import get_current_user

router = APIRouter()


def quality_to_preset(quality: int) -> str:
    """Convert numeric quality (10-100) to Ghostscript preset."""
    if quality <= 30:
        return "screen"
    elif quality <= 60:
        return "ebook"
    elif quality <= 85:
        return "printer"
    else:
        return "prepress"


@router.post("/")
async def compress_pdf_route(
    request: Request,
    file: UploadFile = File(...),
    quality: int = Form(60),
    db: AsyncSession = Depends(get_db),
):
    try:
        filename = file.filename or ""
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext != ".pdf":
            return Response(content="Only PDF files are allowed", status_code=400)

        input_bytes = await file.read()

        if len(input_bytes) > 50 * 1024 * 1024:
            return Response(content="File too large (max 50MB)", status_code=400)

        quality = max(10, min(100, quality))
        preset = quality_to_preset(quality)

        result = compress_pdf(input_bytes, preset)

        name = filename.rsplit(".", 1)[0] if "." in filename else "document"
        out_filename = f"{name}-compressed.pdf"

        # Save history (best effort)
        try:
            user = await get_current_user(request)
            record = CompressionHistory(
                user_id=user["user_id"],
                username=user["username"],
                email=user["email"],
                filename=filename,
                original_size=result["original_size"],
                compressed_size=result["compressed_size"],
                compression_type="pdf",
            )
            db.add(record)
            await db.commit()
        except Exception:
            pass

        return Response(
            content=result["buffer"],
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
                "X-Original-Size": str(result["original_size"]),
                "X-Compressed-Size": str(result["compressed_size"]),
            },
        )
    except Exception as e:
        print(f"PDF compression error: {e}")
        return Response(content=str(e), status_code=500)
