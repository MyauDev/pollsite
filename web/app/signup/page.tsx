"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrCreateDeviceId } from "@/app/lib/device";

export default function SignUpPage() {
   const router = useRouter();
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [err, setErr] = useState("");
   const [loading, setLoading] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErr("");
      setLoading(true);

      // Validation
      if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
         setErr("Все поля обязательны");
         setLoading(false);
         return;
      }

      if (password !== confirmPassword) {
         setErr("Пароли не совпадают");
         setLoading(false);
         return;
      }

      if (password.length < 6) {
         setErr("Пароль должен содержать минимум 6 символов");
         setLoading(false);
         return;
      }

      try {
         const deviceId = getOrCreateDeviceId();
         const res = await fetch("/api/auth/register", {
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
            if (data.email) {
               setErr(data.email[0] || "Ошибка с email");
            } else if (data.password) {
               setErr(data.password[0] || "Ошибка с паролем");
            } else {
               setErr(data.detail || data.message || "Не удалось создать аккаунт");
            }
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
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent rounded-3xl blur-3xl"></div>

            <div className="relative z-10">
               <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 mb-4 transition-colors">
                  ← Назад к ленте
               </Link>
               <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-500 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                  Регистрация
               </h1>
               <p className="text-zinc-300 text-lg mb-2 font-medium">
                  Создать новый аккаунт
               </p>
               <p className="text-zinc-400 text-base max-w-sm mx-auto leading-relaxed">
                  Введите email и пароль для создания аккаунта
               </p>

               {/* Decorative elements */}
               <div className="flex justify-center space-x-2 mt-6">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></div>
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
                     className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
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
                     className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                  />
                  <p className="text-zinc-500 text-xs mt-1">Минимум 6 символов</p>
               </div>

               {/* Confirm Password Input */}
               <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                     Подтвердите пароль
                  </label>
                  <input
                     type="password"
                     value={confirmPassword}
                     onChange={(e) => setConfirmPassword(e.target.value)}
                     placeholder="••••••••"
                     required
                     disabled={loading}
                     className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                  />
               </div>

               {/* Submit Button */}
               <button
                  className="btn btn-primary w-full py-4 text-lg font-semibold bg-purple-600 hover:bg-purple-700"
                  type="submit"
                  disabled={loading}
               >
                  {loading ? "Создаём аккаунт..." : "✨ Создать аккаунт"}
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
                        Уже есть аккаунт?
                     </p>
                     <Link href="/signin" className="btn btn-outline w-full py-3">
                        Войти
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
