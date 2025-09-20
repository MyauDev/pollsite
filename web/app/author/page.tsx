"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import { fetchWithRefresh } from "@/app/lib/fetchWithRefresh";

// Recharts (client-only)
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/** ----- Types you can align with your backend ----- */
type SparkPoint = {
  label?: string;
  date?: string;
  views?: number;
  votes?: number;
  shares?: number;
};

type PollRow = {
  id: number;
  title: string;
  created_at?: string;
  updated_at?: string;
  views: number;
  votes: number;
  shares: number;
  ctr?: number;
  dwell_ms_avg?: number;
  series?: SparkPoint[];
};

type DashboardResponse = {
  polls: PollRow[];
  totals?: {
    views: number;
    votes: number;
    shares: number;
    ctr?: number;
    dwell_ms_avg?: number;
  };
};

/** ----- Small helpers ----- */
function fmtPercent(v?: number) {
  if (v == null || Number.isNaN(v)) return "—";
  const p = v > 1.01 ? v : v * 100;
  return `${Math.round(p)}%`;
}

function fmtMs(ms?: number) {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m}m ${rs}s`;
}

/** ----- Skeletons ----- */
function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="h-5 w-2/3 animate-pulse rounded bg-white/10" />
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="h-10 rounded bg-white/10 animate-pulse" />
        <div className="h-10 rounded bg-white/10 animate-pulse" />
        <div className="h-10 rounded bg-white/10 animate-pulse" />
        <div className="h-10 rounded bg-white/10 animate-pulse" />
      </div>
      <div className="mt-4 h-24 w-full rounded bg-white/10 animate-pulse" />
    </div>
  );
}

/** ----- Metric pill ----- */
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide opacity-60">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

/** ----- Poll card with mini chart ----- */
function PollCard({ row }: { row: PollRow }) {
  const series = row.series ?? [];

  const maxY = useMemo(() => {
    const vals = series.map((d) => (d.views ?? 0) + (d.votes ?? 0));
    const m = Math.max(0, ...vals);
    if (m === 0) return 5;
    return Math.ceil(m * 1.15);
  }, [series]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/p/${row.id}`}
          className="text-base font-semibold hover:opacity-90"
          title={row.title}
        >
          {row.title}
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/p/${row.id}`}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
          >
            Открыть
          </Link>
          <Link
            href={`/edit/${row.id}`}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
          >
            Редактировать
          </Link>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <Metric label="Views" value={row.views ?? 0} />
        <Metric label="Votes" value={row.votes ?? 0} />
        <Metric label="Shares" value={row.shares ?? 0} />
        <Metric label="CTR" value={fmtPercent(row.ctr)} />
        <Metric label="Dwell" value={fmtMs(row.dwell_ms_avg)} />
      </div>

      <div className="mt-4 h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.1} />
            <XAxis
              dataKey={(d) => d.label ?? d.date ?? ""}
              tick={false}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={false} axisLine={false} tickLine={false} domain={[0, maxY]} />
            <Tooltip
              cursor={{ fillOpacity: 0.05 }}
              formatter={(value, name) => [
                value as number,
                name === "views" ? "Просмотры" : name === "votes" ? "Голоса" : "Поделились",
              ]}
              labelFormatter={(l) => (typeof l === "string" ? l : "")}
              contentStyle={{
                background: "rgba(17,17,20,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                color: "#E5E7EB",
                fontSize: 12,
              }}
            />
            <Bar dataKey="views" stackId="a" radius={[6, 6, 0, 0]} />
            <Bar dataKey="votes" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** ----- Page (inner) ----- */
function AuthorDashboardInner() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetchWithRefresh("/api/author/dashboard", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as DashboardResponse;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Не удалось загрузить дашборд");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const polls = data?.polls ?? [];

  return (
    <RequireAuth>
      <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Мои опросы</h1>
          <Link
            href="/create"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Создать
          </Link>
        </div>

        {data?.totals && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <Metric label="Views (all)" value={data.totals.views ?? 0} />
            <Metric label="Votes (all)" value={data.totals.votes ?? 0} />
            <Metric label="Shares (all)" value={data.totals.shares ?? 0} />
            <Metric label="CTR (all)" value={fmtPercent(data.totals.ctr)} />
            <Metric label="Dwell (all)" value={fmtMs(data.totals.dwell_ms_avg)} />
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        {loading && (
          <div className="mt-6 grid gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {!loading && polls.length > 0 && (
          <div className="mt-6 grid gap-4">
            {polls.map((p) => (
              <PollCard
                key={p.id}
                row={{
                  id: p.id,
                  title: p.title,
                  created_at: p.created_at,
                  updated_at: p.updated_at,
                  views: p.views ?? 0,
                  votes: p.votes ?? 0,
                  shares: p.shares ?? 0,
                  ctr: p.ctr,
                  dwell_ms_avg: p.dwell_ms_avg,
                  series: p.series ?? [],
                }}
              />
            ))}
          </div>
        )}

        {!loading && !err && polls.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-80">
            Опросов пока нет. <Link href="/create" className="underline">Создайте первый</Link>.
          </div>
        )}
      </main>
    </RequireAuth>
  );
}

export default function AuthorDashboardPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">Проверяем доступ…</main>}>
      <AuthorDashboardInner />
    </Suspense>
  );
}
