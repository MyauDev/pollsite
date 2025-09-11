'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/app/lib/useSession';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, loading } = useSession();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!data?.authenticated) {
      const q = new URLSearchParams({ redirect: path || '/' }).toString();
      router.replace(`/login?${q}`);
    }
  }, [loading, data, path, router]);

  if (loading || !data?.authenticated) {
    return <div className="py-10 text-center text-zinc-400">Проверяем сессию…</div>;
  }

  return <>{children}</>;
}
