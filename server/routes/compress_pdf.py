from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import Response
from services.pdf_compressor import compress_pdf

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
    file: UploadFile = File(...),
    quality: int = Form(60),
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
