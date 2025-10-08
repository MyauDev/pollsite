"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { fetchWithRefresh } from "@/app/lib/fetchWithRefresh";

type QueuePoll = {
  id: number;
  title: string;
  author_id: number;
  created_at: string;
  under_review: boolean;
  reports_total: number;
  is_hidden: boolean;
  is_frozen: boolean;
};

type Action =
  | "hide"
  | "unhide"
  | "freeze"
  | "unfreeze"
  | "mark_reviewed";

async function postAction(pollId: number, action: Action) {
  const res = await fetchWithRefresh(`/api/moderation/polls/${pollId}/action`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Action failed");
  }
  return (await res.json()) as {
    ok: boolean;
    poll_id: number;
    is_hidden: boolean;
    is_frozen: boolean;
    under_review?: boolean;
    reports_total?: number;
  };
}

export default function ModerationQueuePage() {
  const [items, setItems] = useState<QueuePoll[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetchWithRefresh("/api/moderation/queue", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.detail || "Не удалось загрузить очередь";
        throw new Error(msg);
      }
      const data = (await res.json()) as QueuePoll[];
      setItems(data);
    } catch (e: any) {
      setErr(e?.message || "Ошибка");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onAction = useCallback(
    async (pollId: number, action: Action) => {
      try {
        const res = await postAction(pollId, action);
        // мягкий апдейт локального списка
        setItems((prev) =>
          (prev || []).map((p) =>
            p.id === pollId
              ? {
                  ...p,
                  is_hidden: res.is_hidden,
                  is_frozen: res.is_frozen,
                  under_review:
                    typeof res.under_review === "boolean" ? res.under_review : p.under_review,
                  reports_total:
                    typeof res.reports_total === "number" ? res.reports_total : p.reports_total,
                }
              : p
          )
        );
      } catch (e: any) {
        alert(e?.message || "Не удалось выполнить действие");
      }
    },
    []
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Очередь модерации</h1>
        <button
          onClick={() => load()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          Обновить
        </button>
      </div>

      {loading && <p className="opacity-80">Загрузка…</p>}
      {!loading && err && (
        <p className="text-red-300">Ошибка: {err}</p>
      )}

      {!loading && !err && (
        <>
          {(items?.length ?? 0) === 0 ? (
            <p className="opacity-70">Пока пусто.</p>
          ) : (
            <ul className="grid gap-3">
              {items!.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="mt-1 text-xs opacity-70">
                        ID: {p.id} • Автор: {p.author_id} • Репортов:{" "}
                        <span className={p.reports_total >= 3 ? "text-amber-300" : ""}>
                          {p.reports_total}
                        </span>{" "}
                        • {p.under_review ? "На проверке" : "—"}
                        {p.is_hidden ? " • Скрыт" : ""}{p.is_frozen ? " • Заморожен" : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {p.is_hidden ? (
                        <button
                          onClick={() => onAction(p.id, "unhide")}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                        >
                          Показать
                        </button>
                      ) : (
                        <button
                          onClick={() => onAction(p.id, "hide")}
                          className="rounded-md border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs hover:bg-red-400/15"
                        >
                          Скрыть
                        </button>
                      )}

                      {p.is_frozen ? (
                        <button
                          onClick={() => onAction(p.id, "unfreeze")}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                        >
                          Разморозить
                        </button>
                      ) : (
                        <button
                          onClick={() => onAction(p.id, "freeze")}
                          className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs hover:bg-amber-300/15"
                        >
                          Заморозить
                        </button>
                      )}

                      <button
                        onClick={() => onAction(p.id, "mark_reviewed")}
                        className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs hover:bg-emerald-400/15"
                      >
                        Проверено
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
