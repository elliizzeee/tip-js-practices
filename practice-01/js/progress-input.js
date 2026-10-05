"use strict";

const total = undefined;
const completed = "5";

if (typeof total !== "string" || typeof completed !== "string") {
  console.log("Ошибка: значения должны быть строками");
} else {
  const totalTrimmed = total.trim();
  const completedTrimmed = completed.trim();

  if (totalTrimmed === "" || completedTrimmed === "") {
    console.log("Ошибка: пустая строка");
  } else {
    const totalTasks = Number(totalTrimmed);
    const completedTasks = Number(completedTrimmed);

    if (isNaN(totalTasks) || isNaN(completedTasks)) {
      console.log("Ошибка: введено не число");
    } else if (!isFinite(totalTasks) || !isFinite(completedTasks)) {
      console.log("Ошибка: бесконечное значение");
    } else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
      console.log("Ошибка: количество должно быть целым");
    } else if (
      totalTasks < 0 ||
      totalTasks > 1000 ||
      completedTasks < 0 ||
      completedTasks > totalTasks
    ) {
      console.log("Ошибка: некорректные значения");
    } else if (totalTasks === 0 && completedTasks === 0) {
      console.log("Задач пока нет");
    } else {
      const remaining = totalTasks - completedTasks;
      const percent = completedTasks / totalTasks * 100;

      let status = "В работе";
      if (completedTasks === 0) {
        status = "Не начато";
      }
      if (completedTasks === totalTasks) {
        status = "Завершено";
      }

      console.log("Всего задач:", totalTasks);
      console.log("Выполнено:", completedTasks);
      console.log("Осталось:", remaining);
      console.log("Прогресс:", percent.toFixed(1) + "%");
      console.log("Статус:", status);
    }
  }
}