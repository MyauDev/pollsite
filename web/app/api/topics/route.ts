import { NextRequest, NextResponse } from "next/server";

function apiBase() {
  return process.env.INTERNAL_API_BASE_URL || "http://api:8000";
}

export async function GET(req: NextRequest) {
  try {
    const upstream = await fetch(`${apiBase()}/api/topics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") || "application/json";
    return new NextResponse(text, { status: upstream.status, headers: { "content-type": ct } });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: "Failed to fetch topics" }), { 
      status: 500, 
      headers: { "content-type": "application/json" } 
    });
  }
}
