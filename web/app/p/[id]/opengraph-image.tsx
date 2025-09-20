// web/app/p/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import type { Poll } from "@/app/lib/types";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchPoll(id: string): Promise<Poll | null> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/api/polls/${id}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function OG({ params }: { params: { id: string } }) {
  const poll = await fetchPoll(params.id);
  const title = poll?.title ?? "Опрос";
  const description =
    poll?.description ?? "Голосуйте и смотрите результаты в реальном времени.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(180deg, rgba(10,10,12,1) 0%, rgba(18,18,22,1) 100%)",
          color: "#E5E7EB",
          padding: "48px",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI",
        }}
      >
        <div
          style={{
            fontSize: 28,
            opacity: 0.7,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          PollSite
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.1,
              color: "#F9FAFB",
              textOverflow: "ellipsis",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              maxWidth: "90%",
              opacity: 0.8,
              textOverflow: "ellipsis",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            opacity: 0.9,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#34D399",
              boxShadow: "0 0 18px rgba(52,211,153,0.8)",
            }}
          />
          <div style={{ fontSize: 24 }}>Реальное время • Голосование • Комментарии</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
