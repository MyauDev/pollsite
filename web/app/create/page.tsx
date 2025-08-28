"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePollPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [err, setErr] = useState("");

  const addOption = () => {
    if (options.length >= 4) return;
    setOptions([...options, ""]);
  };
  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const clean = options.map(s => s.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) {
      setErr("Вопрос обязателен, нужно 2–4 варианта");
      return;
    }

    try {
      const res = await fetch("/frontend/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ question: question.trim(), options: clean }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setErr(text || "Не удалось создать опрос");
        return;
      }
      const data = await res.json();
      const id = data?.id || data?.pk || data?.poll_id;
      if (!id) {
        setErr("Сервер не вернул id опроса");
        return;
      }
      router.replace(`/p/${id}`);
    } catch {
      setErr("Сеть недоступна или сервер вернул ошибку");
    }
  };

  return (
    <main className="max-w-lg mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-5">Создать опрос</h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700"
          placeholder="Вопрос"
          value={question}
          onChange={e => setQuestion(e.target.value)}
        />
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700"
                placeholder={`Вариант ${i + 1}`}
                value={opt}
                onChange={e => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="px-3 rounded-xl border border-zinc-700">
                  −
                </button>
              )}
            </div>
          ))}
          {options.length < 4 && (
            <button type="button" onClick={addOption} className="mt-1 px-4 py-2 rounded-xl border border-zinc-700">
              + Добавить вариант
            </button>
          )}
        </div>
        <button className="btn w-full" type="submit">Создать</button>
        {err && <p className="text-red-400">{err}</p>}
      </form>
    </main>
  );
}