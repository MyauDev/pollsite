import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { profileAPI, authAPI } from "../api/endpoints";
import { ModalCard } from "../components/ModalCard";
import { PasswordInput } from "../components/PasswordInput";

type AccountPanel = null | "accountInfo" | "password" | "privacy" | "delete";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<AccountPanel>(null);

  // Password: 2-step flow
  const [passwordStep, setPasswordStep] = useState<1 | 2>(1);
  const [passwordData, setPasswordData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Account info
  const [accountInfo, setAccountInfo] = useState({
    phoneNumber: "",
    email: "",
    dateOfBirth: "",
    accountRegion: "",
  });
  const [accountInfoLoading, setAccountInfoLoading] = useState(false);

  // Privacy
  const [privacySettings, setPrivacySettings] = useState({ isPrivate: false, suggestAccount: true });
  const [privacyLoading, setPrivacyLoading] = useState(false);

  // Main profile form
  const [formData, setFormData] = useState({ name: "", username: "", bio: "", avatar: null as File | null });
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const fetchProfile = async () => {
      try {
        const res = await profileAPI.get(user.username);
        const data = res.data;
        setFormData({
          name: data.display_name || "",
          username: data.user.username || "",
          bio: data.bio || "",
          avatar: null,
        });
        setAvatarPreview(data.avatar_url || data.avatar || "");
        setAccountInfo({
          phoneNumber: data.phone_number || "",
          email: data.user.email || "",
          dateOfBirth: data.date_of_birth || "",
          accountRegion: data.account_region || "",
        });
        setPrivacySettings({
          isPrivate: data.is_private || false,
          suggestAccount: data.suggest_to_others ?? true,
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, authLoading, navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, avatar: file });
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("display_name", formData.name || "");
      fd.append("bio", formData.bio || "");
      if (formData.avatar) fd.append("avatar", formData.avatar);
      await profileAPI.updateWithFormData(fd);
      navigate(`/user/${user?.username}`);
    } catch {
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const closePanel = () => {
    setActivePanel(null);
    setPasswordStep(1);
    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordError(null);
    setDeleteConfirmText("");
  };

  const handlePasswordNext = () => {
    if (!passwordData.oldPassword.trim()) {
      setPasswordError("Please enter your current password");
      return;
    }
    setPasswordError(null);
    setPasswordStep(2);
  };

  const handlePasswordSave = async () => {
    setPasswordError(null);
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    setPasswordLoading(true);
    try {
      await authAPI.changePassword({ old_password: passwordData.oldPassword, new_password: passwordData.newPassword });
      closePanel();
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveAccountInfo = async () => {
    setAccountInfoLoading(true);
    try {
      const fd = new FormData();
      fd.append("phone_number", accountInfo.phoneNumber);
      fd.append("date_of_birth", accountInfo.dateOfBirth);
      fd.append("account_region", accountInfo.accountRegion);
      await profileAPI.updateWithFormData(fd);
      closePanel();
    } catch {
      alert("Failed to update account information.");
    } finally {
      setAccountInfoLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setPrivacyLoading(true);
    try {
      const fd = new FormData();
      fd.append("is_private", privacySettings.isPrivate.toString());
      fd.append("suggest_to_others", privacySettings.suggestAccount.toString());
      await profileAPI.updateWithFormData(fd);
      closePanel();
    } catch {
      alert("Failed to update privacy settings.");
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") { alert('Please type "DELETE" to confirm'); return; }
    alert("Account deletion is not yet implemented. Please contact support.");
    closePanel();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 bg-black border-2 border-pink rounded-full text-white focus:outline-none text-sm";
  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? "bg-pink" : "bg-gray"}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${value ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-black relative">
      {/* Pink gradient cover */}
      <div className="bg-gradient-to-br from-[#F080B8] to-[#FFE6FE] h-36" />

      {/* Top-right + button for avatar upload */}
      <button
        onClick={() => avatarInputRef.current?.click()}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-pink text-white text-2xl flex items-center justify-center hover:bg-pink/80 transition-colors z-10"
      >
        +
      </button>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Empty left spacer */}
          <div className="hidden lg:block" />

          {/* Center - Profile form */}
          <div className="flex flex-col items-center">
            {/* Avatar with + overlay */}
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-pink rounded-full flex items-center justify-center border-2 border-black shadow-lg overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {formData.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </label>
              <input
                id="avatar-upload"
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Name */}
            <div className="mb-6 w-full">
              <label className="block text-white text-sm mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
                placeholder="Diana Shulga"
              />
            </div>

            {/* Username */}
            <div className="mb-6 w-full">
              <label className="block text-white text-sm mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={inputClass}
                placeholder="@username"
              />
            </div>

            {/* Bio */}
            <div className="mb-8 w-full">
              <label className="block text-white text-sm mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                maxLength={240}
                rows={4}
                className="w-full px-4 py-3 bg-black border-2 border-pink rounded-3xl text-white focus:outline-none resize-none text-sm"
                placeholder="Tell the world about yourself..."
              />
              <div className="text-right text-gray text-xs mt-1">{formData.bio.length}/240</div>
            </div>

            {/* Save Changes */}
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="px-12 py-2 bg-pink-light text-black rounded-full font-medium hover:bg-pink transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Right - Account panel */}
          <div className="hidden lg:flex items-start justify-center mt-10">
            <div className="w-full max-w-xs border-2 border-pink rounded-[3rem] p-8">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-white font-medium text-xl">Account</h3>
              </div>
              <div className="border-t border-gray mb-5" />
              <div className="space-y-3">
                {(["Account Information", "Password", "Privacy", "Delete Account"] as const).map((label) => {
                  const panelKey: AccountPanel =
                    label === "Account Information" ? "accountInfo"
                    : label === "Password" ? "password"
                    : label === "Privacy" ? "privacy"
                    : "delete";
                  return (
                    <button
                      key={label}
                      onClick={() => setActivePanel(panelKey)}
                      className="w-full py-1.5 px-3 bg-pink-light text-black rounded-full text-sm font-medium hover:bg-pink transition-colors"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Password Modal ── */}
      {activePanel === "password" && (
        <ModalCard
          title="Change Password"
          onBack={() => passwordStep === 2 ? setPasswordStep(1) : closePanel()}
        >
          {passwordError && (
            <div className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500 rounded-lg px-3 py-2">
              {passwordError}
            </div>
          )}

          {passwordStep === 1 ? (
            <>
              <label className="block text-white text-sm mb-2">Enter Your Password</label>
              <PasswordInput
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                placeholder="Password..."
              />
              <div className="flex justify-end mt-6">
                <button
                  onClick={handlePasswordNext}
                  className="px-8 py-2 bg-pink text-white rounded-full font-medium hover:bg-pink/80 transition-colors"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-white text-sm mb-2">New Password</label>
                <PasswordInput
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="New password"
                />
              </div>
              <div className="mb-6">
                <label className="block text-white text-sm mb-2">Repeat Password</label>
                <PasswordInput
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Repeat password"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handlePasswordSave}
                  disabled={passwordLoading}
                  className="px-8 py-2 bg-pink text-white rounded-full font-medium hover:bg-pink/80 transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </>
          )}
        </ModalCard>
      )}

      {/* ── Privacy Modal ── */}
      {activePanel === "privacy" && (
        <ModalCard title="Privacy" onBack={closePanel}>
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between border border-pink/30 rounded-full px-4 py-2">
              <span className="text-white text-sm">Private Account</span>
              <Toggle
                value={privacySettings.isPrivate}
                onChange={() => setPrivacySettings({ ...privacySettings, isPrivate: !privacySettings.isPrivate })}
              />
            </div>
            <div className="flex items-center justify-between border border-pink/30 rounded-full px-4 py-2">
              <span className="text-white text-sm">Suggest your Account to others</span>
              <Toggle
                value={privacySettings.suggestAccount}
                onChange={() => setPrivacySettings({ ...privacySettings, suggestAccount: !privacySettings.suggestAccount })}
              />
            </div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleSavePrivacy}
              disabled={privacyLoading}
              className="px-10 py-2 bg-pink text-white rounded-full font-medium hover:bg-pink/80 transition-colors disabled:opacity-50"
            >
              {privacyLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </ModalCard>
      )}

      {/* ── Account Information Modal ── */}
      {activePanel === "accountInfo" && (
        <ModalCard title="Account Information" onBack={closePanel}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-white text-sm mb-1">Phone Number</label>
              <input
                type="tel"
                value={accountInfo.phoneNumber}
                onChange={(e) => setAccountInfo({ ...accountInfo, phoneNumber: e.target.value })}
                className={inputClass}
                placeholder="238 632 2368"
              />
            </div>
            <div>
              <label className="block text-white text-sm mb-1">Email</label>
              <input
                type="email"
                value={accountInfo.email}
                onChange={(e) => setAccountInfo({ ...accountInfo, email: e.target.value })}
                className={inputClass}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-white text-sm mb-1">Date of Birth</label>
              <input
                type="date"
                value={accountInfo.dateOfBirth}
                onChange={(e) => setAccountInfo({ ...accountInfo, dateOfBirth: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-white text-sm mb-1">Account Region</label>
              <input
                type="text"
                value={accountInfo.accountRegion}
                onChange={(e) => setAccountInfo({ ...accountInfo, accountRegion: e.target.value })}
                className={inputClass}
                placeholder="India"
              />
            </div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleSaveAccountInfo}
              disabled={accountInfoLoading}
              className="px-10 py-2 bg-pink text-white rounded-full font-medium hover:bg-pink/80 transition-colors disabled:opacity-50"
            >
              {accountInfoLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </ModalCard>
      )}

      {/* ── Delete Account Modal ── */}
      {activePanel === "delete" && (
        <ModalCard title="Delete Account" onBack={closePanel}>
          <p className="text-gray text-sm mb-6">
            This action cannot be undone. All your polls, comments, and data will be permanently deleted.
          </p>
          <div className="mb-6">
            <label className="block text-white text-sm mb-2">Type "DELETE" to confirm</label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-3 bg-black border-2 border-red-500 rounded-full text-white focus:outline-none"
              placeholder="DELETE"
            />
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE"}
              className="px-10 py-2 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Delete Account
            </button>
          </div>
        </ModalCard>
      )}
    </div>
  );
}
