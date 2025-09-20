'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/app/lib/useSession';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, loading } = useSession();
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (loading) return;
    if (data?.authenticated) return;

    // не уводим с /login, чтобы избежать петли (на всякий случай)
    if (path === '/login') return;

    // сохраняем текущий query
    const current = search?.toString();
    const fullPath = current ? `${path}?${current}` : path || '/';

    const q = new URLSearchParams({ redirect: fullPath }).toString();
    router.replace(`/login?${q}`);
  }, [loading, data, path, search, router]);

  if (loading || !data?.authenticated) {
    return <div className="py-10 text-center text-zinc-400">Проверяем сессию…</div>;
  }

  return <>{children}</>;
}
