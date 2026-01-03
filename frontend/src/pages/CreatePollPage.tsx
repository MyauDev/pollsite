import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { pollAPI, topicAPI } from "../api/endpoints";
import type { Topic } from "../types";

export default function CreatePollPage() {
   const navigate = useNavigate();
   const { user, loading: authLoading } = useAuth();
   const [loading, setLoading] = useState(false);
   const [topics, setTopics] = useState<Topic[]>([]);

   const [formData, setFormData] = useState({
      title: "",
      description: "",
      options: ["", ""],
      selectedTopics: [] as number[],
      resultsMode: "open" as "open" | "hidden_until_vote" | "hidden_until_close",
   });

   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      // Wait for auth to finish loading before checking
      if (authLoading) return;

      if (!user) {
         navigate("/login");
         return;
      }

      // Fetch available topics
      const fetchTopics = async () => {
         try {
            const response = await topicAPI.list();
            setTopics(response.data);
         } catch (err) {
            console.error("Failed to fetch topics:", err);
         }
      };
      fetchTopics();
   }, [user, authLoading, navigate]);

   // Show loading while auth is being verified
   if (authLoading) {
      return (
         <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-white text-xl">Loading...</div>
         </div>
      );
   }

   const handleAddOption = () => {
      if (formData.options.length < 4) {
         setFormData({ ...formData, options: [...formData.options, ""] });
      }
   };

   const handleRemoveOption = (index: number) => {
      if (formData.options.length > 2) {
         const newOptions = formData.options.filter((_, i) => i !== index);
         setFormData({ ...formData, options: newOptions });
      }
   };

   const handleOptionChange = (index: number, value: string) => {
      const newOptions = [...formData.options];
      newOptions[index] = value;
      setFormData({ ...formData, options: newOptions });
   };

   const handleTopicToggle = (topicId: number) => {
      const isSelected = formData.selectedTopics.includes(topicId);
      if (isSelected) {
         setFormData({
            ...formData,
            selectedTopics: formData.selectedTopics.filter((id) => id !== topicId),
         });
      } else {
         setFormData({
            ...formData,
            selectedTopics: [...formData.selectedTopics, topicId],
         });
      }
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validation
      if (!formData.title.trim()) {
         setError("Title is required");
         return;
      }

      const validOptions = formData.options.filter((opt) => opt.trim());
      if (validOptions.length < 2) {
         setError("At least 2 options are required");
         return;
      }

      setLoading(true);

      try {
         const payload = {
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            options: validOptions.map((text) => ({ text: text.trim() })),
            topic_ids: formData.selectedTopics.length > 0 ? formData.selectedTopics : undefined,
            results_mode: formData.resultsMode,
            visibility: "public",
         };

         const response = await pollAPI.create(payload as any);
         navigate(`/`); // Navigate to home or poll detail
         console.log("Poll created:", response.data);
      } catch (err: any) {
         console.error("Failed to create poll:", err);
         setError(err.response?.data?.detail || "Failed to create poll. Please try again.");
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-black">
         {/* Pink Header Bar */}
         <div className="bg-pink px-4 py-10">
            <div className="max-w-2xl mx-auto">
               <h1 className="text-3xl font-bold text-white text-center">Create a Poll</h1>
            </div>
         </div>

         {/* Main Content */}
         <div className="max-w-2xl mx-auto px-4 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
               {/* Error Message */}
               {error && (
                  <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                     {error}
                  </div>
               )}

               {/* Title */}
               <div>
                  <label className="block text-white text-sm font-medium mb-2">
                     Question / Title *
                  </label>
                  <input
                     type="text"
                     value={formData.title}
                     onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                     placeholder="What would you like to ask?"
                     className="w-full px-4 py-3 bg-black border-2 border-pink rounded-xl text-white placeholder-gray focus:outline-none focus:border-pink-light transition-colors"
                     maxLength={200}
                  />
                  <div className="text-right text-gray text-xs mt-1">
                     {formData.title.length}/200
                  </div>
               </div>

               {/* Description (optional) */}
               <div>
                  <label className="block text-white text-sm font-medium mb-2">
                     Description (optional)
                  </label>
                  <textarea
                     value={formData.description}
                     onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                     placeholder="Add more context to your question..."
                     rows={3}
                     className="w-full px-4 py-3 bg-black border-2 border-pink rounded-xl text-white placeholder-gray focus:outline-none focus:border-pink-light resize-none transition-colors"
                     maxLength={500}
                  />
               </div>

               {/* Options */}
               <div>
                  <label className="block text-white text-sm font-medium mb-2">
                     Options * (2-4 options)
                  </label>
                  <div className="space-y-3">
                     {formData.options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                           <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                              placeholder={`Option ${index + 1}`}
                              className="flex-1 px-4 py-3 bg-black border-2 border-pink rounded-xl text-white placeholder-gray focus:outline-none focus:border-pink-light transition-colors"
                              maxLength={140}
                           />
                           {formData.options.length > 2 && (
                              <button
                                 type="button"
                                 onClick={() => handleRemoveOption(index)}
                                 className="px-3 py-2 text-red-400 hover:text-red-300 transition-colors"
                              >
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                 </svg>
                              </button>
                           )}
                        </div>
                     ))}
                  </div>
                  {formData.options.length < 4 && (
                     <button
                        type="button"
                        onClick={handleAddOption}
                        className="mt-3 flex items-center gap-2 text-pink hover:text-pink-light transition-colors"
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Option
                     </button>
                  )}
               </div>

               {/* Topics */}
               {topics.length > 0 && (
                  <div>
                     <label className="block text-white text-sm font-medium mb-2">
                        Topics (optional)
                     </label>
                     <div className="flex flex-wrap gap-2">
                        {topics.map((topic) => (
                           <button
                              key={topic.id}
                              type="button"
                              onClick={() => handleTopicToggle(topic.id)}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${formData.selectedTopics.includes(topic.id)
                                 ? "bg-pink text-white"
                                 : "bg-transparent border-2 border-gray text-gray hover:border-pink hover:text-pink"
                                 }`}
                           >
                              {topic.name}
                           </button>
                        ))}
                     </div>
                  </div>
               )}

               {/* Results Mode */}
               <div>
                  <label className="block text-white text-sm font-medium mb-2">
                     When to show results
                  </label>
                  <div className="space-y-2">
                     <label className="flex items-center gap-3 cursor-pointer">
                        <input
                           type="radio"
                           name="resultsMode"
                           value="open"
                           checked={formData.resultsMode === "open"}
                           onChange={(e) => setFormData({ ...formData, resultsMode: e.target.value as any })}
                           className="w-4 h-4 accent-pink"
                        />
                        <span className="text-white">Always show results</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer">
                        <input
                           type="radio"
                           name="resultsMode"
                           value="hidden_until_vote"
                           checked={formData.resultsMode === "hidden_until_vote"}
                           onChange={(e) => setFormData({ ...formData, resultsMode: e.target.value as any })}
                           className="w-4 h-4 accent-pink"
                        />
                        <span className="text-white">Show after voting</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer">
                        <input
                           type="radio"
                           name="resultsMode"
                           value="hidden_until_close"
                           checked={formData.resultsMode === "hidden_until_close"}
                           onChange={(e) => setFormData({ ...formData, resultsMode: e.target.value as any })}
                           className="w-4 h-4 accent-pink"
                        />
                        <span className="text-white">Show after poll closes</span>
                     </label>
                  </div>
               </div>

               {/* Submit Button */}
               <div className="pt-4">
                  <button
                     type="submit"
                     disabled={loading}
                     className="w-full py-3 bg-pink text-white rounded-full font-bold text-lg hover:bg-pink/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {loading ? "Creating..." : "Create Poll"}
                  </button>
               </div>

               {/* Cancel Link */}
               <div className="text-center">
                  <button
                     type="button"
                     onClick={() => navigate(-1)}
                     className="text-gray hover:text-white transition-colors"
                  >
                     Cancel
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}
