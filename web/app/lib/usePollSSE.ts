'use client';
import { useEffect, useRef } from 'react';

export type PollUpdate = {
  poll_id: number;
  total_votes?: number;
  counts?: Record<string | number, number>;
  percents?: Record<string | number, number>;
};

type UsePollSSEOpts = {
  baseUrl?: string;         // например, "http://localhost"
  withCredentials?: boolean; // true, если API на другом origin и нужны куки
};

export function usePollSSE(
  pollId: number,
  onUpdate: (u: {
    poll_id: number;
    total_votes?: number;
    counts?: Record<string, number>;
    percents?: Record<string, number>;
  }) => void,
  opts: UsePollSSEOpts = {}
) {
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!pollId) return;

    const url =
      (opts.baseUrl ? opts.baseUrl.replace(/\/$/, '') : '') +
      `/api/stream/polls/${pollId}`;

    // EventSource init (с куками при cross-origin)
    const es =
      'withCredentials' in EventSource.prototype
        ? new (EventSource as any)(url, { withCredentials: !!opts.withCredentials })
        : new EventSource(url);

    const deliver = (raw: unknown) => {
      // batched delivery в ближайший кадр
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        try {
          const u = raw as Record<string, any>;
          const counts = u?.counts
            ? Object.fromEntries(
                Object.entries(u.counts).map(([k, v]) => [String(k), Number(v) || 0])
              )
            : undefined;
          const percents = u?.percents
            ? Object.fromEntries(
                Object.entries(u.percents).map(([k, v]) => [String(k), Number(v) || 0])
              )
            : undefined;

          onUpdate({
            poll_id: Number(u?.poll_id),
            total_votes: typeof u?.total_votes === 'number' ? u.total_votes : undefined,
            counts,
            percents,
          });
        } catch {
          // ignore parse/shape errors
        }
      });
    };

    const handler = (e: MessageEvent) => {
      try {
        deliver(JSON.parse(e.data));
      } catch {
        // ignore bad JSON
      }
    };

    // именованные события от сервера
    es.addEventListener('snapshot', handler);
    es.addEventListener('update', handler);
    // запасной канал, если сервер шлёт без event
    es.onmessage = handler;

    es.onerror = () => {
      // авто-reconnect делает сам EventSource, опираясь на retry с сервера
      // тут можно логировать в dev
      // if (process.env.NODE_ENV !== 'production') console.debug('SSE error', pollId);
    };

    return () => {
      // cleanup
      es.removeEventListener('snapshot', handler as any);
      es.removeEventListener('update', handler as any);
      es.onmessage = null;
      es.onerror = null;
      try { es.close(); } catch {}
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId, opts.baseUrl, opts.withCredentials, onUpdate]);
}