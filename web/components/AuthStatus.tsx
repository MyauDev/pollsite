"use client";
import { useAuth } from '@/app/lib/useAuth';
import { logout } from '@/app/lib/auth-utils';
import Link from 'next/link';

export default function AuthStatus() {
   const { isAuthenticated, user, loading } = useAuth();

   if (loading) {
      return (
         <div className="text-zinc-400 text-sm">
            Загрузка...
         </div>
      );
   }

   if (isAuthenticated && user) {
      return (
         <div className="flex items-center gap-3">
            <span className="text-zinc-300 text-sm">
               👋 {user.email}
            </span>
            <button
               onClick={logout}
               className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
            >
               Выйти
            </button>
         </div>
      );
   }

   return (
      <div className="flex items-center gap-2">
         <Link
            href="/signin"
            className="text-zinc-300 hover:text-zinc-100 text-sm transition-colors"
         >
            Войти
         </Link>
         <span className="text-zinc-600">•</span>
         <Link
            href="/signup"
            className="text-zinc-300 hover:text-zinc-100 text-sm transition-colors"
         >
            Регистрация
         </Link>
      </div>
   );
}
