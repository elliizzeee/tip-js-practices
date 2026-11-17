// CLI-клиент ПР5: загружает данные с локального API по фильтрам варианта.
import { ApiError, createApiClient } from "./api-client.js";
import { createTaskApi } from "./task-api.js";
import { variantNumber, variantFilters } from "./variant.js";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:5505/api";

async function main() {
  console.log(`ПР5, вариант ${variantNumber}`);
  console.log(`API: ${baseUrl}`);
  console.log(`Фильтры: ${JSON.stringify(variantFilters)}`);

  const client = createApiClient({ baseUrl, timeoutMs: 5000 });
  const api = createTaskApi(client);

  try {
    const { tasks, categories, meta } = await api.loadInitialData(variantFilters);
    console.log(`Задач: ${tasks.length}`);
    console.log(`id: [${tasks.map((t) => t.id).join(", ")}]`);
    console.log(`Категорий: ${categories.length} (${categories.map((c) => c.name).join(", ")})`);
    console.log(`meta: ${JSON.stringify(meta)}`);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Ошибка [${error.kind}]${error.status ? ` ${error.status}` : ""}${error.code ? ` ${error.code}` : ""}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error("Непредвиденная ошибка:", error);
  process.exitCode = 1;
});