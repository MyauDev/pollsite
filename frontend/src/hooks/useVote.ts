import { useCallback } from 'react';
import { pollAPI } from '../api/endpoints';
import type { VoteResponse } from '../types';

/**
 * Hook for voting on polls
 * Returns a function that submits a vote for a given poll and option
 * Returns the vote response with updated counts and percentages
 */
export function useVote() {
  const vote = useCallback(async (pollId: number, optionId: number): Promise<VoteResponse> => {
    try {
      const response = await pollAPI.vote(pollId, { option_id: optionId });
      return response.data;
    } catch (error) {
      console.error('Failed to vote:', error);
      throw error;
    }
  }, []);

  return vote;
}
