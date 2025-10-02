
import { map, inputFirstLineNum, inputLineMax, inputCntLineAfterFirst, kmlLayerGroup,  } from './main.js';
import { QuicklookGroupLayer, footprintGroupLayer, removeLayerFromMap } from './map.js';
import { foundImage, searchOneImage, searchCatalogForKmlKmz } from './service/catalogService.js';
import { reinitializeSlider } from './utils/slider.js';
import { endLine, firstLine} from './workWithLines.js';



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
        const coordinatesNode = placemarks[i].getElementsByTagName('coordinates')[0];
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
    return coordinates;
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
    // Удаление предыдущего слоя KML, если он существует
    if (kmlMapLayer) {
        map.removeLayer(kmlMapLayer);
    }

    // Создание нового слоя KML
    kmlMapLayer = new L.KML(kml);
    map.setView(kmlMapLayer.getBounds().getNorthWest(), 7);
    kmlMapLayer.setStyle({ color: 'blue', fillColor: 'blue' });
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

        // Создание слоя KML (этот код может потребоваться адаптировать в зависимости от вашей библиотеки)
        kmlMapLayer = new L.KML(kml); // Обратите внимание, что вам может потребоваться специальный обработчик для L.KML, если он не является стандартной частью Leaflet.
        map.setView(kmlMapLayer.getBounds().getNorthWest(), 7);
        kmlMapLayer.setStyle({ color: 'blue', fillColor: 'blue' });
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
openButton.addEventListener('click', () => openInfoBox(foundImage));
closeButton.addEventListener('click', closeInfoBox);

// Функция для открытия информационного окна
function openInfoBox(imageData) {

    var infoBox = document.getElementById('infoBox')
    if (!imageData) {
        // Если данных нет, отображаем сообщение об отсутствии данных
        infoContent.innerHTML = '<p>No data for show</p>';
    } else {
        var content = "<h2>Information about image</h2>";
        content += "<p>ID image: " + imageData.Code + "</p>";
        content += "<p>Imagery date: " + imageData.Meta_Date + "</p>";
        content += "<p>Satellite: " + imageData.Satellite + "</p>";
        if (imageData.IncidenceAngle !== null) {
            content += "<p>Incididence angle: " + imageData.IncidenceAngle + "</p>";
        }
        // Если данные есть, заполняем всплывающее окно этими данными
        // Здесь добавьте код для заполнения информации из ваших данных
        infoContent.innerHTML = content;
    }
    infoBox.style.display = 'block';
}

// Функция для закрытия информационного окна
function closeInfoBox() {
    infoBox.style.display = 'none';
}

// Добавляем обработчик события на кнопку "Открыть"



export {coordinatesFromKmlKmz, openInfoBox, closeInfoBox, inputSatelliteId}
// Функция очистки слоя KML
