import { inputFirstLineNum, inputLineMax } from "./main.js";
import { createOneFootprint, oneFootprint, removeOneLayerFromMap } from "./map.js";
import { foundImage } from "./service/catalogService.js";


let newCoordTopLeft = undefined;
let newCoordBottomLeft = undefined;
let newCoordTopRight = undefined;

function endLine(enteredValue){
    if (isNaN(enteredValue)) { // Проверяем, является ли введенное значение числом
        // Если введенное значение не является числом, сбрасываем поле ввода
        inputLineMax.value = '';
    } else if (enteredValue < 1) {
        // Если введенное значение превышает максимальное, устанавливаем максимальное значение
        inputLineMax.value = 1;
    } else if (enteredValue > foundImage.Lines) {
        inputLineMax.value = foundImage.Lines
    }
    var value = inputLineMax.value;
    
    if(value > foundImage.Lines){
        value = foundImage.Lines;
    }

    
   // labelRes.textContent = "Numbers of lines: " + (inputEndLine.value - inputFirstLine.value + 1).toString();

    var diffDistance = value * foundImage.LineToKm;
    const footprintCoordinates = foundImage.getCoordinatesForFootprint();
    newCoordBottomLeft = calculateCoordinates(
        footprintCoordinates.topLeft.lat,
        footprintCoordinates.topLeft.lng,
        footprintCoordinates.bottomLeft.lat,
        footprintCoordinates.bottomLeft.lng,
        diffDistance
    );

    if (newCoordTopLeft == undefined) {
        createOneFootprint(footprintCoordinates.topLeft, footprintCoordinates.topRight, newCoordBottomLeft);       
    } else {
        console.log(oneFootprint,'one footPrint before removing inside EndLine')
        removeOneLayerFromMap(oneFootprint)
        createOneFootprint(newCoordTopLeft, newCoordTopRight, newCoordBottomLeft);

    }
}

function firstLine(enteredValue){
    if (isNaN(enteredValue)) {
        inputFirstLineNum.value = '';
    } else if (enteredValue > foundImage.Lines) {
        // Если введенное значение превышает максимальное, устанавливаем максимальное значение
        inputFirstLineNum.value = foundImage.Lines;
    } else if (enteredValue < 1) {
        // Если введенное значение превышает максимальное, устанавливаем максимальное значение
        inputFirstLineNum.value = 1;
    }
    else if (enteredValue > (foundImage.Lines - 623)) {
        // Если введенное значение превышает максимальное, устанавливаем максимальное значение
        inputFirstLineNum.value = inputLineMax.value - 623;
    }
    const footprintCoordinates = foundImage.getCoordinatesForFootprint();
    console.log(foundImage,'this is firstLine fooundImage');    
    console.log(footprintCoordinates)
    var diffDistance = inputFirstLineNum.value * foundImage.LineToKm;

    newCoordTopLeft = calculateCoordinates(
        footprintCoordinates.topLeft.lat,
        footprintCoordinates.topLeft.lng,
        footprintCoordinates.bottomLeft.lat,
        footprintCoordinates.bottomLeft.lng,
        diffDistance
    );
    
    newCoordTopRight = calculateCoordinates(
        footprintCoordinates.topRight.lat,
        footprintCoordinates.topRight.lng,
        footprintCoordinates.bottomRight.lat,
        footprintCoordinates.bottomRight.lng,
        diffDistance
    );
    
    if (newCoordBottomLeft == undefined) {
        createOneFootprint(newCoordTopLeft, newCoordTopRight, [footprintCoordinates.bottomLeft.lat, footprintCoordinates.bottomLeft.lng]);
    } else {
        // console.log(newCoordBottomLeft)
        // console.log(newCoordTopRight)
        // console.log(newCoordTopLeft)
        removeOneLayerFromMap(oneFootprint);
        console.log(oneFootprint,'oneFootPrints inside First Line');
        createOneFootprint(newCoordTopLeft, newCoordTopRight, newCoordBottomLeft)
    }
  ;   
}

function calculateCoordinates(startLat, startLng, endLat, endLng, distance) {
    // Преобразование градусов в радианы
    const toRadians = (degrees) => degrees * (Math.PI / 180);

    // Радиус Земли в километрах
    const earthRadius = 6371;

    // Преобразование координат в радианы
    const lat1 = toRadians(startLat);
    const lng1 = toRadians(startLng);
    const lat2 = toRadians(endLat);
    const lng2 = toRadians(endLng);

    // Вычисление разницы координат
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;

    // Вычисление синуса половинного расстояния между точками
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    // Вычисление угла между точками
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Вычисление расстояния между точками
    const totalDistance = earthRadius * c;

    // Вычисление доли пройденного расстояния
    const fraction = distance / totalDistance;

    // Вычисление промежуточных координат
    const intermediateLat = startLat + (endLat - startLat) * fraction;
    const intermediateLng = startLng + (endLng - startLng) * fraction;

    // Возвращение промежуточных координат
    return [intermediateLat, intermediateLng];
}



export { firstLine, endLine}

