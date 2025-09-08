"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Topic {
  id: number;
  name: string;
  slug: string;
}

export default function CreatePollPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch topics on component mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch("/api/topics", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setTopics(data.results || data || []);
        }
      } catch (error) {
        console.error("Failed to fetch topics:", error);
      }
    };

    fetchTopics();
  }, []);

  const addOption = () => {
    if (options.length >= 4) return;
    setOptions([...options, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const toggleTopic = (topicId: number) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const clean = options.map(s => s.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) {
      setErr("Вопрос обязателен, нужно 2–4 варианта");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: question.trim(),
        options: clean.map(text => ({ text })),
        topic_ids: selectedTopics,
        results_mode: 'open',
        visibility: 'public'
      };

      // Get JWT token from client-side cookie
      const jwtToken = document.cookie
        .split(';')
        .find(cookie => cookie.trim().startsWith('jwt_fallback='))
        ?.split('=')[1];

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      // Add Authorization header if JWT token is available
      if (jwtToken) {
        headers["Authorization"] = `Bearer ${jwtToken}`;
      }

      const res = await fetch("/api/polls", {
        method: "POST",
        headers,
        cache: "no-store",
        credentials: "include", // Include cookies
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setErr(text || "Не удалось создать опрос");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const id = data?.id || data?.pk || data?.poll_id;
      if (!id) {
        setErr("Сервер не вернул id опроса");
        setLoading(false);
        return;
      }
      router.replace(`/p/${id}`);
    } catch {
      setErr("Сеть недоступна или сервер вернул ошибку");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="text-center py-8 px-4 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent rounded-3xl blur-3xl"></div>

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 mb-4 transition-colors">
            ← Назад к ленте
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-500 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Создать опрос
          </h1>
          <p className="text-zinc-300 text-lg mb-2 font-medium">
            Создай свой опрос
          </p>
          <p className="text-zinc-400 text-base max-w-sm mx-auto leading-relaxed">
            Задай вопрос, добавь варианты ответов и выбери топики
          </p>

          {/* Decorative elements */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 pb-10">
        <form onSubmit={submit} className="space-y-6">
          {/* Question Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Вопрос
            </label>
            <input
              className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
              placeholder="О чём ваш опрос?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Варианты ответов
            </label>
            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                    placeholder={`Вариант ${i + 1}`}
                    value={opt}
                    onChange={e => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    disabled={loading}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="btn btn-outline px-3 py-3 text-red-400 hover:text-red-300"
                      disabled={loading}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {options.length < 4 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="btn btn-outline w-full py-3"
                  disabled={loading}
                >
                  + Добавить вариант
                </button>
              )}
            </div>
          </div>

          {/* Topics Selection */}
          {topics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Топики (необязательно)
              </label>
              <div className="flex flex-wrap gap-2">
                {topics.map(topic => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.id)}
                    className={`topic-chip ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                    disabled={loading}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
              {selectedTopics.length > 0 && (
                <p className="text-sm text-zinc-400 mt-2">
                  Выбрано: {selectedTopics.length} топик{selectedTopics.length > 1 ? 'а' : ''}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            className="btn btn-primary w-full py-4 text-lg font-semibold"
            type="submit"
            disabled={loading}
          >
            {loading ? "Создаём..." : "✨ Создать опрос"}
          </button>

          {/* Error Message */}
          {err && (
            <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
              <p className="text-red-400 text-sm">{err}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}