'use client';
import { useEffect } from 'react';


export type PollUpdate = {
poll_id: number;
total_votes: number;
counts: Record<string, number> | Record<number, number>;
percents: Record<string, number> | Record<number, number>;
};


export function usePollSSE(pollId: number, onUpdate: (u: PollUpdate) => void) {
useEffect(() => {
if (!pollId) return;
const es = new EventSource(`/api/stream/polls/${pollId}`);
const handler = (e: MessageEvent) => { try { onUpdate(JSON.parse(e.data)); } catch {} };
es.addEventListener('snapshot', handler);
es.addEventListener('update', handler);
es.onmessage = handler; // на случай, если сервер шлёт без event
es.onerror = () => { /* авто‑reconnect по retry */ };
return () => es.close();
}, [pollId, onUpdate]);
}