"use client";

import { Suspense, useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { fetchWithRefresh } from "@/app/lib/fetchWithRefresh";

type ResultsMode = "open" | "hidden_until_vote" | "hidden_until_close";
type Visibility = "public" | "link";

type NewOption = { text: string };
type Topic = { id: number; name: string; slug: string };

export default function CreatePollPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">Проверяем доступ…</main>}>
      <RequireAuth>
        <CreatePollForm />
      </RequireAuth>
    </Suspense>
  );
}

function CreatePollForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<NewOption[]>([{ text: "" }, { text: "" }]); // 2 минимально
  const [typeMulti, setTypeMulti] = useState(false);
  const [resultsMode, setResultsMode] = useState<ResultsMode>("open");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Topic creation state
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);

  const canAddOption = options.length < 4;
  const canRemoveOption = options.length > 2;

  const titleTooLong = title.length > 240;

  const trimmedOptions = useMemo(
    () => options.map((o) => ({ text: o.text.trim() })),
    [options]
  );

  const hasEmptyOption = trimmedOptions.some((o) => o.text.length === 0);

  const isValid = !titleTooLong && !hasEmptyOption && trimmedOptions.length >= 2;

  const updateOption = useCallback((idx: number, text: string) => {
    setOptions((prev) => {
      const next = prev.slice();
      next[idx] = { text };
      return next;
    });
  }, []);

  const addOption = useCallback(() => {
    if (!canAddOption) return;
    setOptions((prev) => [...prev, { text: "" }]);
  }, [canAddOption]);

  const removeOption = useCallback((idx: number) => {
    if (!canRemoveOption) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }, [canRemoveOption]);

  const toggleTopic = useCallback((topicId: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  }, []);

  // Fetch topics function
  const fetchTopics = useCallback(async () => {
    try {
      const res = await fetchWithRefresh("/api/topics", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setTopics(data.results || data || []);
      }
    } catch (e) {
      console.error("Failed to fetch topics:", e);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  // Create new topic function
  const createTopic = useCallback(async () => {
    if (!newTopicName.trim()) return;

    setCreatingTopic(true);
    try {
      const res = await fetchWithRefresh("/api/topics", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: newTopicName.trim(),
          slug: newTopicName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        }),
      });

      if (res.ok) {
        const newTopic = await res.json();
        setTopics(prev => [...prev, newTopic].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedTopics(prev => [...prev, newTopic.id]);
        setNewTopicName("");
        setShowTopicForm(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.name?.[0] || "Failed to create topic");
      }
    } catch (e: any) {
      alert(`Ошибка создания темы: ${e.message}`);
    } finally {
      setCreatingTopic(false);
    }
  }, [newTopicName]);

  // Fetch topics on component mount
  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      setError("Проверьте поля формы: заголовок ≤ 240, минимум 2 не пустые опции.");
      return;
    }

    setSubmitting(true);
    try {
      // Бэкенду обычно нужны порядковые номера опций
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        type_multi: typeMulti,
        results_mode: resultsMode,
        visibility,
        options: trimmedOptions.map((o, i) => ({ text: o.text, order: i })),
        topic_ids: selectedTopics.length > 0 ? selectedTopics : undefined,
      };

      const res = await fetchWithRefresh("/api/polls", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.detail || data?.error || (await res.text().catch(() => "")) || "Не удалось создать опрос";
        throw new Error(typeof msg === "string" ? msg : "Не удалось создать опрос");
      }

      const created = await res.json();
      const id = created?.id ?? created?.poll?.id;
      if (!id) throw new Error("Сервер не вернул ID опроса.");

      router.push(`/p/${id}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Ошибка сети. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold">Создать опрос</h1>
      <p className="mt-1 text-sm opacity-80">
        Минимум 2 и максимум 4 опции. Заголовок до 240 символов.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm opacity-90">Заголовок</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300} // визуальный лимит чуть больше; валидируем на 240
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="Вопрос к аудитории…"
            aria-label="Заголовок"
            required
          />
          <div className={`text-xs ${titleTooLong ? "text-red-300" : "opacity-60"}`}>
            {title.length}/240
          </div>
        </label>

        <label className="grid gap-1">
          <span className="text-sm opacity-90">Описание (необязательно)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="Детали, ссылки и т.д."
            aria-label="Описание"
          />
        </label>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-90">Темы (необязательно)</span>
            <button
              type="button"
              onClick={() => setShowTopicForm(!showTopicForm)}
              className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs hover:bg-white/15 transition-colors"
            >
              + Добавить тему
            </button>
          </div>

          {showTopicForm && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 grid gap-2">
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Название новой темы"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
                maxLength={80}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createTopic();
                  } else if (e.key === 'Escape') {
                    setShowTopicForm(false);
                    setNewTopicName("");
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={createTopic}
                  disabled={!newTopicName.trim() || creatingTopic}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-3 py-1 text-xs hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creatingTopic ? "Создаём..." : "Создать"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTopicForm(false);
                    setNewTopicName("");
                  }}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs hover:bg-white/15 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {topicsLoading ? (
            <div className="text-xs opacity-60">Загружаем темы...</div>
          ) : topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${selectedTopics.includes(topic.id)
                    ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40"
                    : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/15"
                    }`}
                >
                  {topic.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs opacity-60">Нет доступных тем</div>
          )}
          {selectedTopics.length > 0 && (
            <div className="text-xs opacity-60">
              Выбрано тем: {selectedTopics.length}
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <div className="text-sm opacity-90">Опции</div>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={opt.text}
                onChange={(e) => updateOption(idx, e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
                placeholder={`Вариант ${idx + 1}`}
                aria-label={`Опция ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => removeOption(idx)}
                disabled={!canRemoveOption}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                title="Удалить опцию"
              >
                −
              </button>
            </div>
          ))}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={addOption}
              disabled={!canAddOption}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
            >
              Добавить опцию
            </button>
            <div className="text-xs opacity-60">{options.length}/4</div>
          </div>

          {hasEmptyOption && (
            <div className="text-xs text-red-300">Опции не должны быть пустыми.</div>
          )}
        </div>

        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm opacity-90">Множественный выбор</span>
            <input
              type="checkbox"
              checked={typeMulti}
              onChange={(e) => setTypeMulti(e.target.checked)}
              className="h-5 w-5 accent-emerald-400"
            />
          </label>

          <div className="grid gap-1">
            <span className="text-sm opacity-90">Видимость результатов</span>
            <select
              value={resultsMode}
              onChange={(e) => setResultsMode(e.target.value as ResultsMode)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
              aria-label="Режим результатов"
            >
              <option value="open">Всегда видны</option>
              <option value="hidden_until_vote">Скрыты до голосования</option>
              <option value="hidden_until_close">Скрыты до закрытия</option>
            </select>
          </div>

          <div className="grid gap-1">
            <span className="text-sm opacity-90">Доступ</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
              aria-label="Доступ"
            >
              <option value="public">Публичный</option>
              <option value="link">По ссылке</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-60"
        >
          {submitting ? "Публикуем..." : "Опубликовать"}
        </button>
      </form>
    </main>
  );
}
