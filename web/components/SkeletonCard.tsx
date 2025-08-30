'use client';
export default function SkeletonCard() {
  return (
    <div className="h-[88dvh] rounded-2xl bg-zinc-900/60 backdrop-blur-sm animate-pulse p-6 border border-white/5">
      <div className="h-8 w-3/4 bg-zinc-800/80 rounded-lg mb-6" />
      <div className="space-y-4">
        <div className="h-14 w-full bg-zinc-800/80 rounded-2xl" />
        <div className="h-14 w-full bg-zinc-800/80 rounded-2xl" />
        <div className="h-14 w-2/3 bg-zinc-800/80 rounded-2xl" />
      </div>
      <div className="mt-auto pt-6">
        <div className="h-4 w-20 bg-zinc-800/80 rounded" />
      </div>
    </div>
  );
}