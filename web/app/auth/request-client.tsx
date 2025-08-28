// app/auth/request-client.tsx
"use client";
import { useState } from "react";

export default function AuthRequestClient() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSent(false);

    try {
      const res = await fetch("/frontend/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        setErr(msg || "Не удалось отправить письмо");
        return;
      }

      setSent(true);
    } catch {
      setErr("Сеть недоступна или сервер вернул ошибку");
    }
  };

  return (
    <main className="max-w-md mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-4">Вход по e-mail</h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700"
        />
        <button className="btn w-full" type="submit">Отправить ссылку</button>
      </form>
      {sent && <p className="text-green-400 mt-3">Письмо отправлено. Проверь почту/логи API.</p>}
      {err && <p className="text-red-400 mt-3">{err}</p>}
    </main>
  );
}