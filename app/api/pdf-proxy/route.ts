import { NextRequest, NextResponse } from "next/server";

// Server-side proxy so react-pdf can fetch R2 presigned URLs without
// hitting CORS restrictions (R2 doesn't send Allow-Origin for localhost).
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new NextResponse("Invalid url param", { status: 400 });
  }

  // Only proxy to R2 / Cloudflare endpoints — never act as an open proxy.
  const allowedHosts = [
    ".r2.cloudflarestorage.com",
    ".r2.dev",
    ".cloudflare.com",
  ];
  if (!allowedHosts.some((h) => target.hostname.endsWith(h))) {
    return new NextResponse("Forbidden host", { status: 403 });
  }

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/pdf";
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
