import SatelliteImage from "../models/SatelliteImage.js";
import { fillTableWithSatelliteImages } from "../main.js";
import {
  createFootprintGroup,
  createOneFootprint,
  createOneQuicklook,
  zoomToImage,
} from "../map.js";
import { reinitializeSlider } from "../utils/slider.js";
import { coordinatesFromKmlKmz, geoJson } from "../buttonEvents.js";
const imageDataArray = [];
let foundImage;

// var path = "http://10.0.6.117:8001/CatalogService?DateFr="
// var path = "http://10.0.9.243:9000/catalog?DateFr="
var path = "http://127.0.0.1:9000/catalog?DateFr=";
//var pat2 = "http://127.0.0.1:3000/"
// var path = "http://old-eo.gharysh.kz/CatalogService?DateFr="
var path2 = "http://10.0.11.107:3000/";

function searchCatalogForKmlKmz(options) {
  showLoadingOverlay();

  // Проверка, переданы ли только координаты
  imageDataArray.length = 0;
  // Формирование URL
  const {
    dateFrom,
    dateTo,
    west,
    east,
    south,
    north,
    satellites,
    angle,
    cloud,
  } = options;
  // Формирование URL
  const fullPath =
    path +
    dateFrom +
    "&DateTo=" +
    dateTo +
    "&West=" +
    west +
    "&East=" +
    east +
    "&South=" +
    south +
    "&North=" +
    north;
  console.log(fullPath, "full path");
  fetch(fullPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      data.data.forEach((item) => {
        // console.log(geoJson)
        const satelliteImage = new SatelliteImage(item);
        // Проверка по спутнику и углу
        if (
          satellites.some((satellite) => satellite === item.Satellite) &&
          item.IncidenceAngle <= angle
        ) {
          let satelliteImageCoordinates = [];
          satelliteImageCoordinates = satelliteImage.getCoordinates();
          satelliteImageCoordinates.push(satelliteImageCoordinates[0]); //[0] = satelliteImageCoordinates[4];
          let correctedCoordinates = satelliteImageCoordinates.map((coord) => [
            coord[1],
            coord[0],
          ]);

          const polygon1 = turf.polygon([correctedCoordinates]);
          // Предполагается, что geoJson - ваш объект FeatureCollection
          // Предполагается, что otherPolygon - это другой полигон, с которым нужно проверить пересечение
          processFeatures(geoJson, polygon1, satelliteImage);

          // Дальнейшие действия с полученными данными
        }
        // Дальнейшие действия с полученными данными
      });
      // Дальнейшие действия с полученными данными
      //createFootprintGroup(imageDataArray);
      imageDataArray.sort((a, b) => {
        if (b.Code < a.Code) return -1;
        if (b.Code > a.Code) return 1;
        return 0;
      });
      console.log(imageDataArray, "this is imageDataArray");
      fillTableWithSatelliteImages(imageDataArray);
      hideLoadingOverlay();
    })

    .catch((error) => {
      console.error("There was a problem with your fetch operation:", error);
      hideLoadingOverlay();
      showErrorPopup(
        "Unable to search the data. Correct the vector file or search manually using the rectangle tool."
      );
    });
}

function checkIntersectionAndAdd(polygon, otherPolygon, satelliteImage) {
  const intersection = turf.intersect(polygon, otherPolygon);
  if (
    intersection &&
    !imageDataArray.some((item) => item.Code === satelliteImage.Code)
  ) {
    imageDataArray.push(satelliteImage);
  }
}

function processGeometry(geometry, otherPolygon, satelliteImage) {
  let turfGeometry;
  if (geometry.type === "Polygon") {
    turfGeometry = turf.polygon(geometry.coordinates);
    checkIntersectionAndAdd(turfGeometry, otherPolygon, satelliteImage);
  } else if (geometry.type === "MultiPolygon") {
    turfGeometry = turf.multiPolygon(geometry.coordinates);
    checkIntersectionAndAdd(turfGeometry, otherPolygon, satelliteImage);
  }
  // Если требуется, добавьте обработку других типов геометрий
}

