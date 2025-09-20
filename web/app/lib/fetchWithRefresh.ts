export async function fetchWithRefresh(path: string, init: RequestInit = {}) {
  // не запускаем refresh для самого refresh-эндпоинта
  const isRefreshCall = typeof path === "string" && path.includes("/api/auth/refresh");

  const doFetch = () => fetch(path, { ...init, credentials: "include" as const });

  let res = await doFetch();
  if (res.status !== 401 || isRefreshCall) {
    return res;
  }

  // Глобальный (на модуль) промис рефреша, чтобы не было «штормов»
  const g = globalThis as any;
  if (!g.__refreshPromise) {
    g.__refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      // очистка после завершения
      g.__refreshPromise = null;
    });
  }

  const r = await g.__refreshPromise;
  if (r && r.ok) {
    // ВАЖНО: если исходный запрос был с «одноразовым» body (ReadableStream/FormData),
    // его надо создавать заново снаружи. Для JSON/строки обычно ок.
    res = await doFetch();
  }

  return res;
}
