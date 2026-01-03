import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { profileAPI, pollAPI } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Profile, Poll, UserComment } from "../types";
import { PollCard } from "../components/PollCard";
import { Button } from "../components/Button";

export const UserProfilePage = () => {
   const { username } = useParams<{ username: string }>();
   const navigate = useNavigate();
   const { user } = useAuth();
   const [profile, setProfile] = useState<Profile | null>(null);
   const [polls, setPolls] = useState<Poll[]>([]);
   const [replies, setReplies] = useState<UserComment[]>([]);
   const [loading, setLoading] = useState(true);
   const [repliesLoading, setRepliesLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [isFollowing, setIsFollowing] = useState(false);
   const [followLoading, setFollowLoading] = useState(false);
   const [activeTab, setActiveTab] = useState<"created" | "replies">("created");

   const isOwnProfile = user?.username === username;

   useEffect(() => {
      const fetchProfile = async () => {
         if (!username) return;

         setLoading(true);
         setError(null);

         try {
            const profileData = await profileAPI.get(username);
            setProfile(profileData.data);
            setIsFollowing(profileData.data.is_following || false);

            // Fetch user's polls
            const pollsResponse = await pollAPI.list({ search: username });
            // Filter polls by this author
            const userPolls = pollsResponse.data.results.filter(
               (poll: Poll) => poll.author?.username === username
            );
            setPolls(userPolls);
         } catch (err: any) {
            console.error("Failed to fetch profile:", err);
            setError(err.response?.data?.detail || "Failed to load profile");
         } finally {
            setLoading(false);
         }
      };

      fetchProfile();
   }, [username]);

   // Fetch replies when tab changes to replies
   useEffect(() => {
      const fetchReplies = async () => {
         if (!username || activeTab !== "replies") return;
         if (replies.length > 0) return; // Already loaded

         setRepliesLoading(true);
         try {
            const response = await profileAPI.comments(username);
            setReplies(response.data.results);
         } catch (err) {
            console.error("Failed to fetch replies:", err);
         } finally {
            setRepliesLoading(false);
         }
      };

      fetchReplies();
   }, [activeTab, username, replies.length]);

   const handleFollow = async () => {
      if (!username || !user) return;

      setFollowLoading(true);
      try {
         if (isFollowing) {
            await profileAPI.unfollow(username);
            setIsFollowing(false);
            setProfile((prev) =>
               prev ? { ...prev, followers_count: prev.followers_count - 1 } : null
            );
         } else {
            await profileAPI.follow(username);
            setIsFollowing(true);
            setProfile((prev) =>
               prev ? { ...prev, followers_count: prev.followers_count + 1 } : null
            );
         }
      } catch (err) {
         console.error("Follow action failed:", err);
      } finally {
         setFollowLoading(false);
      }
   };

   const handleShare = async () => {
      const shareUrl = window.location.href;

      try {
         await navigator.clipboard.writeText(shareUrl);
         alert("Profile link copied to clipboard!");
      } catch (err) {
         console.error("Copy failed:", err);
         alert("Failed to copy link. Please copy the URL manually.");
      }
   };

   const handleBlock = async () => {
      if (!username || !user) return;

      // Show confirmation
      const confirmed = window.confirm(`Are you sure you want to block ${username}? You won't see their content anymore.`);
      if (!confirmed) return;

      // TODO: Implement block API endpoint
      alert("Block feature coming soon. This user has been noted for blocking.");
   };

   if (loading) {
      return (
         <div className="flex justify-center items-center min-h-screen bg-black">
            <div className="text-white text-xl">Loading profile...</div>
         </div>
      );
   }

   if (error || !profile) {
      return (
         <div className="flex flex-col justify-center items-center min-h-screen bg-black">
            <div className="text-white text-xl mb-4">
               {error || "Profile not found"}
            </div>
            <Button onClick={() => navigate("/")}>Go Home</Button>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-black">
         {/* Pink Header Bar */}
         <div className="bg-pink px-4 py-15">
            <div className="max-w-7xl mx-auto">
               {/* Empty header for visual design */}
            </div>
         </div>

         {/* Back Button - Below header on black background */}
         <div className="max-w-7xl mx-auto px-4 pt-6">
            <button
               onClick={() => navigate(-1)}
               className="text-white hover:text-pink transition-colors"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
               </svg>
            </button>
         </div>

         {/* Main Content - Profile and Tabs Side by Side */}
         <div className="max-w-7xl mx-auto px-4 -mt-30">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               {/* Left Sidebar - Profile Info */}
               <div className="lg:col-span-3">
                  <div className="sticky top-24">
                     {/* Avatar - overlaps the pink header */}
                     <div className="flex justify-center mb-4">
                        <div className="w-32 h-32 bg-pink rounded-full flex items-center justify-center border border-black shadow-lg overflow-hidden">
                           {profile.avatar ? (
                              <img
                                 src={profile.avatar}
                                 alt={profile.user.username}
                                 className="w-full h-full object-cover"
                              />
                           ) : (
                              <span className="text-5xl font-bold text-white">
                                 {profile.user.username.charAt(0).toUpperCase()}
                              </span>
                           )}
                        </div>
                     </div>

                     {/* Display Name or Username */}
                     <h2 className="text-2xl font-bold text-white text-center mb-2">
                        {profile.display_name || profile.user.username}
                     </h2>

                     {/* Username handle */}
                     <p className="text-gray text-center mb-4 text-sm">
                        @{profile.user.username.toLowerCase()}
                     </p>

                     {/* Bio */}
                     {profile.bio && (
                        <p className="text-gray text-center mb-6 text-sm px-4">
                           {profile.bio}
                        </p>
                     )}

                     {/* Stats */}
                     <div className="flex justify-center gap-8 mb-6">
                        <div className="text-center">
                           <div className="text-2xl font-bold text-white">
                              {profile.followers_count}
                           </div>
                           <div className="text-xs text-gray">Followers</div>
                        </div>
                        <div className="text-center">
                           <div className="text-2xl font-bold text-white">
                              {profile.following_count}
                           </div>
                           <div className="text-xs text-gray">Following</div>
                        </div>
                     </div>

                     {/* Edit Profile Button - Only for own profile */}
                     {isOwnProfile && (
                        <div className="px-4 mb-6">
                           <button
                              onClick={() => navigate('/profile/edit')}
                              className="w-full py-2 px-4 rounded-full font-medium transition-colors bg-transparent border-2 border-white text-white hover:bg-white hover:text-black"
                           >
                              EDIT PROFILE
                           </button>
                        </div>
                     )}

                     {/* Follow/Following Button */}
                     {!isOwnProfile && user && (
                        <div className="px-4">
                           <button
                              onClick={handleFollow}
                              disabled={followLoading}
                              className={`w-full py-2 px-4 rounded-full font-medium transition-colors ${isFollowing
                                 ? "bg-transparent border-2 border-white text-white hover:bg-white hover:text-black"
                                 : "bg-pink text-white hover:bg-pink/80"
                                 }`}
                           >
                              {followLoading
                                 ? "..."
                                 : isFollowing
                                    ? "FOLLOWING"
                                    : "FOLLOW"}
                           </button>
                        </div>
                     )}
                  </div>
               </div>

               {/* Middle Content - Tabs and Polls */}
               <div className="lg:col-span-5 mt-22">
                  {/* Tabs */}
                  <div className="mb-6">
                     <div className="flex gap-8 justify-center ">
                        <button
                           onClick={() => setActiveTab("created")}
                           className={`pb-3 px-1 border-b-2 font-medium transition-colors text-sm uppercase tracking-wider ${activeTab === "created"
                              ? "border-pink text-white"
                              : "border-transparent text-gray hover:text-white"
                              }`}
                        >
                           Created
                        </button>
                        <button
                           onClick={() => setActiveTab("replies")}
                           className={`pb-3 px-1 border-b-2 font-medium transition-colors text-sm uppercase tracking-wider ${activeTab === "replies"
                              ? "border-pink text-white"
                              : "border-transparent text-gray hover:text-white"
                              }`}
                        >
                           Replies
                        </button>
                     </div>
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-6">
                     {activeTab === "created" && (
                        <>
                           {polls.length === 0 ? (
                              <div className="text-center py-12 text-gray">
                                 No polls yet
                              </div>
                           ) : (
                              polls.map((poll) => (
                                 <PollCard key={poll.id} poll={poll} />
                              ))
                           )}
                        </>
                     )}

                     {activeTab === "replies" && (
                        <>
                           {repliesLoading ? (
                              <div className="text-center py-12 text-gray">
                                 Loading replies...
                              </div>
                           ) : replies.length === 0 ? (
                              <div className="text-center py-12 text-gray">
                                 No replies yet
                              </div>
                           ) : (
                              replies.map((reply) => (
                                 <div
                                    key={reply.id}
                                    className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 hover:border-pink/50 transition-colors"
                                 >
                                    <div
                                       className="text-sm text-gray mb-2 cursor-pointer hover:text-pink"
                                       onClick={() => navigate(`/poll/${reply.poll_id}`)}
                                    >
                                       On: {reply.poll_title || `Poll #${reply.poll_id}`}
                                    </div>
                                    <p className="text-white">{reply.content}</p>
                                    <div className="flex justify-between items-center mt-3 text-xs text-gray">
                                       <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                                       {reply.replies_count > 0 && (
                                          <span>{reply.replies_count} {reply.replies_count === 1 ? 'reply' : 'replies'}</span>
                                       )}
                                    </div>
                                 </div>
                              ))
                           )}
                        </>
                     )}
                  </div>
               </div>

               {/* Right Sidebar - Actions and Recommendations */}
               <div className="lg:col-span-4 mt-22">
                  <div className="sticky top-24 space-y-10">
                     {/* Action Buttons */}
                     <div className="flex justify-end gap-4">
                        <button
                           onClick={handleShare}
                           title="Share Profile"
                           className="group w-10 h-10 rounded-full flex items-center justify-center hover:bg-pink transition-colors"
                        >
                           <svg className="w-5 h-5 text-white group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                           </svg>
                        </button>
                        {!isOwnProfile && user && (
                           <button
                              onClick={handleBlock}
                              title="Block User"
                              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-500/20 transition-colors"
                           >
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                           </button>
                        )}
                     </div>

                     {/* "You Might Also Like" Section - Only for other users */}
                     {!isOwnProfile && (
                        <div>
                           <h3 className="text-white font-medium mb-4 uppercase tracking-wider text-sm text-center">
                              You might also like
                           </h3>
                           <div className="space-y-3">
                              {/* Placeholder for recommendations */}
                              <div className="text-center py-8 text-gray text-sm">
                                 Recommendations coming soon
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
