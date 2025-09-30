export type PollOption = { id: number; text: string; order: number };
export type PollStats = {
total_votes: number;
option_counts: Record<string, number> | null;
updated_at?: string;
};
export type Topic = { id: number; name: string; slug: string };
export type Poll = {
id: number;
title: string;
description?: string;
type_multi: boolean;
results_mode: 'open' | 'hidden_until_vote' | 'hidden_until_close';
visibility: 'public' | 'link';
media_url?: string;
closes_at?: string | null;
created_at: string;
updated_at: string;
options: PollOption[];
topics: Topic[];
stats?: PollStats | null;
results_available: boolean;
option_percents?: Record<string | number, number> | null;
user_vote?: number | null; // ID of the option the user voted for
};


export type CursorPage<T> = {
next: string | null;
previous: string | null;
results: T[];
};