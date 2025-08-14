export default async function Home() {
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/healthz', { cache: 'no-store' }).catch(() => null);
    const ok = res && res.ok;
    return (
      <main>
        <h1>Polls App — Stage 0</h1>
        <p>API health: {ok ? 'ok' : 'unavailable'}</p>
        <p>Next.js is running. Nginx proxies / → web and /api → Django.</p>
      </main>
    );
  }