export async function fetchFeed(cursor?: string, deviceId?: string): Promise<import('./types').CursorPage<import('./types').Poll>> {
    const url = cursor ? `/api/feed?cursor=${encodeURIComponent(cursor)}` : '/api/feed';
    const headers: Record<string, string> = {};
    if (deviceId) headers['X-Device-Id'] = deviceId;
    
    const res = await fetch(url, { 
        cache: 'no-store',
        headers 
    });
    if (!res.ok) throw new Error('Failed to load feed');
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