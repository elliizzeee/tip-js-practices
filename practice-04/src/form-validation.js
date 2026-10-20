export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  let idValue = null;
  let titleValue = null;
  let priorityValue = null;

  // 1. Проверка ID
  if (editingId !== null) {
    // Режим редактирования
    const exists = tasks.find(t => t.id === editingId);
    if (!exists) {
      errors.id = "Задача для редактирования не найдена";
    } else {
      idValue = editingId;
    }
  } else {
    // Режим создания
    const rawId = draft.id;
    const numId = Number(rawId);
    
    if (!Number.isSafeInteger(numId) || numId <= 0) {
      errors.id = "Введите положительное целое число";
    } else if (tasks.some(t => t.id === numId)) {
      errors.id = "Задача с таким id уже существует";
    } else {
      idValue = numId;
    }
  }

  // 2. Проверка Title
  if (typeof draft.title !== "string") {
    errors.title = "Название должно быть строкой";
  } else {
    const trimmed = draft.title.trim();
    if (trimmed.length < 1) {
      errors.title = "Название не может быть пустым";
    } else if (trimmed.length > 100) {
      errors.title = "Название не должно превышать 100 символов";
    } else {
      titleValue = trimmed;
    }
  }

  // 3. Проверка Priority
  if (!["low", "medium", "high"].includes(draft.priority)) {
    errors.priority = "Выберите корректный приоритет";
  } else {
    priorityValue = draft.priority;
  }

  // Результат
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      id: idValue,
      title: titleValue,
      priority: priorityValue,
    },
  };
}