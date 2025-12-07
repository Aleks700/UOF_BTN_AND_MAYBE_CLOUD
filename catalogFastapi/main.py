from fastapi import FastAPI, UploadFile, File, Query
import httpx
import geopandas as gpd
from shapely.geometry import Polygon
import tempfile
import os

app = FastAPI(title="Geo Catalog Proxy with KML Filter")

BASE_URL = "http://10.0.6.117:8001/CatalogService"


# ===========================
# ✅ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
# ===========================
def polygon_from_coordinates_string(coord_str: str) -> Polygon:
    """
    Преобразует строку:
    '47.74 67.37 48.14 67.53 48.04 67.86 47.63 67.69'
    → Polygon
    """
    values = list(map(float, coord_str.split()))
    points = []

    for i in range(0, len(values), 2):
        lat = values[i]
        lon = values[i + 1]
        points.append((lon, lat))  # Shapely → (x=lon, y=lat)

    return Polygon(points)


# ===========================
# ✅ 1. ПРОСТО ПРОКСИ
# ===========================
@app.get("/catalog")
async def get_catalog(
    DateFr: str = Query(...),
    DateTo: str = Query(...),
    West: float = Query(...),
    East: float = Query(...),
    South: float = Query(...),
    North: float = Query(...)
):
    params = {
        "DateFr": DateFr,
        "DateTo": DateTo,
        "West": West,
        "East": East,
        "South": South,
        "North": North,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(BASE_URL, params=params)

    return response.json()


# ===========================
# ✅ 2. ПРОКСИ + KML ФИЛЬТР
# ===========================
@app.post("/catalog/kml")
async def get_catalog_with_kml(
    DateFr: str = Query(...),
    DateTo: str = Query(...),
    file: UploadFile = File(...)
):
    # ✅ сохраняем KML
    with tempfile.NamedTemporaryFile(delete=False, suffix=".kml") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    # ✅ читаем геометрию из KML
    gdf = gpd.read_file(tmp_path)
    user_geometry = gdf.unary_union
    os.remove(tmp_path)

    # ✅ получаем все сцены за период
    params = {
        "DateFr": DateFr,
        "DateTo": DateTo,
        "West": -180,
        "East": 180,
        "South": -90,
        "North": 90,
    }

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.get(BASE_URL, params=params)

    data = response.json()["data"]

    # ✅ ПРОСТРАНСТВЕННАЯ ФИЛЬТРАЦИЯ
    result = []

    for obj in data:
        try:
            poly = polygon_from_coordinates_string(obj["Coordinates"])
            if poly.intersects(user_geometry):
                result.append(obj)
        except Exception as e:
            print("Ошибка геометрии:", obj.get("Code"), e)

    return {
        "total": len(data),
        "intersected": len(result),
        "items": result
    }
