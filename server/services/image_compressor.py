import subprocess
import shutil
import tempfile
import os
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


def _has_tool(name: str) -> bool:
    return shutil.which(name) is not None


def _compress_jpeg_mozjpeg(img: Image.Image, quality: int, icc_profile: bytes) -> bytes:
    """Compress JPEG using mozjpeg's cjpeg for best compression."""
    # Save as BMP/PPM for cjpeg input
    with tempfile.NamedTemporaryFile(suffix=".ppm", delete=False) as tmp_in:
        img.save(tmp_in, format="PPM")
        tmp_in_path = tmp_in.name

    tmp_out_path = tmp_in_path + ".jpg"

    try:
        cmd = ["cjpeg", "-quality", str(quality), "-outfile", tmp_out_path, tmp_in_path]
        result = subprocess.run(cmd, capture_output=True, timeout=60)

        if result.returncode != 0:
            raise RuntimeError(f"cjpeg error: {result.stderr.decode()}")

        with open(tmp_out_path, "rb") as f:
            return f.read()
    finally:
        for p in [tmp_in_path, tmp_out_path]:
            if os.path.exists(p):
                os.unlink(p)


def _compress_jpeg_pillow(img: Image.Image, quality: int, icc_profile: bytes) -> bytes:
    """Fallback: compress JPEG using Pillow."""
    output = BytesIO()
    subsampling = "4:4:4" if quality >= 90 else "4:2:0"
    img.save(
        output,
        format="JPEG",
        quality=quality,
        optimize=True,
        subsampling=subsampling,
        icc_profile=icc_profile,
    )
    return output.getvalue()


def _compress_png(img: Image.Image, quality: int, icc_profile: bytes) -> bytes:
    """Compress PNG using pngquant + oxipng, fallback to Pillow."""
    has_pngquant = _has_tool("pngquant")
    has_oxipng = _has_tool("oxipng")

    if not has_pngquant and not has_oxipng:
        # Fallback to Pillow
        output = BytesIO()
        img.save(output, format="PNG", optimize=True, compress_level=9, icc_profile=icc_profile)
        return output.getvalue()

    # Save initial PNG
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        img.save(tmp, format="PNG", icc_profile=icc_profile)
        tmp_path = tmp.name

    try:
        # Step 1: pngquant - lossy quantization (huge size reduction)
        if has_pngquant:
            min_q = max(0, quality - 10)
            max_q = quality
            cmd = [
                "pngquant",
                "--force",
                "--quality", f"{min_q}-{max_q}",
                "--speed", "1",
                "--output", tmp_path,
                tmp_path,
            ]
            subprocess.run(cmd, capture_output=True, timeout=60)

        # Step 2: oxipng - lossless optimization
        if has_oxipng:
            cmd = ["oxipng", "-o", "4", "--strip", "safe", tmp_path]
            subprocess.run(cmd, capture_output=True, timeout=60)

        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def compress_image(input_bytes: bytes, quality: int = 70, output_format: str | None = None) -> dict:
    """Compress an image using the best available tools."""
    original_size = len(input_bytes)

    img = Image.open(BytesIO(input_bytes))

    # Auto-rotate based on EXIF
    img = ImageOps.exif_transpose(img)

    # Convert to sRGB to preserve colors
    img = _convert_to_srgb(img)

    # Determine output format
    fmt = output_format or img.format or "JPEG"
    fmt = fmt.upper()
    if fmt == "JPG":
        fmt = "JPEG"

    # Convert modes for JPEG
    if fmt == "JPEG" and img.mode in ("RGBA", "P", "CMYK"):
        img = img.convert("RGB")

    # Build sRGB ICC profile
    srgb_icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()

    if fmt == "JPEG":
        if _has_tool("cjpeg"):
            compressed_bytes = _compress_jpeg_mozjpeg(img, quality, srgb_icc)
        else:
            compressed_bytes = _compress_jpeg_pillow(img, quality, srgb_icc)
    elif fmt == "PNG":
        compressed_bytes = _compress_png(img, quality, srgb_icc)
    elif fmt == "WEBP":
        output = BytesIO()
        img.save(output, format="WEBP", quality=quality, method=6, icc_profile=srgb_icc)
        compressed_bytes = output.getvalue()
    else:
        output = BytesIO()
        img.save(output, format=fmt, quality=quality)
        compressed_bytes = output.getvalue()

    # If compression made it larger, return original
    if len(compressed_bytes) >= original_size:
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
