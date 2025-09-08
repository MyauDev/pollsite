"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
   id: number;
   email: string;
}

export default function Header() {
   const router = useRouter();
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const [showDropdown, setShowDropdown] = useState(false);

   // Check authentication status
   useEffect(() => {
      checkAuth();

      // Listen for auth state changes (e.g., login/logout)
      const handleAuthChange = () => {
         checkAuth();
      };

      // Listen for storage events (when cookies change in other tabs)
      window.addEventListener('storage', handleAuthChange);

      // Listen for custom auth events
      window.addEventListener('authStateChanged', handleAuthChange);

      return () => {
         window.removeEventListener('storage', handleAuthChange);
         window.removeEventListener('authStateChanged', handleAuthChange);
      };
   }, []);

   const checkAuth = async () => {
      try {
         // Get JWT token from client-side cookie
         const jwtToken = document.cookie
            .split(';')
            .find(cookie => cookie.trim().startsWith('jwt_fallback='))
            ?.split('=')[1];

         if (!jwtToken) {
            setLoading(false);
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
         }
      } catch (error) {
         console.error("Auth check failed:", error);
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

         // Update state immediately
         setUser(null);
         setShowDropdown(false);

         // Dispatch custom event to notify other components
         window.dispatchEvent(new CustomEvent('authStateChanged'));

         router.push("/");
      } catch (error) {
         console.error("Logout failed:", error);
         // Even if logout API fails, clear local state
         setUser(null);
         setShowDropdown(false);
         document.cookie = "jwt_fallback=; Path=/; SameSite=Lax; Max-Age=0";
         window.dispatchEvent(new CustomEvent('authStateChanged'));
         router.push("/");
      }
   };

   return (
      <header className="bg-black/50 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-50">
         <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
               {/* Logo and Navigation */}
               <div className="flex items-center space-x-6">
                  <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-500 to-green-400 bg-clip-text text-transparent">
                     PollSite
                  </Link>

                  <nav className="hidden md:flex items-center space-x-4">
                     <Link
                        href="/"
                        className="text-zinc-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800"
                     >
                        🏠 Главная
                     </Link>
                     <Link
                        href="/create"
                        className="text-zinc-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800"
                     >
                        ➕ Создать
                     </Link>
                  </nav>
               </div>

               {/* Account Section */}
               <div className="flex items-center space-x-4">
                  {loading ? (
                     <div className="animate-pulse">
                        <div className="w-8 h-8 bg-zinc-700 rounded-full"></div>
                     </div>
                  ) : user ? (
                     /* Authenticated User */
                     <div className="relative">
                        <button
                           onClick={() => setShowDropdown(!showDropdown)}
                           className="flex items-center space-x-2 text-zinc-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800"
                        >
                           <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-400 rounded-full flex items-center justify-center text-white font-medium text-sm">
                              {user.email.charAt(0).toUpperCase()}
                           </div>
                           <span className="hidden sm:block text-sm">{user.email}</span>
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                           </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                           <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg">
                              <Link
                                 href="/account"
                                 onClick={() => setShowDropdown(false)}
                                 className="block px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 border-b border-zinc-700"
                              >
                                 👤 Профиль
                              </Link>
                              <button
                                 onClick={handleLogout}
                                 className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800"
                              >
                                 🚪 Выйти
                              </button>
                           </div>
                        )}
                     </div>
                  ) : (
                     /* Guest User */
                     <div className="flex items-center space-x-3">
                        <Link
                           href="/signin"
                           className="text-zinc-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800"
                        >
                           Войти
                        </Link>
                        <Link
                           href="/signup"
                           className="bg-gradient-to-r from-blue-500 to-green-400 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
                        >
                           Регистрация
                        </Link>
                     </div>
                  )}
               </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden pb-4">
               <nav className="flex items-center space-x-4">
                  <Link
                     href="/"
                     className="text-zinc-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800"
                  >
                     🏠 Главная
                  </Link>
                  <Link
                     href="/create"
                     className="text-zinc-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800"
                  >
                     ➕ Создать
                  </Link>
               </nav>
            </div>
         </div>

         {/* Click outside to close dropdown */}
         {showDropdown && (
            <div
               className="fixed inset-0 z-40"
               onClick={() => setShowDropdown(false)}
            />
         )}
      </header>
   );
}
