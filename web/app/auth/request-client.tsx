// app/auth/request-client.tsx
"use client";
import { useState } from "react";
import Link from "next/link";

export default function AuthRequestClient() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSent(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        setErr(msg || "Не удалось отправить письмо");
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setErr("Сеть недоступна или сервер вернул ошибку");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="text-center py-8 px-4 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-transparent to-transparent rounded-3xl blur-3xl"></div>

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 mb-4 transition-colors">
            ← Назад к ленте
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-500 via-green-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Войти
          </h1>
          <p className="text-zinc-300 text-lg mb-2 font-medium">
            Вход по e-mail
          </p>
          <p className="text-zinc-400 text-base max-w-sm mx-auto leading-relaxed">
            Отправим ссылку для входа на вашу почту
          </p>

          {/* Decorative elements */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-md mx-auto px-4 pb-10">
        {!sent ? (
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email адрес
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
              />
            </div>

            <button
              className="btn btn-primary w-full py-4 text-lg font-semibold bg-green-600 hover:bg-green-700"
              type="submit"
              disabled={loading}
            >
              {loading ? "Отправляем..." : "🔑 Отправить ссылку"}
            </button>

            {err && (
              <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
                <p className="text-red-400 text-sm">{err}</p>
              </div>
            )}
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-green-900/20 border border-green-700 rounded-xl p-6">
              <div className="text-green-400 text-4xl mb-3">✉️</div>
              <h2 className="text-xl font-semibold text-green-400 mb-2">
                Письмо отправлено!
              </h2>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Проверьте почту <span className="font-medium text-white">{email}</span>
                <br />
                и перейдите по ссылке для входа
              </p>
            </div>

            <button
              onClick={() => {
                setSent(false);
                setEmail("");
                setErr("");
              }}
              className="btn btn-outline w-full py-3"
            >
              Отправить на другую почту
            </button>
          </div>
        )}
      </div>
    </div>
  );
}