"use client";

import { Suspense, useState } from "react";
import RequireAuth from "@/components/RequireAuth";

/**
 * Change password (authenticated):
 * - POST /api/auth/password/change with { old_password, new_password }
 * - Show green "OK" on success
 */
function PasswordChangeInner() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setOk(false);
    setError(null);

    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        const detail =
          data?.detail ||
          data?.error ||
          (await res.text().catch(() => "")) ||
          "Не удалось сменить пароль";
        setError(typeof detail === "string" ? detail : "Не удалось сменить пароль");
        return;
      }

      setOk(true);
      setOldPassword("");
      setNewPassword("");
    } catch {
      setError("Сеть недоступна. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
        <h1 className="text-xl font-semibold">Смена пароля</h1>
        <p className="mt-1 text-sm opacity-80">
          Введите текущий и новый пароль.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm opacity-90">Текущий пароль</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
              placeholder="••••••••"
              aria-label="Текущий пароль"
              minLength={6}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm opacity-90">Новый пароль</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
              placeholder="••••••••"
              aria-label="Новый пароль"
              minLength={6}
            />
          </label>

          {ok && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              OK
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
            {submitting ? "Сохраняем..." : "Сменить пароль"}
          </button>
        </form>
      </main>
    </RequireAuth>
  );
}

export default function PasswordChangePage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">Проверяем доступ…</main>}>
      <PasswordChangeInner />
    </Suspense>
  );
}
