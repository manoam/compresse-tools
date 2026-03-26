from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import Response
from services.image_compressor import compress_image
from typing import Optional

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@router.post("/")
async def compress_image_route(
    file: UploadFile = File(...),
    quality: int = Form(70),
    format: Optional[str] = Form(None),
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
