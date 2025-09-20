"use client";

/**
 * Simple shimmering skeleton card to show while loading.
 */
export default function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="h-5 w-2/3 animate-pulse rounded bg-white/10" />
      <div className="mt-3 grid gap-2">
        <div className="h-9 animate-pulse rounded-xl bg-white/10" />
        <div className="h-9 animate-pulse rounded-xl bg-white/10" />
        <div className="h-9 animate-pulse rounded-xl bg-white/10" />
      </div>
      <div className="mt-4 h-6 w-1/3 animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-24 animate-pulse rounded-xl bg-white/10" />
    </div>
  );
}