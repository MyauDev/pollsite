"use client";

import { motion } from "framer-motion";
import PollCard from "@/components/PollCard";
import SkeletonCard from "@/components/SkeletonCard";
import type { Poll } from "@/app/lib/types";
import { useInfiniteFeed } from "@/app/lib/useInfiniteFeed";

export default function Feed() {
  const { items, loading, done, sentinelRef } = useInfiniteFeed();

  return (
    <section className="mx-auto w-full max-w-md">
      <div className="flex flex-col gap-4">
        {items.map((poll: Poll) => (
          <motion.div
            key={poll.id}
            layout
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20, mass: 0.9 }}
          >
            <PollCard poll={poll} />
          </motion.div>
        ))}

        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Сентинел для дозагрузки */}
        <div ref={sentinelRef} />

        {/* Небольшой финальный плейсхолдер */}
        {!loading && done && (
          <div className="py-6 text-center text-xs opacity-60">Это всё на сейчас 👋</div>
        )}
      </div>
    </section>
  );
}