'use client';
import { useEffect, useState } from 'react';
import { fetchWithRefresh } from './fetchWithRefresh';

export type Session = { authenticated: boolean; user?: { id:number; email:string; is_staff:boolean } };

export function useSession() {
  const [data, setData] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithRefresh('/api/auth/session');
        if (res.ok) setData(await res.json());
        else setData({ authenticated: false });
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  return { data, loading };
}
