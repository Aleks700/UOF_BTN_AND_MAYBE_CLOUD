from fastapi import FastAPI, UploadFile, File, Query
import httpx
import geopandas as gpd
from shapely.geometry import Polygon
import tempfile
import os
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Geo Catalog Proxy with KML Filter")



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5501",
        "http://127.0.0.1:5501",
    ],
    allow_origin_regex=r"http://10\.\d+\.\d+\.\d+:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "http://10.0.6.117:8001/CatalogService"



df_clouds = pd.read_excel("ALL_2024.xlsx")


# ✅ Приводим процент к float (21,8 → 21.8)
df_clouds["Cloud_Coverage_%"] = (
    df_clouds["Cloud_Coverage_%"]
    .astype(str)
    .str.replace(",", ".", regex=False)
    .astype(float)
)

# ✅ Делаем словарь:
# { Image_ID: процент }
cloud_dict = dict(
    zip(df_clouds["Image_ID"], df_clouds["Cloud_Coverage_%"])
)
# print(cloud_dict)

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
    DateFr: str = Query("2024-10-30"),
    DateTo: str = Query("2024-11-08"),
    West: float = Query("74.459002"),
    East: float = Query("53.499767"),
    South: float = Query("49.275218"),
    North: float = Query("65.710996"),
    Cloud: float| None = Query(100)
):
    params = {
        "DateFr": DateFr,
        "DateTo": DateTo,
        "West": West,
        "East": East,
        "South": South,
        "North": North,
    }
    print(Cloud)

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(BASE_URL, params=params)
        data = response.json()
    # print('work')
    # return response.json()
    filtered = []

    for item in data["data"]:
        print(item)
        # ✅ Берём ID без .jpeg
        image_id = item["new_quicklook"].replace(".jpeg", "")
        print(image_id,"this is image id")
        print(image_id,"image id")
        # ✅ Получаем процент из Excel
        cloud_value = cloud_dict.get(image_id)
        print(cloud_value,"this cloud value")

        # ✅ Если есть в Excel и проходит по лимиту
        if cloud_value ==None :
            item["Cloud_Coverage"] = 0  # ✅ добавляем поле
            print(item,"item")
            filtered.append(item)
        elif cloud_value <= Cloud:
            # cloud_value is not None and cloud_value <= Cloud:
            item["Cloud_Coverage"] = cloud_value  # ✅ добавляем поле
            print(item,"item")
            filtered.append(item)
    print(filtered,"this is filtered")
    return {'data':filtered}


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
