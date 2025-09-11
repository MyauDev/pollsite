export async function fetchFeed(cursor?: string, deviceId?: string): Promise<import('./types').CursorPage<import('./types').Poll>> {
    const url = cursor ? `/api/feed?cursor=${encodeURIComponent(cursor)}` : '/api/feed';
    const headers: Record<string, string> = {};
    if (deviceId) headers['X-Device-Id'] = deviceId;
    
    // Add JWT token from client-side cookie if available
    if (typeof document !== 'undefined') {
        const jwtToken = document.cookie
            .split(';')
            .find(cookie => cookie.trim().startsWith('jwt_fallback='))
            ?.split('=')[1];
        
        if (jwtToken) {
            headers['Authorization'] = `Bearer ${jwtToken}`;
        }
    }
    
    const res = await fetch(url, { 
        cache: 'no-store',
        credentials: 'include', // Include cookies
        headers 
    });
    if (!res.ok) throw new Error('Failed to load feed');
    return res.json();
}

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

export async function vote(poll_id: number, option_id: number, deviceId?: string, idemKey?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (deviceId) headers['X-Device-Id'] = deviceId;
    if (idemKey) headers['Idempotency-Key'] = idemKey;
    const res = await fetch('/api/vote', {
        method: 'POST',
        headers,
        body: JSON.stringify({ poll_id, option_id })
    });
    if (!res.ok) throw new Error('Vote failed');
    return res.json();
}

// Проверка авторизации через /api/auth/me
export async function isAuthed() {
    try {
        const res = await fetch('/api/auth/me', {
            credentials: 'include',
            cache: 'no-store'
        });
        if (!res.ok) return false;
        const me = await res.json();
        return !!me?.id;
    } catch {
        return false;
    }
}