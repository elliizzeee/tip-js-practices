"use strict";

const totalTasks = 5;
const completedTasks = 2;
const dailyLimit = 1001;

if (typeof totalTasks !== "number" || typeof completedTasks !== "number" || typeof dailyLimit !== "number") {
    console.log("Ошибка: вместо числа передана строка");
}
else if (Number.isNaN(totalTasks) || Number.isNaN(completedTasks) || Number.isNaN(dailyLimit)) {
    console.log("Ошибка: недопустимое числовое значение");
}
else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks) || !Number.isInteger(dailyLimit)) {
    console.log("Ошибка: дробное количество");
}
else if (totalTasks < 0 || completedTasks < 0 || dailyLimit < 0) {
    console.log("Ошибка: отрицательное количество");
}
else if (totalTasks > 1000 || dailyLimit > 1000) {
    console.log("Ошибка: превышена верхняя граница");
}
else if (completedTasks > totalTasks) {
    console.log("Ошибка: выполнено больше, чем существует");
}
else if (dailyLimit < 1) {
    console.log("Ошибка: дневная норма должна быть от 1 до 1000");
}
else {
    let ost = totalTasks - completedTasks;

    if (ost === 0) {
        console.log("Все задачи уже выполнены");
        console.log("Потребуется дней: 0");
    } else {
        console.log("Осталось задач:", ost);

        let days = 0;

        while (ost > 0) {
            days = days + 1;

            let doneToday = Math.min(dailyLimit, ost);

            ost = ost - doneToday;

            console.log("День " + days + ": выполнено " + doneToday + ", осталось " + ost);
        }

        console.log("Потребуется дней:", days);
    }
}