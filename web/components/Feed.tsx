'use client';
import { useInfiniteFeed } from '@/app/lib/useInfiniteFeed';
import PollCard from './PollCard';
import SkeletonCard from './SkeletonCard';
import { motion } from 'framer-motion';


export default function Feed() {
const { items, loading, sentinelRef, done } = useInfiniteFeed();


return (
<main className="min-h-dvh">
{items.map((p) => (
<motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
<PollCard poll={p} />
</motion.div>
))}


{!done && (
<div ref={sentinelRef}>
{loading ? <SkeletonCard /> : <div className="h-10"/>}
</div>
)}


{done && items.length === 0 && (
<div className="text-center text-zinc-400 py-20">Нет опросов</div>
)}
</main>
);
}