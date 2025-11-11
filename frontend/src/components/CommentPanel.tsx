import { useEffect, useState, useCallback } from 'react';
import { commentAPI } from '../api/endpoints';
import type { Comment } from '../types';
import { useAuth } from '../context/AuthContext';

interface CommentPanelProps {
   pollId: number;
   isOpen: boolean;
   onClose: () => void;
}

export const CommentPanel = ({ pollId, isOpen, onClose }: CommentPanelProps) => {
   const { user } = useAuth();
   const [comments, setComments] = useState<Comment[]>([]);
   const [loading, setLoading] = useState(false);
   const [newComment, setNewComment] = useState('');
   const [posting, setPosting] = useState(false);
   const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
   const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
   const [replies, setReplies] = useState<Record<number, Comment[]>>({});

   // Prevent body scroll when panel is open
   useEffect(() => {
      if (isOpen) {
         document.body.style.overflow = 'hidden';
      } else {
         document.body.style.overflow = '';
      }
      return () => {
         document.body.style.overflow = '';
      };
   }, [isOpen]);

   const loadComments = useCallback(async () => {
      if (!isOpen) return;

      setLoading(true);
      try {
         const response = await commentAPI.list(pollId);
         // response.data is the CommentListResponse with results array
         setComments(response.data.results || []);
      } catch (error) {
         console.error('Failed to load comments:', error);
      } finally {
         setLoading(false);
      }
   }, [pollId, isOpen]);

   useEffect(() => {
      loadComments();
   }, [loadComments]);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim() || posting) return;

      setPosting(true);
      try {
         const response = await commentAPI.create(pollId, {
            content: newComment,
            parent: replyingTo?.id || null
         });

         // If it's a top-level comment, add to the main list
         if (!replyingTo) {
            setComments(prev => [response.data, ...prev]);
         } else {
            // If it's a reply, increment the parent's replies_count and add to replies list
            setComments(prev => prev.map(comment =>
               comment.id === replyingTo.id
                  ? { ...comment, replies_count: comment.replies_count + 1 }
                  : comment
            ));

            // Add the new reply to the replies list
            setReplies(prev => ({
               ...prev,
               [replyingTo.id]: [response.data, ...(prev[replyingTo.id] || [])]
            }));

            // Ensure the parent comment is expanded to show the new reply
            setExpandedComments(prev => new Set(prev).add(replyingTo.id));
         }

         setNewComment('');
         setReplyingTo(null); // Clear reply state after posting
      } catch (error: any) {
         console.error('Failed to post comment:', error);
         console.error('Error response:', error.response?.data);
         console.error('Full error details:', JSON.stringify(error.response?.data, null, 2));
         const errorMsg = error.response?.data?.error?.details || error.response?.data?.detail || error.response?.data?.content?.[0] || 'Unknown error';
         alert(`Failed to post comment: ${JSON.stringify(errorMsg)}`);
      } finally {
         setPosting(false);
      }
   };

   const loadReplies = async (commentId: number) => {
      try {
         const response = await commentAPI.list(pollId, { parent: commentId });
         setReplies(prev => ({
            ...prev,
            [commentId]: response.data.results || []
         }));
         setExpandedComments(prev => new Set(prev).add(commentId));
      } catch (error) {
         console.error('Failed to load replies:', error);
      }
   };

   const toggleReplies = (commentId: number) => {
      if (expandedComments.has(commentId)) {
         // Collapse
         setExpandedComments(prev => {
            const newSet = new Set(prev);
            newSet.delete(commentId);
            return newSet;
         });
      } else {
         // Expand - load replies if not already loaded
         if (!replies[commentId]) {
            loadReplies(commentId);
         } else {
            setExpandedComments(prev => new Set(prev).add(commentId));
         }
      }
   };

   const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return date.toLocaleDateString();
   };

   return (
      <>
         {/* Backdrop - only covers below header */}
         {isOpen && (
            <div
               className="fixed inset-0 top-20 bg-black/50 z-40 transition-opacity duration-300"
               onClick={onClose}
            />
         )}

         {/* Panel - starts below header */}
         <div
            className={`fixed right-0 top-20 bottom-0 w-full sm:w-[400px] md:w-[350px] bg-black border-l mb-6 border-gray z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
               }`}
         >
            <div className="h-full flex flex-col">
               {/* Header */}
               <div className="flex items-center justify-between p-6 border-b border-gray mx-4">
                  <h2 className="text-2xl text-white">Comments</h2>
                  <button
                     onClick={onClose}
                     className="text-white hover:text-pink transition-colors"
                     aria-label="Close"
                  >
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                  </button>
               </div>

               {/* Comments List */}
               <div className="flex-1 overflow-y-auto p-6 space-y-2">
                  {loading ? (
                     <div className="flex justify-center items-center h-32">
                        <div className="text-gray">Loading comments...</div>
                     </div>
                  ) : comments.length === 0 ? (
                     <div className="flex justify-center items-center h-32">
                        <div className="text-gray">No comments yet. Be the first!</div>
                     </div>
                  ) : (
                     comments.map((comment) => (
                        <div key={comment.id} className="space-y-2">
                           <div className="flex items-start space-x-3">
                              {/* Avatar on the left */}
                              <div className="w-8 h-8 bg-pink rounded-full flex items-center justify-center shrink-0">
                                 <span className="text-sm font-semibold text-white">
                                    {comment.author?.username?.charAt(0).toUpperCase() || 'A'}
                                 </span>
                              </div>
                              {/* Username/time above comment box */}
                              <div className="flex-1 space-y-1">
                                 <div className="flex items-center justify-between text-sm">
                                    <div className="flex text-xs items-center space-x-2">
                                       <span className=" text-gray">
                                          {comment.author?.username || 'Anonymous'}
                                       </span>

                                       <span className="text-xs text-gray">{formatDate(comment.created_at)}</span>
                                    </div>
                                 </div>
                                 <div className="bg-black text-sm rounded-md px-3 py-1 border border-pink">
                                    <p className="text-white">{comment.content}</p>
                                 </div>
                                 {/* Action buttons - Like, Reply, and View Replies */}
                                 <div className="flex items-center justify-between pt-0.5">
                                    {/* View Replies Button on the left */}
                                    {comment.replies_count > 0 ? (
                                       <button
                                          onClick={() => toggleReplies(comment.id)}
                                          className="flex items-center space-x-1 text-xs text-gray hover:text-pink transition-all"
                                       >
                                          <span>{comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}</span>
                                          <svg
                                             className={`w-3 h-3 transition-transform duration-200 ${expandedComments.has(comment.id) ? 'rotate-180' : ''}`}
                                             fill="none"
                                             stroke="currentColor"
                                             viewBox="0 0 24 24"
                                          >
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                       </button>
                                    ) : (
                                       <div></div>
                                    )}

                                    {/* Like and Reply buttons on the right */}
                                    <div className="flex items-center space-x-0.5">
                                       <button
                                          onClick={() => {
                                             // TODO: Implement like functionality
                                             console.log('Like comment:', comment.id);
                                          }}
                                          className="flex items-center text-gray hover:text-pink transition-colors scale-75"
                                       >
                                          <span className="icon-button icon-button-gray icon-heart"></span>
                                       </button>
                                       <button
                                          onClick={() => {
                                             setReplyingTo(comment);
                                             // Scroll to the comment input
                                             const inputSection = document.querySelector('.comment-input-section');
                                             inputSection?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                          }}
                                          className="flex items-center text-gray hover:text-pink transition-colors scale-75"
                                       >
                                          <span className="icon-button icon-button-gray icon-comment"></span>
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* Nested Replies */}
                           {expandedComments.has(comment.id) && replies[comment.id] && (
                              <div className="ml-11 space-y-2 pl-4 border-l-2 border-pink/30">
                                 {replies[comment.id].map((reply) => (
                                    <div key={reply.id} className="flex items-start space-x-2">
                                       <div className="w-6 h-6 bg-pink rounded-full flex items-center justify-center shrink-0">
                                          <span className="text-xs font-semibold text-white">
                                             {reply.author?.username?.charAt(0).toUpperCase() || 'A'}
                                          </span>
                                       </div>
                                       <div className="flex-1 space-y-1">
                                          <div className="flex text-xs items-center space-x-2">
                                             <span className="text-gray">{reply.author?.username || 'Anonymous'}</span>
                                             <span className="text-gray">{formatDate(reply.created_at)}</span>
                                          </div>
                                          <div className="bg-black text-xs rounded-md px-2 py-1 border border-pink/50">
                                             <p className="text-white">{reply.content}</p>
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     ))
                  )}
               </div>

               {/* Comment Input */}
               <div className="p-1 mb-5 border-t border-gray mx-4 comment-input-section">
                  <form onSubmit={handleSubmit}>
                     {/* Replying To Indicator */}
                     {replyingTo && (
                        <div className="mt-3 mb-2 p-2 bg-black  flex items-start justify-between">
                           <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                 <span className="text-xs text-pink font-medium">Replying to</span>
                                 <span className="text-xs text-gray">
                                    {replyingTo.author?.username || 'Anonymous'}
                                 </span>
                              </div>
                              <p className="text-xs border rounded-md border-pink text-white p-1 line-clamp-2">{replyingTo.content}</p>
                           </div>
                           <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="ml-2 text-gray hover:text-pink text-xs"
                           >
                              ✕
                           </button>
                        </div>
                     )}

                     <div className="flex items-start space-x-3">
                        {/* User Avatar */}
                        <div className="w-8 h-8 bg-pink mt-3 rounded-full flex items-center justify-center shrink-0">
                           <span className="text-sm font-semibold text-white">
                              {user?.username?.charAt(0).toUpperCase() || 'A'}
                           </span>
                        </div>

                        {/* Input area with username above */}
                        <div className="flex-1 space-y-1">
                           <span className="text-xs text-gray">
                              {user?.username || 'Anonymous'}
                           </span>
                           <div className="relative">
                              <textarea
                                 value={newComment}
                                 onChange={(e) => setNewComment(e.target.value)}
                                 placeholder={replyingTo ? `Reply to ${replyingTo.author?.username || 'Anonymous'}...` : "Write a comment..."}
                                 className="w-full bg-black border border-pink rounded-md p-3 pr-8 text-white text-xs placeholder-gray focus:outline-none focus:border-pink resize-none"
                                 rows={2}
                                 maxLength={2000}
                                 disabled={posting}
                              />
                              {/* Send button inside textarea */}
                              <button
                                 type="submit"
                                 disabled={!newComment.trim() || posting}
                                 className="absolute bottom-2 right-2 text-pink hover:text-pink/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all scale-75 hover:scale-90"
                              >
                                 <span className="icon-button icon-paper-plane"></span>
                              </button>
                           </div>

                        </div>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      </>
   );
};
