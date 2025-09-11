import { NextRequest, NextResponse } from "next/server";

function getApiBase() {
  return process.env.INTERNAL_API_BASE_URL || "http://api:8000";
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${getApiBase()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  // тело + статус
  const buf = await upstream.arrayBuffer();
  const res = new NextResponse(buf, { status: upstream.status });

  // заголовки
  const ct = upstream.headers.get("content-type");
  if (ct) res.headers.set("content-type", ct);

  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) res.headers.append("set-cookie", setCookie);

  return res;
}
