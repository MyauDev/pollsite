'use client';
const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';


export function saveTokens(access: string, refresh?: string) {
localStorage.setItem(ACCESS_KEY, access);
if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}
export function getAccessToken() {
if (typeof window === 'undefined') return '';
return localStorage.getItem(ACCESS_KEY) || '';
}
export function clearTokens() {
localStorage.removeItem(ACCESS_KEY);
localStorage.removeItem(REFRESH_KEY);
}
export function isAuthed() { return !!getAccessToken(); }