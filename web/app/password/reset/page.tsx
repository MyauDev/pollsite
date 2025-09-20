// web/app/password/reset/page.tsx
"use client";

import { useState } from "react";

/**
 * Request password reset:
 * - POST /api/auth/password/reset/request
 * - Always show green info after submit: "Если такой e-mail есть — отправили инструкцию"
 */
export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await fetch("/api/auth/password/reset/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});
      // Независимо от ответа показываем зелёный алерт
      setDone(true);
    } catch {
      // Даже при ошибке показываем зеленый алерт согласно ТЗ
      setDone(true);
      setError("Не удалось отправить запрос. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold">Восстановление пароля</h1>
      <p className="mt-1 text-sm opacity-80">
        Укажите e-mail — мы отправим ссылку для смены пароля.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm opacity-90">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="you@example.com"
            aria-label="Email"
          />
        </label>

        {done && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Если такой e-mail есть — отправили инструкцию.
          </div>
        )}

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
          {submitting ? "Отправляем..." : "Отправить"}
        </button>
      </form>
    </main>
  );
}
