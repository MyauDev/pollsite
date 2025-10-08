"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fetchWithRefresh } from "@/app/lib/fetchWithRefresh";
import { usePollSSE, type PollUpdate } from "@/app/lib/usePollSSE";
import { getOrCreateDeviceId } from "@/app/lib/device";
import { useVote } from "@/app/lib/useVote";
import type { Poll, PollOption } from "@/app/lib/types";
import Comments from "@/components/Comments";

/** Compute rounded percent with safe zero handling */
function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

/** Fire lightweight analytics event to backend (kind, not type!) */
async function sendEvent(
  kind: "view" | "dwell" | "vote" | "share",
  payload: Record<string, unknown>
) {
  try {
    await fetchWithRefresh("/api/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, ...payload }),
    });
  } catch {
    // swallow
  }
}

/** Map results_mode + voted/available -> show results? */
function shouldShowResults(poll: Poll, hasVoted: boolean) {
  switch (poll.results_mode) {
    case "open":
      return true;
    case "hidden_until_vote":
      return hasVoted;
    case "hidden_until_close":
      return !!poll.results_available;
    default:
      return false;
  }
}

/** Reasons list must match backend Report.Reason choices */
const REPORT_REASONS = [
  { value: "spam", label: "Спам" },
  { value: "abuse", label: "Оскорбления/абьюз" },
  { value: "nsfw", label: "NSFW/18+" },
  { value: "illegal", label: "Незаконное" },
  { value: "other", label: "Другое" },
];

