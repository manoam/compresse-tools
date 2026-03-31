import io
import pikepdf
from PIL import Image

# Profiles: quality = Pillow JPEG quality, max_dim = max width or height for images
PROFILES = {
    "screen": {"quality": 40, "max_dim": 1200},
    "ebook": {"quality": 60, "max_dim": 1800},
    "printer": {"quality": 85, "max_dim": 3000},
}


def _recompress_image(raw_data: bytes, quality: int, max_dim: int) -> bytes | None:
    """Recompress a single image with Pillow. Returns JPEG bytes or None if failed."""
    try:
        img = Image.open(io.BytesIO(raw_data))

        # Convert to RGB if needed (CMYK, RGBA, P, etc.)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Resize if too large
        w, h = img.size
        if max_dim > 0 and (w > max_dim or h > max_dim):
            ratio = min(max_dim / w, max_dim / h)
            img = img.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)

        out = io.BytesIO()
        img.save(out, format="JPEG", quality=quality, optimize=True)
        return out.getvalue()
    except Exception:
        return None


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

    images_processed = 0

    for page in pdf.pages:
        try:
            resources = page.get("/Resources", {})
            xobjects = resources.get("/XObject", {})
        except Exception:
            continue

        for key in list(xobjects.keys()):
            try:
                xobj = xobjects[key]
                if not hasattr(xobj, "read_bytes"):
                    continue

                subtype = xobj.get("/Subtype")
                if str(subtype) != "/Image":
                    continue

                # Read raw image data
                raw_data = xobj.read_raw_bytes()
                width = int(xobj.get("/Width", 0))
                height = int(xobj.get("/Height", 0))

                if width == 0 or height == 0:
                    continue

                # Try to extract the image as PIL-readable data
                filter_name = str(xobj.get("/Filter", ""))

                if "/DCTDecode" in filter_name:
                    # Already JPEG - recompress
                    img_data = raw_data
                elif "/FlateDecode" in filter_name:
                    # PNG-like data - decompress first
                    try:
                        img_data = xobj.read_bytes()
                        # Reconstruct raw image from pixel data
                        bpc = int(xobj.get("/BitsPerComponent", 8))
                        cs = str(xobj.get("/ColorSpace", "/DeviceRGB"))
                        if "/DeviceRGB" in cs:
                            mode = "RGB"
                        elif "/DeviceGray" in cs:
                            mode = "L"
                        else:
                            continue

                        img = Image.frombytes(mode, (width, height), img_data)

                        # Resize if needed
                        w, h = img.size
                        if max_dim > 0 and (w > max_dim or h > max_dim):
                            ratio = min(max_dim / w, max_dim / h)
                            img = img.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)

                        out = io.BytesIO()
                        img.save(out, format="JPEG", quality=img_quality, optimize=True)
                        compressed = out.getvalue()

                        if len(compressed) < len(raw_data):
                            new_img = pikepdf.Stream(pdf, compressed)
                            new_img["/Filter"] = pikepdf.Name("/DCTDecode")
                            new_img["/Width"] = img.size[0]
                            new_img["/Height"] = img.size[1]
                            new_img["/ColorSpace"] = pikepdf.Name("/DeviceRGB") if img.mode == "RGB" else pikepdf.Name("/DeviceGray")
                            new_img["/BitsPerComponent"] = 8
                            xobjects[key] = new_img
                            images_processed += 1
                        continue
                    except Exception:
                        continue
                else:
                    continue

                # Recompress JPEG images
                compressed = _recompress_image(img_data, img_quality, max_dim)
                if compressed and len(compressed) < len(raw_data):
                    new_img = pikepdf.Stream(pdf, compressed)
                    new_img["/Filter"] = pikepdf.Name("/DCTDecode")

                    # Get new dimensions
                    try:
                        pil_img = Image.open(io.BytesIO(compressed))
                        new_img["/Width"] = pil_img.size[0]
                        new_img["/Height"] = pil_img.size[1]
                    except Exception:
                        new_img["/Width"] = width
                        new_img["/Height"] = height

                    cs = xobj.get("/ColorSpace")
                    if cs:
                        new_img["/ColorSpace"] = cs
                    else:
                        new_img["/ColorSpace"] = pikepdf.Name("/DeviceRGB")
                    new_img["/BitsPerComponent"] = 8

                    xobjects[key] = new_img
                    images_processed += 1

            except Exception:
                continue

    # Save compressed PDF
    out_buf = io.BytesIO()
    pdf.save(out_buf, linearize=True, compress_streams=True)
    compressed_bytes = out_buf.getvalue()
    compressed_size = len(compressed_bytes)

    pdf.close()

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
