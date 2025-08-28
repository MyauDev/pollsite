import type { Metadata } from 'next';


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost';


export const metadata: Metadata = {
metadataBase: new URL(siteUrl),
title: {
default: 'Polls — TikTok‑лента опросов',
template: '%s · Polls',
},
description: 'Голосуй одним тапом и сразу смотри результат. Создавай свои опросы.',
openGraph: {
type: 'website',
url: siteUrl,
title: 'Polls — TikTok‑лента опросов',
description: 'Голосуй одним тапом и сразу смотри результат. Создавай свои опросы.',
images: ['/og-default.png'],
},
twitter: {
card: 'summary_large_image',
site: '@',
},
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="ru">
<body className="min-h-dvh bg-black text-white">
<div className="mx-auto max-w-md px-2 sm:px-0">{children}</div>
<div className="p-3 flex items-center justify-between text-sm text-zinc-400">
  <a href="/">Лента</a>
  <div className="space-x-4">
    <a href="/auth">Войти</a>
    <a href="/create" className="underline">Создать опрос</a>
  </div>
</div>
</body>
</html>
);
}