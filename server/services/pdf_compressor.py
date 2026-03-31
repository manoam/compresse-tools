import io
import pikepdf
from PIL import Image, ImageCms

PROFILES = {
    "screen": {"quality": 40, "max_dim": 1200},
    "ebook": {"quality": 60, "max_dim": 1800},
    "printer": {"quality": 85, "max_dim": 3000},
}


def _extract_image(pdf: pikepdf.Pdf, xobj) -> Image.Image | None:
    """Try to extract an image from a PDF XObject as a PIL Image."""
    try:
        pdfimage = pikepdf.PdfImage(xobj)
        pil_image = pdfimage.as_pil_image()
        return pil_image
    except Exception:
        return None


def _cmyk_to_rgb(img: Image.Image) -> Image.Image:
    """Convert CMYK to RGB with proper color handling."""
    # Try ICC-based conversion first (most accurate)
    try:
        srgb_profile = ImageCms.createProfile("sRGB")
        # Pillow can convert CMYK to RGB directly
        return img.convert("RGB")
    except Exception:
        return img.convert("RGB")


def _compress_pil_image(img: Image.Image, quality: int, max_dim: int) -> bytes:
    """Compress a PIL image to JPEG bytes."""
    if img.mode == "CMYK":
        img = _cmyk_to_rgb(img)
    elif img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    w, h = img.size
    if max_dim > 0 and (w > max_dim or h > max_dim):
        ratio = min(max_dim / w, max_dim / h)
        img = img.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=quality, optimize=True)
    return out.getvalue()


def _should_skip(xobj) -> bool:
    """Check if image should be skipped (transparency, indexed, too small)."""
    if xobj.get("/SMask"):
        return True
    cs = str(xobj.get("/ColorSpace", ""))
    if "/Indexed" in cs:
        return True
    w = int(xobj.get("/Width", 0))
    h = int(xobj.get("/Height", 0))
    if w < 50 or h < 50:
        return True
    return False


def compress_pdf(input_bytes: bytes, quality: str = "ebook") -> dict:
    """Compress PDF by recompressing each embedded image with Pillow."""
    original_size = len(input_bytes)
    profile = PROFILES.get(quality, PROFILES["ebook"])
    img_quality = profile["quality"]
    max_dim = profile["max_dim"]

    try:
        pdf = pikepdf.Pdf.open(io.BytesIO(input_bytes))
    except Exception as e:
        raise RuntimeError(f"Impossible d'ouvrir le PDF : {e}")

    # First pass: collect ALL image objects and their compressed versions
    # Key: (objgen) -> compressed stream data
    compressed_cache = {}  # objgen -> (compressed_bytes, new_w, new_h, color_mode) or None
    images_processed = 0

    # Iterate all objects in the PDF to find images (handles shared objects)
    for obj in pdf.objects:
        try:
            if not isinstance(obj, pikepdf.Stream):
                continue
            if str(obj.get("/Subtype", "")) != "/Image":
                continue

            objgen = obj.objgen
            if objgen in compressed_cache:
                continue

            if _should_skip(obj):
                compressed_cache[objgen] = None
                continue

            pil_img = _extract_image(pdf, obj)
            if pil_img is None:
                compressed_cache[objgen] = None
                continue

            original_raw_size = len(obj.read_raw_bytes())
            compressed = _compress_pil_image(pil_img, img_quality, max_dim)

            if len(compressed) < original_raw_size:
                new_img = Image.open(io.BytesIO(compressed))
                new_w, new_h = new_img.size
                color_mode = pil_img.mode if pil_img.mode in ("RGB", "L") else "RGB"
                compressed_cache[objgen] = (compressed, new_w, new_h, color_mode)
                w, h = pil_img.size
                print(f"  Compressed image obj{objgen}: {w}x{h} -> {new_w}x{new_h}, {original_raw_size} -> {len(compressed)} bytes")
                images_processed += 1
            else:
                compressed_cache[objgen] = None
                print(f"  Kept original image obj{objgen}: compressed would be larger")

        except Exception as e:
            print(f"  Error processing obj{obj.objgen if hasattr(obj, 'objgen') else '?'}: {e}")
            continue

    print(f"  Cache: {len(compressed_cache)} entries, {images_processed} compressed")

    # Second pass: replace image data in-place on the actual objects
    for obj in pdf.objects:
        try:
            if not isinstance(obj, pikepdf.Stream):
                continue
            if str(obj.get("/Subtype", "")) != "/Image":
                continue

            objgen = obj.objgen
            cached = compressed_cache.get(objgen)
            if cached is None:
                continue

            compressed_bytes, new_w, new_h, color_mode = cached

            # Replace the stream data in-place
            obj.write(compressed_bytes, filter=pikepdf.Name("/DCTDecode"))
            obj["/Width"] = new_w
            obj["/Height"] = new_h
            obj["/BitsPerComponent"] = 8
            if color_mode == "L":
                obj["/ColorSpace"] = pikepdf.Name("/DeviceGray")
            else:
                obj["/ColorSpace"] = pikepdf.Name("/DeviceRGB")

            # Remove old filter-related keys
            for key_to_remove in ["/DecodeParms", "/SMask"]:
                if key_to_remove in obj:
                    del obj[key_to_remove]

        except Exception:
            continue

    # Save
    out_buf = io.BytesIO()
    pdf.save(out_buf, linearize=True, compress_streams=True)
    compressed_bytes = out_buf.getvalue()
    compressed_size = len(compressed_bytes)
    pdf.close()

    print(f"PDF compression: {images_processed} images processed, {original_size} -> {compressed_size}")

    if compressed_size >= original_size:
        return {
            "buffer": input_bytes,
            "original_size": original_size,
            "compressed_size": original_size,
        }

    return {
        "buffer": compressed_bytes,
        "original_size": original_size,
        "compressed_size": compressed_size,
    }
