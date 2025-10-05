"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
// If your alias differs, adjust the import path accordingly.
import { fetchWithRefresh } from "@/app/lib/fetchWithRefresh";

/**
 * Minimal shape for the session payload returned by /api/auth/session.
 * Adjust as needed to match your backend.
 */
type SessionResponse =
  | { authenticated: true; user: { id: number | string; email?: string; name?: string } }
  | { authenticated: false }
  | null;

/**
 * Header navigation with auth-aware links.
 * - Always show: "Лента", "Создать"
 * - If authenticated: "Выйти", "Кабинет"
 * - Else: "Войти", "Регистрация"
 * All requests use credentials: 'include'.
 */
export default function Header() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse>(null);
  const isAuthed = !!(session && "authenticated" in session && session.authenticated);

  const loadSession = useCallback(async () => {
    try {
      // Use provided helper; ensure credentials are included.
      const res = await fetchWithRefresh("/api/auth/session", {
        method: "GET",
        credentials: "include",
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) {
        setSession({ authenticated: false });
        return;
      }
      const data = (await res.json()) as SessionResponse;
      if (data && "authenticated" in data) {
        setSession(data);
      } else {
        // Fallback if API returns user object directly
        setSession(
          (data as any)?.user
            ? { authenticated: true, user: (data as any).user }
            : { authenticated: false }
        );
      }
    } catch {
      setSession({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    // Load session on mount.
    void loadSession();
  }, [loadSession]);

  const handleLogout = useCallback(async () => {
    try {
      const res = await fetchWithRefresh("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Accept": "application/json" },
      });
      // Regardless of status, refresh UI state.
      if (!res.ok) {
        // Optionally handle error toast here.
      }
    } catch {
      // Optionally handle error toast here.
    } finally {
      await loadSession();
      router.refresh();
    }
  }, [router, loadSession]);

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="sticky top-0 z-40 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60"
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-4 py-3">
        <Link
          href="/"
          className="select-none text-lg font-semibold tracking-tight hover:opacity-90"
        >
          PollSite
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-xl px-3 py-2 hover:bg-white/5 transition"
          >
            Лента
          </Link>

          <Link
            href="/create"
            className="rounded-xl px-3 py-2 hover:bg-white/5 transition"
          >
            Создать
          </Link>

          {isAuthed ? (
            <>
              <Link
                href="/profile"
                className="rounded-xl px-3 py-2 hover:bg-white/5 transition"
              >
                Профиль
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl px-3 py-2 hover:bg-white/5 transition"
                aria-label="Выйти"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 hover:bg-white/5 transition"
              >
                Войти
              </Link>
              <Link
                href="/signup"
                className="rounded-xl px-3 py-2 hover:bg-white/5 transition"
              >
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </motion.header>
  );
}