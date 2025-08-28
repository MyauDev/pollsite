import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

// Robust URL handling to prevent runtime crashes
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost';
let siteUrl: string;
try {
  siteUrl = new URL(rawSiteUrl).href;
} catch {
  // If URL is malformed, try to fix it by adding protocol
  siteUrl = new URL(
    rawSiteUrl.startsWith('http') ? rawSiteUrl : `http://${rawSiteUrl}`
  ).href;
}


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
// Remove invalid '@' or use proper Twitter handle
// site: '@YourTwitterHandle',
},
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
        <div className="mx-auto max-w-md px-2 sm:px-0">{children}</div>
      </body>
    </html>
  );
}