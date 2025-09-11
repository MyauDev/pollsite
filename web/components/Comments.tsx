'use client';
import { useEffect, useState } from 'react';

type Comment = { id:number; poll:number; parent:number|null; content:string; status:string; author_email?:string|null; created_at:string; replies_count:number };

async function fetchComments(pollId: number, parent?: number) {
  const url = parent ? `/api/polls/${pollId}/comments?parent=${parent}` : `/api/polls/${pollId}/comments`;
  const res = await fetch(url, { cache:'no-store' });
  if (!res.ok) throw new Error('load comments');
  return res.json();
}

async function postComment(pollId: number, content: string, parent?: number) {
  const headers: Record<string,string> = { 'Content-Type':'application/json' };
  // можно добавить авторизацию позже
  const res = await fetch('/api/comments', { method:'POST', headers, body: JSON.stringify({ poll: pollId, parent, content }) });
  if (!res.ok) throw new Error('send comment');
  return res.json();
}

export default function Comments({ pollId }: { pollId:number }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await fetchComments(pollId)); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [pollId]);

  const submit = async () => {
    if (!text.trim()) return;
    const saved = await postComment(pollId, text.trim());
    // скрытые комментарии не показываем; пользователь получит «отправлено на модерацию»
    if (saved.status === 'visible') setItems(prev => [saved, ...prev]);
    setText('');
    if (saved.status !== 'visible') alert('Комментарий отправлен на модерацию');
  };

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Напишите комментарий…"
               className="flex-1 rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" />
        <button onClick={submit} className="btn">Отправить</button>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? <div className="text-sm text-zinc-400">Загрузка…</div> : items.length === 0 ? (
          <div className="text-sm text-zinc-500">Пока нет комментариев</div>
        ) : items.map(c => (
          <div key={c.id} className="rounded-2xl bg-zinc-900 p-3 border border-zinc-800">
            <div className="text-xs text-zinc-500">{c.author_email || 'Аноним'} · {new Date(c.created_at).toLocaleString()}</div>
            <div className="mt-1 whitespace-pre-wrap">{c.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
