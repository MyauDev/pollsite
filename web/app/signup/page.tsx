"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Signup page:
 * - POST /api/auth/signup with credentials: 'include'
 * - On success redirect to /create
 * - No localStorage usage (server sets cookies)
 */
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const detail =
          (await res.json().catch(() => ({})))?.detail ||
          (await res.text().catch(() => "")) ||
          "Registration failed";
        setError(typeof detail === "string" ? detail : "Registration failed");
        return;
      }

      // Success: go to create and refresh RSC tree to pick up cookies
      router.push("/create");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold">Регистрация</h1>
      <p className="mt-1 text-sm opacity-80">
        Создай аккаунт, чтобы публиковать опросы и голосовать.
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

        <label className="grid gap-1">
          <span className="text-sm opacity-90">Пароль</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="••••••••"
            aria-label="Пароль"
            minLength={6}
          />
        </label>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-60"
        >
          {submitting ? "Регистрируем..." : "Зарегистрироваться"}
        </button>
      </form>

      <div className="mt-4 text-sm opacity-90">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="underline hover:opacity-80">
          Войти
        </Link>
      </div>
    </main>
  );
}
