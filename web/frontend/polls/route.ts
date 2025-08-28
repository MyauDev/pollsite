import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function apiBase() {
  return process.env.INTERNAL_API_BASE_URL || "http://api:8000";
}

export async function POST(req: NextRequest) {
  const jwt = cookies().get("jwt")?.value; // access из cookie
  const body = await req.text();

  const upstream = await fetch(`${apiBase()}/api/polls/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body,
    cache: "no-store",
  });

  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") || "application/json";
  return new NextResponse(text, { status: upstream.status, headers: { "content-type": ct } });
}