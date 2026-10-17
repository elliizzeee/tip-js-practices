// Заготовка модуля. throw ниже отмечает отсутствие реализации,
// а не способ обработки некорректных данных в готовом решении.
// Для предусмотренных ошибок необходимо возвращать { ok: false, error: "..." }.
// console.log(), prompt(), document и чтение внешнего состояния здесь не нужны.

export function createTask(id, title, priority = "medium") {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом" };
  }

  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }

  const normalizedTitle = title.trim();
  if (normalizedTitle.length < 1 || normalizedTitle.length > 100) {
    return { ok: false, error: "Длина названия должна быть от 1 до 100 символов" };
  }

  if (priority !== "low" && priority !== "medium" && priority !== "high") {
    return { ok: false, error: "Приоритет должен быть low, medium или high" };
  }

  return {
    ok: true,
    task: {
      id,
      title: normalizedTitle,
      completed: false,
      priority,
    },
  };
}

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed === true).length;
  const pending = total - completed;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return { total, completed, pending, progress };
}
export function addTask(tasks, id, title, priority = "medium") {
  const creation = createTask(id, title, priority);
  if (!creation.ok) {
    return creation;
  }

  if (findTaskById(tasks, id) !== undefined) {
    return { ok: false, error: "Задача с таким id уже существует" };
  }

  return { ok: true, tasks: [...tasks, creation.task] };
}

export function setTaskCompleted(tasks, id, completed) {
  if (typeof completed !== "boolean") {
    return { ok: false, error: "completed должен быть boolean" };
  }

  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом" };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: "Задача с таким id не найдена" };
  }

  const next = tasks.map((task) =>
    task.id === id ? { ...task, completed } : task
  );

  return { ok: true, tasks: next };
}

export function renameTask(tasks, id, title) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом" };
  }

  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }

  const normalizedTitle = title.trim();
  if (normalizedTitle.length < 1 || normalizedTitle.length > 100) {
    return { ok: false, error: "Длина названия должна быть от 1 до 100 символов" };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: "Задача с таким id не найдена" };
  }

  const next = tasks.map((task) =>
    task.id === id ? { ...task, title: normalizedTitle } : task
  );

  return { ok: true, tasks: next };
}

export function removeTask(tasks, id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом" };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: "Задача с таким id не найдена" };
  }

  const next = tasks.filter((task) => task.id !== id);

  return { ok: true, tasks: next };
}