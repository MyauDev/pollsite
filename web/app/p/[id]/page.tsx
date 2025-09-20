// web/app/p/[id]/page.tsx
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { headers, cookies } from "next/headers";
import PollCard from "@/components/PollCard";
import type { Poll } from "@/app/lib/types";

/** Build absolute base URL from incoming request headers (works on edge/node) */
function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/** Fetch poll server-side with cookies forwarded (no-store) */
async function fetchPoll(id: string): Promise<Poll> {
  const base = getBaseUrl();
  const cookieHeader = cookies().toString();
  const res = await fetch(`${base}/api/polls/${id}`, {
    cache: "no-store",
    headers: {
      // Прокидываем cookie, чтобы учесть авторизацию/видимость
      cookie: cookieHeader,
      accept: "application/json",
    },
  });
  if (!res.ok) {
    // Можно отдать notFound() при 404
    throw new Error(`Failed to load poll ${id}: ${res.status}`);
  }
  return res.json();
}

type PageProps = {
  params: { id: string };
};

/** SEO/OG metadata */
export async function generateMetadata(
  { params }: PageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const poll = await fetchPoll(params.id);

  const title = poll.title || "Опрос";
  const description =
    poll.description ||
    "Голосуйте и смотрите результаты в реальном времени.";

  const base = getBaseUrl();
  const ogImage = `${base}/p/${params.id}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/p/${params.id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PollPage({ params }: PageProps) {
  const poll = await fetchPoll(params.id);

  return (
    <div className="flex flex-col gap-4">
      {/* Карточка — та же, что и в ленте (SSE и Comments уже внутри) */}
      <PollCard poll={poll} />

      {/* Кнопка «Открыть в ленте» */}
      <div className="flex justify-center">
        <Link
          href={`/#${poll.id}`}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          Открыть в ленте
        </Link>
      </div>
    </div>
  );
}
