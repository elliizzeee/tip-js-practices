// Доменный слой задач. Проверяет входные фильтры и ответы по контракту API.
import { ApiError } from "./api-client.js";

const PRIORITIES = new Set(["low", "medium", "high"]);
const FILTER_KEYS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveInt(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function assertTask(task) {
  if (!task || typeof task !== "object") throw invalidResponse("Задача должна быть объектом.");
  if (!isPositiveInt(task.id)) throw invalidResponse("У задачи некорректный id.");
  if (typeof task.title !== "string" || task.title.trim().length === 0) throw invalidResponse("У задачи пустое название.");
  if (typeof task.completed !== "boolean") throw invalidResponse("У задачи некорректное completed.");
  if (!PRIORITIES.has(task.priority)) throw invalidResponse("У задачи некорректный priority.");
  if (!isPositiveInt(task.categoryId)) throw invalidResponse("У задачи некорректный categoryId.");
  return task;
}

function assertCategory(item) {
  if (!item || typeof item !== "object") throw invalidResponse("Категория должна быть объектом.");
  if (!isPositiveInt(item.id)) throw invalidResponse("У категории некорректный id.");
  if (typeof item.name !== "string" || item.name.trim().length === 0) throw invalidResponse("У категории пустое название.");
  return item;
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
  if (payload.meta.total !== payload.data.length) {
    throw invalidResponse("meta.total не совпадает с количеством задач.");
  }
  if (!payload.meta.filters || typeof payload.meta.filters !== "object") {
    throw invalidResponse("meta.filters должен присутствовать.");
  }
  return payload;
}

function normalizeFilters(raw) {
  if (raw === undefined) return {};
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Фильтры должны быть объектом.");
  }
  for (const name of Object.keys(raw)) {
    if (!FILTER_KEYS.has(name)) throw new TypeError(`Неизвестный фильтр: ${name}.`);
  }

  const result = {};

  if (raw.completed !== undefined) {
    if (typeof raw.completed !== "boolean") throw new TypeError("completed должен быть boolean.");
    result.completed = raw.completed;
  }

  if (raw.priority !== undefined) {
    if (!PRIORITIES.has(raw.priority)) throw new TypeError("priority должен быть low, medium или high.");
    result.priority = raw.priority;
  }

  if (raw.categoryId !== undefined) {
    if (!isPositiveInt(raw.categoryId)) throw new TypeError("categoryId должен быть положительным целым.");
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

export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Ожидался клиент с методом requestJson.");
  }

  async function getTasks(filters) {
    const normalized = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", {
      query: Object.keys(normalized).length > 0 ? normalized : undefined,
    });
    const checked = assertTaskList(payload);
    return {
      tasks: checked.data,
      meta: checked.meta,
    };
  }

  async function getTaskById(id) {
    if (!isPositiveInt(id)) throw new TypeError("id должен быть положительным целым числом.");
    const payload = await client.requestJson(`/tasks/${id}`, undefined);
    if (!payload || typeof payload !== "object" || !payload.data) {
      throw invalidResponse("Ожидался объект {data: task}.");
    }
    return assertTask(payload.data);
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
      throw invalidResponse("Ожидался объект {data: [...]}.");
    }
    const ids = new Set();
    const categories = payload.data.map((item) => {
      assertCategory(item);
      if (ids.has(item.id)) throw invalidResponse("Повторяющийся id категории.");
      ids.add(item.id);
      return item;
    });
    return categories;
  }

  async function loadInitialData(filters) {
    const normalized = normalizeFilters(filters);
    const query = Object.keys(normalized).length > 0 ? normalized : undefined;

    // Оба запроса стартуют синхронно: важно не ставить await между ними.
    const [tasksResult, categories] = await Promise.all([
      (async () => {
        const payload = await client.requestJson("/tasks", { query });
        return assertTaskList(payload);
      })(),
      (async () => {
        const payload = await client.requestJson("/categories");
        if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
          throw invalidResponse("Ожидался объект {data: [...]} категорий.");
        }
        payload.data.forEach(assertCategory);
        return payload.data;
      })(),
    ]);

    return {
      tasks: tasksResult.data,
      categories,
      meta: tasksResult.meta,
    };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}