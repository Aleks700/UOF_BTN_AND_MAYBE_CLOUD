import { inputCntLineAfterFirst, inputFirstLineNum, inputLineMax } from "../main.js";
import { foundImage } from "../service/catalogService.js";
import { firstLine, endLine } from "../workWithLines.js";

const slider = document.getElementById('slider');

// Создаем слайдер
function createSliderWithStartValue(imageData) {
    // Проверяем, что imageData.Lines не null и является числом
    if (imageData.Lines !== null && typeof imageData.Lines === 'number') {
        noUiSlider.create(slider, {
            start: [1, imageData.Lines], // Начальные значения
            connect: true, // Соединяем ползунки линией
            orientation: 'vertical',
            margin: 623,
            range: {
                'min': 1, // Минимальное значение
                'max': imageData.Lines // Максимальное значение
            },
            format: {
                to: value => Math.round(value),
                from: value => Math.round(value)
            },
            pips: {
                mode: 'range',
                density: 3,
                format: {
                    to: value => Math.round(value),
                    from: value => Math.round(value)
                }
            }
        });
        const sliderFill = slider.querySelector('.noUi-connect');
        sliderFill.style.background = 'grey'; // Установка цвета фона в серый
    } else {
        console.error("Invalid value for imageData.Lines");
    }



        slider.noUiSlider.on('update', function (values, handle) {
        if (handle == 0){
            inputFirstLineNum.value = values[handle];
            firstLine(inputFirstLineNum.value)
            inputCntLineAfterFirst.value = inputLineMax.value - inputFirstLineNum.value+1;
            endLine(inputLineMax.value);
        }
        else{
            inputLineMax.value = values[handle]
            inputCntLineAfterFirst.value = inputLineMax.value - inputFirstLineNum.value+1;
            endLine(inputLineMax.value)
        }
        //createFootprint();
    });
}






// const slider = document.getElementById('slider');

// function createSlider() {
//     noUiSlider.create(slider, {
//         start: [1,maxLine],
//         connect: true,
//         step: 1,
//         orientation: 'vertical',
//         margin: 623,
//         range: {
//             'min': 1,
//             'max': maxLine
//         },
//         format: {
//             to: value => Math.round(value),
//             from: value => Math.round(value)
//         },
//         pips: {
//             mode: 'range',
//             density: 3,
//             format: {
//                 to: value => Math.round(value),
//                 from: value => Math.round(value)
//             }
//         }
//     });

//     // Обработчик события при изменении значения слайдера
//     slider.noUiSlider.on('update', function (values, handle) {
//         if (handle == 0){
//             inputFirstLine.value = values[handle];
//             firstLine(inputFirstLine.value)
//         }
//         else{
//             inputEndLine.value = values[handle]
//             endLine(inputEndLine.value)
//         }
//         //createFootprint();
//     });
// }



function reinitializeSlider(imageData) {
    inputCntLineAfterFirst.value = imageData.Lines;
    if (slider.innerHTML.trim() === '') {
        createSliderWithStartValue(imageData)
    } else{
        slider.noUiSlider.destroy();
        createSliderWithStartValue(imageData)
    }    // Создаем слайдер с новыми настройками

}

export { reinitializeSlider, createSliderWithStartValue };