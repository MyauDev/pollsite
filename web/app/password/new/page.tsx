"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Confirm password reset:
 * - Fields: uid, token, new_password
 * - POST /api/auth/password/reset/confirm
 * - On success show green alert "Пароль изменён"
 */
function PasswordNewInner() {
  const params = useSearchParams();
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Автозаполнение из query (?uid=...&token=...)
  useEffect(() => {
    const qUid = params.get("uid") || "";
    const qTok = params.get("token") || "";
    if (qUid) setUid(qUid);
    if (qTok) setToken(qTok);
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ uid, token, new_password: newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        const detail =
          data?.detail ||
          data?.error ||
          (await res.text().catch(() => "")) ||
          "Не удалось изменить пароль";
        setError(typeof detail === "string" ? detail : "Не удалось изменить пароль");
        return;
      }

      setSuccess(true);
      // по желанию можно перенаправить на /login через пару секунд
      // setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Сеть недоступна. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold">Новый пароль</h1>
      <p className="mt-1 text-sm opacity-80">
        Введите токен из письма и задайте новый пароль.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm opacity-90">UID</span>
          <input
            type="text"
            required
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="uid из письма"
            aria-label="UID"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm opacity-90">Token</span>
          <input
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="токен из письма"
            aria-label="Token"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm opacity-90">Новый пароль</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="••••••••"
            aria-label="Новый пароль"
          />
        </label>

        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Пароль изменён.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-60"
          >
            {submitting ? "Сохраняем..." : "Сменить пароль"}
          </button>
          {success && (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Войти
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

export default function PasswordNewPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">Загрузка…</main>}>
      <PasswordNewInner />
    </Suspense>
  );
}
