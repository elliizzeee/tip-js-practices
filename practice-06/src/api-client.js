export class ApiError extends Error {
  constructor(message, { kind, status = null, code = null, details = null, url = null, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

export function buildUrl(baseUrl, path, query = {}) {
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
    value !== null
    && typeof value === "object"
    && typeof value.status === "number"
    && typeof value.ok === "boolean"
    && typeof value.headers?.get === "function"
    && typeof value.json === "function"
  );
}

function classifyAbort(timeoutController, externalSignal) {
  if (externalSignal?.aborted) return "aborted";
  if (timeoutController.signal.aborted) return "timeout";
  return "aborted";
}

export function createApiClient({ baseUrl, fetchFn = globalThis.fetch, timeoutMs = 3000 } = {}) {
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

  async function requestJson(path, { method = "GET", query, body, signal: externalSignal, timeoutMs: callTimeout } = {}) {
    const verb = String(method).toUpperCase();
    if (!ALLOWED_METHODS.has(verb)) {
      throw new TypeError(`Метод ${method} не поддерживается.`);
    }
    if (verb === "GET" && body !== undefined) {
      throw new TypeError("GET не должен содержать тело запроса.");
    }

    const url = buildUrl(baseUrl, path, query);
    const effectiveTimeout = callTimeout ?? timeoutMs;

    const headers = { Accept: "application/json" };
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const timeoutController = new AbortController();
    const timer = setTimeout(
      () => timeoutController.abort(new ApiError("Тайм-аут запроса.", { kind: "timeout", url })),
      effectiveTimeout,
    );

    const signals = [timeoutController.signal];
    if (externalSignal) signals.push(externalSignal);
    const combined = typeof AbortSignal.any === "function"
      ? AbortSignal.any(signals)
      : (() => {
          const c = new AbortController();
          for (const s of signals) {
            if (s.aborted) { c.abort(s.reason); break; }
            s.addEventListener("abort", () => c.abort(s.reason), { once: true });
          }
          return c.signal;
        })();

    let response;
    try {
      response = await fetchFn(url, { method: verb, headers, body: payload, signal: combined });
    } catch (error) {
      clearTimeout(timer);
      if (timeoutController.signal.aborted || externalSignal?.aborted) {
        const kind = classifyAbort(timeoutController, externalSignal);
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
      throw new ApiError("Ответ не является объектом Response.", { kind: "invalid-response", url });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = /^application\/json\b/i.test(contentType);

    // Сначала HTTP-ошибка, потом Content-Type успешного ответа.
    if (!response.ok) {
      let code = null;
      let details = null;
      let serverMessage = null;
      try {
        if (isJson) {
          const parsedBody = await response.json();
          if (parsedBody && typeof parsedBody === "object" && parsedBody.error) {
            code = typeof parsedBody.error.code === "string" ? parsedBody.error.code : null;
            details = parsedBody.error.details ?? null;
            serverMessage = typeof parsedBody.error.message === "string" ? parsedBody.error.message : null;
          }
        }
      } catch {
        // тело не JSON — статус важнее.
      }
      throw new ApiError(
        serverMessage ?? `HTTP ${response.status} ${response.statusText || "ошибка"}.`,
        { kind: "http", status: response.status, code, details, url },
      );
    }

    if (response.status === 204) return null;

    if (!isJson) {
      throw new ApiError("Ожидался Content-Type application/json.", {
        kind: "invalid-response", status: response.status, url,
      });
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ApiError("Не удалось разобрать JSON успешного ответа.", {
        kind: "invalid-response", status: response.status, url, cause: error,
      });
    }
  }

  return { requestJson };
}