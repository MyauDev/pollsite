"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
   id: number;
   email: string;
}

export default function AccountPage() {
   const router = useRouter();
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      checkAuth();
   }, []);

   const checkAuth = async () => {
      try {
         // Get JWT token from client-side cookie
         const jwtToken = document.cookie
            .split(';')
            .find(cookie => cookie.trim().startsWith('jwt_fallback='))
            ?.split('=')[1];

         if (!jwtToken) {
            router.push("/signin");
            return;
         }

         const res = await fetch("/api/auth/me", {
            headers: {
               "Authorization": `Bearer ${jwtToken}`
            },
            credentials: "include"
         });

         if (res.ok) {
            const data = await res.json();
            setUser(data);
         } else {
            router.push("/signin");
         }
      } catch (error) {
         console.error("Auth check failed:", error);
         router.push("/signin");
      } finally {
         setLoading(false);
      }
   };

   const handleLogout = async () => {
      try {
         await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
         });

         // Clear client-side JWT cookie
         document.cookie = "jwt_fallback=; Path=/; SameSite=Lax; Max-Age=0";

         // Notify header about auth state change
         window.dispatchEvent(new CustomEvent('authStateChanged'));

         router.push("/");
      } catch (error) {
         console.error("Logout failed:", error);
         // Even if logout fails, clear local state
         document.cookie = "jwt_fallback=; Path=/; SameSite=Lax; Max-Age=0";
         window.dispatchEvent(new CustomEvent('authStateChanged'));
         router.push("/");
      }
   };

   if (loading) {
      return (
         <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <div className="animate-pulse text-zinc-400">Загрузка...</div>
         </div>
      );
   }

   if (!user) {
      return null; // Will redirect to signin
   }

   return (
      <div className="min-h-screen bg-black text-white">
         {/* Header */}
         <div className="text-center py-8 px-4 relative">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent rounded-3xl blur-3xl"></div>

            <div className="relative z-10">
               <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 via-blue-400 to-green-400 bg-clip-text text-transparent mb-4">
                  Профиль
               </h1>
               <p className="text-zinc-300 text-lg mb-2 font-medium">
                  Информация об аккаунте
               </p>

               {/* Decorative elements */}
               <div className="flex justify-center space-x-2 mt-6">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-150"></div>
               </div>
            </div>
         </div>

         {/* Account Info */}
         <div className="max-w-2xl mx-auto px-4 pb-10">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-6">
               {/* User Avatar and Info */}
               <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-400 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                     {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                     <h2 className="text-xl font-semibold text-white">{user.email}</h2>
                     <p className="text-zinc-400">ID: {user.id}</p>
                  </div>
               </div>

               {/* Account Details */}
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-zinc-300 mb-1">
                        Email
                     </label>
                     <div className="w-full rounded-xl px-4 py-3 bg-zinc-800 border border-zinc-700 text-white">
                        {user.email}
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-zinc-300 mb-1">
                        Статус аккаунта
                     </label>
                     <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-400 text-sm">Активен</span>
                     </div>
                  </div>
               </div>

               {/* Actions */}
               <div className="space-y-3 pt-6 border-t border-zinc-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     <Link
                        href="/create"
                        className="btn btn-primary text-center py-3"
                     >
                        ➕ Создать опрос
                     </Link>
                     <Link
                        href="/"
                        className="btn btn-secondary text-center py-3"
                     >
                        🏠 К ленте
                     </Link>
                  </div>

                  <button
                     onClick={handleLogout}
                     className="w-full py-3 px-4 bg-red-900/20 border border-red-700 text-red-400 rounded-xl hover:bg-red-900/30 transition-colors"
                  >
                     🚪 Выйти из аккаунта
                  </button>
               </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center">
               <p className="text-zinc-500 text-sm">
                  Зарегистрирован в системе PollSite
               </p>
            </div>
         </div>
      </div>
   );
}
