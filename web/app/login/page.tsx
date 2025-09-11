'use client';
import { useState } from 'react';
import { saveTokens } from '@/app/lib/auth';
import { useRouter } from 'next/navigation';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const router = useRouter();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    if (!res.ok) { setErr('Неверный логин/пароль'); return; }
    const data = await res.json(); saveTokens(data.access, data.refresh); router.push('/');
  };
  return (
    <main className="max-w-md mx-auto py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Войти</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" type="password" placeholder="Пароль" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="btn w-full" type="submit">Войти</button>
      </form>
      <a href="/password/reset" className="text-sm underline text-zinc-400">Забыли пароль?</a>
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </main>
  );
}
