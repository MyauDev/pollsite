'use client';
import { useCallback, useRef } from 'react';
import { vote as apiVote } from './api';
import { getOrCreateDeviceId } from './device';


export function useVote() {
const deviceIdRef = useRef<string>('');
if (!deviceIdRef.current && typeof window !== 'undefined') deviceIdRef.current = getOrCreateDeviceId();


return useCallback(async (pollId: number, optionId: number) => {
const idem = (crypto as any).randomUUID ? crypto.randomUUID() : `${pollId}-${optionId}-${Date.now()}`;
return apiVote(pollId, optionId, deviceIdRef.current, idem);
}, []);
}