function processFeature(feature, otherPolygon, satelliteImage) {
  if (feature.geometry.type === "GeometryCollection") {
    feature.geometry.geometries.forEach((geometry) => {
      processGeometry(geometry, otherPolygon, satelliteImage); // Применяем функцию ко всем геометриям в коллекции
    });
  } else {
    processGeometry(feature.geometry, otherPolygon, satelliteImage); // Прямая обработка для неколлекционных геометрий
  }
}

function processFeatures(featureCollection, otherPolygon, satelliteImage) {
  featureCollection.features.forEach((feature) => {
    processFeature(feature, otherPolygon, satelliteImage);
  });
}

function searchCatalog(options) {
  showLoadingOverlay();
  // Проверка, переданы ли только координаты
  imageDataArray.length = 0;
  // Формирование URL
  const {
    dateFrom,
    dateTo,
    west,
    east,
    south,
    north,
    satellites,
    angle,
    isNightImage,
    cloud,
  } = options;
  // Формирование URL
  const fullPath =
    path +
    dateFrom +
    "&DateTo=" +
    dateTo +
    "&West=" +
    west +
    "&East=" +
    east +
    "&South=" +
    south +
    "&North=" +
    north +
    "&Cloud=" +
    cloud;
  console.log(fullPath, "fullPath this is");
  fetch(fullPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      const filteredItems = isNightImage
        ? data.data.filter((item) => item.SunElevationAngle <= 0)
        : data.data;

      filteredItems.forEach((item) => {
        const satelliteImage = new SatelliteImage(item);
        if (
          satellites.some((satellite) => satellite === item.Satellite) &&
          item.IncidenceAngle <= angle
        ) {
          imageDataArray.push(satelliteImage);
          // Дальнейшие действия с полученными данными
        }

        // Дальнейшие действия с полученными данными
      });

      if (satellites.includes("PeruSat-1")) {
        const startDate = dateFrom;
        const endDate = dateTo;

        const clientRectangle = {
          topRight: { latitude: north, longitude: west },
          topLeft: { latitude: east, longitude: north },
          bottomRight: { latitude: south, longitude: west },
          bottomLeft: { latitude: south, longitude: east },
          // topRight: { latitude:  east, longitude: west },
          // topLeft: { latitude:  east, longitude: north},
          // bottomRight: { latitude: south, longitude: west },
          // bottomLeft: { latitude: south, longitude: north }
        };
        const secondApiPath = path2;
        const secondRequestData = {
          clientRectangle,
          startDate,
          endDate,
        };
        //console.log(secondRequestData)
        const requestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(secondRequestData),
        };

        // Отправка второго запроса
        fetch(secondApiPath, requestOptions)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
          .then((secondApiData) => {
            // Обработка данных второго запроса и добавление их в массив
            secondApiData.forEach((item) => {
              // const Code = item.data_strip_id;
              // const IncidenceAngle = item.IncidenceAngle;

              // const coordPeru = [item.sw_corner_latitude, item.sw_corner_longitude,
              //     item.se_corner_latitude, item.se_corner_longitude,
              //     item.ne_corner_latitude, item.ne_corner_longitude,
              //     item.nw_corner_latitude, item.nw_corner_longitude]

              // const QuicklookUrl = `https://cof.cnois.gob.pe/customer-office-quicklook/${item.data_strip_id}_QL.jpeg`;
              console.log(item.acquisition_end_date);
              const data = {
                Code: item.data_strip_id,
                Coordinates: `${item.sw_corner_latitude} ${item.sw_corner_longitude} ${item.se_corner_latitude} ${item.se_corner_longitude} ${item.ne_corner_latitude} ${item.ne_corner_longitude} ${item.nw_corner_latitude} ${item.nw_corner_longitude}`,
                // Cloud_Coverage: item.Cloud_Coverage,
                IncidenceAngle: item.incidence_angle,
                Satellite: item.satellite_name,
                Metadata_Date: item.acquisition_end_date.substring(0, 10),
                Quicklook: `https://cof.cnois.gob.pe/customer-office-quicklook/${item.data_strip_id}_QL.jpeg`,
              };

              const satelliteImage = new SatelliteImage(data);
              imageDataArray.push(satelliteImage);
            });

            // Сортировка и отображение данных
            imageDataArray.sort((a, b) => {
              if (b.Code < a.Code) return -1;
              if (b.Code > a.Code) return 1;
              return 0;
            });
            console.log(imageDataArray, "imageDataArray");
            fillTableWithSatelliteImages(imageDataArray);
            hideLoadingOverlay();
          })
          .catch((error) => {
            console.error(
              "There was a problem with your second fetch operation:",
              error
            );
            hideLoadingOverlay();
          });
      } else {
        imageDataArray.sort((a, b) => {
          if (b.Code < a.Code) return -1;
          if (b.Code > a.Code) return 1;
          return 0;
        });
        fillTableWithSatelliteImages(imageDataArray);
        hideLoadingOverlay();
      }
      // Дальнейшие действия с полученными данными
      //createFootprintGroup(imageDataArray);
    })

    .catch((error) => {
      console.error("There was a problem with your fetch operation:", error);
      hideLoadingOverlay();
    });
}

