import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

export function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

function assertTask(value) {
  if (!isTask(value)) throw invalidResponse("Сервер вернул задачу неверной схемы.");
  return value;
}

function assertCategory(value) {
  if (!isCategory(value)) throw invalidResponse("Сервер вернул категорию неверной схемы.");
  return value;
}

function assertTaskList(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    throw invalidResponse("Ожидался объект {data: [...]}.");
  }
  const ids = new Set();
  for (const task of payload.data) {
    assertTask(task);
    if (ids.has(task.id)) throw invalidResponse("Повторяющийся id в списке задач.");
    ids.add(task.id);
  }
  if (!payload.meta || typeof payload.meta !== "object") throw invalidResponse("Ожидался meta.");
  if (payload.meta.total !== payload.data.length) throw invalidResponse("meta.total не совпадает с длиной data.");
  return payload;
}

function normalizeFilters(raw) {
  if (raw === undefined) return {};
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Фильтры должны быть объектом.");
  }
  for (const name of Object.keys(raw)) {
    if (!ALLOWED_FILTERS.has(name)) throw new TypeError(`Неизвестный фильтр: ${name}.`);
  }
  const result = {};
  if (raw.completed !== undefined) {
    if (typeof raw.completed !== "boolean") throw new TypeError("completed должен быть boolean.");
    result.completed = raw.completed;
  }
  if (raw.priority !== undefined) {
    if (!ALLOWED_PRIORITIES.has(raw.priority)) throw new TypeError("priority должен быть low, medium или high.");
    result.priority = raw.priority;
  }
  if (raw.categoryId !== undefined) {
    if (!isPositiveSafeInteger(raw.categoryId)) throw new TypeError("categoryId должен быть положительным целым.");
    result.categoryId = raw.categoryId;
  }
  if (raw.q !== undefined) {
    if (typeof raw.q !== "string") throw new TypeError("q должен быть строкой.");
    const trimmed = raw.q.trim();
    if (trimmed.length > 100) throw new TypeError("q не должен быть длиннее 100 символов.");
    if (trimmed.length > 0) result.q = trimmed;
  }
  return result;
}

function normalizeDraft(draft) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    throw new TypeError("Черновик должен быть объектом.");
  }
  const result = {};
  if (typeof draft.title !== "string" || draft.title.trim().length < 1 || draft.title.trim().length > 100) {
    throw new TypeError("title должен содержать от 1 до 100 символов.");
  }
  result.title = draft.title.trim();
  if (!ALLOWED_PRIORITIES.has(draft.priority)) throw new TypeError("priority должен быть low, medium или high.");
  result.priority = draft.priority;
  if (!isPositiveSafeInteger(draft.categoryId)) throw new TypeError("categoryId должен быть положительным целым.");
  result.categoryId = draft.categoryId;
  return result;
}

export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Ожидался клиент с методом requestJson.");
  }

  async function getTasks(filters, { signal } = {}) {
    const normalized = normalizeFilters(filters);
    const query = Object.keys(normalized).length > 0 ? normalized : undefined;
    const payload = await client.requestJson("/tasks", { query, signal });
    const checked = assertTaskList(payload);
    return { tasks: checked.data, meta: checked.meta };
  }

  async function getTaskById(id, { signal } = {}) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("id должен быть положительным целым.");
    const payload = await client.requestJson(`/tasks/${id}`, { signal });
    if (!payload || typeof payload !== "object" || !payload.data) {
      throw invalidResponse("Ожидался объект {data: task}.");
    }
    return assertTask(payload.data);
  }

  async function getCategories({ signal } = {}) {
    const payload = await client.requestJson("/categories", { signal });
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
      throw invalidResponse("Ожидался объект {data: [...]}.");
    }
    const ids = new Set();
    return payload.data.map((item) => {
      assertCategory(item);
      if (ids.has(item.id)) throw invalidResponse("Повторяющийся id категории.");
      ids.add(item.id);
      return item;
    });
  }

  async function loadInitialData(filters, { signal } = {}) {
    const normalized = normalizeFilters(filters);
    const query = Object.keys(normalized).length > 0 ? normalized : undefined;
    const [tasksPayload, categoriesPayload] = await Promise.all([
      client.requestJson("/tasks", { query, signal }),
      client.requestJson("/categories", { signal }),
    ]);
    const checked = assertTaskList(tasksPayload);
    if (!categoriesPayload || typeof categoriesPayload !== "object" || !Array.isArray(categoriesPayload.data)) {
      throw invalidResponse("Ожидался объект {data: [...]} категорий.");
    }
    categoriesPayload.data.forEach(assertCategory);
    return { tasks: checked.data, categories: categoriesPayload.data, meta: checked.meta };
  }

  async function createTask(draft, { signal } = {}) {
    const body = normalizeDraft(draft);
    const payload = await client.requestJson("/tasks", { method: "POST", body, signal });
    if (!payload || typeof payload !== "object" || !payload.data) {
      throw invalidResponse("Ожидался объект {data: task}.");
    }
    return assertTask(payload.data);
  }

  async function updateTask(id, changes, { signal } = {}) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("id должен быть положительным целым.");
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
      throw new TypeError("Изменения должны быть объектом.");
    }
    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "PATCH", body: changes, signal,
    });
    if (!payload || typeof payload !== "object" || !payload.data) {
      throw invalidResponse("Ожидался объект {data: task}.");
    }
    return assertTask(payload.data);
  }

  async function setTaskCompleted(id, completed, { signal } = {}) {
    if (typeof completed !== "boolean") throw new TypeError("completed должен быть boolean.");
    return updateTask(id, { completed }, { signal });
  }

  async function deleteTask(id, { signal } = {}) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("id должен быть положительным целым.");
    const result = await client.requestJson(`/tasks/${id}`, { method: "DELETE", signal });
    if (result !== null) throw invalidResponse("DELETE должен вернуть 204 без тела.");
    return null;
  }

  async function resetDemoData({ signal } = {}) {
    const payload = await client.requestJson("/debug/reset", { method: "POST", signal });
    if (!payload || typeof payload !== "object" || !payload.data) {
      throw invalidResponse("Ожидался объект {data: {...}}.");
    }
    return payload.data;
  }

  return {
    getTasks, getTaskById, getCategories, loadInitialData,
    createTask, updateTask, setTaskCompleted, deleteTask, resetDemoData,
  };
}