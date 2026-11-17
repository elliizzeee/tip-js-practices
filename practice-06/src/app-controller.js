import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  if (!api || typeof api.loadInitialData !== "function") {
    throw new TypeError("api должен содержать методы доменного слоя.");
  }
  if (!view || typeof view.setListState !== "function") {
    throw new TypeError("view должен быть адаптером интерфейса.");
  }

  let tasks = [];
  let categories = [];
  let filters = {};
  let editingId = null;
  let loadController = null;
  let loadSeq = 0;
  let categoriesLoaded = false;

  function showError(error) {
    if (error instanceof ApiError && error.kind === "aborted") return;
    view.setListState("error", messageForError(error));
    view.notify(messageForError(error), "error");
  }

  function applyList() {
    view.setTasks(tasks, categories);
    view.setTotal(tasks.length);
    view.setListState(tasks.length === 0 ? "empty" : "ready");
  }

  async function performLoad(targetFilters) {
    loadController?.abort();
    const controller = new AbortController();
    loadController = controller;
    const seq = ++loadSeq;

    view.setListState("loading");
    try {
      if (!categoriesLoaded) {
        const result = await api.loadInitialData(targetFilters, { signal: controller.signal });
        if (seq !== loadSeq) return;
        tasks = result.tasks;
        categories = result.categories;
        categoriesLoaded = true;
        view.setCategories(categories);
      } else {
        const result = await api.getTasks(targetFilters, { signal: controller.signal });
        if (seq !== loadSeq) return;
        tasks = result.tasks;
      }
      filters = targetFilters;
      applyList();
    } catch (error) {
      if (seq !== loadSeq) return;
      if (error instanceof ApiError && error.kind === "aborted") return;
      showError(error);
    } finally {
      if (loadController === controller) loadController = null;
    }
  }

  async function mutate(action, successMessage) {
    view.setMutationPending(true);
    try {
      const result = await action();
      view.notify(successMessage, "success");
      await performLoad(filters);
      return result;
    } catch (error) {
      showError(error);
      return null;
    } finally {
      view.setMutationPending(false);
    }
  }

  return {
    async start(initialFilters = {}) {
      filters = { ...initialFilters };
      await performLoad(filters);
    },

    async applyFilters(nextFilters) {
      filters = { ...nextFilters };
      await performLoad(filters);
    },

    async refresh() {
      if (!categoriesLoaded) await performLoad(filters);
      else await performLoad(filters);
    },

    async submit(draft) {
      const validation = validateDraft(draft, categories);
      if (!validation.valid) {
        view.showFormErrors(validation.errors);
        return;
      }
      view.showFormErrors({});
      if (editingId === null) {
        await mutate(() => api.createTask(validation.value), "Задача создана.");
        view.setFormTask(null);
      } else {
        await mutate(() => api.updateTask(editingId, validation.value), "Изменения сохранены.");
        editingId = null;
        view.setFormTask(null);
      }
    },

    beginEdit(id) {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      editingId = id;
      view.setFormTask(task);
    },

    cancelEdit() {
      editingId = null;
      view.setFormTask(null);
    },

    async toggleTask(id) {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      await mutate(() => api.setTaskCompleted(id, !task.completed), "Статус обновлён.");
    },

    async deleteTask(id) {
      if (editingId === id) {
        editingId = null;
        view.setFormTask(null);
      }
      await mutate(() => api.deleteTask(id), "Задача удалена.");
    },

    async resetData() {
      await mutate(() => api.resetDemoData(), "Учебные данные восстановлены.");
    },

    destroy() {
      loadController?.abort();
      loadController = null;
    },
  };
}