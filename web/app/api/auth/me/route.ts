import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function getApiBase() {
  return process.env.INTERNAL_API_BASE_URL || "http://api:8000";
}

export async function GET(req: NextRequest) {
  const jwt = cookies().get("jwt")?.value;
  const jwtFallback = cookies().get("jwt_fallback")?.value;
  const sessionid = cookies().get("sessionid")?.value;

  // Build headers with authentication
  const headers: Record<string, string> = {};

  // Add JWT if available (prefer HttpOnly cookie, fallback to client-side cookie, then Authorization header)
  const authHeader = req.headers.get("authorization");
  const token = jwt || jwtFallback || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add session cookie if available
  if (sessionid) {
    headers["Cookie"] = `sessionid=${sessionid}`;
  }

  const upstream = await fetch(`${getApiBase()}/api/auth/me`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  // Get response data
  const responseText = await upstream.text();
  const res = new NextResponse(responseText, { status: upstream.status });

  // Set content type
  const ct = upstream.headers.get("content-type");
  if (ct) res.headers.set("content-type", ct);

  return res;
}
