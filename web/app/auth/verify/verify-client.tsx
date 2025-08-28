// app/auth/verify/verify-client.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Result = { ok: boolean; message: string };

export default function VerifyClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const token = sp.get("token") ?? "";
  const code  = sp.get("code")  ?? "";
  const [res, setRes] = useState<Result | null>(null);

  useEffect(() => {
    let aborted = false;

    (async () => {
      if (!token || !code) {
        setRes({ ok: false, message: "Не хватает token или code" });
        return;
      }

      try {
        const r = await fetch("/frontend/auth/magic/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, code }),
          cache: "no-store",
          credentials: "include", // примем Set-Cookie от нашего же origin
        });

        if (aborted) return;

        if (!r.ok) {
          const text = await r.text().catch(() => "");
          setRes({ ok: false, message: text || "Не удалось подтвердить" });
          return;
        }

        // если API вернёт JWT в JSON — сохраним как fallback (не HttpOnly)
        try {
          const data = await r.json();
          if (data?.access) {
            document.cookie = `jwt=${data.access}; Path=/; SameSite=Lax`;
          }
          setRes({ ok: true, message: data?.message ?? "Почта подтверждена" });
        } catch {
          setRes({ ok: true, message: "Почта подтверждена" });
        }

        setTimeout(() => router.replace("/create"), 400);
      } catch {
        if (!aborted) setRes({ ok: false, message: "Сеть недоступна или сервер вернул ошибку" });
      }
    })();

    return () => { aborted = true; };
  }, [token, code, router]);

  return (
    <main className="max-w-md mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-4">Подтверждение e-mail</h1>

      {res ? (
        res.ok ? (
          <div className="rounded-xl border border-zinc-700 p-4">
            <p className="text-green-400">{res.message}</p>
            <p className="mt-2 text-zinc-300">Сейчас перенаправим на создание опроса…</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-700 p-4">
            <p className="text-red-400">Ошибка: {res.message}</p>
            <a href="/auth" className="inline-block mt-4 rounded-xl px-4 py-2 border border-zinc-700">
              Запросить письмо снова
            </a>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-zinc-700 p-4">Проверяем токен и код…</div>
      )}
    </main>
  );
}