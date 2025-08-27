export function getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return '';
    const k = 'did';
    let v = localStorage.getItem(k);
    if (!v) {
    v = (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem(k, v);
    }
    return v;
    }