export async function fetchWithRefresh(path: string, init: RequestInit = {}) {
  const doFetch = () => fetch(path, { ...init, credentials: 'include' });
  let res = await doFetch();
  if (res.status === 401) {
    const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (r.ok) res = await doFetch();
  }
  return res;
}
