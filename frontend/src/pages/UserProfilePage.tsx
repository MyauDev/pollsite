import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { profileAPI, pollAPI } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Profile, Poll, UserComment } from "../types";
import { PollCard } from "../components/PollCard";
import { Button } from "../components/Button";
import { FollowersPanel } from "../components/FollowersPanel";

export const UserProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [replies, setReplies] = useState<UserComment[]>([]);
  const [replyPolls, setReplyPolls] = useState<Poll[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"created" | "replies">("created");
  const [followPanelOpen, setFollowPanelOpen] = useState(false);
  const [followPanelMode, setFollowPanelMode] = useState<"followers" | "following">("followers");
  const [suggestFollowState, setSuggestFollowState] = useState<Record<string, boolean>>({});

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

        const pollsResponse = await pollAPI.list({ search: username });
        const userPolls = pollsResponse.data.results.filter(
          (poll: Poll) => poll.author?.username === username
        );
        setPolls(userPolls);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  // Fetch suggestions for other profiles
  useEffect(() => {
    if (isOwnProfile || !profile) return;
    profileAPI.suggestions()
      .then((res) => {
        setSuggestedUsers(res.data.slice(0, 5));
        const state: Record<string, boolean> = {};
        res.data.forEach((p: Profile) => { state[p.user.username] = p.is_following ?? false; });
        setSuggestFollowState(state);
      })
      .catch(console.error);
  }, [isOwnProfile, profile]);

  // Fetch replies when tab switches
  useEffect(() => {
    const fetchReplies = async () => {
      if (!username || activeTab !== "replies") return;
      if (replies.length > 0) return;

      setRepliesLoading(true);
      try {
        const response = await profileAPI.comments(username);
        const commentList = response.data.results;
        setReplies(commentList);

        // Fetch unique polls for those comments
        const pollIds = [...new Set(commentList.map((c: UserComment) => c.poll_id))];
        const pollResults = await Promise.allSettled(
          pollIds.map((id) => pollAPI.get(id as number))
        );
        const fetchedPolls = pollResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map((r) => r.value.data);
        setReplyPolls(fetchedPolls);
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
        setProfile((prev) => prev ? { ...prev, followers_count: prev.followers_count - 1 } : null);
      } else {
        await profileAPI.follow(username);
        setIsFollowing(true);
        setProfile((prev) => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null);
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSuggestFollow = async (targetUsername: string) => {
    if (!user) return;
    const isF = suggestFollowState[targetUsername];
    try {
      if (isF) {
        await profileAPI.unfollow(targetUsername);
      } else {
        await profileAPI.follow(targetUsername);
      }
      setSuggestFollowState((prev) => ({ ...prev, [targetUsername]: !isF }));
    } catch (err) {
      console.error("Follow failed:", err);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Profile link copied to clipboard!");
    } catch {
      alert("Failed to copy link. Please copy the URL manually.");
    }
  };

  const handleBlock = async () => {
    if (!username || !user) return;
    if (!window.confirm(`Are you sure you want to block ${username}?`)) return;
    alert("Block feature coming soon.");
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
        <div className="text-white text-xl mb-4">{error || "Profile not found"}</div>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Followers/Following slide-in panel */}
      <FollowersPanel
        isOpen={followPanelOpen}
        mode={followPanelMode}
        username={username!}
        onClose={() => setFollowPanelOpen(false)}
      />

      {/* Pink gradient cover */}
      <div className="bg-gradient-to-br from-[#F080B8] to-[#FFE6FE] h-36" />

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left sidebar - Profile info */}
          <div className="lg:col-span-3 -mt-16">
            <div className="sticky top-24">
              {/* Avatar - overlaps cover */}
              <div className="mb-4">
                <div className="w-32 h-32 bg-pink rounded-[2rem] flex items-center justify-center border-2 border-black shadow-lg overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {profile.user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Name + username + bio */}
              <h2 className="text-2xl font-bold text-white mb-1">
                {profile.display_name || profile.user.username}
              </h2>
              <p className="text-gray text-sm mb-2">@{profile.user.username.toLowerCase()}</p>
              {profile.bio && (
                <p className="text-gray text-sm mb-4">{profile.bio}</p>
              )}

              {/* Followers / Following inline */}
              <div className="flex items-center gap-3 mb-5 text-sm">
                <button
                  onClick={() => { setFollowPanelMode("followers"); setFollowPanelOpen(true); }}
                  className="hover:text-pink transition-colors"
                >
                  <span className="font-bold text-white">{profile.followers_count}</span>
                  <span className="text-gray ml-1">Followers</span>
                </button>
                <span className="text-gray">|</span>
                <button
                  onClick={() => { setFollowPanelMode("following"); setFollowPanelOpen(true); }}
                  className="hover:text-pink transition-colors"
                >
                  <span className="font-bold text-white">{profile.following_count}</span>
                  <span className="text-gray ml-1">Following</span>
                </button>
              </div>

              {/* Own profile: Edit button */}
              {isOwnProfile && (
                <button
                  onClick={() => navigate("/profile/edit")}
                  className="py-2 px-6 rounded-full font-medium border-2 border-white text-white hover:bg-white hover:text-black transition-colors text-sm"
                >
                  EDIT PROFILE
                </button>
              )}

              {/* Other profile: Follow/Following button */}
              {!isOwnProfile && user && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`py-2 px-6 rounded-full font-medium text-sm transition-colors ${
                    isFollowing
                      ? "border-2 border-white text-white hover:bg-white hover:text-black"
                      : "bg-pink text-white hover:bg-pink/80"
                  }`}
                >
                  {followLoading ? "..." : isFollowing ? "FOLLOWING" : "FOLLOW"}
                </button>
              )}
            </div>
          </div>

          {/* Center - Tabs + content */}
          <div className="lg:col-span-5 mt-6">
            {/* Tabs */}
            <div className="flex gap-8 justify-center mb-6">
              <button
                onClick={() => setActiveTab("created")}
                className={`pb-3 px-1 border-b-2 font-medium transition-colors text-sm uppercase tracking-wider ${
                  activeTab === "created" ? "border-pink text-white" : "border-transparent text-gray hover:text-white"
                }`}
              >
                Created
              </button>
              <button
                onClick={() => setActiveTab("replies")}
                className={`pb-3 px-1 border-b-2 font-medium transition-colors text-sm uppercase tracking-wider ${
                  activeTab === "replies" ? "border-pink text-white" : "border-transparent text-gray hover:text-white"
                }`}
              >
                Replies
              </button>
            </div>

            {/* Tab content */}
            <div className="space-y-6">
              {activeTab === "created" && (
                polls.length === 0 ? (
                  <div className="text-center py-12 text-gray">No polls yet</div>
                ) : (
                  polls.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      hideAuthor
                      isOwnPoll={isOwnProfile}
                      showExpiry={!isOwnProfile}
                      onDeleted={(id) => setPolls((prev) => prev.filter((p) => p.id !== id))}
                    />
                  ))
                )
              )}

              {activeTab === "replies" && (
                repliesLoading ? (
                  <div className="text-center py-12 text-gray">Loading replies...</div>
                ) : replyPolls.length === 0 ? (
                  <div className="text-center py-12 text-gray">No replies yet</div>
                ) : (
                  replyPolls.map((poll) => (
                    <PollCard key={poll.id} poll={poll} hideAuthor />
                  ))
                )
              )}
            </div>
          </div>

          {/* Right sidebar - Actions + Suggestions */}
          <div className="lg:col-span-4 mt-6">
            <div className="sticky top-24 space-y-8">
              {/* Action icons */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={handleShare}
                  title="Share Profile"
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-pink/20 transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                {!isOwnProfile && user && (
                  <button
                    onClick={handleBlock}
                    title="Block User"
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-pink/20 transition-colors"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                )}
              </div>

              {/* "You Might Also Like" suggestions */}
              {!isOwnProfile && (
                <div>
                  <h3 className="text-white font-medium mb-4 uppercase tracking-wider text-sm">
                    You might also like
                  </h3>
                  {suggestedUsers.length === 0 ? (
                    <div className="text-gray text-sm text-center py-4">No suggestions available</div>
                  ) : (
                    <div className="space-y-3">
                      {suggestedUsers.map((suggested) => (
                        <div key={suggested.id} className="flex items-center justify-between">
                          <button
                            onClick={() => navigate(`/user/${suggested.user.username}`)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <div className="w-9 h-9 rounded-full bg-pink flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-white">
                                {suggested.user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-left">
                              <p className="text-white text-sm font-medium">
                                {suggested.display_name || suggested.user.username}
                              </p>
                              <p className="text-gray text-xs">@{suggested.user.username}</p>
                            </div>
                          </button>
                          {user && user.username !== suggested.user.username && (
                            <button
                              onClick={() => handleSuggestFollow(suggested.user.username)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                suggestFollowState[suggested.user.username]
                                  ? "border border-white text-white hover:bg-white hover:text-black"
                                  : "bg-pink text-white hover:bg-pink/80"
                              }`}
                            >
                              {suggestFollowState[suggested.user.username] ? "Following" : "Follow"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
