'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { vote } from '@/app/lib/api';
import type { Poll } from '@/app/lib/types';
import Comments from '@/components/Comments';

/** Fire-and-forget analytics event sender (client-only) */
async function sendEvent(
  kind: 'view' | 'dwell' | 'vote' | 'share',
  pollId: number,
  dwellMs?: number
) {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, poll_id: pollId, dwell_ms: dwellMs || 0 }),
      keepalive: kind === 'dwell', // helps on unload
    });
  } catch {
    /* noop */
  }
}

/** Narrow helper types for unknown fields coming from API */
type Topic = { id: number; name: string };
type Author = { id: number; name?: string };

/** Type guard: checks that poll has `topics: Topic[]` */
function hasTopics(p: unknown): p is { topics: Topic[] } {
  const t = (p as any)?.topics;
  return Array.isArray(t) && t.every((x: any) => typeof x?.id === 'number');
}

/** Type guard: checks that poll has `author` with numeric id */
function hasAuthor(p: unknown): p is { author: Author } {
  const a = (p as any)?.author;
  return a && typeof a.id === 'number';
}

async function followTopic(topicId: number, token?: string) {
  const res = await fetch(`/api/topics/${topicId}/follow`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('follow failed');
}

async function followAuthor(authorId: number, token?: string) {
  const res = await fetch(`/api/authors/${authorId}/follow`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('follow failed');
}

function shareUrl(pollId: number) {
  // Works on client and falls back to env or localhost on SSR
  const base =
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL) || 'http://localhost';
  return `${base}/p/${pollId}`;
}

type Props = {
  poll: Poll; // stats may be null — this is valid for this type
};

export default function PollCard({ poll }: Props) {
  // Initialize counts from poll.stats, but ensure every option id is present
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    const src = (poll.stats as any)?.counts ?? {};
    const map: Record<number, number> = {};
    for (const opt of poll.options) {
      map[opt.id] = Number(src[opt.id]) || 0;
    }
    return map;
  });

  const [total, setTotal] = useState<number>(() => poll.stats?.total_votes ?? 0);
  const [chosen, setChosen] = useState<number | null>(() => poll.user_vote ?? null);

  // --- Analytics: view + dwell tracking ---
  useEffect(() => {
    /** Start a dwell timer and send 'view' once when poll appears */
    let start = performance.now();
    sendEvent('view', poll.id);
    return () => {
      const dwell = Math.round(performance.now() - start);
      sendEvent('dwell', poll.id, dwell);
    };
  }, [poll.id]);

  // Sync with incoming poll updates (e.g., when feed page appends/refreshes)
  useEffect(() => {
    const src = (poll.stats as any)?.counts ?? {};
    const map: Record<number, number> = {};
    for (const opt of poll.options) map[opt.id] = Number(src[opt.id]) || 0;
    setCounts(map);
    setTotal(poll.stats?.total_votes ?? 0);

    const userVote = poll.user_vote ?? null;
    setChosen(userVote);
  }, [poll]);

  // Precompute percents for progress bars
  const percents = useMemo(() => {
    const t = total || 0;
    const map: Record<number, number> = {};
    for (const opt of poll.options) {
      const c = counts[opt.id] || 0;
      map[opt.id] = t ? Math.round((c / t) * 10000) / 100 : 0;
    }
    return map;
  }, [counts, total, poll.options]);

  // Rules for when to show results
  const canShowResults =
    poll.results_mode === 'open' ||
    chosen !== null ||
    !!poll.results_available ||
    !!poll.user_vote;

  // Voting handler with optimistic update and server resync
  const onChoose = useCallback(
    async (optId: number) => {
      if (chosen !== null) return; // single vote (MVP)

      setChosen(optId);
      setCounts((prev) => ({ ...prev, [optId]: (prev[optId] || 0) + 1 }));
      setTotal((t) => t + 1);

      try {
        const res = await vote(poll.id, optId);
        const serverCounts: Record<number, number> = {};
        for (const [k, v] of Object.entries((res as any).counts || {})) {
          serverCounts[Number(k)] = Number(v as number);
        }
        setCounts(serverCounts);
        setTotal((res as any).total_votes || 0);

        // --- Analytics: vote (only after backend confirms) ---
        sendEvent('vote', poll.id);
      } catch (e) {
        // rollback to server state if failed
        const src = (poll.stats as any)?.counts ?? {};
        const map: Record<number, number> = {};
        for (const opt of poll.options) map[opt.id] = Number(src[opt.id]) || 0;
        setCounts(map);
        setTotal(poll.stats?.total_votes ?? 0);
        setChosen(poll.user_vote ?? null);
        console.error(e);
      }
    },
    [chosen, poll]
  );

  return (
    <div className="h-fit rounded-2xl bg-card/80 backdrop-blur-sm p-6 flex flex-col justify-between shadow-xl border border-white/5">
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-400">#{poll.id}</div>
          {chosen !== null && (
            <div className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full border border-green-400/20">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Отвечено
            </div>
          )}
        </div>
        <h2 className="text-2xl font-semibold mt-1">{poll.title}</h2>
        {poll.description && <p className="text-zinc-300 mt-2">{poll.description}</p>}
      </div>

      <div className="space-y-3 mt-6">
        {poll.options.map((opt) => {
          const percent = percents[opt.id] ?? 0;
          const active = chosen === opt.id;
          return (
            <button
              key={opt.id}
              disabled={chosen !== null}
              onClick={() => onChoose(opt.id)}
              className={`w-full relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
                active
                  ? 'border-green-400/50 bg-green-400/5 cursor-default'
                  : chosen !== null
                  ? 'border-zinc-700/50 cursor-default opacity-70'
                  : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/20'
              }`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {active && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center"
                    >
                      <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </motion.div>
                  )}
                  <span className="text-base">{opt.text}</span>
                </div>
                <AnimatePresence>
                  {canShowResults && (
                    <motion.span
                      key={`${opt.id}-percent`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-zinc-300"
                    >
                      {percent.toFixed(0)}%
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <Comments pollId={poll.id} />
              {canShowResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className={`absolute inset-y-0 left-0 ${
                    active ? 'bg-green-400/20' : 'bg-zinc-800/50'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div>#{poll.id}</div>
        <div className="space-x-2">
          {hasTopics(poll) &&
            poll.topics.map((t) => (
              <button key={t.id} onClick={() => followTopic(t.id)} className="underline">
                + тема {t.name}
              </button>
            ))}
          {hasAuthor(poll) && (
            <button onClick={() => followAuthor(poll.author.id)} className="underline">
              + автор
            </button>
          )}
        </div>
      </div>

      <button
        className="text-xs text-zinc-400 underline"
        onClick={async () => {
          const reason = prompt('Причина жалобы: spam/abuse/nsfw/illegal/other', 'abuse') || 'abuse';
          const res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_type: 'poll', target_id: poll.id, reason }),
          });
          if (res.ok) alert('Спасибо! Жалоба отправлена.');
          else alert('Не удалось отправить жалобу.');
        }}
      >
        Пожаловаться
      </button>

      {/* Footer with "Share" button */}
      <div className="flex items-center justify-between text-xs text-zinc-400 mt-4">
        <span>{total} голосов</span>
        <button
          type="button"
          className="underline text-zinc-300"
          onClick={async () => {
            const url = shareUrl(poll.id);
            const title = poll.title || 'Опрос';
            try {
              if (navigator.share) {
                await navigator.share({ title, url });
                // --- Analytics: share (native share succeeded) ---
                sendEvent('share', poll.id);
              } else {
                await navigator.clipboard.writeText(url);
                alert('Ссылка скопирована');
                // --- Analytics: share (clipboard fallback) ---
                sendEvent('share', poll.id);
              }
            } catch {
              /* noop */
            }
          }}
        >
          Поделиться
        </button>
      </div>
    </div>
  );
}
