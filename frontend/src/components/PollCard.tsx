import { useNavigate } from "react-router-dom";
import { useCallback, useState, useMemo, useEffect } from "react";
import type { Poll } from "../types";
import { useVote } from "../hooks/useVote";

interface PollCardProps {
   poll: Poll;
}

export const PollCard = ({ poll }: PollCardProps) => {
   const navigate = useNavigate();
   const vote = useVote();

   const [optimisticVote, setOptimisticVote] = useState<number | null>(null);
   const [isVoting, setIsVoting] = useState(false);
   const [votePercents, setVotePercents] = useState<Record<number, number> | null>(null);
   const [totalVotes, setTotalVotes] = useState<number | null>(null);
   const [userVote, setUserVote] = useState<number | null>(poll.user_vote ?? null);

   // Update userVote when poll.user_vote changes
   useEffect(() => {
      setUserVote(poll.user_vote ?? null);
   }, [poll.user_vote]);

   // Debug logging
   console.log('PollCard Debug:', {
      pollId: poll.id,
      pollUserVote: poll.user_vote,
      userVoteState: userVote,
      optimisticVote,
      hasVoted: optimisticVote !== null || userVote !== null
   });

   // Calculate percentages from backend stats
   const livePercents = useMemo(() => {
      if (votePercents) return votePercents;

      const percents: Record<number, number> = {};
      if (poll.stats && poll.stats.option_counts) {
         const total = poll.stats.total_votes || 0;
         Object.entries(poll.stats.option_counts).forEach(([optionId, count]) => {
            const id = parseInt(optionId);
            percents[id] = total > 0 ? Math.round((count / total) * 100) : 0;
         });
      } else {
         // No stats available, set all to 0
         poll.options.forEach(opt => {
            percents[opt.id] = 0;
         });
      }
      return percents;
   }, [votePercents, poll.stats, poll.options]);

   const liveTotal = useMemo(() => {
      if (totalVotes !== null) return totalVotes;
      return poll.stats?.total_votes || 0;
   }, [totalVotes, poll.stats]);

   const hasVoted = useMemo(
      () => optimisticVote !== null || userVote !== null,
      [optimisticVote, userVote]
   );

   const displayedTotal = useMemo(() => {
      // If we have a backend response with totalVotes, use that (it already includes the new vote)
      // Otherwise, if we have an optimistic vote, add 1 to the live total
      if (totalVotes !== null) return totalVotes;
      if (optimisticVote !== null && userVote === null) return liveTotal + 1;
      return liveTotal;
   }, [liveTotal, optimisticVote, totalVotes, userVote]);

   const handleVote = useCallback(async (optionId: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (hasVoted || isVoting) return;

      setOptimisticVote(optionId);
      setIsVoting(true);

      try {
         console.log('Voting on poll', poll.id, 'option', optionId);
         const response = await vote(poll.id, optionId);
         console.log('Vote response:', response);
         // Update with backend response
         setVotePercents(response.percents);
         setTotalVotes(response.total_votes);
         setUserVote(response.voted_option_id);
      } catch (error) {
         // Rollback on error
         setOptimisticVote(null);
         console.error('Vote failed:', error);
      } finally {
         setIsVoting(false);
      }
   }, [hasVoted, isVoting, poll.id, vote]);

   const handleShare = useCallback(async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const url = `${window.location.origin}/polls/${poll.id}`;
      try {
         if (navigator.share) {
            await navigator.share({
               title: poll.title,
               text: poll.description || poll.title,
               url
            });
         } else {
            await navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
         }
      } catch (error) {
         console.error('Share failed:', error);
      }
   }, [poll.id, poll.title, poll.description]);

   return (
      <div className="block h-full">
         {/* Author Section - Above the card */}
         <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-pink rounded-full flex items-center justify-center">
               <span className="text-sm font-semibold text-white">
                  {poll.author?.username?.charAt(0).toUpperCase() || 'U'}
               </span>
            </div>
            <div>
               <p className="text-sm font-medium text-white">
                  {poll.author?.username || 'Unknown'}
               </p>
               <p className="text-xs text-gray">
                  {new Date(poll.created_at).toLocaleDateString()}
               </p>
            </div>
         </div>

         {/* Poll Card */}
         <div
            className="block bg-black rounded-[3rem] shadow-md shadow-pink hover:shadow-lg transition-shadow duration-300 overflow-hidden border-2 border-pink cursor-pointer"
            onClick={() => navigate(`/polls/${poll.id}`)}
         >
            <div className="p-10 py-12">
               <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-white flex-1 mr-4">
                     {poll.title}
                  </h3>
                  {poll.topics && poll.topics.length > 0 && (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-light text-pink whitespace-nowrap">
                        {poll.topics[0].name}
                     </span>
                  )}
               </div>
               <div className="border-b border-gray pb-3 mb-4">
                  {poll.description && (
                     <p className="text-sm text-gray mb-4 line-clamp-2">
                        {poll.description}
                     </p>
                  )}
               </div>

               {/* Poll Options - Interactive */}
               <div className="space-y-4 mb-4">
                  {poll.options
                     .sort((a, b) => a.order - b.order)
                     .slice(0, 3)
                     .map((option) => {
                        const percentage = livePercents[option.id] || 0;
                        const isSelected = hasVoted &&
                           (option.id === optimisticVote || option.id === userVote);

                        return (
                           <button
                              key={option.id}
                              onClick={(e) => handleVote(option.id, e)}
                              disabled={hasVoted || isVoting}
                              className={`relative w-full text-center rounded-4xl p-3 transition-all overflow-hidden ${hasVoted
                                 ? 'bg-pink-light text-black cursor-not-allowed border border-pink/30'
                                 : 'bg-pink-light hover:bg-pink hover:text-white cursor-pointer text-black'
                                 } ${isVoting ? 'opacity-60' : ''}`}
                           >
                              {/* Pink fill bar based on percentage - only show after voting */}
                              {hasVoted && (
                                 <div
                                    className="absolute inset-0 bg-pink transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                 />
                              )}

                              <div className="relative flex items-center justify-between my-1 mx-6">
                                 <span className={`text-sm items-start flex ${isSelected ? ' text-white' : ''}`}>
                                    {option.text}
                                 </span>
                                 {hasVoted && (
                                    <span className={`text-xs ml-2 ${isSelected ? 'text-white' : 'text-black'}`}>
                                       {percentage}%
                                    </span>
                                 )}
                              </div>
                           </button>
                        );
                     })}
                  {poll.options.length > 3 && (
                     <p className="text-xs text-gray text-center">
                        +{poll.options.length - 3} more option{poll.options.length - 3 > 1 ? "s" : ""}
                     </p>
                  )}
               </div>

               {/* Poll Footer - Icons and Vote Count */}
               <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center space-x-3">
                     {/* Heart Icon - Navigate to poll */}
                     <button
                        aria-label="Like"
                        onClick={(e) => {
                           e.stopPropagation();
                           navigate(`/polls/${poll.id}`);
                        }}
                     >
                        <span className="icon-button icon-heart"></span>
                     </button>

                     {/* Comment Icon - Navigate to poll */}
                     <button
                        aria-label="Comment"
                        onClick={(e) => {
                           e.stopPropagation();
                           navigate(`/polls/${poll.id}#comments`);
                        }}
                     >
                        <span className="icon-button icon-comment"></span>
                     </button>

                     {/* Paper Plane Icon - Share */}
                     <button
                        aria-label="Share"
                        onClick={handleShare}
                     >
                        <span className="icon-button icon-paper-plane"></span>
                     </button>
                  </div>

                  <div className="flex items-center text-sm text-gray">
                     <span>{displayedTotal} vote{displayedTotal !== 1 ? 's' : ''}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
