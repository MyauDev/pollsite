import { PollCard } from "../components/PollCard";
import { useInfiniteFeed } from "../hooks/useInfiniteFeed";

export const HomePage = () => {
  const { items, loading, done, sentinelRef } = useInfiniteFeed();

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="space-y-6">
          {items.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}

          {/* Sentinel element for infinite scroll */}
          <div ref={sentinelRef} className="h-20 flex items-center justify-center">
            {loading && (
              <p className="text-white">Loading more polls...</p>
            )}
            {done && items.length > 0 && (
              <p className="text-gray">No more polls to load</p>
            )}
            {!loading && items.length === 0 && (
              <p className="text-white">No polls available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

