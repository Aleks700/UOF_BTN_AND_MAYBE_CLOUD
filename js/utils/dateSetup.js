
const endDateInput = document.getElementById('endDate');
const startDateInput = document.getElementById('startDate');


document.addEventListener('DOMContentLoaded', function() {
    

    const today = new Date();
    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);

    endDateInput.valueAsDate = today;
    startDateInput.valueAsDate = lastWeek;
});

// Добавляем обработчики событий для изменений в полях даты
endDateInput.addEventListener('change', handleDateChange);
startDateInput.addEventListener('change', handleDateChange);

function handleDateChange() {
    // Получаем новые значения дат из полей ввода
    const endDate = endDateInput.valueAsDate;
    const startDate = startDateInput.valueAsDate;


    // Здесь вы можете выполнить любые другие действия в зависимости от изменений даты
}




