'use client';
import { useState } from 'react';


export default function ResetNew() {
  const [uid, setUid] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [ok, setOk] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/password/reset/confirm', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uid, token, new_password: password }) });
    setOk(res.ok);
  };
  return (
    <main className="max-w-md mx-auto py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Новый пароль</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" placeholder="uid" value={uid} onChange={e=>setUid(e.target.value)} required />
        <input className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" placeholder="token" value={token} onChange={e=>setToken(e.target.value)} required />
        <input className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" type="password" placeholder="Новый пароль" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="btn w-full" type="submit">Сменить пароль</button>
      </form>
      {ok && <p className="text-green-400 text-sm">Пароль изменён. Теперь войдите.</p>}
    </main>
  );
}
