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


def compress_pdf(input_bytes: bytes, quality: str = "ebook") -> dict:
    """Compress a PDF using Ghostscript. Simple and reliable."""
    original_size = len(input_bytes)

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_in:
        tmp_in.write(input_bytes)
        tmp_in_path = tmp_in.name

    tmp_out_path = tmp_in_path.replace(".pdf", "_compressed.pdf")

    try:
        # Simple, reliable compression using only -dPDFSETTINGS
        cmd = [
            GS_PATH,
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            f"-dPDFSETTINGS=/{quality}",
            "-dNOPAUSE",
            "-dBATCH",
            "-dQUIET",
            "-dDetectDuplicateImages=true",
            "-dCompressFonts=true",
            "-dSubsetFonts=true",
            f"-sOutputFile={tmp_out_path}",
            tmp_in_path,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

        if result.returncode != 0:
            raise RuntimeError(f"Ghostscript error: {result.stderr}")

        with open(tmp_out_path, "rb") as f:
            compressed_bytes = f.read()

        compressed_size = len(compressed_bytes)

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