async function searchOneImage(imageID) {
  imageID = imageID.replace(/\s+/g, "");
  if (imageID.startsWith("DS_")) {
    fetchImageByIDforKazEOSat1(imageID);
  } else if (imageID.startsWith("KM")) {
    fetchImageByIDforKazEOSat2(imageID);
  } else {
    console.error("Unknown satellite image ID format:", imageID);
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fetchImageByIDforKazEOSat1(imageID) {
  const year = imageID.slice(9, 13);
  const month = imageID.slice(13, 15);
  const day = imageID.slice(15, 17);

  // Создаем новую дату на основе полученных значений
  const currentDate = new Date(`${year}-${month}-${day}`);

  // Вычитаем один день
  const oneDayBefore = new Date(currentDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);

  // Плюсуем один день
  const oneDayAfter = new Date(currentDate);
  oneDayAfter.setDate(oneDayAfter.getDate() + 1);

  // Преобразуем полученные даты обратно в формат год-месяц-день
  const dateFrom = formatDate(oneDayBefore);
  const dateTo = formatDate(oneDayAfter);

  const west = "179.356737";
  const east = "79.563306";
  const south = "-37.146315";
  const north = "-179.766815";

  const fullPath =
    path +
    dateFrom +
    "&DateTo=" +
    dateTo +
    "&West=" +
    west +
    "&East=" +
    east +
    "&South=" +
    south +
    "&North=" +
    north;

  fetch(fullPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      const foundImage2 = data.data.find((item) => item.Code === imageID);
      if (foundImage2) {
        foundImage = new SatelliteImage(foundImage2);
        console.log(foundImage, "this is founded images");

        foundImage
          .calculateLines(foundImage2.Quicklook)
          .then((lines) => {
            foundImage.Lines = lines;
            createOneQuicklook(foundImage);
            // const coordinates = foundImage.getCoordinatesForFootprint();

            // createOneFootprint(coordinates.topLeft, coordinates.topRight, coordinates.bottomLeft);
            zoomToImage(foundImage);
            reinitializeSlider(foundImage);
          })
          .catch((error) => {
            console.error("Ошибка при вычислении lines:", error.message);
          });
      } else {
        // Не найдено изображение с таким imageID
        console.log("Image not found");
      }
    })
    .catch((error) => {
      console.error("There was a problem with your fetch operation:", error);
    });
}

function fetchImageByIDforKazEOSat2(imageID) {
  // Вычитаем один день

  // Пример использования:
  const idDict = {
    KM000109MI: "2014-12-11",
    KM00048bMI: "2015-06-29",
    KM000764MI: "2015-12-30",
    KM000cbdMI: "2016-06-29",
    KM001356MI: "2016-12-30",
    KM0018feMI: "2017-06-29",
    KM001e2aMI: "2017-12-30",
    KM0022fbMI: "2018-06-29",
    KM00275fMI: "2018-12-30",
    KM002bc2MI: "2019-06-29",
    KM002fc0MI: "2019-12-30",
    KM0035dbMI: "2020-06-29",
    KM003c05MI: "2020-12-30",
    KM00410aMI: "2021-06-29",
    KM004556MI: "2021-12-30",
    KM0049f4MI: "2022-06-29",
    KM004e93MI: "2022-12-30",
    KM005292MI: "2023-06-29",
    KM005686MI: "2023-12-30",
    KM0057f4MI: "2024-03-04",
  };

  const [dateFrom, dateTo] = findClosestValues(imageID, idDict);
  // Преобразуем полученные даты обратно в формат год-месяц-день

  const west = "179.356737";
  const east = "79.563306";
  const south = "-37.146315";
  const north = "-179.766815";

  const fullPath =
    path +
    dateFrom +
    "&DateTo=" +
    dateTo +
    "&West=" +
    west +
    "&East=" +
    east +
    "&South=" +
    south +
    "&North=" +
    north;

  fetch(fullPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      const foundImage2 = data.data.find((item) => item.Code === imageID);
      if (foundImage2) {
        foundImage = new SatelliteImage(foundImage2);
        const coordinates = foundImage.getCoordinatesForFootprint();
        createOneFootprint(
          coordinates.topLeft,
          coordinates.topRight,
          coordinates.bottomLeft
        );
        createOneQuicklook(foundImage);
        zoomToImage(foundImage);
      } else {
        // Не найдено изображение с таким imageID
        console.log("Image not found");
      }
    })
    .catch((error) => {
      console.error("There was a problem with your fetch operation:", error);
    });
}

