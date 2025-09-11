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

  // Get response data
  const responseText = await upstream.text();
  const res = new NextResponse(responseText, { status: upstream.status });

  // Set content type
  const ct = upstream.headers.get("content-type");
  if (ct) res.headers.set("content-type", ct);

  // Forward Django session cookies
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) res.headers.append("set-cookie", setCookie);

  // If login successful, also set JWT token as HttpOnly cookie
  if (upstream.status === 200) {
    try {
      const data = JSON.parse(responseText);
      if (data.access) {
        // Set JWT token as HttpOnly cookie for better security
        res.headers.append("set-cookie", 
          `jwt=${data.access}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`
        );
        
        // Also set refresh token
        if (data.refresh) {
          res.headers.append("set-cookie", 
            `refresh_token=${data.refresh}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
          );
        }
      }
    } catch (e) {
      // If JSON parsing fails, just continue without setting JWT cookies
      console.error("Failed to parse login response:", e);
    }
  }

  return res;
}
