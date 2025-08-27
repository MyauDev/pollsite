'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CursorPage, Poll } from './types';
import { fetchFeed } from './api';


export function useInfiniteFeed() {
const [items, setItems] = useState<Poll[]>([]);
const [cursor, setCursor] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
const [done, setDone] = useState(false);


const load = useCallback(async () => {
if (loading || done) return;
setLoading(true);
try {
const page: CursorPage<Poll> = await fetchFeed(cursor ?? undefined);
setItems(prev => [...prev, ...page.results]);
if (page.next) {
const nextUrl = new URL(page.next);
setCursor(nextUrl.searchParams.get('cursor'));
} else {
setDone(true);
}
} finally { setLoading(false); }
}, [cursor, loading, done]);


// авто‑загрузка первой страницы
useEffect(() => { if (!items.length) load(); }, []);


// наблюдатель конца списка
const sentinelRef = useRef<HTMLDivElement | null>(null);
useEffect(() => {
const el = sentinelRef.current; if (!el) return;
const io = new IntersectionObserver((entries) => {
if (entries.some(e => e.isIntersecting)) load();
}, { rootMargin: '400px 0px' });
io.observe(el);
return () => io.disconnect();
}, [load]);


return { items, loading, done, sentinelRef };
}