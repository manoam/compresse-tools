from io import BytesIO
from PIL import Image


def compress_image(input_bytes: bytes, quality: int = 70, output_format: str | None = None) -> dict:
    """Compress an image using Pillow."""
    original_size = len(input_bytes)

    img = Image.open(BytesIO(input_bytes))

    # Auto-rotate based on EXIF
    from PIL import ImageOps
    img = ImageOps.exif_transpose(img)

    # Determine output format
    fmt = output_format or img.format or "JPEG"
    fmt = fmt.upper()
    if fmt == "JPG":
        fmt = "JPEG"

    # Convert RGBA to RGB for JPEG
    if fmt == "JPEG" and img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    output = BytesIO()

    if fmt == "JPEG":
        img.save(output, format="JPEG", quality=quality, optimize=True)
    elif fmt == "PNG":
        img.save(output, format="PNG", optimize=True)
    elif fmt == "WEBP":
        img.save(output, format="WEBP", quality=quality, method=6)
    else:
        img.save(output, format=fmt, quality=quality)

    compressed_bytes = output.getvalue()

    return {
        "buffer": compressed_bytes,
        "original_size": original_size,
        "compressed_size": len(compressed_bytes),
        "format": fmt.lower(),
    }
