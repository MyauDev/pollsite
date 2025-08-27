import { ImageResponse } from 'next/og';
export const runtime = 'edge';
export const alt = 'Poll preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';


async function getPoll(id: string) {
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost';
const res = await fetch(`${base}/api/polls/${id}`, { cache: 'no-store' });
if (!res.ok) return null;
return res.json();
}


export default async function OpengraphImage({ params }: { params: { id: string } }) {
const poll = await getPoll(params.id);
const title = (poll?.title as string) || 'Опрос';
return new ImageResponse(
(
<div
style={{
width: '100%',
height: '100%',
display: 'flex',
flexDirection: 'column',
justifyContent: 'center',
padding: 64,
background: 'linear-gradient(135deg, #0b1220 0%, #111827 100%)',
color: 'white',
fontSize: 56,
fontWeight: 700,
}}
>
<div style={{ fontSize: 28, opacity: 0.7, marginBottom: 16 }}>Polls</div>
<div style={{ lineHeight: 1.2 }}>{title}</div>
<div style={{ marginTop: 24, fontSize: 24, opacity: 0.85 }}>Голосуй одним тапом →</div>
</div>
),
{ ...size }
);
}