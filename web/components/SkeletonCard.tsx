'use client';
export default function SkeletonCard() {
return (
<div className="h-[88dvh] my-3 rounded-3xl bg-zinc-900 animate-pulse p-6">
<div className="h-8 w-3/4 bg-zinc-800 rounded mb-6"/>
<div className="space-y-3">
<div className="h-12 w-full bg-zinc-800 rounded-2xl"/>
<div className="h-12 w-full bg-zinc-800 rounded-2xl"/>
<div className="h-12 w-2/3 bg-zinc-800 rounded-2xl"/>
</div>
</div>
);
}