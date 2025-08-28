import { NextRequest, NextResponse } from "next/server";
function getApiBase() { return process.env.INTERNAL_API_BASE_URL || "http://api:8000"; }
export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${getApiBase()}/api/auth/magic/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") || "text/plain; charset=utf-8";
  return new NextResponse(text, { status: upstream.status, headers: { "content-type": ct } });
}