from io import BytesIO
from PIL import Image, ImageOps


def compress_image(input_bytes: bytes, quality: int = 70, output_format: str | None = None) -> dict:
    """Compress an image using Pillow with smart optimization."""
    original_size = len(input_bytes)

    img = Image.open(BytesIO(input_bytes))

    # Auto-rotate based on EXIF
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
        # Smart subsampling: keep 4:4:4 at high quality for sharpness
        subsampling = "4:4:4" if quality >= 90 else "4:2:0"
        img.save(
            output,
            format="JPEG",
            quality=quality,
            optimize=True,
            subsampling=subsampling,
            # Strip all metadata (EXIF, ICC, etc.) for smaller size
        )
    elif fmt == "PNG":
        # For PNG: strip metadata, max compression level
        # Convert to palette mode if possible (huge savings)
        if img.mode == "RGBA":
            # Keep RGBA, just optimize compression
            img.save(output, format="PNG", optimize=True, compress_level=9)
        else:
            img = img.convert("RGB")
            # Try to quantize to palette for smaller size
            try:
                quantized = img.quantize(colors=256, method=2)
                quantized.save(output, format="PNG", optimize=True, compress_level=9)
            except Exception:
                img.save(output, format="PNG", optimize=True, compress_level=9)
    elif fmt == "WEBP":
        img.save(
            output,
            format="WEBP",
            quality=quality,
            method=6,  # slowest but best compression
        )
    else:
        img.save(output, format=fmt, quality=quality)

    compressed_bytes = output.getvalue()

    # If compression made it larger, return original
    if compressed_bytes and len(compressed_bytes) >= original_size:
        return {
            "buffer": input_bytes,
            "original_size": original_size,
            "compressed_size": original_size,
            "format": fmt.lower(),
        }

    return {
        "buffer": compressed_bytes,
        "original_size": original_size,
        "compressed_size": len(compressed_bytes),
        "format": fmt.lower(),
    }
