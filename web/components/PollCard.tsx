'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { vote } from '@/app/lib/api';
import type { Poll } from '@/app/lib/types';

function shareUrl(pollId: number) {
  const base =
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL) || 'http://localhost';
  return `${base}/p/${pollId}`;
}

type Props = {
  poll: Poll; // stats может быть null — это валидно для этого типа
};

export default function PollCard({ poll }: Props) {
  // инициализируем из poll.stats (если есть)
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    const src = (poll.stats as any)?.counts ?? {};
    const map: Record<number, number> = {};
    for (const opt of poll.options) {
      map[opt.id] = Number(src[opt.id]) || 0;
    }
    return map;
  });

  const [total, setTotal] = useState<number>(() => poll.stats?.total_votes ?? 0);
  const [chosen, setChosen] = useState<number | null>(null);

  // если сам poll обновился (при догрузке ленты) — синхронизируемся
  useEffect(() => {
    const src = (poll.stats as any)?.counts ?? {};
    const map: Record<number, number> = {};
    for (const opt of poll.options) map[opt.id] = Number(src[opt.id]) || 0;
    setCounts(map);
    setTotal(poll.stats?.total_votes ?? 0);
  }, [poll]);

  const percents = useMemo(() => {
    const t = total || 0;
    const map: Record<number, number> = {};
    for (const opt of poll.options) {
      const c = counts[opt.id] || 0;
      map[opt.id] = t ? Math.round((c / t) * 10000) / 100 : 0;
    }
    return map;
  }, [counts, total, poll.options]);

  const canShowResults =
    poll.results_mode === 'open' || chosen !== null || !!poll.results_available;

  const onChoose = useCallback(
    async (optId: number) => {
      if (chosen !== null) return; // один голос (MVP)
      setChosen(optId);
      // optimistic
      setCounts(prev => ({ ...prev, [optId]: (prev[optId] || 0) + 1 }));
      setTotal(t => t + 1);
      try {
        const res = await vote(poll.id, optId);
        // sync с сервером
        const serverCounts: Record<number, number> = {};
        for (const [k, v] of Object.entries((res as any).counts || {})) {
          serverCounts[Number(k)] = Number(v as number);
        }
        setCounts(serverCounts);
        setTotal((res as any).total_votes || 0);
      } catch (e) {
        // откат — на ошибке возвращаем оптимизм назад
        const src = (poll.stats as any)?.counts ?? {};
        const map: Record<number, number> = {};
        for (const opt of poll.options) map[opt.id] = Number(src[opt.id]) || 0;
        setCounts(map);
        setTotal(poll.stats?.total_votes ?? 0);
        setChosen(null);
        console.error(e);
      }
    },
    [chosen, poll]
  );

  return (
    <div className="h-[88dvh] my-3 rounded-3xl bg-card p-6 flex flex-col justify-between shadow-xl">
      <div>
        <div className="text-xs text-zinc-400">#{poll.id}</div>
        <h2 className="text-2xl font-semibold mt-1">{poll.title}</h2>
        {poll.description && <p className="text-zinc-300 mt-2">{poll.description}</p>}
      </div>

      <div className="space-y-3 mt-6">
        {poll.options.map(opt => {
          const percent = percents[opt.id] ?? 0;
          const active = chosen === opt.id;
          return (
            <button
              key={opt.id}
              disabled={chosen !== null}
              onClick={() => onChoose(opt.id)}
              className={`w-full relative overflow-hidden rounded-2xl border border-zinc-700 px-4 py-4 text-left ${
                chosen !== null ? 'cursor-default' : 'hover:border-zinc-500'
              }`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-base">{opt.text}</span>
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
              {canShowResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className={`absolute inset-y-0 left-0 ${
                    active ? 'bg-zinc-700/60' : 'bg-zinc-800/50'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* футер карточки с кнопкой "Поделиться" */}
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
              } else {
                await navigator.clipboard.writeText(url);
                alert('Ссылка скопирована');
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

