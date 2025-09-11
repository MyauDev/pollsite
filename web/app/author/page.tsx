'use client';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/app/lib/auth';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';


type Item = { id:number; title:string; views:number; votes:number; shares:number; dwell_ms_avg:number; ctr:number };


export default function AuthorDashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const token = getAccessToken();
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/author/dashboard', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
      if (!res.ok) return;
      const data = await res.json(); setItems(data.items || []);
    })();
  }, [token]);


  return (
    <main className="max-w-4xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Кабинет автора</h1>
      <div className="grid grid-cols-2 gap-4">
        {items.map((it) => (
          <div key={it.id} className="rounded-2xl bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400 mb-1">#{it.id}</div>
            <div className="font-medium mb-2 truncate">{it.title}</div>
            <div className="text-xs text-zinc-400 mb-2">Views {it.views} · Votes {it.votes} · CTR {it.ctr}% · Dwell {Math.round(it.dwell_ms_avg/1000)}s</div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{name:'Views', v:it.views},{name:'Votes',v:it.votes},{name:'Shares',v:it.shares}]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" /><YAxis />
                  <Tooltip />
                  <Bar dataKey="v" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
