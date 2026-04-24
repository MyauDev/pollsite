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
    visibility: "public" as "public" | "link",
    typeMulti: false,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
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
      setFormData({ ...formData, options: formData.options.filter((_, i) => i !== index) });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleTopicToggle = (topicId: number) => {
    const isSelected = formData.selectedTopics.includes(topicId);
    setFormData({
      ...formData,
      selectedTopics: isSelected
        ? formData.selectedTopics.filter((id) => id !== topicId)
        : [...formData.selectedTopics, topicId],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        visibility: formData.visibility,
        type_multi: formData.typeMulti,
      };
      await pollAPI.create(payload as any);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create poll. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectClass =
    "w-full px-4 py-2 bg-black border-2 border-pink rounded-xl text-white focus:outline-none focus:border-pink-light transition-colors appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-2/5 items-center justify-center relative overflow-hidden">
        {/* Pink rounded rectangle decoration */}
        <div className="absolute left-0 top-1/4 w-40 h-72 bg-pink rounded-r-[3rem]" />
        <div className="relative z-10 pl-16">
          <h1 className="text-6xl font-black text-white uppercase leading-tight tracking-tight">
            CREATE<br />A POLL
          </h1>

          {/* Settings preview card */}
          <div className="mt-8 bg-black/80 border border-gray rounded-2xl p-5 max-w-xs">
            {/* Allow multiple selections */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-white text-sm">Allow multiple selections</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, typeMulti: !formData.typeMulti })}
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.typeMulti ? "bg-pink" : "bg-gray"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${formData.typeMulti ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Results visibility */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-gray text-xs mb-1">Results visibility</p>
                <select
                  value={formData.resultsMode}
                  onChange={(e) => setFormData({ ...formData, resultsMode: e.target.value as any })}
                  className="w-full px-3 py-1.5 bg-black border border-pink rounded-full text-white text-xs focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="open">Always Visible</option>
                  <option value="hidden_until_vote">After Voting</option>
                  <option value="hidden_until_close">After Close</option>
                </select>
              </div>
              <div className="flex-1">
                <p className="text-gray text-xs mb-1">Access</p>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                  className="w-full px-3 py-1.5 bg-black border border-pink rounded-full text-white text-xs focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="public">Public</option>
                  <option value="link">By Link</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-10">
        <form onSubmit={handleSubmit} className="max-w-lg">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ask your question..."
              className="w-full px-4 py-3 bg-black border-2 border-pink rounded-xl text-white placeholder-gray focus:outline-none transition-colors"
              maxLength={240}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-2">
              Description <span className="text-gray">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details, links, or extra info..."
              rows={4}
              className="w-full px-4 py-3 bg-black border-2 border-pink rounded-xl text-white placeholder-gray focus:outline-none resize-none transition-colors"
              maxLength={240}
            />
            <div className="text-right text-gray text-xs mt-1">
              {formData.description.length}/240
            </div>
          </div>

          {/* Options */}
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-3">Options</label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-4 py-3 bg-black border-2 border-pink rounded-xl text-white placeholder-gray focus:outline-none transition-colors"
                    maxLength={140}
                  />
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="w-8 h-8 rounded-full bg-pink text-white flex items-center justify-center hover:bg-pink/80 transition-colors text-base leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              {formData.options.length < 4 ? (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-5 py-1.5 rounded-full border-2 border-pink text-pink text-sm font-medium hover:bg-pink-light transition-colors"
                >
                  Add Option
                </button>
              ) : (
                <span />
              )}
              <span className="text-gray text-xs">{formData.options.length}/4</span>
            </div>
          </div>

          {/* Mobile-only settings (visible on small screens where left panel is hidden) */}
          <div className="lg:hidden mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">Allow multiple selections</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, typeMulti: !formData.typeMulti })}
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.typeMulti ? "bg-pink" : "bg-gray"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${formData.typeMulti ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className="block text-white text-sm mb-1">Results visibility</label>
              <select
                value={formData.resultsMode}
                onChange={(e) => setFormData({ ...formData, resultsMode: e.target.value as any })}
                className={selectClass}
              >
                <option value="open">Always Visible</option>
                <option value="hidden_until_vote">After Voting</option>
                <option value="hidden_until_close">After Poll Closes</option>
              </select>
            </div>
            <div>
              <label className="block text-white text-sm mb-1">Access</label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                className={selectClass}
              >
                <option value="public">Public</option>
                <option value="link">By Link</option>
              </select>
            </div>
          </div>

          {/* Topics */}
          {topics.length > 0 && (
            <div className="mb-6">
              <label className="block text-white text-sm font-medium mb-2">
                Topics <span className="text-gray">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleTopicToggle(topic.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.selectedTopics.includes(topic.id)
                        ? "bg-pink text-white"
                        : "border-2 border-gray text-gray hover:border-pink hover:text-pink"
                    }`}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-2.5 bg-pink text-white rounded-full font-bold uppercase text-sm hover:bg-pink/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Publishing..." : "PUBLISH"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
