import io
import pikepdf
from PIL import Image

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



def _compress_pil_image(img: Image.Image, quality: int, max_dim: int) -> tuple[bytes, str]:
    """Compress a PIL image to JPEG bytes. Returns (bytes, color_mode)."""
    original_mode = img.mode

    # Keep CMYK as CMYK for accurate colors, convert others to RGB
    if img.mode == "CMYK":
        pass  # Keep as-is, JPEG supports CMYK
    elif img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    w, h = img.size
    if max_dim > 0 and (w > max_dim or h > max_dim):
        ratio = min(max_dim / w, max_dim / h)
        img = img.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=quality, optimize=True)
    return out.getvalue(), img.mode


def _should_skip(xobj) -> bool:
    """Check if image should be skipped (indexed, too small)."""
    cs = str(xobj.get("/ColorSpace", ""))
    if "/Indexed" in cs:
        return True
    w = int(xobj.get("/Width", 0))
    h = int(xobj.get("/Height", 0))
    if w < 50 or h < 50:
        return True
    # Skip SMask images themselves (grayscale masks)
    # But DON'T skip images that HAVE an SMask - we can still compress them
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
            compressed, color_mode = _compress_pil_image(pil_img, img_quality, max_dim)

            if len(compressed) < original_raw_size:
                new_img = Image.open(io.BytesIO(compressed))
                new_w, new_h = new_img.size
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
            if color_mode == "CMYK":
                obj["/ColorSpace"] = pikepdf.Name("/DeviceCMYK")
            elif color_mode == "L":
                obj["/ColorSpace"] = pikepdf.Name("/DeviceGray")
            else:
                obj["/ColorSpace"] = pikepdf.Name("/DeviceRGB")

            # Remove old decode params (no longer valid after recompression)
            if "/DecodeParms" in obj:
                del obj["/DecodeParms"]

            # Resize SMask if image dimensions changed
            smask = obj.get("/SMask")
            if smask and (new_w != int(smask.get("/Width", 0)) or new_h != int(smask.get("/Height", 0))):
                try:
                    smask_img = pikepdf.PdfImage(smask).as_pil_image()
                    smask_resized = smask_img.resize((new_w, new_h), Image.LANCZOS)
                    out = io.BytesIO()
                    smask_resized.save(out, format="PNG")
                    smask_pil = Image.open(io.BytesIO(out.getvalue()))
                    # Write resized mask back
                    smask_bytes = smask_resized.tobytes()
                    smask.write(smask_bytes, filter=pikepdf.Name("/FlateDecode"))
                    smask["/Width"] = new_w
                    smask["/Height"] = new_h
                except Exception:
                    pass  # Keep original SMask if resize fails

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
