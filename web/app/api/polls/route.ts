import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function apiBase() {
  return process.env.INTERNAL_API_BASE_URL || "http://api:8000";
}

export async function POST(req: NextRequest) {
  const jwt = cookies().get("jwt")?.value;
  const jwtFallback = cookies().get("jwt_fallback")?.value;
  const sessionid = cookies().get("sessionid")?.value;
  const csrftoken = cookies().get("csrftoken")?.value;
  const body = await req.text();

  // Build headers with authentication and cookies
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add JWT if available (prefer HttpOnly cookie, fallback to client-side cookie, then Authorization header)
  const authHeader = req.headers.get("authorization");
  const token = jwt || jwtFallback || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add cookies if available
  const cookieParts = [];
  if (sessionid) cookieParts.push(`sessionid=${sessionid}`);
  if (csrftoken) cookieParts.push(`csrftoken=${csrftoken}`);
  if (cookieParts.length > 0) {
    headers["Cookie"] = cookieParts.join("; ");
  }

  // Add CSRF header if token is available
  if (csrftoken) {
    headers["X-CSRFToken"] = csrftoken;
  }

  const upstream = await fetch(`${apiBase()}/api/polls/`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  // Return response with proper headers
  const buf = await upstream.arrayBuffer();
  const res = new NextResponse(buf, { status: upstream.status });

  const ct = upstream.headers.get("content-type");
  if (ct) res.headers.set("content-type", ct);

  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) res.headers.append("set-cookie", setCookie);

  return res;
}