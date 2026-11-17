const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

export function validateTaskDraft(draft, categories) {
  const errors = {};
  let title = "";
  let priority = "";
  let categoryId = null;

  if (!draft || typeof draft !== "object") {
    return { valid: false, value: null, errors: { title: "Черновик должен быть объектом." } };
  }

  if (typeof draft.title !== "string") {
    errors.title = "Название должно быть строкой.";
  } else {
    const trimmed = draft.title.trim();
    if (trimmed.length < 1) errors.title = "Название не может быть пустым.";
    else if (trimmed.length > 100) errors.title = "Название не должно превышать 100 символов.";
    else title = trimmed;
  }

  if (!ALLOWED_PRIORITIES.has(draft.priority)) {
    errors.priority = "Выберите корректный приоритет.";
  } else {
    priority = draft.priority;
  }

  const categoryNum = Number(draft.categoryId);
  if (!Number.isSafeInteger(categoryNum) || categoryNum <= 0) {
    errors.categoryId = "Выберите категорию.";
  } else if (!Array.isArray(categories) || !categories.some((item) => item.id === categoryNum)) {
    errors.categoryId = "Указана неизвестная категория.";
  } else {
    categoryId = categoryNum;
  }

  if (Object.keys(errors).length > 0) return { valid: false, value: null, errors };
  return { valid: true, value: { title, priority, categoryId }, errors: {} };
}