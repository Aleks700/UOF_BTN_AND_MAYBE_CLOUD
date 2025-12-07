import os
import xml.etree.ElementTree as ET
from datetime import datetime
import geopandas as gpd

class MaxarFinder():
    
    def __init__(self):
        self.listOfDict: dict = {}
       
    
    def insertTif(self, tifId: str, tifSrc: str) -> None:
        self.listOfDict[tifId]["srcTif"] = tifSrc

    def insertXml(self, tifId: str, srcXml: str) -> None:
        self.listOfDict[tifId]["srcXml"] = srcXml
        
        # Парсим XML и извлекаем нужные данные
        try:
            tree = ET.parse(srcXml)
            root = tree.getroot()

            # --- Дата снимка ---
            first_line_time = root.find('.//FIRSTLINETIME')
            if first_line_time is not None:
                dt = datetime.fromisoformat(first_line_time.text.replace('Z', '+00:00'))
                self.listOfDict[tifId]["date"] = dt.strftime('%Y-%m-%d')

            # --- Угол (средний off-nadir) ---
            off_nadir = root.find('.//MEANOFFNADIRVIEWANGLE')
            if off_nadir is not None:
                self.listOfDict[tifId]["angle"] = float(off_nadir.text)

            # --- Облачность ---
            cloud_cover = root.find('.//CLOUDCOVER')
            if cloud_cover is not None:
                self.listOfDict[tifId]["cloud_cover"] = float(cloud_cover.text) * 100  # в процентах

        except Exception as e:
            print(f"Ошибка при парсинге XML {srcXml}: {e}")
    def insertShp(self, tifId: str, srcShp: str) -> None:
        self.listOfDict[tifId]["srcShp"] = srcShp
        
        try:
            gdf = gpd.read_file(srcShp)
            
            if len(gdf) == 0:
                print(f"Пустой SHP: {srcShp}")
                return

            geom = gdf.geometry.iloc[0]
            
            # 1. Bounds (для fitBounds в Leaflet)
            minx, miny, maxx, maxy = geom.bounds
            self.listOfDict[tifId]["bounder"] = [minx, miny, maxx, maxy]

            # 2. Центроид (для метки)
            centroid = geom.centroid
            self.listOfDict[tifId]["centroid"] = [centroid.x, centroid.y]

            # 3. WKT (для PostGIS)
            self.listOfDict[tifId]["wkt"] = geom.wkt

            # 4. Координаты вершин полигона → для Leaflet
            if geom.geom_type == "Polygon":
                # Exterior ring coordinates: [[lon, lat], ...]
                exterior = list(geom.exterior.coords)
                # Leaflet использует [lat, lon]!
                leaflet_coords = [[lat, lon] for lon, lat in exterior]
                self.listOfDict[tifId]["leaflet_polygon"] = leaflet_coords
            else:
                self.listOfDict[tifId]["leaflet_polygon"] = []

            # 5. CRS
            if gdf.crs:
                self.listOfDict[tifId]["coordinate"] = gdf.crs.to_string()
                # Также сохраним SRID для PostGIS
                self.listOfDict[tifId]["srid"] = gdf.crs.to_epsg()
            else:
                self.listOfDict[tifId]["coordinate"] = "Unknown"
                self.listOfDict[tifId]["srid"] = None

        except Exception as e:
            print(f"Ошибка при чтении SHP {srcShp}: {e}")
    def findTiff(self, pathToSearch: str):
        for root, dirs, files in os.walk(pathToSearch):
            for file in files:
                new_file = file.lower()
                if (new_file.endswith('_pixel_shape.shp') or 
                    new_file.endswith('.tif') or 
                    new_file.endswith('.tiff') or 
                    (new_file.endswith('.xml') and not new_file.endswith('readme.xml'))):
                    
                    tifId = ''
                    suffix = new_file.split('.')[-1]
                    
                    if new_file.endswith('_pixel_shape.shp'):
                        tifId = new_file.removesuffix('_pixel_shape.shp')
                    else:
                        tifId = new_file[:new_file.rfind('.')]
                    
                    if tifId not in self.listOfDict:
                        self.listOfDict[tifId] = {
                            "angle": 0,
                            "srcTif": "",
                            "srcShp": "",
                            "srcXml": "",
                            "coordinate": "",
                            "date": "",
                            "cloud_cover": 0.0,
                            "bounder": [],           # [minx, miny, maxx, maxy]
                            "centroid": [],          # [lon, lat]
                            "wkt": ""                # WKT для PostGIS
                        }
                    
                    full_path = os.path.join(root, file)
                    match suffix:
                        case 'shp':
                            self.insertShp(tifId, full_path)
                        case 'xml':
                            self.insertXml(tifId, full_path)
                        case 'tif' | 'tiff':
                            self.insertTif(tifId, full_path)

    def showAll(self):
        for tifId, data in self.listOfDict.items():
            print(f"ID: {tifId}")
            print(f"  Дата: {data['date']}")
            print(f"  Угол: {data['angle']:.2f}°")
            print(f"  Облачность: {data['cloud_cover']:.2f}%")
            print(f"  TIF: {os.path.basename(data['srcTif'])}")
            print(f"  SHP: {os.path.basename(data['srcShp'])}")
            print(f"  XML: {os.path.basename(data['srcXml'])}")
            print(f"  CRS: {data['coordinate']}")
            print(f"  Bounds: {data['bounder']}")
            print(f"  Центр: {data['centroid']}")
            print(f"  WKT: {data['wkt'][:100]}...")
            print("-" * 60)

    # === Для экспорта в PostGIS (пример) ===
    def to_postgis_sql(self, table_name="maxar_tiles"):
        sql_lines = [f"INSERT INTO {table_name} (tif_id, acquisition_date, off_nadir_angle, cloud_cover, geom) VALUES"]
        
        values = []
        for tifId, d in self.listOfDict.items():
            if d['wkt'] and d['date']:
                values.append(
                    f"('{tifId}', "
                    f"'{d['date']}', "
                    f"{d['angle']}, "
                    f"{d['cloud_cover']}, "
                    f"ST_GeomFromText('{d['wkt']}', 32642)"  # Укажи нужный SRID
                    f")"
                )
        
        if values:
            sql = ";\n".join([sql_lines[0] + ",\n".join(values)]) + ";"
            return sql
        return "-- Нет данных для вставки"

# === Запуск ===
data = MaxarFinder()
data.findTiff(r'D:\Maxar')
data.showAll()

# Пример SQL для PostGIS
print("\n=== SQL для PostGIS ===")
print(data.to_postgis_sql())