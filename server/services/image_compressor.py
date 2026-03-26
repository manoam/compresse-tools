from io import BytesIO
from PIL import Image, ImageOps, ImageCms


def _convert_to_srgb(img: Image.Image) -> Image.Image:
    """Convert image from any ICC profile to sRGB to preserve colors."""
    try:
        icc_profile = img.info.get("icc_profile")
        if icc_profile:
            input_profile = ImageCms.ImageCmsProfile(BytesIO(icc_profile))
            srgb_profile = ImageCms.createProfile("sRGB")
            img = ImageCms.profileToProfile(img, input_profile, srgb_profile)
    except Exception:
        pass
    return img


def compress_image(input_bytes: bytes, quality: int = 70, output_format: str | None = None) -> dict:
    """Compress an image using Pillow with smart optimization."""
    original_size = len(input_bytes)

    img = Image.open(BytesIO(input_bytes))

    # Auto-rotate based on EXIF
    img = ImageOps.exif_transpose(img)

    # Convert to sRGB to preserve colors when stripping ICC profile
    img = _convert_to_srgb(img)

    # Determine output format
    fmt = output_format or img.format or "JPEG"
    fmt = fmt.upper()
    if fmt == "JPG":
        fmt = "JPEG"

    # Convert RGBA to RGB for JPEG
    if fmt == "JPEG" and img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    elif fmt == "JPEG" and img.mode == "CMYK":
        img = img.convert("RGB")

    output = BytesIO()

    # Build sRGB ICC profile to embed
    srgb_icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()

    if fmt == "JPEG":
        subsampling = "4:4:4" if quality >= 90 else "4:2:0"
        img.save(
            output,
            format="JPEG",
            quality=quality,
            optimize=True,
            subsampling=subsampling,
            icc_profile=srgb_icc,
        )
    elif fmt == "PNG":
        if img.mode == "RGBA":
            img.save(output, format="PNG", optimize=True, compress_level=9, icc_profile=srgb_icc)
        else:
            img = img.convert("RGB")
            img.save(output, format="PNG", optimize=True, compress_level=9, icc_profile=srgb_icc)
    elif fmt == "WEBP":
        img.save(
            output,
            format="WEBP",
            quality=quality,
            method=6,
            icc_profile=srgb_icc,
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