function findClosestValues(id, idDict) {
  const trimmedId = id.slice(0, -8); // Убираем "_006_MUL" с конца

  let prevKey = null;
  let nextKey = null;
  let prevKeyFound = false; // Флаг для обработки случая, когда ключ равен искомому айди

  for (const key in idDict) {
    if (key === trimmedId) {
      prevKeyFound = true;
    }
    if (key < trimmedId && (!prevKey || key > prevKey)) {
      prevKey = key;
    }
    if (key > trimmedId && (!nextKey || key < nextKey)) {
      nextKey = key;
    }
  }

  // Если найденный ключ совпадает с искомым айди, вернем его как оба ближайших ключа
  if (prevKeyFound) {
    nextKey = prevKey;
  }

  // Получаем значения для найденных ключей
  const prevValue = prevKey ? idDict[prevKey] : null;
  let nextValue = nextKey ? idDict[nextKey] : null;

  // Если следующего ключа нет (айди больше последнего ключа), установим дату сегодняшнего дня
  if (!nextValue) {
    const today = new Date();
    const year = today.getFullYear();
    let month = today.getMonth() + 1;
    month = month < 10 ? "0" + month : month;
    let day = today.getDate();
    day = day < 10 ? "0" + day : day;
    nextValue = `${year}-${month}-${day}`;
  }

  return [prevValue, nextValue];
}

function showLoadingOverlay() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoadingOverlay() {
  document.getElementById("loadingOverlay").style.display = "none";
}

function showErrorPopup(errorMessage) {
  // Создаем основной элемент всплывающего окна
  const popup = document.createElement("div");
  popup.style.position = "fixed";
  popup.style.left = "50%";
  popup.style.top = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.padding = "20px";
  popup.style.backgroundColor = "white";
  popup.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
  popup.style.zIndex = "1000";
  popup.style.textAlign = "center";
  popup.style.borderRadius = "8px";
  popup.style.border = "2px solid black";
  // Добавляем текст ошибки
  const message = document.createElement("p");
  message.textContent = errorMessage;
  popup.appendChild(message);

  // Добавляем кнопку закрытия
  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.marginTop = "20px";
  closeButton.onclick = function () {
    document.body.removeChild(popup);
  };
  popup.appendChild(closeButton);

  // Добавляем всплывающее окно в body
  document.body.appendChild(popup);
}

// Экспорт функций для использования в других модулях
export {
  searchCatalog,
  imageDataArray,
  createFootprintGroup,
  searchOneImage,
  foundImage,
  searchCatalogForKmlKmz,
};
