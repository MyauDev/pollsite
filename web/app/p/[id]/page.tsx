import type { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';
import PollCard from '@/components/PollCard';


async function getPoll(id: string) {
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost';
const res = await fetch(`${base}/api/polls/${id}`, { cache: 'no-store' });
if (!res.ok) return null;
return res.json();
}


export async function generateMetadata(
{ params }: { params: { id: string } },
_parent: ResolvingMetadata
): Promise<Metadata> {
const poll = await getPoll(params.id);
if (!poll) return { title: 'Опрос не найден' };
const title = poll.title || 'Опрос';
const desc = poll.description || 'Проголосуй и смотри результаты сразу';
const ogImage = new URL(`/p/${params.id}/opengraph-image`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost');
return {
title,
description: desc,
openGraph: {
title,
description: desc,
images: [ogImage.toString()],
url: `/p/${params.id}`,
type: 'article',
},
twitter: {
card: 'summary_large_image',
title,
description: desc,
images: [ogImage.toString()],
},
alternates: { canonical: `/p/${params.id}` },
};
}


export default async function PollPage({ params }: { params: { id: string } }) {
const poll = await getPoll(params.id);
if (!poll) return <div className="py-20 text-center text-zinc-400">Опрос не найден</div>;
return (
<div className="py-4">
<div className="mb-3 text-sm text-zinc-400"><Link href="/">← к ленте</Link></div>
{/* Используем тот же компонент карточки */}
<PollCard poll={poll} />
</div>
);
}