export default function PollCard({ poll }: { poll: Poll }) {
  const deviceId = getOrCreateDeviceId();
  const mountedAt = useRef<number>(Date.now());

  /** liveCounts: runtime option vote counts (key as string id) */
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    const base = poll.stats?.option_counts ?? null;
    if (base) {
      for (const [k, v] of Object.entries(base)) init[String(k)] = Number(v) || 0;
    } else {
      for (const o of poll.options) init[String(o.id)] = 0;
    }
    return init;
  });

  /** liveTotal: total votes (prefer snapshot from server, otherwise sum) */
  const [liveTotal, setLiveTotal] = useState<number>(() => {
    if (poll.stats?.total_votes != null) return Number(poll.stats.total_votes) || 0;
    return Object.values(poll.stats?.option_counts ?? {}).reduce(
      (s, n) => s + (Number(n) || 0),
      0
    );
  });

  /** livePercents: optional server-provided percents */
  const [livePercents, setLivePercents] = useState<Record<string, number> | null>(() => {
    const p = poll.option_percents ?? null;
    if (!p) return null;
    const mapped: Record<string, number> = {};
    for (const [k, v] of Object.entries(p)) mapped[String(k)] = Number(v) || 0;
    return mapped;
  });

  /** local optimistic selection (single-choice) */
  const [optimisticVote, setOptimisticVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  /** Report UI state */
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("spam");
  const [reportNote, setReportNote] = useState<string>("");
  const [isReporting, setIsReporting] = useState(false);
  const [reportDone, setReportDone] = useState<null | "ok" | "err">(null);
  const [reportErrText, setReportErrText] = useState<string>("");

  /** apply SSE snapshots/updates */
  const onSSEUpdate = useCallback((u: PollUpdate) => {
    if (u?.counts) {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(u.counts)) next[String(k)] = Number(v) || 0;
      setLiveCounts(next);
    }
    if (typeof u?.total_votes === "number") {
      setLiveTotal(Number(u.total_votes) || 0);
    }
    if (u?.percents) {
      const nextP: Record<string, number> = {};
      for (const [k, v] of Object.entries(u.percents)) nextP[String(k)] = Number(v) || 0;
      setLivePercents(nextP);
    }
  }, []);

  usePollSSE(Number(poll.id), onSSEUpdate);

  /** single-choice: consider voted if either optimistic or user_vote present */
  const hasVoted = useMemo(
    () => optimisticVote != null || poll.user_vote != null,
    [optimisticVote, poll.user_vote]
  );

  const showResults = shouldShowResults(poll, hasVoted);

  /** apply optimistic count bump */
  const displayedCounts = useMemo(() => {
    if (optimisticVote == null) return liveCounts;
    const key = String(optimisticVote);
    return { ...liveCounts, [key]: (liveCounts[key] ?? 0) + 1 };
  }, [liveCounts, optimisticVote]);

  /** apply optimistic total bump */
  const displayedTotal = useMemo(() => {
    if (optimisticVote == null) return liveTotal;
    if (Number.isFinite(liveTotal)) return (liveTotal || 0) + 1;
    return Object.values(displayedCounts).reduce((s, n) => s + (n || 0), 0);
  }, [displayedCounts, liveTotal, optimisticVote]);

  /** vote hook: returns function (pollId, optionId) */
  const vote = useVote();

  const onVote = useCallback(
    async (optionId: number) => {
      // keep single-choice UX; for multi remove guards
      if (hasVoted || isVoting) return;

      setOptimisticVote(optionId);
      setIsVoting(true);

      void sendEvent("vote", { poll_id: poll.id, option_id: optionId, device_id: deviceId });

      try {
        await vote(poll.id, optionId);
      } catch {
        // rollback on error
        setOptimisticVote(null);
      } finally {
        setIsVoting(false);
      }
    },
    [deviceId, hasVoted, isVoting, poll.id, vote]
  );

  /** view/dwell tracking */
  useEffect(() => {
    mountedAt.current = Date.now();
    void sendEvent("view", { poll_id: poll.id, device_id: deviceId });
    return () => {
      const dwell = Date.now() - mountedAt.current;
      void sendEvent("dwell", { poll_id: poll.id, device_id: deviceId, dwell_ms: dwell });
    };
  }, [deviceId, poll.id]);

  /** share handler + event */
  const onShare = useCallback(async () => {
    const url = `${location.origin}/p/${poll.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: poll.title, text: "Глянь опрос!", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Ссылка скопирована");
      }
      // record share after successful attempt
      void sendEvent("share", { poll_id: poll.id, device_id: deviceId });
    } catch {
      // ignore
    }
  }, [deviceId, poll.id, poll.title]);

  /** report submit */
  const submitReport = useCallback(async () => {
    if (isReporting) return;
    setIsReporting(true);
    setReportDone(null);
    setReportErrText("");

    try {
      // backend принимает поля: target_type, target_id, reason
      const res = await fetchWithRefresh("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "poll",
          target_id: Number(poll.id),
          reason: reportReason,
          // note на бэке необязателен; если решите хранить — добавьте туда
          // note: reportNote?.slice(0, 500),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data?.detail as string) ||
          Object.values(data as Record<string, unknown>)[0]?.toString() ||
          "Не удалось отправить жалобу";
        throw new Error(msg);
      }

      setReportDone("ok");
      // можно автозакрыть модал через таймер
      setTimeout(() => {
        setIsReportOpen(false);
      }, 900);
    } catch (e: any) {
      setReportDone("err");
      setReportErrText(e?.message || "Ошибка отправки");
    } finally {
      setIsReporting(false);
    }
  }, [isReporting, poll.id, reportReason]);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-base font-semibold leading-snug">{poll.title}</h2>
      {poll.description ? (
        <p className="mt-1 text-sm opacity-80">{poll.description}</p>
      ) : null}

      {/* Topics */}
      {poll.topics && poll.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {poll.topics.map((topic) => (
            <span
              key={topic.id}
              className="inline-block rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 text-xs text-emerald-300"
            >
              {topic.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-2">
        {poll.options
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((opt: PollOption) => {
            const key = String(opt.id);
            const count = displayedCounts[key] ?? 0;

            // If server sent percents we could use them, but with optimism it's safer to recompute
            const percent = showResults ? pct(count, displayedTotal) : 0;

            const selected =
              hasVoted &&
              String(opt.id) === String(optimisticVote ?? poll.user_vote ?? -1);

            return (
              <motion.button
                key={opt.id}
                whileTap={{ scale: 0.98 }}
                disabled={hasVoted || isVoting}
                onClick={() => onVote(opt.id)}
                className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left transition
                  ${selected ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}
                  ${hasVoted ? "cursor-default" : "cursor-pointer"}
                `}
              >
                {/* Progress bar */}
                {showResults && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: "spring", stiffness: 140, damping: 18 }}
                    className="pointer-events-none absolute inset-y-0 left-0 rounded-xl bg-white/10"
                    style={{ clipPath: "inset(0 0 0 0 round 0.75rem)" }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between gap-3">
                  <span className="text-sm">{opt.text}</span>
                  <span className="text-xs tabular-nums opacity-80">
                    {showResults ? `${percent}%` : "\u00A0"}
                  </span>
                </div>
              </motion.button>
            );
          })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs opacity-80">
        <span>
          {showResults
            ? `${displayedTotal} голосов`
            : poll.results_mode === "hidden_until_close"
            ? "Результаты будут после закрытия"
            : "Результаты скрыты до голосования"}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-1 hover:bg-red-400/15"
            aria-haspopup="dialog"
            aria-expanded={isReportOpen}
          >
            Пожаловаться
          </button>

          <button
            type="button"
            onClick={onShare}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
          >
            Поделиться
          </button>
        </div>
      </div>

      {/* Report modal */}
      {isReportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isReporting && setIsReportOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Пожаловаться на опрос</h3>
            <p className="mt-1 text-xs opacity-80">
              Выберите причину. Репорты видит модерация.
            </p>

            <div className="mt-3 grid gap-2">
              <label className="text-xs opacity-80">Причина</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm outline-none"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              {reportReason === "other" && (
                <>
                  <label className="mt-2 text-xs opacity-80">Комментарий (необязательно)</label>
                  <textarea
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
                    placeholder="Кратко опишите проблему"
                  />
                </>
              )}
            </div>

            {/* status line */}
            <div className="mt-3 min-h-[1.25rem] text-xs">
              {reportDone === "ok" && (
                <span className="text-emerald-300">Спасибо! Жалоба отправлена.</span>
              )}
              {reportDone === "err" && (
                <span className="text-red-300">Ошибка: {reportErrText}</span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isReporting}
                onClick={() => setIsReportOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isReporting}
                onClick={submitReport}
                className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-sm hover:bg-red-400/15 disabled:opacity-60"
              >
                {isReporting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <Comments pollId={Number(poll.id)} />
      </div>
    </article>
  );
}
