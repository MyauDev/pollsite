'use client';
import { useState } from 'react';


export default function ResetReq() {
  const [email, setEmail] = useState('');
  const [ok, setOk] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/auth/password/reset/request', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    setOk(true);
  };
  return (
    <main className="max-w-md mx-auto py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Сброс пароля</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
        <button className="btn w-full" type="submit">Отправить ссылку</button>
      </form>
      {ok && <p className="text-green-400 text-sm">Если такой e‑mail есть, мы отправили инструкцию.</p>}
    </main>
  );
}
