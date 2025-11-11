import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pollAPI } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Poll } from "../types";

export const PollDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    const fetchPoll = async () => {
      if (!id) return;
      try {
        const response = await pollAPI.get(parseInt(id));
        setPoll(response.data);
        if (response.data.user_vote) {
          setSelectedOption(response.data.user_vote);
        }
      } catch (err) {
        setError("Failed to load poll");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id]);

  const handleVote = async () => {
    if (!id || !selectedOption || !isAuthenticated) return;

    setVoting(true);
    try {
      await pollAPI.vote(parseInt(id), { option_id: selectedOption });
      // Refresh poll data
      const response = await pollAPI.get(parseInt(id));
      setPoll(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit vote");
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading poll...</div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Poll not found</div>
      </div>
    );
  }

  const hasVoted = !!poll.user_vote;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate("/")}
          className="mb-4 text-indigo-600 hover:text-indigo-800"
        >
          ← Back to polls
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{poll.title}</h1>
          <p className="text-gray-600 mb-6">{poll.description}</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{poll.question}</h2>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {poll.options.map((option) => (
              <div key={option.id} className="relative">
                <label
                  className={`block border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedOption === option.id
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-300 hover:border-gray-400"
                  } ${hasVoted ? "cursor-default" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="poll-option"
                        value={option.id}
                        checked={selectedOption === option.id}
                        onChange={() => !hasVoted && setSelectedOption(option.id)}
                        disabled={hasVoted}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-3 text-gray-900">{option.text}</span>
                    </div>
                    {hasVoted && (
                      <span className="text-sm text-gray-600">
                        {option.vote_count} ({option.percentage.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  {hasVoted && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${option.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </label>
              </div>
            ))}
          </div>

          {!hasVoted && isAuthenticated && (
            <button
              onClick={handleVote}
              disabled={!selectedOption || voting}
              className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {voting ? "Submitting..." : "Submit Vote"}
            </button>
          )}

          {!isAuthenticated && (
            <div className="mt-6 text-center p-4 bg-yellow-50 rounded-md">
              <p className="text-yellow-800">
                Please{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="underline font-medium"
                >
                  login
                </button>{" "}
                to vote
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Created by {poll.author.username}</span>
              <span>{poll.total_votes} total votes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
