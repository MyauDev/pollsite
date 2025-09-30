"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrCreateDeviceId } from "@/app/lib/device";

export default function SignInPage() {
   const router = useRouter();
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [err, setErr] = useState("");
   const [loading, setLoading] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErr("");
      setLoading(true);

      if (!email.trim() || !password.trim()) {
         setErr("Email и пароль обязательны");
         setLoading(false);
         return;
      }

      try {
         const deviceId = getOrCreateDeviceId();
         const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               "X-Device-Id": deviceId
            },
            cache: "no-store",
            credentials: "include",
            body: JSON.stringify({
               email: email.trim(),
               password: password
            }),
         });

         if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setErr(data.detail || data.message || "Не удалось войти");
            setLoading(false);
            return;
         }

         const data = await res.json();

         // Save JWT token as fallback (server should have already set HttpOnly cookie)
         if (data?.access) {
            // Set a non-HttpOnly version as fallback for client-side access
            document.cookie = `jwt_fallback=${data.access}; Path=/; SameSite=Lax; Max-Age=43200`;
         }

         // Notify header about auth state change
         window.dispatchEvent(new CustomEvent('authStateChanged'));

         // Redirect to main page
         router.replace("/");
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
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent rounded-3xl blur-3xl"></div>

            <div className="relative z-10">
               <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 mb-4 transition-colors">
                  ← Назад к ленте
               </Link>
               <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 via-blue-400 to-green-400 bg-clip-text text-transparent mb-4">
                  Войти
               </h1>
               <p className="text-zinc-300 text-lg mb-2 font-medium">
                  Войти в аккаунт
               </p>
               <p className="text-zinc-400 text-base max-w-sm mx-auto leading-relaxed">
                  Введите email и пароль для входа
               </p>

               {/* Decorative elements */}
               <div className="flex justify-center space-x-2 mt-6">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-150"></div>
               </div>
            </div>
         </div>

         {/* Form */}
         <div className="max-w-md mx-auto px-4 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
               {/* Email Input */}
               <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                     Email
                  </label>
                  <input
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="you@example.com"
                     required
                     disabled={loading}
                     className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
               </div>

               {/* Password Input */}
               <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                     Пароль
                  </label>
                  <input
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••"
                     required
                     disabled={loading}
                     className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
               </div>

               {/* Submit Button */}
               <button
                  className="btn btn-primary w-full py-4 text-lg font-semibold"
                  type="submit"
                  disabled={loading}
               >
                  {loading ? "Входим..." : "🔑 Войти"}
               </button>

               {/* Error Message */}
               {err && (
                  <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
                     <p className="text-red-400 text-sm">{err}</p>
                  </div>
               )}

               {/* Alternative options */}
               <div className="space-y-3 pt-4 border-t border-zinc-700">
                  <div className="text-center">
                     <p className="text-zinc-400 text-sm mb-3">
                        Нет аккаунта?
                     </p>
                     <Link href="/signup" className="btn btn-outline w-full py-3">
                        Создать аккаунт
                     </Link>
                  </div>

                  <div className="text-center">
                     <p className="text-zinc-400 text-sm mb-3">
                        Или
                     </p>
                     <Link href="/auth" className="btn btn-secondary w-full py-3">
                        ✉️ Войти по email-ссылке
                     </Link>
                  </div>
               </div>
            </form>
         </div>
      </div>
   );
}
