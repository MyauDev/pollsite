import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { profileAPI, authAPI } from "../api/endpoints";

export default function EditProfilePage() {
   const navigate = useNavigate();
   const { user, loading: authLoading } = useAuth();
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);

   // Modal states
   const [showPasswordModal, setShowPasswordModal] = useState(false);
   const [showDeleteModal, setShowDeleteModal] = useState(false);
   const [showAccountInfoModal, setShowAccountInfoModal] = useState(false);
   const [showPrivacyModal, setShowPrivacyModal] = useState(false);

   const [passwordData, setPasswordData] = useState({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
   });
   const [passwordError, setPasswordError] = useState<string | null>(null);
   const [passwordLoading, setPasswordLoading] = useState(false);
   const [deleteConfirmText, setDeleteConfirmText] = useState("");

   // Account info state
   const [accountInfo, setAccountInfo] = useState({
      age: "" as string,
      gender: "" as "" | "m" | "f" | "o",
   });
   const [accountInfoLoading, setAccountInfoLoading] = useState(false);

   // Privacy state
   const [privacySettings, setPrivacySettings] = useState({
      isPrivate: false,
   });
   const [privacyLoading, setPrivacyLoading] = useState(false);

   const [formData, setFormData] = useState({
      name: "",
      username: "",
      bio: "",
      avatar: null as File | null,
   });

   const [avatarPreview, setAvatarPreview] = useState<string>("");

   useEffect(() => {
      // Wait for auth to finish loading before checking
      if (authLoading) return;

      if (!user) {
         navigate("/login");
         return;
      }

      const fetchProfile = async () => {
         try {
            const response = await profileAPI.get(user.username);
            setFormData({
               name: response.data.display_name || "",
               username: response.data.user.username || "",
               bio: response.data.bio || "",
               avatar: null,
            });
            setAvatarPreview(response.data.avatar_url || response.data.avatar || "");
            setAccountInfo({
               age: response.data.age?.toString() || "",
               gender: response.data.gender || "",
            });
            setPrivacySettings({
               isPrivate: response.data.is_private || false,
            });
         } catch (error) {
            console.error("Failed to load profile:", error);
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
         reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
         };
         reader.readAsDataURL(file);
      }
   };

   const handleSaveChanges = async () => {
      setSaving(true);
      try {
         // Build FormData for multipart upload
         const submitData = new FormData();
         submitData.append("display_name", formData.name || "");
         submitData.append("bio", formData.bio || "");
         if (formData.avatar) {
            submitData.append("avatar", formData.avatar);
         }

         await profileAPI.updateWithFormData(submitData);

         // Navigate back to profile on success
         navigate(`/user/${user?.username}`);
      } catch (error) {
         console.error("Failed to save profile:", error);
         alert("Failed to save profile. Please try again.");
      } finally {
         setSaving(false);
      }
   };

   const handlePasswordChange = async () => {
      setPasswordError(null);

      if (passwordData.newPassword !== passwordData.confirmPassword) {
         setPasswordError("New passwords don't match");
         return;
      }

      if (passwordData.newPassword.length < 8) {
         setPasswordError("Password must be at least 8 characters");
         return;
      }

      setPasswordLoading(true);
      try {
         await authAPI.changePassword({
            old_password: passwordData.oldPassword,
            new_password: passwordData.newPassword,
         });
         alert("Password changed successfully!");
         setShowPasswordModal(false);
         setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } catch (error: any) {
         setPasswordError(error.response?.data?.detail || "Failed to change password");
      } finally {
         setPasswordLoading(false);
      }
   };

   const handleDeleteAccount = async () => {
      if (deleteConfirmText !== "DELETE") {
         alert('Please type "DELETE" to confirm');
         return;
      }

      // For now, just logout since delete endpoint may not exist
      // In production, this would call an API to delete the account
      alert("Account deletion is not yet implemented. Please contact support.");
      setShowDeleteModal(false);
   };

   const handleSaveAccountInfo = async () => {
      setAccountInfoLoading(true);
      try {
         const submitData = new FormData();
         if (accountInfo.age) {
            submitData.append("age", accountInfo.age);
         }
         if (accountInfo.gender) {
            submitData.append("gender", accountInfo.gender);
         }

         await profileAPI.updateWithFormData(submitData);
         alert("Account information updated!");
         setShowAccountInfoModal(false);
      } catch (error) {
         console.error("Failed to update account info:", error);
         alert("Failed to update account information. Please try again.");
      } finally {
         setAccountInfoLoading(false);
      }
   };

   const handleSavePrivacy = async () => {
      setPrivacyLoading(true);
      try {
         const submitData = new FormData();
         submitData.append("is_private", privacySettings.isPrivate.toString());

         await profileAPI.updateWithFormData(submitData);
         alert("Privacy settings updated!");
         setShowPrivacyModal(false);
      } catch (error) {
         console.error("Failed to update privacy settings:", error);
         alert("Failed to update privacy settings. Please try again.");
      } finally {
         setPrivacyLoading(false);
      }
   };

   if (loading || authLoading) {
      return (
         <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-white">Loading...</div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-black">
         {/* Pink Header Bar */}
         <div className="bg-pink px-4 py-15">
            <div className="max-w-7xl mx-auto"></div>
         </div>

         {/* Back Button */}
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

         {/* Main Content */}
         <div className="max-w-6xl mx-auto px-4 -mt-30">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Empty Left Column - Spacer */}
               <div className="hidden lg:block"></div>

               {/* Center Column - Profile Form */}
               <div className="flex flex-col items-center">
                  {/* Avatar with Edit Button */}
                  <div className="flex justify-center mb-8">
                     <div className="relative">
                        <div className="w-32 h-32 bg-pink rounded-full flex items-center justify-center border border-black shadow-lg overflow-hidden">
                           {avatarPreview ? (
                              <img
                                 src={avatarPreview}
                                 alt="Avatar"
                                 className="w-full h-full object-cover"
                              />
                           ) : (
                              <span className="text-5xl font-bold text-white">
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
                           type="file"
                           accept="image/*"
                           onChange={handleAvatarChange}
                           className="hidden"
                        />
                     </div>
                  </div>

                  {/* Name Input */}
                  <div className="mb-6 w-full">
                     <label className="block text-white text-sm mb-2 text-start">Name</label>
                     <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-black border-2 border-pink rounded-full text-white focus:outline-none focus:border-pink text-start"
                        placeholder="Diana Shulga"
                     />
                  </div>

                  {/* Username Input */}
                  <div className="mb-6 w-full">
                     <label className="block text-white text-sm mb-2 text-start">Username</label>
                     <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-4 py-3 bg-black border-2 border-pink rounded-full text-white focus:outline-none focus:border-pink text-start"
                        placeholder="@dianashlyae007"
                     />
                  </div>

                  {/* Bio Input */}
                  <div className="mb-8 w-full">
                     <label className="block text-white text-sm mb-2 text-start">Bio</label>
                     <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        maxLength={240}
                        rows={4}
                        className="w-full px-4 py-3 bg-black border-2 border-pink rounded-3xl text-white focus:outline-none focus:border-pink resize-none text-start"
                        placeholder="Laaaaaaaaaaaa"
                     />
                     <div className="text-center text-gray text-xs mt-1">
                        {formData.bio.length}/240
                     </div>
                  </div>

                  {/* Save Changes Button */}
                  <div className="flex justify-center">
                     <button
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="px-12 py-2 bg-pink-light text-black rounded-full font-medium hover:bg-pink transition-colors disabled:opacity-50"
                     >
                        {saving ? "Saving..." : "Save Changes"}
                     </button>
                  </div>
               </div>

               {/* Right Column - Account Settings */}
               <div className="hidden lg:flex items-center justify-center mt-26">
                  <div className="max-w-10/12 border-2 border-pink rounded-[3rem] p-10">
                     <div className="flex items-center gap-3 mb-6">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <h3 className="text-white font-medium text-xl">Account</h3>
                     </div>
                     <div className="border-t border-gray-600 mb-6"></div>
                     <div className="space-y-4">
                        <button
                           onClick={() => setShowAccountInfoModal(true)}
                           className="w-full py-1 px-2 bg-pink-light text-black rounded-full font-small hover:bg-pink transition-colors"
                        >
                           Account Information
                        </button>
                        <button
                           onClick={() => setShowPasswordModal(true)}
                           className="w-full py-1 px-2 bg-pink-light text-black rounded-full font-small hover:bg-pink transition-colors"
                        >
                           Change Password
                        </button>
                        <button
                           onClick={() => setShowPrivacyModal(true)}
                           className="w-full py-1 px-2 bg-pink-light text-black rounded-full font-small hover:bg-pink transition-colors"
                        >
                           Privacy
                        </button>
                        <button
                           onClick={() => setShowDeleteModal(true)}
                           className="w-full py-1 px-2 bg-red-500 text-white rounded-full font-small hover:bg-red-600 transition-colors"
                        >
                           Delete Account
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Password Change Modal */}
         {showPasswordModal && (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
               <div className="bg-black border-2 border-pink rounded-3xl p-8 max-w-md w-full">
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">Change Password</h2>

                  {passwordError && (
                     <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
                        {passwordError}
                     </div>
                  )}

                  <div className="space-y-4">
                     <div>
                        <label className="block text-white text-sm mb-2">Current Password</label>
                        <input
                           type="password"
                           value={passwordData.oldPassword}
                           onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                           className="w-full px-4 py-3 bg-black border-2 border-pink rounded-full text-white focus:outline-none"
                           placeholder="Enter current password"
                        />
                     </div>
                     <div>
                        <label className="block text-white text-sm mb-2">New Password</label>
                        <input
                           type="password"
                           value={passwordData.newPassword}
                           onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                           className="w-full px-4 py-3 bg-black border-2 border-pink rounded-full text-white focus:outline-none"
                           placeholder="Enter new password"
                        />
                     </div>
                     <div>
                        <label className="block text-white text-sm mb-2">Confirm New Password</label>
                        <input
                           type="password"
                           value={passwordData.confirmPassword}
                           onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                           className="w-full px-4 py-3 bg-black border-2 border-pink rounded-full text-white focus:outline-none"
                           placeholder="Confirm new password"
                        />
                     </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                     <button
                        onClick={() => {
                           setShowPasswordModal(false);
                           setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
                           setPasswordError(null);
                        }}
                        className="flex-1 py-2 border-2 border-white text-white rounded-full hover:bg-white hover:text-black transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handlePasswordChange}
                        disabled={passwordLoading}
                        className="flex-1 py-2 bg-pink text-white rounded-full hover:bg-pink/80 transition-colors disabled:opacity-50"
                     >
                        {passwordLoading ? "Saving..." : "Change Password"}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Delete Account Modal */}
         {showDeleteModal && (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
               <div className="bg-black border-2 border-red-500 rounded-3xl p-8 max-w-md w-full">
                  <h2 className="text-2xl font-bold text-red-500 mb-4 text-center">Delete Account</h2>
                  <p className="text-gray text-center mb-6">
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

                  <div className="flex gap-4">
                     <button
                        onClick={() => {
                           setShowDeleteModal(false);
                           setDeleteConfirmText("");
                        }}
                        className="flex-1 py-2 border-2 border-white text-white rounded-full hover:bg-white hover:text-black transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE"}
                        className="flex-1 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                     >
                        Delete Account
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Account Information Modal */}
         {showAccountInfoModal && (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
               <div className="bg-black border-2 border-pink rounded-3xl p-8 max-w-md w-full">
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">Account Information</h2>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-white text-sm mb-2">Age</label>
                        <input
                           type="number"
                           min="1"
                           max="120"
                           value={accountInfo.age}
                           onChange={(e) => setAccountInfo({ ...accountInfo, age: e.target.value })}
                           className="w-full px-4 py-3 bg-black border-2 border-pink rounded-full text-white focus:outline-none"
                           placeholder="Enter your age"
                        />
                     </div>
                     <div>
                        <label className="block text-white text-sm mb-2">Gender</label>
                        <div className="flex gap-4">
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                 type="radio"
                                 name="gender"
                                 value="m"
                                 checked={accountInfo.gender === "m"}
                                 onChange={(e) => setAccountInfo({ ...accountInfo, gender: e.target.value as "m" | "f" | "o" })}
                                 className="w-4 h-4 accent-pink"
                              />
                              <span className="text-white">Male</span>
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                 type="radio"
                                 name="gender"
                                 value="f"
                                 checked={accountInfo.gender === "f"}
                                 onChange={(e) => setAccountInfo({ ...accountInfo, gender: e.target.value as "m" | "f" | "o" })}
                                 className="w-4 h-4 accent-pink"
                              />
                              <span className="text-white">Female</span>
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                 type="radio"
                                 name="gender"
                                 value="o"
                                 checked={accountInfo.gender === "o"}
                                 onChange={(e) => setAccountInfo({ ...accountInfo, gender: e.target.value as "m" | "f" | "o" })}
                                 className="w-4 h-4 accent-pink"
                              />
                              <span className="text-white">Other</span>
                           </label>
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                     <button
                        onClick={() => setShowAccountInfoModal(false)}
                        className="flex-1 py-2 border-2 border-white text-white rounded-full hover:bg-white hover:text-black transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleSaveAccountInfo}
                        disabled={accountInfoLoading}
                        className="flex-1 py-2 bg-pink text-white rounded-full hover:bg-pink/80 transition-colors disabled:opacity-50"
                     >
                        {accountInfoLoading ? "Saving..." : "Save"}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Privacy Modal */}
         {showPrivacyModal && (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
               <div className="bg-black border-2 border-pink rounded-3xl p-8 max-w-md w-full">
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">Privacy Settings</h2>

                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="text-white font-medium">Private Account</p>
                           <p className="text-gray text-sm">Only approved followers can see your content</p>
                        </div>
                        <button
                           onClick={() => setPrivacySettings({ ...privacySettings, isPrivate: !privacySettings.isPrivate })}
                           className={`w-14 h-8 rounded-full transition-colors ${privacySettings.isPrivate ? "bg-pink" : "bg-gray-600"
                              }`}
                        >
                           <div
                              className={`w-6 h-6 bg-white rounded-full transition-transform ${privacySettings.isPrivate ? "translate-x-7" : "translate-x-1"
                                 }`}
                           />
                        </button>
                     </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                     <button
                        onClick={() => setShowPrivacyModal(false)}
                        className="flex-1 py-2 border-2 border-white text-white rounded-full hover:bg-white hover:text-black transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleSavePrivacy}
                        disabled={privacyLoading}
                        className="flex-1 py-2 bg-pink text-white rounded-full hover:bg-pink/80 transition-colors disabled:opacity-50"
                     >
                        {privacyLoading ? "Saving..." : "Save"}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

