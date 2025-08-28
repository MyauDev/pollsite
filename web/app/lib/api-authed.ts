'use client';
import { getAccessToken } from './auth';


export async function apiAuthed(path: string, init: RequestInit = {}) {
const headers = new Headers(init.headers as any);
const token = getAccessToken();
if (token) headers.set('Authorization', `Bearer ${token}`);
headers.set('Content-Type', 'application/json');
const res = await fetch(path, { ...init, headers });
if (!res.ok) throw new Error(await res.text());
return res.json();
}