export const STORAGE_VERSION = 1;

// Все функции принимают объект storage явно.
export function isValidTaskList(value) {
  if (!Array.isArray(value)) return false;

  const ids = new Set();
  for (const task of value) {
    if (!task || typeof task !== "object") return false;
    
    // Проверка id
    if (!Number.isSafeInteger(task.id) || task.id <= 0) return false;
    if (ids.has(task.id)) return false; // дубликаты
    ids.add(task.id);

    // Проверка title
    if (typeof task.title !== "string") return false;
    const title = task.title.trim();
    if (title.length < 1 || title.length > 100) return false;

    // Проверка completed
    if (typeof task.completed !== "boolean") return false;

    // Проверка priority
    if (!["low", "medium", "high"].includes(task.priority)) return false;
  }
  return true;
}

export function loadTasks(storage, key, fallbackTasks) {
  const fallbackCopy = fallbackTasks.map((task) => ({ ...task }));

  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      return { ok: true, source: "initial", tasks: fallbackCopy };
    }

    const parsed = JSON.parse(raw);
    if (parsed.version !== STORAGE_VERSION || !isValidTaskList(parsed.tasks)) {
      return { ok: false, source: "fallback", tasks: fallbackCopy, error: "Неверная схема сохранённых данных" };
    }

    return { ok: true, source: "storage", tasks: parsed.tasks.map((task) => ({ ...task })) };
  } catch (error) {
    return { ok: false, source: "fallback", tasks: fallbackCopy, error: `Ошибка чтения: ${error.message}` };
  }
}

export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Неверная схема данных, запись отменена" };
  }

  try {
    const payload = JSON.stringify({ version: STORAGE_VERSION, tasks });
    storage.setItem(key, payload);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Ошибка записи: ${error.message}` };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Ошибка удаления: ${error.message}` };
  }
}