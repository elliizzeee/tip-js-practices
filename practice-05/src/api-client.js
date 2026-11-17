// Общий HTTP-клиент ПР5.
// Отвечает только за транспорт: URL, заголовки, тайм-аут, отмену,
// классификацию ошибок и разбор JSON. Доменных правил здесь нет.

export class ApiError extends Error {
  constructor(message, { kind, status = null, code = null, details = null, url = null, cause = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
    this.cause = cause;
  }
}

// Соединяет baseUrl и путь, нормализуя слеши.
export function buildUrl(baseUrl, path, query) {
  const base = String(baseUrl).replace(/\/+$/, "");
  const suffix = String(path).replace(/^\/+/, "");
  const url = new URL(`${base}/${suffix}`);

  if (query && typeof query === "object") {
    for (const [name, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(name, String(value));
    }
  }

  return url.toString();
}

function isResponse(value) {
  return value instanceof Response || (
    value !== null &&
    typeof value === "object" &&
    typeof value.status === "number" &&
    typeof value.ok === "boolean" &&
    typeof value.headers?.get === "function" &&
    typeof value.json === "function"
  );
}

function classifyAbort(reason, timeoutController, externalSignal) {
  // Явная внешняя отмена важнее тайм-аута, если сработал именно внешний сигнал.
  if (externalSignal && externalSignal.aborted) return "aborted";
  if (timeoutController.signal.aborted) return "timeout";
  return "aborted";
}

export function createApiClient({ baseUrl, fetchFn = globalThis.fetch, timeoutMs = 10_000 } = {}) {
  if (typeof baseUrl !== "string" || baseUrl.length === 0) {
    throw new TypeError("baseUrl должен быть непустой строкой.");
  }
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new TypeError("baseUrl должен быть абсолютным URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("baseUrl должен использовать http или https.");
  }
  if (parsed.search || parsed.hash) {
    throw new TypeError("baseUrl не должен содержать query или hash.");
  }
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs должен быть положительным целым числом.");
  }

  async function requestJson(path, { query, signal: externalSignal, timeoutMs: callTimeout } = {}) {
    const url = buildUrl(baseUrl, path, query);
    const effectiveTimeout = callTimeout ?? timeoutMs;

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(new ApiError("Тайм-аут запроса.", { kind: "timeout", url })), effectiveTimeout);

    // Объединяем внешний и внутренний сигналы в один, чтобы fetch получил один signal.
    const signals = [timeoutController.signal];
    if (externalSignal) signals.push(externalSignal);
    const combined = typeof AbortSignal.any === "function"
      ? AbortSignal.any(signals)
      : (() => {
          const controller = new AbortController();
          for (const s of signals) {
            if (s.aborted) { controller.abort(s.reason); break; }
            s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
          }
          return controller.signal;
        })();

    let response;
    try {
      response = await fetchFn(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: combined,
      });
    } catch (error) {
      clearTimeout(timer);

      // fetch отменился из-за сигнала — уточняем вид.
      if (timeoutController.signal.aborted || externalSignal?.aborted) {
        const kind = classifyAbort(error, timeoutController, externalSignal);
        const message = kind === "timeout"
          ? `Превышено время ожидания (${effectiveTimeout} мс).`
          : "Запрос отменён.";
        throw new ApiError(message, { kind, url, cause: error });
      }

      throw new ApiError(
        `Сетевая ошибка: ${error instanceof Error ? error.message : String(error)}`,
        { kind: "network", url, cause: error },
      );
    }

    clearTimeout(timer);

    if (!isResponse(response)) {
      throw new ApiError("Ответ не является объектом Response.", {
        kind: "invalid-response",
        url,
      });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = /^application\/json\b/i.test(contentType);

    // Ошибки HTTP: пытаемся вытащить тело {error:{code,message,details}}.
    if (!response.ok) {
      let code = null;
      let details = null;
      let serverMessage = null;
      try {
        if (isJson) {
          const payload = await response.json();
          if (payload && typeof payload === "object" && payload.error) {
            code = typeof payload.error.code === "string" ? payload.error.code : null;
            details = payload.error.details ?? null;
            serverMessage = typeof payload.error.message === "string" ? payload.error.message : null;
          }
        }
      } catch {
        // тело не JSON — игнорируем, статус всё равно главнее.
      }
      throw new ApiError(
        serverMessage ?? `HTTP ${response.status} ${response.statusText || "ошибка"}.`,
        {
          kind: "http",
          status: response.status,
          code,
          details,
          url,
        },
      );
    }

    // 204 / пустое тело.
    if (response.status === 204) return null;

    if (!isJson) {
      throw new ApiError("Ожидался Content-Type application/json.", {
        kind: "invalid-response",
        status: response.status,
        url,
      });
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new ApiError("Не удалось разобрать JSON успешного ответа.", {
        kind: "invalid-response",
        status: response.status,
        url,
        cause: error,
      });
    }

    return payload;
  }

  return { requestJson };
}