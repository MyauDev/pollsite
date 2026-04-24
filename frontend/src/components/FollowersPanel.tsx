import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { profileAPI } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Profile } from "../types";

interface FollowersPanelProps {
  isOpen: boolean;
  mode: "followers" | "following";
  username: string;
  onClose: () => void;
}

export const FollowersPanel = ({ isOpen, mode, username, onClose }: FollowersPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [followState, setFollowState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const fetch = mode === "followers"
      ? profileAPI.followers(username)
      : profileAPI.following(username);

    fetch
      .then((res) => {
        const results = res.data.results || [];
        setProfiles(results);
        const state: Record<string, boolean> = {};
        results.forEach((p: Profile) => {
          state[p.user.username] = p.is_following ?? false;
        });
        setFollowState(state);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, mode, username]);

  const handleFollow = async (targetUsername: string) => {
    if (!user) return;
    const isFollowing = followState[targetUsername];
    try {
      if (isFollowing) {
        await profileAPI.unfollow(targetUsername);
      } else {
        await profileAPI.follow(targetUsername);
      }
      setFollowState((prev) => ({ ...prev, [targetUsername]: !isFollowing }));
    } catch (err) {
      console.error("Follow action failed:", err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-black border-r-2 border-pink z-50 transition-transform duration-300 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold text-lg capitalize">{mode}</h3>
            <button
              onClick={onClose}
              className="text-gray hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="text-gray text-center py-8">Loading...</div>
          ) : profiles.length === 0 ? (
            <div className="text-gray text-center py-8">No {mode} yet</div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between">
                  <button
                    onClick={() => { navigate(`/user/${profile.user.username}`); onClose(); }}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-9 h-9 rounded-full bg-pink flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">
                        {profile.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">
                        {profile.display_name || profile.user.username}
                      </p>
                      <p className="text-gray text-xs">@{profile.user.username}</p>
                    </div>
                  </button>

                  {user && user.username !== profile.user.username && (
                    <button
                      onClick={() => handleFollow(profile.user.username)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        followState[profile.user.username]
                          ? "border border-white text-white hover:bg-white hover:text-black"
                          : "bg-pink text-white hover:bg-pink/80"
                      }`}
                    >
                      {followState[profile.user.username] ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
