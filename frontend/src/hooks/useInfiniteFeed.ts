import { useCallback, useEffect, useRef, useState } from 'react';
import type { Poll } from '../types';
import { pollAPI } from '../api/endpoints';

interface CursorPage<T> {
  results: T[];
  next: string | null;
  previous: string | null;
}

export function useInfiniteFeed() {
  const [items, setItems] = useState<Poll[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const params = cursor ? { cursor } : {};
      const response = await pollAPI.list(params);
      const page: CursorPage<Poll> = response.data;
      
      // Prevent duplicates by filtering out polls that already exist
      setItems(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPolls = page.results.filter(poll => !existingIds.has(poll.id));
        return [...prev, ...newPolls];
      });
      
      if (page.next) {
        const nextUrl = new URL(page.next);
        setCursor(nextUrl.searchParams.get('cursor'));
      } else {
        setDone(true);
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, done]);

  // Auto-load first page
  useEffect(() => {
    if (!items.length && !loading && !done) {
      load();
    }
  }, [items.length, loading, done, load]);

  // Intersection observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) {
          load();
        }
      },
      { rootMargin: '400px 0px' }
    );
    
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  return { items, loading, done, sentinelRef };
}
