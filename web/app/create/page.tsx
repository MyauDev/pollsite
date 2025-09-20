"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { fetchWithRefresh } from "@/app/lib/fetchWithRefresh";

type ResultsMode = "open" | "hidden_until_vote" | "hidden_until_close";
type Visibility = "public" | "link";

type NewOption = { text: string };

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
