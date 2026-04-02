from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from config import STATIC_DIR

router = APIRouter()


@router.get("/seo/", response_class=HTMLResponse)
async def serve_homepage_bg():
    file_path = STATIC_DIR / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")


@router.get("/seo/en/", response_class=HTMLResponse)
async def serve_homepage_en():
    file_path = STATIC_DIR / "en" / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")


@router.get("/seo/city/{city_slug}/", response_class=HTMLResponse)
async def serve_city_page_bg(city_slug: str):
    file_path = STATIC_DIR / "city" / city_slug / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")


@router.get("/seo/en/city/{city_slug}/", response_class=HTMLResponse)
async def serve_city_page_en(city_slug: str):
    file_path = STATIC_DIR / "en" / "city" / city_slug / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")


@router.get("/seo/city/{city_slug}/ortho/", response_class=HTMLResponse)
async def serve_ortho_page_bg(city_slug: str):
    file_path = STATIC_DIR / "city" / city_slug / "ortho" / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")


@router.get("/seo/en/city/{city_slug}/ortho/", response_class=HTMLResponse)
async def serve_ortho_page_en(city_slug: str):
    file_path = STATIC_DIR / "en" / "city" / city_slug / "ortho" / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")


@router.get("/seo/static/{file_path:path}")
async def serve_static_file(file_path: str):
    full_path = STATIC_DIR / file_path
    if full_path.exists() and full_path.is_file():
        return FileResponse(full_path)
    raise HTTPException(status_code=404, detail="File not found")
