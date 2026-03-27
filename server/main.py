import sys
import os
from contextlib import asynccontextmanager

# Ensure server/ is in sys.path when run from project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db
from routes.compress_image import router as image_router
from routes.compress_pdf import router as pdf_router
from routes.history import router as history_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="CompressTool API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Original-Size", "X-Compressed-Size", "X-Images-Compressed"],
)

app.include_router(image_router, prefix="/api/compress/image")
app.include_router(pdf_router, prefix="/api/compress/pdf")
app.include_router(history_router, prefix="/api/history")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve React static files in production
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve React SPA - all non-API routes return index.html."""
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn

    is_dev = not os.path.isdir(STATIC_DIR)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3001,
        reload=is_dev,
        reload_dirs=[os.path.dirname(os.path.abspath(__file__))] if is_dev else None,
        app_dir=os.path.dirname(os.path.abspath(__file__)),
    )
