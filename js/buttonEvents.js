
import { map, inputFirstLineNum, inputLineMax, inputCntLineAfterFirst, kmlLayerGroup,  } from './main.js';
import { QuicklookGroupLayer, footprintGroupLayer, removeLayerFromMap } from './map.js';
import { foundImage, searchOneImage, searchCatalogForKmlKmz } from './service/catalogService.js';
import { reinitializeSlider } from './utils/slider.js';
import { endLine, firstLine} from './workWithLines.js';


let geoJson;
const btnFind = document.getElementById('btnFind');
const inputSatelliteId = document.getElementById('inputSatelliteId');
let coordinatesFromKmlKmz = [];

var kmlMapLayer = null

function createTableForKmlKmz(coordinates){
    const inputStartDate = document.getElementById('startDate').value;
    const inputEndDate = document.getElementById('endDate').value;
    const selectedSatellites = Array.from(document.querySelectorAll('input[name="satellite"]:checked'))
        .map(checkbox => checkbox.value);


    // Получаем угол
 
    const angle = parseInt(document.getElementById('angle').value); // для целого числа
    const boundingBox = getBoundingBox(coordinates); 
    const searchOptions = {
        dateFrom: inputStartDate,
        dateTo: inputEndDate,
        west: boundingBox.north,
        east: boundingBox.east,
        south: boundingBox.west,
        north: boundingBox.south,
        satellites: selectedSatellites, // Пример спутников
        angle: angle // Пример угла съемки
    };
    searchCatalogForKmlKmz(searchOptions);
    removeLayerFromMap(QuicklookGroupLayer);
    removeLayerFromMap(footprintGroupLayer);
}


// Функция получения координат из KML
function getCoordinatesFromKML(kml) {
    const coordinates = [];
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kml, "text/xml");
    const placemarks = xmlDoc.getElementsByTagName('Placemark');

    for (let i = 0; i < placemarks.length; i++) {
        // Обрабатываем MultiGeometry внутри Placemark
        const multiGeometries = placemarks[i].getElementsByTagName('MultiGeometry');
        
        // Если в Placemark есть MultiGeometry
        for (let j = 0; j < multiGeometries.length; j++) {
            const polygons = multiGeometries[j].getElementsByTagName('Polygon');
            // Извлекаем координаты из каждого Polygon внутри MultiGeometry
            for (let k = 0; k < polygons.length; k++) {
                const coordinatesNode = polygons[k].getElementsByTagName('coordinates')[0];
                processCoordinatesNode(coordinatesNode, coordinates);
            }
        }

        // Если в Placemark есть прямой Polygon (не в MultiGeometry)
        const polygonsDirect = placemarks[i].getElementsByTagName('Polygon');
        for (let m = 0; m < polygonsDirect.length; m++) {
            const coordinatesNode = polygonsDirect[m].getElementsByTagName('coordinates')[0];
            processCoordinatesNode(coordinatesNode, coordinates);
        }
    }

    return coordinates;
}

function processCoordinatesNode(coordinatesNode, coordinates) {
    if (coordinatesNode) {
        const coords = coordinatesNode.textContent.trim().split(' ');
        coords.forEach((coord) => {
            const parts = coord.split(',');
            if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                coordinates.push([lat, lng]); // Leaflet использует порядок широта, долгота
            }
        });
    }
}




document.getElementById('headerBtnKmlUpload').addEventListener('click', function () {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.setAttribute('accept', '.kml,.kmz');
    // Обработчик события выбора файла
    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file.name.endsWith('.kml')) {
            removeLayerFromMap(kmlLayerGroup)
            // Если выбран KML файл
            const reader = new FileReader();
            reader.onload = function (e) {
                let kmlText = e.target.result;
                // Загрузка и добавление KML на карту Leaflet                
                loadAndAddKML(kmlText);
            };
            reader.readAsText(file);
        } else if (file.name.endsWith('.kmz')) {
            removeLayerFromMap(kmlLayerGroup)
            // Если выбран KMZ файл
            const reader = new FileReader();
            reader.onload = function (e) {
                const kmzData = e.target.result;
                // Работа с KMZ данными
                handleKMZData(kmzData);
                
            };
            
            reader.readAsArrayBuffer(file);
        }

       

    });
    // Нажатие на элемент input типа "file"
    fileInput.click();
});

// Функция загрузки и добавления KML на карту Leaflet
function loadAndAddKML(kmlText) {
    coordinatesFromKmlKmz = getCoordinatesFromKML(kmlText);
    createTableForKmlKmz(coordinatesFromKmlKmz);
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmlText, 'text/xml');
    geoJson = toGeoJSON.kml(kml);
    // Удаление предыдущего слоя KML, если он существует
    if (kmlMapLayer) {
        map.removeLayer(kmlMapLayer);
    }

    // Создание нового слоя KML
    kmlMapLayer = new L.KML(kml);
    map.fitBounds(kmlMapLayer.getBounds());
    kmlMapLayer.setStyle({ color: 'slateblue', fillColor: 'lightseagreen',   weight: 7});
    kmlMapLayer.addTo(kmlLayerGroup);

    // Получение координат слоя
    
}

