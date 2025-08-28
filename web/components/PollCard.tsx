'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { vote } from '@/app/lib/api';
import type { Poll } from '@/app/lib/types';
import { useState } from 'react';


async function followTopic(topicId: number, token?: string) {
const res = await fetch(`/api/topics/${topicId}/follow`, { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
if (!res.ok) throw new Error('follow failed');
}
async function followAuthor(authorId: number, token?: string) {
const res = await fetch(`/api/authors/${authorId}/follow`, { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
if (!res.ok) throw new Error('follow failed');
}
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
  const [chosen, setChosen] = useState<number | null>(() => poll.user_vote ?? null);

  // если сам poll обновился (при догрузке ленты) — синхронизируемся
  useEffect(() => {
    const src = (poll.stats as any)?.counts ?? {};
    const map: Record<number, number> = {};
    for (const opt of poll.options) map[opt.id] = Number(src[opt.id]) || 0;
    setCounts(map);
    setTotal(poll.stats?.total_votes ?? 0);

    // Если есть user_vote, применяем ту же логику что и при голосовании
    const userVote = poll.user_vote ?? null;
    setChosen(userVote);

    // Если пользователь уже голосовал, но статистика не отражает это (например, при первой загрузке),
    // применяем оптимистичное обновление как при голосовании
    if (userVote && map[userVote] !== undefined) {
      // Используем серверную статистику как есть, так как она уже включает голос пользователя
      // Никаких дополнительных изменений не нужно
    }
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
    poll.results_mode === 'open' || chosen !== null || !!poll.results_available || !!poll.user_vote;

  const onChoose = useCallback(
    async (optId: number) => {
      if (chosen !== null) return; // один голос (MVP)

      // Применяем ту же логику что и при пресете answered polls
      setChosen(optId);
      // optimistic update
      setCounts(prev => ({ ...prev, [optId]: (prev[optId] || 0) + 1 }));
      setTotal(t => t + 1);

      try {
        const res = await vote(poll.id, optId);
        // sync с сервером - используем точно такую же логику обновления
        const serverCounts: Record<number, number> = {};
        for (const [k, v] of Object.entries((res as any).counts || {})) {
          serverCounts[Number(k)] = Number(v as number);
        }
        setCounts(serverCounts);
        setTotal((res as any).total_votes || 0);
        // chosen уже установлен выше, сервер должен подтвердить наш выбор
      } catch (e) {
        // откат — возвращаем к исходному состоянию
        const src = (poll.stats as any)?.counts ?? {};
        const map: Record<number, number> = {};
        for (const opt of poll.options) map[opt.id] = Number(src[opt.id]) || 0;
        setCounts(map);
        setTotal(poll.stats?.total_votes ?? 0);
        setChosen(poll.user_vote ?? null); // возвращаем к серверному состоянию
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
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Отвечено
            </div>
          )}
        </div>
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
              className={`w-full relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${active
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
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
              {canShowResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className={`absolute inset-y-0 left-0 ${active ? 'bg-green-400/20' : 'bg-zinc-800/50'
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
          {poll.topics?.map((t: any) => (
          <button key={t.id} onClick={() => followTopic(t.id)} className="underline">+ тема {t.name}</button>
          ))}
          {poll.author && (
          <button onClick={() => followAuthor(poll.author.id)} className="underline">+ автор</button>
          )}
        </div>
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

