// web/components/Replies.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Comment } from "@/components/Comments";

/**
 * Replies list for a given parent comment.
 * - Lazy loads on mount.
 * - Supports pagination (?page=N).
 * - Subscribes to SSE and appends newly created replies in real time.
 */
export default function Replies({
  pollId,
  parentId,
}: {
  pollId: number;
  parentId: number;
}) {
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  type Paginated<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
  };

  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      const url = `/api/polls/${pollId}/comments?parent=${parentId}&page=${pageToLoad}`;
      const res = await fetch(url, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("failed to load replies");
      const data: Paginated<Comment> | Comment[] = await res.json();

      if (Array.isArray(data)) {
        // Non-paginated fallback
        setItems((prev) => (pageToLoad === 1 ? data : [...prev, ...data]));
        setHasMore(false);
      } else {
        setItems((prev) =>
          pageToLoad === 1 ? data.results : [...prev, ...data.results]
        );
        setHasMore(Boolean(data.next));
      }

      setPage(pageToLoad);
    },
    [pollId, parentId]
  );

  // initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPage(1)
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setHasMore(false);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  // SSE subscription: only care about replies to this parent
  useEffect(() => {
    const es = new EventSource(`/api/stream/polls/${pollId}`);

    const onCreated = (e: MessageEvent) => {
      try {
        const c: Comment = JSON.parse(e.data);
        if (c.status !== "visible") return;
        if (c.parent !== parentId) return;

        setItems((prev) => {
          if (prev.some((x) => x.id === c.id)) return prev;
          // append to the end (older at bottom) or prepend — choose UX.
          return [...prev, c];
        });
      } catch {
        /* ignore */
      }
    };

    const onHidden = (e: MessageEvent) => {
      try {
        const { id } = JSON.parse(e.data) as { id: number; status?: string };
        setItems((prev) => prev.filter((r) => r.id !== id));
      } catch {
        /* ignore */
      }
    };

    const onUnhidden = (e: MessageEvent) => {
      try {
        const c: Comment = JSON.parse(e.data);
        if (c.status !== "visible") return;
        if (c.parent !== parentId) return;
        setItems((prev) => {
          if (prev.some((x) => x.id === c.id)) return prev;
          return [...prev, c];
        });
      } catch {
        /* ignore */
      }
    };

    es.addEventListener("comment.created", onCreated);
    es.addEventListener("comment.hidden", onHidden);
    es.addEventListener("comment.unhidden", onUnhidden);

    es.onerror = () => {
      // EventSource will reconnect automatically.
    };

    return () => es.close();
  }, [pollId, parentId]);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    try {
      await fetchPage(page + 1);
    } catch (e) {
      console.error(e);
    }
  }, [hasMore, page, fetchPage]);

  if (loading) {
    return (
      <div className="pl-4 text-xs opacity-70">
        Загружаем ответы…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pl-4 text-xs opacity-60">
        Ответов пока нет.
      </div>
    );
  }

  return (
    <div className="mt-2 grid gap-2 pl-4">
      {items.map((r) => (
        <article
          key={r.id}
          className="rounded-lg border border-white/10 bg-white/5 p-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] opacity-80">
              {r.author_email || "Аноним"}
            </div>
            <div className="text-[10px] opacity-60">
              {new Date(r.created_at).toLocaleString?.() ?? r.created_at}
            </div>
          </div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{r.content}</div>
        </article>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="mt-1 w-max rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
        >
          Показать ещё ответы
        </button>
      )}
    </div>
  );
}
