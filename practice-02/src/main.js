import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  createTask,
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";

function printSummary(tasks, label) {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  console.log(`\n--- ${label} ---`);
  console.log(`Всего: ${total}; выполнено: ${completed}; осталось: ${pending}`);
  if (total === 0) {
    console.log("Задач пока нет");
  } else {
    console.log(`Прогресс: ${progress.toFixed(1)}%`);
  }
}

function applyResult(current, result, label) {
  if (result.ok) {
    console.log(`\n${label}: успех`);
    return result.tasks;
  }
  console.error(`\n${label}: ошибка — ${result.error}`);
  return current;
}

// 6.5
console.log("========== ОБЩИЙ СЦЕНАРИЙ ==========");

let currentTasks = demoTasks;

console.log("\nИсходные задачи:");
console.table(currentTasks);
console.log("Названия:", getTaskTitles(currentTasks));
console.log("Невыполненные id:", getPendingTasks(currentTasks).map((t) => t.id));
printSummary(currentTasks, "Исходный набор");

currentTasks = applyResult(
  currentTasks,
  addTask(currentTasks, 20, "Добавить проверку", "high"),
  "Добавление id=20"
);
printSummary(currentTasks, "После добавления id=20");

currentTasks = applyResult(
  currentTasks,
  setTaskCompleted(currentTasks, 4, true),
  "Выполнение id=4"
);
printSummary(currentTasks, "После выполнения id=4");

currentTasks = applyResult(
  currentTasks,
  renameTask(currentTasks, 10, "Подготовить инструкцию запуска"),
  "Переименование id=10"
);
printSummary(currentTasks, "После переименования id=10");

currentTasks = applyResult(
  currentTasks,
  removeTask(currentTasks, 7),
  "Удаление id=7"
);
printSummary(currentTasks, "После удаления id=7");

console.log("\nИтоговый массив:");
console.table(currentTasks);
console.log("Итоговые id:", currentTasks.map((t) => t.id));

const duplicateAttempt = addTask(currentTasks, 20, "Дубликат");
console.log("\nПопытка повторно добавить id=20:");
console.log(duplicateAttempt);
if (!duplicateAttempt.ok) {
  console.log("Состояние не изменено, id остаются:", currentTasks.map((t) => t.id));
}

console.log("\ndemoTasks после всех операций:");
console.table(demoTasks);
console.log(
  "demoTasks содержит исходные 4 записи:",
  demoTasks.length === 4 &&
    demoTasks.map((t) => t.id).join(",") === "1,4,7,10"
);

// ИНДИВИДУАЛЬНЫЙ ВАРИАНТ 
console.log("\n========== ИНДИВИДУАЛЬНЫЙ ВАРИАНТ ==========");
console.log("Номер варианта:", variantNumber);

let variantCurrent = variantTasks;

console.log("\nИсходные задачи варианта:");
console.table(variantCurrent);
printSummary(variantCurrent, "Исходный набор варианта");

variantCurrent = applyResult(
  variantCurrent,
  addTask(variantCurrent, 80, "Согласовать план проекта", "high"),
  "Добавление id=80"
);
printSummary(variantCurrent, "После добавления id=80");

variantCurrent = applyResult(
  variantCurrent,
  setTaskCompleted(variantCurrent, 11, true),
  "Выполнение id=11"
);
printSummary(variantCurrent, "После выполнения id=11");

variantCurrent = applyResult(
  variantCurrent,
  renameTask(variantCurrent, 23, "Уточнить требования"),
  "Переименование id=23"
);
printSummary(variantCurrent, "После переименования id=23");

variantCurrent = applyResult(
  variantCurrent,
  removeTask(variantCurrent, 37),
  "Удаление id=37"
);
printSummary(variantCurrent, "После удаления id=37");

const variantDuplicate = addTask(variantCurrent, 80, "Дубликат");
console.log("\nПопытка повторно добавить id=80:");
console.log(variantDuplicate);
if (!variantDuplicate.ok) {
  console.log(
    "Состояние не изменено, id остаются:",
    variantCurrent.map((t) => t.id)
  );
}

console.log("\nvariantTasks после всех операций (не должен измениться):");
console.table(variantTasks);