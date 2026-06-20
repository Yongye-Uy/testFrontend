import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/pdf-token";

const ALLOWED_HOSTS = [
  ".r2.cloudflarestorage.com",
  ".r2.dev",
  ".cloudflare.com",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  // Token travels as a request header only — never in the URL, so it cannot be copied
  // from the address bar or network tab URL column and reused in a new tab.
  const token = req.headers.get("x-pdf-token");

  if (!url) return new NextResponse("Missing url param", { status: 400 });
  if (!token) return new NextResponse("Missing token", { status: 401 });

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new NextResponse("Invalid url param", { status: 400 });
  }

  if (!ALLOWED_HOSTS.some((h) => target.hostname.endsWith(h))) {
    return new NextResponse("Forbidden host", { status: 403 });
  }

  const valid = await verifyToken(url, token);
  if (!valid) {
    return new NextResponse("Invalid or expired token", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: "no-store" });
  } catch {
    return new NextResponse("Failed to fetch document", { status: 502 });
  }
  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      // Force inline display — never attachment/download
      "Content-Disposition": "inline",
      // Block embedding in other origins
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
      // No caching of the proxied bytes
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