// Функция обработки данных KMZ
function handleKMZData(kmzData) {
    // Создание экземпляра JSZip и загрузка KMZ данных
    const zip = new JSZip();
    zip.loadAsync(kmzData).then(function(zip) {
        // Найдите KML файл в архиве KMZ
        const kmlFile = zip.file(/.*\.kml$/i)[0];
        if (kmlFile) {
            return kmlFile.async('string');
        } else {
            throw new Error("KML file not found in KMZ archive.");
        }
    }).then(function(kmlContent) {
        // Здесь мы используем функцию getCoordinatesFromKML для анализа KML и извлечения координат
        coordinatesFromKmlKmz = getCoordinatesFromKML(kmlContent);
        createTableForKmlKmz(coordinatesFromKmlKmz);
        // Преобразуйте XML KML в объект и добавьте на карту
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlContent, 'text/xml');
        geoJson = toGeoJSON.kml(kml)
        // Создание слоя KML (этот код может потребоваться адаптировать в зависимости от вашей библиотеки)
        kmlMapLayer = new L.KML(kml); // Обратите внимание, что вам может потребоваться специальный обработчик для L.KML, если он не является стандартной частью Leaflet.
        map.fitBounds(kmlMapLayer.getBounds());
        kmlMapLayer.setStyle({ color: 'slateblue', fillColor: 'lightseagreen' });
        kmlMapLayer.addTo(kmlLayerGroup);
    }).catch(function(error) {
        console.error(error);
    });
}





btnFind.addEventListener('click', function() {
    const imageID = inputSatelliteId.value;
    if (imageID) {
        searchOneImage(imageID);
    } else {
        // Пользователь не ввел ID снимка
        console.error('Please enter the image ID');
    }
});













// Функция для получения описывающего прямоугольника полигона
function getBoundingBox(polygonCoordinates) {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    polygonCoordinates.forEach(coord => {
        const [lng, lat] = coord;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
    });

    return {
        west: minLng,
        east: maxLng,
        south: minLat,
        north: maxLat
    };
}


var openButton = document.getElementById('infoButton');    
var closeButton = document.getElementById('closeButton');
openButton.addEventListener('click', () => openInfoBox(foundImage), );
closeButton.addEventListener('click', closeInfoBox);

// Функция для открытия информационного окна
function openInfoBox(imageData) {
    document.getElementById('overlay').style.display = 'block';
    var infoBox = document.getElementById('infoBox')
    var infoImage = document.getElementById('infoImage');
    if (!imageData) {
        // Если данных нет, отображаем сообщение об отсутствии данных
        infoContent.innerHTML = '<p>No data for show</p>';
    } else {
        infoImage.style.filter = 'brightness(120%)';

        infoImage.src = imageData.Quicklook; // предполагается, что у imageData есть поле imageUrl
        infoImage.alt = "Image Preview"; // Можете установить более подходящий alt текст

        var content = "<h2>IMAGE INFORMATION</h2>";
        content += "<p><strong>ID image:</strong> " + imageData.Code + "</p>";
        content += "<p><strong>Imagery date:</strong> " + imageData.Meta_Date + "</p>";
        content += "<p><strong>Satellite:</strong> " + imageData.Satellite + "</p>";
        if (imageData.IncidenceAngle !== null) {
            content += "<p><strong>Pitch:</strong> " + imageData.Pitch + "</p>";
            content += "<p><strong>Roll:</strong> " + imageData.Roll + "</p>";
            content += "<p><strong>Incidence angle:</strong> " + imageData.IncidenceAngle + "</p>";
        }
        // Если данные есть, заполняем всплывающее окно этими данными
        infoContent.innerHTML = content;

    }
  
    infoBox.style.display = 'flex';
}

// Функция для закрытия информационного окна
function closeInfoBox() {
    infoBox.style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

document.getElementById('overlay').addEventListener('click', function(event) {
    // Проверяем, что клик был не по infoBox и не по его дочерним элементам
    var isClickInsideInfoBox = document.getElementById('infoBox').contains(event.target);

    if (!isClickInsideInfoBox) {
        // Скрываем overlay и infoBox, если клик был снаружи infoBox
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('infoBox').style.display = 'none';
    }
});

export {coordinatesFromKmlKmz, openInfoBox, closeInfoBox, inputSatelliteId,  geoJson}
// Функция очистки слоя KML
