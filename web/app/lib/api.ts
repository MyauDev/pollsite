// Универсальный helper для запросов к backend API с учётом куки
export async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Получение ленты
export async function fetchFeed(
  cursor?: string,
  deviceId?: string
): Promise<import('./types').CursorPage<import('./types').Poll>> {
  const url = cursor
    ? `/api/feed?cursor=${encodeURIComponent(cursor)}`
    : '/api/feed';

  const headers: Record<string, string> = {};
  if (deviceId) headers['X-Device-Id'] = deviceId;

  return api(url, { cache: 'no-store', headers });
}

// Голосование
export async function vote(
  poll_id: number,
  option_id: number,
  deviceId?: string,
  idemKey?: string
) {
  const headers: Record<string, string> = {};
  if (deviceId) headers['X-Device-Id'] = deviceId;
  if (idemKey) headers['Idempotency-Key'] = idemKey;

  return api('/api/vote', {
    method: 'POST',
    headers,
    body: JSON.stringify({ poll_id, option_id }),
  });
}

// Проверка авторизации через /api/auth/me
export async function isAuthed() {
  try {
    const me = await api('/api/auth/me');
    return !!me?.id;
  } catch {
    return false;
  }
}