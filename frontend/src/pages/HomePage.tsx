import { PollCard } from "../components/PollCard";
import { useInfiniteFeed } from "../hooks/useInfiniteFeed";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { pollAPI } from "../api/endpoints";
import type { Poll } from "../types";

export const HomePage = () => {
  const { items, loading, done, sentinelRef } = useInfiniteFeed();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sharedBy, setSharedBy] = useState<string | null>(null);
  const [sharedPoll, setSharedPoll] = useState<Poll | null>(null);

  useEffect(() => {
    // Check for shared link parameters
    const encodedUser = searchParams.get('s');
    const pollId = searchParams.get('poll');

    if (encodedUser) {
      try {
        const username = atob(encodedUser);
        setSharedBy(username);
      } catch (error) {
        console.error('Failed to decode shared_by:', error);
      }
    }

    if (pollId) {
      // Fetch the shared poll
      const fetchSharedPoll = async () => {
        try {
          const response = await pollAPI.get(parseInt(pollId));
          setSharedPoll(response.data);
        } catch (error) {
          console.error('Failed to fetch shared poll:', error);
        }
      };
      fetchSharedPoll();
    }

    // Clean up URL parameters
    if (encodedUser || pollId) {
      searchParams.delete('s');
      searchParams.delete('poll');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="space-y-6">
          {/* Shared poll - displayed at the top */}
          {sharedPoll && (
            <PollCard
              key={sharedPoll.id}
              poll={sharedPoll}
              sharedBy={sharedBy}
            />
          )}

          {/* Regular feed - filter out shared poll if it exists */}
          {items
            .filter(poll => !sharedPoll || poll.id !== sharedPoll.id)
            .map((poll) => (
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

