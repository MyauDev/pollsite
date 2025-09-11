'use client';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/app/lib/auth';

type Report = { id:number; target_type:string; target_id:number; reason:string; created_at:string; reporter_email?:string };

export default function ModerationPage() {
  const [items, setItems] = useState<Report[]>([]);
  const token = getAccessToken();

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/reports', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
      if (!res.ok) return;
      setItems(await res.json());
    })();
  }, [token]);

  const act = async (pollId: number, action: 'hide'|'unhide'|'freeze'|'unfreeze') => {
    const res = await fetch(`/api/moderation/polls/${pollId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action })
    });
    if (!res.ok) alert('Ошибка'); else alert('OK');
  };

  return (
    <main className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Модерация</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-400"><th>ID</th><th>Target</th><th>Reason</th><th>Reporter</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {items.map(r => (
            <tr key={r.id} className="border-b border-zinc-800">
              <td className="py-2">{r.id}</td>
              <td>#{r.target_id} ({r.target_type})</td>
              <td>{r.reason}</td>
              <td>{r.reporter_email || 'anon'}</td>
              <td className="space-x-2">
                <button className="btn" onClick={()=>act(r.target_id,'hide')}>Hide</button>
                <button className="btn" onClick={()=>act(r.target_id,'unhide')}>Unhide</button>
                <button className="btn" onClick={()=>act(r.target_id,'freeze')}>Freeze</button>
                <button className="btn" onClick={()=>act(r.target_id,'unfreeze')}>Unfreeze</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
