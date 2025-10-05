"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AvailResp = {
  ok: boolean;
  available: boolean;
  normalized?: string;
  reason?: string;       // "empty" | "invalid_format" | "invalid_email"
  suggestions?: string[]; // если когда-нибудь добавишь
};

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export default function SignupPage() {
  const router = useRouter();

  // form state
  const [username, setUsername] = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");

  // submit state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);

  // live availability state
  const [uLoading, setULoading] = useState(false);
  const [uAvail, setUAvail]     = useState<AvailResp | null>(null);

  const [eLoading, setELoading] = useState(false);
  const [eAvail, setEAvail]     = useState<AvailResp | null>(null);

  // debouncers
  const uTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- helpers ----------
  function resetUsernameCheck() {
    setUAvail(null);
    setULoading(false);
    if (uTimer.current) clearTimeout(uTimer.current);
  }
  function resetEmailCheck() {
    setEAvail(null);
    setELoading(false);
    if (eTimer.current) clearTimeout(eTimer.current);
  }

  async function checkUsername(u: string) {
    setULoading(true);
    try {
      const url = `/api/auth/check-username?u=${encodeURIComponent(u)}`;
      const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as AvailResp;
      setUAvail(json);
    } catch {
      setUAvail({ ok: false, available: false });
    } finally {
      setULoading(false);
    }
  }

  async function checkEmail(e: string) {
    setELoading(true);
    try {
      const url = `/api/auth/check-email?e=${encodeURIComponent(e)}`;
      const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as AvailResp;
      setEAvail(json);
    } catch {
      setEAvail({ ok: false, available: false });
    } finally {
      setELoading(false);
    }
  }

  // ---------- effects (debounced live check) ----------
  useEffect(() => {
    // локальная моментальная валидация, до запроса на сервер
    if (!username) {
      resetUsernameCheck();
      return;
    }
    if (!USERNAME_RE.test(username)) {
      // не спамим сервер, сразу показываем invalid_format
      setUAvail({ ok: true, available: false, reason: "invalid_format" });
      setULoading(false);
      if (uTimer.current) clearTimeout(uTimer.current);
      return;
    }
    // debounced запрос на сервер
    if (uTimer.current) clearTimeout(uTimer.current);
    uTimer.current = setTimeout(() => {
      void checkUsername(username);
    }, 350);
    return () => {
      if (uTimer.current) clearTimeout(uTimer.current);
    };
  }, [username]);

  useEffect(() => {
    if (!email) {
      resetEmailCheck();
      return;
    }
    // очень простая проверка email, основная — на бэке
    const looksEmail = email.includes("@") && email.includes(".");
    if (!looksEmail) {
      setEAvail({ ok: true, available: false, reason: "invalid_email" });
      setELoading(false);
      if (eTimer.current) clearTimeout(eTimer.current);
      return;
    }
    if (eTimer.current) clearTimeout(eTimer.current);
    eTimer.current = setTimeout(() => {
      void checkEmail(email);
    }, 350);
    return () => {
      if (eTimer.current) clearTimeout(eTimer.current);
    };
  }, [email]);

  // ---------- derived ----------
  const usernameOk = useMemo(() => {
    if (!username) return false;
    if (!USERNAME_RE.test(username)) return false;
    if (!uAvail) return false;
    return !!uAvail.available;
  }, [username, uAvail]);

  const emailOk = useMemo(() => {
    if (!email) return false;
    if (!eAvail) return false;
    return !!eAvail.available;
  }, [email, eAvail]);

  const canSubmit = usernameOk && emailOk && password.length >= 8 && !submitting;

  // ---------- submit ----------
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const firstError =
          json?.detail ||
          Object.values(json)[0] ||
          (await res.text().catch(() => "")) ||
          "Registration failed";
        setFormError(typeof firstError === "string" ? firstError : "Registration failed");
        return;
      }

      // Успех: в дашборд создания
      router.push("/create");
      router.refresh();
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // (опционально) URL для Google SSO — если проксируешь API из Next:
  // настроить на стороне nginx/caddy так, чтобы это вёл на dj-allauth endpoint.
  const GOOGLE_URL = "/api/auth/google/login"; // поменяй при необходимости

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold">Регистрация</h1>
      <p className="mt-1 text-sm opacity-80">Создай аккаунт, чтобы публиковать опросы и голосовать.</p>

      {/* --- Google SSO (опционально) --- */}
      <div className="mt-4">
        <a
          href={GOOGLE_URL}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path d="M21.35 11.1H12v2.8h5.3c-.23 1.4-1.6 4.1-5.3 4.1-3.18 0-5.77-2.63-5.77-5.9s2.6-5.9 5.77-5.9c1.81 0 3.02.76 3.72 1.41l2.54-2.46C16.91 3.06 14.7 2 12 2 6.96 2 2.89 6.03 2.89 11.1S6.96 20.2 12 20.2c6.89 0 8.11-5.85 7.74-9.1z" /></svg>
          Войти через Google
        </a>
      </div>

      <div className="my-4 flex items-center gap-3 text-xs opacity-60">
        <div className="h-px flex-1 bg-white/10" />
        <span>или</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4">
        {/* username */}
        <label className="grid gap-1">
          <span className="text-sm opacity-90">Логин</span>
          <input
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="your_login"
            aria-label="Логин"
            pattern="^[a-zA-Z0-9_.-]{3,32}$"
            title="3–32 символа: латиница, цифры, точка, дефис, подчёркивание"
          />
          {/* status */}
          <div className="h-5 text-xs">
            {uLoading && <span className="opacity-60">Проверяем…</span>}
            {!uLoading && uAvail?.reason === "invalid_format" && (
              <span className="text-red-300">Неверный формат логина</span>
            )}
            {!uLoading && uAvail && uAvail.ok && uAvail.reason !== "invalid_format" && (
              uAvail.available
                ? <span className="text-emerald-300">Свободно</span>
                : <span className="text-red-300">Занято</span>
            )}
          </div>
        </label>

        {/* email */}
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
          <div className="h-5 text-xs">
            {eLoading && <span className="opacity-60">Проверяем…</span>}
            {!eLoading && eAvail?.reason === "invalid_email" && (
              <span className="text-red-300">Некорректный email</span>
            )}
            {!eLoading && eAvail && eAvail.ok && eAvail.reason !== "invalid_email" && (
              eAvail.available
                ? <span className="text-emerald-300">Свободно</span>
                : <span className="text-red-300">Этот email уже зарегистрирован</span>
            )}
          </div>
        </label>

        {/* password */}
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
            minLength={8}
          />
          <div className="h-5 text-xs opacity-60">
            Минимум 8 символов. Используйте буквы и цифры.
          </div>
        </label>

        {formError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
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
