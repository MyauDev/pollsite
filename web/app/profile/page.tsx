"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = {
  id: number;
  email: string;
  username?: string;
  profile?: {
    public_nickname?: string | null;
    age?: number | null;
    gender?: string | null;
    avatar?: string | null;
  };
};

export default function AccountOverview() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setMe(await res.json());
      } catch (e: any) {
        setErr(e?.message || "Не удалось загрузить профиль");
      }
    })();
  }, []);

  if (err) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
        Загрузка…
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold">Аккаунт</h1>

      <div className="mt-4 grid gap-2 text-sm">
        <div>
          <span className="opacity-60">Email: </span>
          <span className="font-medium">{me.email}</span>
        </div>
        <div>
          <span className="opacity-60">Логин: </span>
          <span className="font-medium">{me.username ?? "—"}</span>
        </div>
        <div>
          <span className="opacity-60">Публичный ник: </span>
          <span className="font-medium">{me.profile?.public_nickname ?? "—"}</span>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/author/dashboard"
          className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          Мои опросы
        </Link>
      </div>
    </main>
  );
}
