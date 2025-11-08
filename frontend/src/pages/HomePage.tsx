import { useEffect, useState } from "react";
import { pollAPI } from "../api/endpoints";
import { PollCard } from "../components/PollCard";
import type { Poll } from "../types";

export const HomePage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await pollAPI.list();
        setPolls(response.data.results);
      } catch (err) {
        setError("Failed to load polls");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-lg text-white">Loading polls...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white text-center">Recent Polls</h1>
          <p className="text-gray text-center mt-2">
            Vote on polls or create your own
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>

        {polls.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500">No polls yet. Be the first to create one!</p>
          </div>
        )}
      </div>
    </div>
  );
};
