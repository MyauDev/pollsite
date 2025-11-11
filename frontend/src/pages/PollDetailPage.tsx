import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pollAPI } from "../api/endpoints";
import type { Poll } from "../types";
import { useVote } from "../hooks/useVote";

export const PollDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vote = useVote();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPoll = async () => {
      if (!id) return;
      try {
        const response = await pollAPI.get(parseInt(id));
        setPoll(response.data);
      } catch (err) {
        setError("Failed to load poll");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id]);

  const handleVote = async (optionId: number) => {
    if (!id || !poll) return;

    try {
      const response = await vote(parseInt(id), optionId);
      // Update poll with new stats
      setPoll({
        ...poll,
        user_vote: response.voted_option_id,
        stats: {
          total_votes: response.total_votes,
          option_counts: response.counts,
          updated_at: new Date().toISOString()
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit vote");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-lg text-gray-900">Loading poll...</div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Poll not found</h2>
            <button
              onClick={() => navigate("/")}
              className="mt-4 text-pink-600 hover:text-pink-800"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasVoted = poll.user_vote !== null && poll.user_vote !== undefined;
  const totalVotes = poll.stats?.total_votes || 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <button
            onClick={() => navigate("/")}
            className="text-pink-600 hover:text-pink-800 mb-4"
          >
            ← Back to home
          </button>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {poll.title}
          </h2>
          {poll.description && (
            <p className="mt-2 text-center text-sm text-gray-600">
              {poll.description}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            {poll.options.map((option) => {
              const voteCount = poll.stats?.option_counts?.[option.id] || 0;
              const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const isSelected = poll.user_vote === option.id;

              return (
                <div key={option.id}>
                  <button
                    onClick={() => handleVote(option.id)}
                    disabled={hasVoted}
                    className={`appearance-none relative block w-full px-3 py-2 border ${isSelected
                        ? "border-pink-500 bg-pink-500 text-white"
                        : "border-gray-300 bg-white text-gray-900"
                      } rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm ${hasVoted ? "cursor-not-allowed" : "cursor-pointer hover:border-pink-400"
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{option.text}</span>
                      {hasVoted && (
                        <span className={isSelected ? "text-white" : "text-gray-600"}>
                          {percentage}% ({voteCount})
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Total votes: {totalVotes}</p>
            {poll.author?.username && (
              <p className="text-sm text-gray-600">Created by: {poll.author.username}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
