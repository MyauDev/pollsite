'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAuthed } from '@/app/lib/auth';
import { apiAuthed } from '@/app/lib/api-authed';


export default function EditPollPage() {
const router = useRouter();
const params = useParams<{ id: string }>();
const id = Number(params.id);
const [loaded, setLoaded] = useState(false);
const [title, setTitle] = useState('');
const [description, setDescription] = useState('');
const [options, setOptions] = useState<string[]>([]);
const [error, setError] = useState('');


useEffect(() => {
if (!isAuthed()) { router.replace('/auth'); return; }
(async () => {
const res = await fetch(`/api/polls/${id}`);
const p = await res.json();
setTitle(p.title || '');
setDescription(p.description || '');
setOptions((p.options || []).map((o: any) => o.text));
setLoaded(true);
})();
}, [id, router]);


const submit = async (e: React.FormEvent) => {
e.preventDefault(); setError('');
try {
const body = {
title,
description,
type_multi: false,
results_mode: 'open',
visibility: 'public',
options: options.filter(Boolean).map(text => ({ text }))
};
const res = await apiAuthed(`/api/polls/${id}/update`, { method: 'PUT', body: JSON.stringify(body) });
router.push(`/p/${id}`);
} catch (e: any) {
setError(e.message || 'Ошибка редактирования');
}
};


if (!loaded) return <div className="py-10 text-center">Загрузка…</div>;


return (
<main className="max-w-md mx-auto py-10">
<h1 className="text-2xl font-semibold mb-4">Редактировать опрос</h1>
<form onSubmit={submit} className="space-y-4">
<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Вопрос"
className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" required />
<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Описание (опц.)"
className="w-full rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" />
<div className="space-y-2">
{options.map((opt, i) => (
<div key={i} className="flex gap-2">
<input value={opt} onChange={e=>{
const v = e.target.value; setOptions(prev => prev.map((o, idx) => idx === i ? v : o));
}} placeholder={`Вариант ${i+1}`}
className="flex-1 rounded-xl px-4 py-3 bg-zinc-900 border border-zinc-700" required />
</div>
))}
</div>
<button className="btn w-full" type="submit">Сохранить</button>
</form>
{error && <p className="text-red-400 mt-3">{error}</p>}
</main>
);
}