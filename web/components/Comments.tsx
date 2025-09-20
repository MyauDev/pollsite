// web/components/Comments.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommentItem from "@/components/CommentItem";

/** Public comment DTO aligned with your backend read-serializer */
export type Comment = {
  id: number;
  poll: number;
  parent: number | null;
  content: string;
  status: "visible" | "hidden";
  author_email?: string | null;
  created_at: string;
  replies_count: number;
};

/** Simple helper: read a cookie by name */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([$?*|{}\]\\^])/g, "\\$1") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Ensure we have a device ID (cookie or localStorage). Returns ID and also sets cookie if missing. */
function ensureDeviceId(): string {
  if (typeof window === "undefined") return "";
  const fromCookie = getCookie("did");
  if (fromCookie) return fromCookie;
  const stored = window.localStorage.getItem("did");
  const id = stored || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  try {
    // set a long-lived cookie (1 year)
    document.cookie = `did=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 365}`;
  } catch {}
  try {
    window.localStorage.setItem("did", id);
  } catch {}
  return id;
}

/** DRF-like paginated response */
type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export default function Comments({ pollId }: { pollId: number }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [newContent, setNewContent] = useState("");
  const [posting, setPosting] = useState(false);

  const [replyTo, setReplyTo] = useState<number | null>(null); // parent comment id to reply
  const didRef = useRef<string>("");

  // initialize device id once
  useEffect(() => {
    didRef.current = ensureDeviceId();
  }, []);

  /** Fetch a page of root comments (parent is null) */
  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      const url = `/api/polls/${pollId}/comments?page=${pageToLoad}`;
      const res = await fetch(url, { cache: "no-store", credentials: "include", headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("failed to load comments");
      const data: Paginated<Comment> | Comment[] = await res.json();
      if (Array.isArray(data)) {
        // Non-paginated fallback
        setItems((prev) => (pageToLoad === 1 ? data : [...prev, ...data]));
        setHasMore(false);
      } else {
        setItems((prev) => (pageToLoad === 1 ? data.results : [...prev, ...data.results]));
        setHasMore(Boolean(data.next));
      }
      setPage(pageToLoad);
    },
    [pollId]
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
  }, [pollId, fetchPage]);

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/stream/polls/${pollId}`);

    /** Handle new visible comment (root or reply) */
    const onCreated = (e: MessageEvent) => {
      try {
        const c: Comment = JSON.parse(e.data);
        if (c.status === "hidden") return;
        setItems((prev) => {
          // if reply, bump parent replies_count (if parent is currently loaded)
          if (c.parent) {
            return prev.map((p) => (p.id === c.parent ? { ...p, replies_count: (p.replies_count ?? 0) + 1 } : p));
          }
          // if root: prepend, avoid duplicates
          if (prev.some((x) => x.id === c.id)) return prev;
          return [c, ...prev];
        });
      } catch {
        // ignore parse errors
      }
    };

    /** Hide comment (remove from currently loaded list) */
    const onHidden = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as { id: number; status?: string };
        setItems((prev) => prev.filter((c) => c.id !== payload.id));
      } catch {
        // ignore
      }
    };

    /** Unhide: backend sends full object -> we can insert (root) or bump replies_count (reply) */
    const onUnhidden = (e: MessageEvent) => {
      try {
        const c: Comment = JSON.parse(e.data);
        if (c.status !== "visible") return;
        setItems((prev) => {
          if (c.parent) {
            return prev.map((p) => (p.id === c.parent ? { ...p, replies_count: (p.replies_count ?? 0) + 1 } : p));
          }
          if (prev.some((x) => x.id === c.id)) return prev;
          return [c, ...prev];
        });
      } catch {
        // ignore
      }
    };

    es.addEventListener("comment.created", onCreated);
    es.addEventListener("comment.hidden", onHidden);
    es.addEventListener("comment.unhidden", onUnhidden);
    es.onerror = () => {
      // EventSource will auto-reconnect; no-op
    };

    return () => es.close();
  }, [pollId]);

  /** Post a new comment (root or reply) */
  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const content = newContent.trim();
      if (!content) return;

      setPosting(true);
      try {
        const body = JSON.stringify({ poll: pollId, parent: replyTo ?? null, content });
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        // include device header if available
        const did = didRef.current;
        if (did) headers["X-Device-Id"] = did;

        const res = await fetch("/api/comments", {
          method: "POST",
          credentials: "include",
          headers,
          body,
        });
        // If backend returns 201 with comment JSON — great.
        // Even if not, SSE "comment.created" will arrive and UI will update.
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const msg = (data && (data.detail || data.error)) || "Не удалось отправить комментарий";
          throw new Error(typeof msg === "string" ? msg : "Не удалось отправить комментарий");
        }

        // Optimistic UX: if server echoes the created comment and it's visible — merge it
        const created = await res.json().catch(() => null);
        if (created && created.status === "visible") {
          const c = created as Comment;
          setItems((prev) => {
            if (c.parent) {
              return prev.map((p) => (p.id === c.parent ? { ...p, replies_count: (p.replies_count ?? 0) + 1 } : p));
            }
            if (prev.some((x) => x.id === c.id)) return prev;
            return [c, ...prev];
          });
        }

        setNewContent("");
        setReplyTo(null);
      } catch (err) {
        // You can show a toast here
        console.error(err);
      } finally {
        setPosting(false);
      }
    },
    [newContent, pollId, replyTo]
  );

  const startReply = useCallback((parentId: number) => {
    setReplyTo(parentId);
    // focus textarea (if desired)
    const el = document.getElementById("comment-textarea") as HTMLTextAreaElement | null;
    el?.focus();
  }, []);

  const cancelReply = useCallback(() => setReplyTo(null), []);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    try {
      await fetchPage(page + 1);
    } catch (e) {
      console.error(e);
    }
  }, [hasMore, page, fetchPage]);

  const replyBanner = useMemo(() => {
    if (!replyTo) return null;
    const parent = items.find((c) => c.id === replyTo);
    return (
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
        <div className="truncate">
          Ответ на комментарий #{replyTo}
          {parent ? ` — ${parent.author_email || "Аноним"}` : ""}
        </div>
        <button
          type="button"
          onClick={cancelReply}
          className="rounded-md border border-white/10 bg-white/10 px-2 py-1 hover:bg-white/15"
        >
          Отменить
        </button>
      </div>
    );
  }, [replyTo, items, cancelReply]);

  if (loading) return <div>Загрузка комментариев…</div>;

  return (
    <section className="grid gap-4">
      {/* New comment form */}
      <form onSubmit={submit} className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
        {replyBanner}
        <textarea
          id="comment-textarea"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
          placeholder={replyTo ? "Ваш ответ…" : "Ваш комментарий…"}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
          aria-label="Комментарий"
        />
        <div className="flex items-center justify-between">
          <div className="text-xs opacity-60">
            {newContent.trim().length}/1000
          </div>
          <div className="flex items-center gap-2">
            {replyTo && (
              <button
                type="button"
                onClick={cancelReply}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
              >
                Отмена
              </button>
            )}
            <button
              type="submit"
              disabled={posting || newContent.trim().length === 0}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-sm hover:bg-white/15 disabled:opacity-60"
            >
              {posting ? "Отправляем…" : replyTo ? "Ответить" : "Отправить"}
            </button>
          </div>
        </div>
      </form>

      {/* Comments list */}
      <div className="grid gap-3">
        {items.length === 0 ? (
          <div className="text-sm opacity-60">Комментариев пока нет. Будьте первым!</div>
        ) : (
          items.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onReply={() => startReply(comment.id)} />
          ))
        )}

        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            className="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Показать ещё
          </button>
        )}
      </div>
    </section>
  );
}