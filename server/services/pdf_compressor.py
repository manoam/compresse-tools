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


def _compress_pil_image(img: Image.Image, quality: int, max_dim: int) -> bytes:
    """Compress a PIL image to JPEG bytes."""
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    w, h = img.size
    if max_dim > 0 and (w > max_dim or h > max_dim):
        ratio = min(max_dim / w, max_dim / h)
        img = img.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=quality, optimize=True)
    return out.getvalue()


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
    images_skipped = 0

    # Collect all image XObjects across all pages
    seen = set()
    for page in pdf.pages:
        _process_page_images(pdf, page, img_quality, max_dim, seen)

    # Count results
    images_processed = len(seen)

    # Save compressed PDF
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


def _process_page_images(pdf, page, img_quality, max_dim, seen):
    """Process all images in a page's resources."""
    try:
        resources = page.get("/Resources")
        if not resources:
            return
        xobjects = resources.get("/XObject")
        if not xobjects:
            return
    except Exception:
        return

    for key in list(xobjects.keys()):
        try:
            xobj = xobjects[key]

            # Skip if not an image
            subtype = xobj.get("/Subtype")
            if str(subtype) != "/Image":
                # Could be a Form XObject containing images
                if str(subtype) == "/Form":
                    _process_form_xobject(pdf, xobj, img_quality, max_dim, seen)
                continue

            # Skip if already processed (same object ID)
            obj_id = id(xobj)
            if obj_id in seen:
                continue
            seen.add(obj_id)

            # Try to extract as PIL image using pikepdf's built-in support
            pil_img = _extract_image(pdf, xobj)
            if pil_img is None:
                print(f"  Skipped image {key}: could not extract")
                continue

            # Get original raw size
            original_raw_size = len(xobj.read_raw_bytes())

            # Skip tiny images (icons, logos)
            w, h = pil_img.size
            if w < 50 or h < 50:
                continue

            # Skip images with transparency (SMask) - JPEG doesn't support it
            if xobj.get("/SMask"):
                print(f"  Skipped image {key}: has transparency (SMask)")
                continue

            # Skip images with Indexed/special ColorSpace - risky to convert
            cs = str(xobj.get("/ColorSpace", ""))
            if "/Indexed" in cs:
                print(f"  Skipped image {key}: Indexed ColorSpace")
                continue

            # Recompress
            compressed = _compress_pil_image(pil_img, img_quality, max_dim)

            # Only replace if smaller
            if len(compressed) < original_raw_size:
                # Get new dimensions
                new_img = Image.open(io.BytesIO(compressed))
                new_w, new_h = new_img.size

                new_stream = pikepdf.Stream(pdf, compressed)
                new_stream["/Filter"] = pikepdf.Name("/DCTDecode")
                new_stream["/Width"] = new_w
                new_stream["/Height"] = new_h
                new_stream["/BitsPerComponent"] = 8

                if pil_img.mode == "L":
                    new_stream["/ColorSpace"] = pikepdf.Name("/DeviceGray")
                else:
                    new_stream["/ColorSpace"] = pikepdf.Name("/DeviceRGB")

                xobjects[key] = new_stream
                print(f"  Compressed image {key}: {w}x{h} -> {new_w}x{new_h}, {original_raw_size} -> {len(compressed)} bytes")
            else:
                print(f"  Kept original image {key}: compressed would be larger")

        except Exception as e:
            print(f"  Error processing image {key}: {e}")
            continue


def _process_form_xobject(pdf, form_xobj, img_quality, max_dim, seen):
    """Process images inside a Form XObject (nested resources)."""
    try:
        resources = form_xobj.get("/Resources")
        if not resources:
            return
        xobjects = resources.get("/XObject")
        if not xobjects:
            return

        for key in list(xobjects.keys()):
            try:
                xobj = xobjects[key]
                subtype = xobj.get("/Subtype")
                if str(subtype) != "/Image":
                    continue

                obj_id = id(xobj)
                if obj_id in seen:
                    continue
                seen.add(obj_id)

                pil_img = _extract_image(pdf, xobj)
                if pil_img is None:
                    continue

                # Skip images with transparency or Indexed ColorSpace
                if xobj.get("/SMask"):
                    continue
                cs = str(xobj.get("/ColorSpace", ""))
                if "/Indexed" in cs:
                    continue

                original_raw_size = len(xobj.read_raw_bytes())
                w, h = pil_img.size
                if w < 50 or h < 50:
                    continue

                compressed = _compress_pil_image(pil_img, img_quality, max_dim)

                if len(compressed) < original_raw_size:
                    new_img = Image.open(io.BytesIO(compressed))
                    new_w, new_h = new_img.size

                    new_stream = pikepdf.Stream(pdf, compressed)
                    new_stream["/Filter"] = pikepdf.Name("/DCTDecode")
                    new_stream["/Width"] = new_w
                    new_stream["/Height"] = new_h
                    new_stream["/BitsPerComponent"] = 8

                    if pil_img.mode == "L":
                        new_stream["/ColorSpace"] = pikepdf.Name("/DeviceGray")
                    else:
                        new_stream["/ColorSpace"] = pikepdf.Name("/DeviceRGB")

                    xobjects[key] = new_stream

            except Exception:
                continue
    except Exception:
        return
