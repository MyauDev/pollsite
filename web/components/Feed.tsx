'use client';
import { useInfiniteFeed } from '@/app/lib/useInfiniteFeed';
import PollCard from './PollCard';
import SkeletonCard from './SkeletonCard';
import { motion } from 'framer-motion';

// Array of gradient backgrounds for poll sections
const gradientBackgrounds = [
  'bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-transparent',
  'bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent',
  'bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent',
  'bg-gradient-to-br from-orange-500/20 via-red-500/10 to-transparent',
  'bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent',
  'bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent',
];

export default function Feed() {
  const { items, loading, sentinelRef, done } = useInfiniteFeed();

  return (
    <main className="min-h-screen pb-8 px-2">
      <div className="space-y-6">
        {items.map((p, index) => {
          const gradientClass = gradientBackgrounds[index % gradientBackgrounds.length];
          const hasAnswered = p.user_vote !== null && p.user_vote !== undefined;

          return (
            <motion.section
              key={p.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              className={`relative rounded-3xl p-4 backdrop-blur-sm border shadow-2xl ${hasAnswered
                  ? 'border-green-400/30 bg-green-400/5'
                  : 'border-white/10'
                } ${gradientClass}`}
            >
              {/* Decorative border glow */}
              <div className={`absolute inset-0 rounded-3xl opacity-50 blur-sm -z-10 ${hasAnswered
                  ? 'bg-gradient-to-r from-green-400/30 via-transparent to-green-500/30'
                  : 'bg-gradient-to-r from-blue-500/30 via-transparent to-purple-500/30'
                }`}></div>

              {/* Poll content */}
              <div className="relative z-10">
                <PollCard poll={p} />
              </div>

              {/* Section number indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="absolute top-4 right-4 w-8 h-8 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-xs font-bold text-white/70 border border-white/20"
              >
                {index + 1}
              </motion.div>
            </motion.section>
          );
        })}
      </div>

      {!done && (
        <div ref={sentinelRef} className="mt-6">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-3xl p-4 bg-gradient-to-br from-zinc-800/50 via-zinc-700/30 to-transparent backdrop-blur-sm border border-white/10"
            >
              <SkeletonCard />
            </motion.div>
          ) : (
            <div className="h-10" />
          )}
        </div>
      )}

      {done && items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center py-20 rounded-3xl bg-gradient-to-br from-zinc-800/30 via-zinc-700/20 to-transparent backdrop-blur-sm border border-white/10 mx-2"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl mb-6"
          >
            📊
          </motion.div>
          <h3 className="text-2xl font-bold text-white mb-3">Пока нет опросов</h3>
          <p className="text-zinc-400 text-base max-w-sm mx-auto">
            Скоро здесь появятся интересные вопросы для голосования!
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center space-x-1 mt-4"
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
          </motion.div>
        </motion.div>
      )}
    </main>
  );
}