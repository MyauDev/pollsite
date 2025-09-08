import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function apiBase() {
  return process.env.INTERNAL_API_BASE_URL || "http://api:8000";
}

export async function GET(req: NextRequest) {
  const jwt = cookies().get("jwt")?.value;
  const jwtFallback = cookies().get("jwt_fallback")?.value;
  const sessionid = cookies().get("sessionid")?.value;
  const csrftoken = cookies().get("csrftoken")?.value;

  // Get query parameters
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  
  // Build the upstream URL
  let upstreamUrl = `${apiBase()}/api/feed`;
  if (cursor) {
    upstreamUrl += `?cursor=${encodeURIComponent(cursor)}`;
  }

  // Build headers with authentication and cookies
  const headers: Record<string, string> = {};

  // Add JWT if available (prefer HttpOnly cookie, fallback to client-side cookie, then Authorization header)
  const authHeader = req.headers.get("authorization");
  const token = jwt || jwtFallback || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
  
  // Debug logging
  console.log("Feed API Debug:", {
    jwt: jwt ? "present" : "missing",
    jwtFallback: jwtFallback ? "present" : "missing", 
    authHeader: authHeader ? "present" : "missing",
    token: token ? "present" : "missing"
  });
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Forward device ID header
  const deviceId = req.headers.get("x-device-id");
  if (deviceId) {
    headers["X-Device-Id"] = deviceId;
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

  const upstream = await fetch(upstreamUrl, {
    method: "GET",
    headers,
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
