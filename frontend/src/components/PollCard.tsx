import { Link } from "react-router-dom";
import type { Poll } from "../types";

interface PollCardProps {
   poll: Poll;
}

export const PollCard = ({ poll }: PollCardProps) => {
   const hasVoted = !!poll.user_vote;

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
         <Link
            to={`/polls/${poll.id}`}
            className="block bg-black rounded-[3rem] shadow-md shadow-pink hover:shadow-lg transition-shadow duration-300 overflow-hidden border-2 border-pink"
         >
            <div className="p-10 py-12">
               <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-white flex-1 mr-4">
                     {poll.title}
                  </h3>
                  {poll.topic && (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-light text-pink whitespace-nowrap">
                        {poll.topic.name}
                     </span>
                  )}
               </div>
               <div className="border-b border-gray pb-3 mb-4">
                  {/* Poll Question */}
                  <p className="text-gray mb-4 line-clamp-2">{poll.question}</p>

                  {poll.description && (
                     <p className="text-sm text-gray mb-4 line-clamp-2 ">
                        {poll.description}
                     </p>
                  )}
               </div>

               {/* Poll Options Preview */}
               <div className="space-y-4 mb-4">
                  {poll.options.slice(0, 3).map((option) => (
                     <div
                        key={option.id}
                        className="relative text-center bg-pink-light hover:bg-pink transition-opacity rounded-4xl p-3"
                     >
                        <div className="flex items-center justify-between my-1">
                           <span className="text-sm text-black truncate flex-1">
                              {option.text}
                           </span>
                           {hasVoted && (
                              <span className="text-xs text-gray ml-2">
                                 {option.vote_count} ({option.percentage.toFixed(0)}%)
                              </span>
                           )}
                        </div>
                        {hasVoted && (
                           <div className="mt-1 bg-gray rounded-full h-1.5">
                              <div
                                 className="bg-pink h-1.5 rounded-full transition-all"
                                 style={{ width: `${option.percentage}%` }}
                              />
                           </div>
                        )}
                     </div>
                  ))}
                  {poll.options.length > 3 && (
                     <p className="text-xs text-gray text-center">
                        +{poll.options.length - 3} more option{poll.options.length - 3 > 1 ? "s" : ""}
                     </p>
                  )}
               </div>

               {/* Poll Footer - Icons and Vote Count */}
               <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center space-x-3">
                     {/* Heart Icon */}
                     <button aria-label="Like">
                        <span className="icon-button icon-heart"></span>
                     </button>

                     {/* Comment Icon */}
                     <button aria-label="Comment">
                        <span className="icon-button icon-comment"></span>
                     </button>

                     {/* Paper Plane Icon */}
                     <button aria-label="Share">
                        <span className="icon-button icon-paper-plane"></span>
                     </button>
                  </div>

                  <div className="flex items-center text-sm text-gray">
                     <span>{poll?.total_votes || 0} votes</span>
                  </div>
               </div>
            </div>
         </Link>
      </div>
   );
};
