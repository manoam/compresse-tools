import subprocess
import shutil
import tempfile
import os
import platform


def _find_ghostscript() -> str:
    """Find Ghostscript binary on Windows or Linux."""
    if platform.system() == "Windows":
        for path in [
            r"C:\Program Files\gs\gs10.07.0\bin\gswin64c.exe",
            r"C:\Program Files (x86)\gs\gs10.07.0\bin\gswin32c.exe",
        ]:
            if os.path.exists(path):
                return path
        found = shutil.which("gswin64c") or shutil.which("gswin32c")
        if found:
            return found
    else:
        found = shutil.which("gs")
        if found:
            return found
    raise RuntimeError("Ghostscript not found. Please install it.")


GS_PATH = _find_ghostscript()

# Compression profiles with explicit image downsampling settings
PROFILES = {
    "screen": {
        "dpi": 72,
        "image_quality": 40,
        "desc": "Web / écran (72 dpi)",
    },
    "ebook": {
        "dpi": 150,
        "image_quality": 60,
        "desc": "Équilibré (150 dpi)",
    },
    "printer": {
        "dpi": 300,
        "image_quality": 80,
        "desc": "Impression (300 dpi)",
    },
    "prepress": {
        "dpi": 300,
        "image_quality": 95,
        "desc": "Qualité maximale",
    },
}


def compress_pdf(input_bytes: bytes, quality: str = "ebook") -> dict:
    """
    Compress a PDF using Ghostscript with aggressive image optimization.
    """
    original_size = len(input_bytes)
    profile = PROFILES.get(quality, PROFILES["ebook"])
    dpi = profile["dpi"]
    img_quality = profile["image_quality"]

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_in:
        tmp_in.write(input_bytes)
        tmp_in_path = tmp_in.name

    tmp_out_path = tmp_in_path.replace(".pdf", "_compressed.pdf")

    try:
        cmd = [
            GS_PATH,
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            f"-dPDFSETTINGS=/{quality}",
            "-dNOPAUSE",
            "-dBATCH",
            "-dQUIET",
            # Force image downsampling
            "-dDownsampleColorImages=true",
            "-dDownsampleGrayImages=true",
            "-dDownsampleMonoImages=true",
            f"-dColorImageResolution={dpi}",
            f"-dGrayImageResolution={dpi}",
            f"-dMonoImageResolution={dpi}",
            # Force JPEG compression for color/gray images
            "-dAutoFilterColorImages=false",
            "-dAutoFilterGrayImages=false",
            "-dColorImageFilter=/DCTEncode",
            "-dGrayImageFilter=/DCTEncode",
            # Set JPEG quality
            f"-c '<< /ColorImageDict << /QFactor {(100 - img_quality) / 100:.2f} /Blend 1 /HSamples [2 1 1 2] /VSamples [2 1 1 2] >> >> setdistillerparams'",
            f"-c '<< /GrayImageDict << /QFactor {(100 - img_quality) / 100:.2f} /Blend 1 /HSamples [2 1 1 2] /VSamples [2 1 1 2] >> >> setdistillerparams'",
            # Strip metadata
            "-dDetectDuplicateImages=true",
            "-dCompressFonts=true",
            "-dSubsetFonts=true",
            f"-sOutputFile={tmp_out_path}",
            tmp_in_path,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            # Fallback: try simple compression without custom image settings
            cmd_simple = [
                GS_PATH,
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                f"-dPDFSETTINGS=/{quality}",
                "-dNOPAUSE",
                "-dBATCH",
                "-dQUIET",
                "-dDownsampleColorImages=true",
                "-dDownsampleGrayImages=true",
                f"-dColorImageResolution={dpi}",
                f"-dGrayImageResolution={dpi}",
                "-dDetectDuplicateImages=true",
                "-dCompressFonts=true",
                "-dSubsetFonts=true",
                f"-sOutputFile={tmp_out_path}",
                tmp_in_path,
            ]
            result = subprocess.run(cmd_simple, capture_output=True, text=True, timeout=120)

            if result.returncode != 0:
                raise RuntimeError(f"Ghostscript error: {result.stderr}")

        with open(tmp_out_path, "rb") as f:
            compressed_bytes = f.read()

        compressed_size = len(compressed_bytes)

        # If compression made it larger, return original
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

    finally:
        for path in [tmp_in_path, tmp_out_path]:
            if os.path.exists(path):
                os.unlink(path)
