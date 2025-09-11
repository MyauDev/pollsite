import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const res = new NextResponse(JSON.stringify({ success: true }), { 
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

  // Clear all authentication cookies
  res.headers.append("set-cookie", 
    "jwt=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  res.headers.append("set-cookie", 
    "refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  res.headers.append("set-cookie", 
    "jwt_fallback=; Path=/; SameSite=Lax; Max-Age=0"
  );
  res.headers.append("set-cookie", 
    "sessionid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  res.headers.append("set-cookie", 
    "csrftoken=; Path=/; SameSite=Lax; Max-Age=0"
  );

  return res;
}
