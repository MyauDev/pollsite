import { useState } from "react";
import type { Comment } from "../types";
import { Button } from "./Button";

interface CommentSectionProps {
   pollId: number;
   comments: Comment[];
   onAddComment: (content: string) => Promise<void>;
   isAuthenticated: boolean;
}

export const CommentSection = ({
   pollId,
   comments,
   onAddComment,
   isAuthenticated,
}: CommentSectionProps) => {
   const [newComment, setNewComment] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;

      setIsSubmitting(true);
      try {
         await onAddComment(newComment);
         setNewComment("");
      } catch (error) {
         console.error("Failed to add comment:", error);
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
         <h3 className="text-xl font-bold text-gray-900 mb-4">
            Comments ({comments.length})
         </h3>

         {/* Add Comment Form */}
         {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="mb-6">
               <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
               />
               <div className="mt-2 flex justify-end">
                  <Button
                     type="submit"
                     disabled={!newComment.trim() || isSubmitting}
                     size="sm"
                  >
                     {isSubmitting ? "Posting..." : "Post Comment"}
                  </Button>
               </div>
            </form>
         ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
               <p className="text-gray-600">Please log in to comment</p>
            </div>
         )}

         {/* Comments List */}
         <div className="space-y-4">
            {comments.length === 0 ? (
               <p className="text-gray-500 text-center py-8">
                  No comments yet. Be the first to comment!
               </p>
            ) : (
               comments.map((comment) => (
                  <div
                     key={comment.id}
                     className="border-b border-gray-200 pb-4 last:border-b-0"
                  >
                     <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                           <span className="text-sm font-semibold text-indigo-600">
                              {comment.author.username.charAt(0).toUpperCase()}
                           </span>
                        </div>
                        <div className="flex-1">
                           <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900">
                                 {comment.author.username}
                              </span>
                              <span className="text-xs text-gray-500">
                                 {new Date(comment.created_at).toLocaleDateString()} at{" "}
                                 {new Date(comment.created_at).toLocaleTimeString()}
                              </span>
                           </div>
                           <p className="text-gray-700 whitespace-pre-wrap">
                              {comment.content}
                           </p>
                        </div>
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>
   );
};
