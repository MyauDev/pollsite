"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get("redirect") || "/";

  const [identifier, setIdentifier] = useState(""); // ← раньше было email
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ identifier, password }), // ← ключ изменился
      });

      if (!res.ok) {
        const detail =
          (await res.json().catch(() => ({})))?.detail ||
          (await res.text().catch(() => "")) ||
          "Login failed";
        setError(typeof detail === "string" ? detail : "Login failed");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold">Вход</h1>
      <p className="mt-1 text-sm opacity-80">Войдите, чтобы голосовать и комментировать.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm opacity-90">Email или логин</span>
          <input
            type="text"
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="you@example.com или your_login"
            aria-label="Email или логин"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm opacity-90">Пароль</span>
          <input
            type="password"
            required
            autoComplete="current-password"
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
          {submitting ? "Входим..." : "Войти"}
        </button>
      </form>

      <div className="mt-4 text-sm opacity-90">
        Нет аккаунта?{" "}
        <Link href="/signup" className="underline hover:opacity-80">
          Зарегистрируйтесь
        </Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">Загрузка…</main>}>
      <LoginInner />
    </Suspense>
  );
}

