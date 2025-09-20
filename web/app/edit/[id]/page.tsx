"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { fetchWithRefresh } from "@/app/lib/fetchWithRefresh";
import type { Poll } from "@/app/lib/types";

type ResultsMode = "open" | "hidden_until_vote" | "hidden_until_close";
type Visibility = "public" | "link";

type EditOption = { id?: number; text: string; order: number };

export default function EditPollPage() {
  return (
    <RequireAuth>
      <EditPollForm />
    </RequireAuth>
  );
}

function EditPollForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const pollId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<EditOption[]>([]);
  const [typeMulti, setTypeMulti] = useState(false);
  const [resultsMode, setResultsMode] = useState<ResultsMode>("open");
  const [visibility, setVisibility] = useState<Visibility>("public");

  const titleTooLong = title.length > 240;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithRefresh(`/api/polls/${pollId}`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Не удалось загрузить опрос (${res.status})`);
        const data = (await res.json()) as Poll;

        if (cancelled) return;

        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setTypeMulti(Boolean(data.type_multi));
        setResultsMode((data.results_mode as ResultsMode) ?? "open");
        setVisibility((data.visibility as Visibility) ?? "public");

        const opts =
          (data.options ?? []).map((o) => ({
            id: o.id,
            text: o.text ?? "",
            order: o.order ?? 0,
          })) || [];
        // гарантируем минимум 2 строки для удобства
        const normalized =
          opts.length >= 2
            ? opts.sort((a, b) => a.order - b.order)
            : [...opts, ...Array.from({ length: 2 - opts.length }, (_, i) => ({ text: "", order: opts.length + i }))];
        setOptions(normalized);
      } catch (e: any) {
        setError(e?.message || "Ошибка сети. Попробуйте позже.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (Number.isFinite(pollId)) {
      void load();
    } else {
      setError("Неверный ID опроса.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [pollId]);

  const canAddOption = options.length < 4;
  const canRemoveOption = options.length > 2;

  const hasEmptyOption = useMemo(
    () => options.some((o) => (o.text ?? "").trim().length === 0),
    [options]
  );

  const isValid = !titleTooLong && !hasEmptyOption && options.length >= 2;

  const updateOptionText = useCallback((idx: number, text: string) => {
    setOptions((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], text };
      return next;
    });
  }, []);

  const addOption = useCallback(() => {
    if (!canAddOption) return;
    setOptions((prev) => {
      const order = prev.length ? Math.max(...prev.map((o) => o.order ?? 0)) + 1 : 0;
      return [...prev, { text: "", order }];
    });
  }, [canAddOption]);

  const removeOption = useCallback(
    (idx: number) => {
      if (!canRemoveOption) return;
      setOptions((prev) => prev.filter((_, i) => i !== idx).map((o, i) => ({ ...o, order: i })));
    },
    [canRemoveOption]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      setError("Проверьте поля формы: заголовок ≤ 240, минимум 2 не пустые опции.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        type_multi: typeMulti,
        results_mode: resultsMode,
        visibility,
        options: options.map((o, i) => ({
          id: o.id, // если API поддерживает сохранение/изменение по id
          text: (o.text ?? "").trim(),
          order: i,
        })),
      };

      const res = await fetchWithRefresh(`/api/polls/${pollId}/update`, {
        method: "PUT",
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
          data?.detail ||
          data?.error ||
          (await res.text().catch(() => "")) ||
          "Не удалось сохранить изменения";
        throw new Error(typeof msg === "string" ? msg : "Не удалось сохранить изменения");
      }

      router.push(`/p/${pollId}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Ошибка сети. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold">Редактировать опрос</h1>
      <p className="mt-1 text-sm opacity-80">Измените текст и параметры опроса.</p>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Загружаем…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm opacity-90">Заголовок</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
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
              <div key={`${opt.id ?? "new"}-${idx}`} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => updateOptionText(idx, e.target.value)}
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
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-60"
          >
            {submitting ? "Сохраняем..." : "Сохранить"}
          </button>
        </form>
      )}
    </main>
  );
}