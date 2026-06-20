import { NextRequest, NextResponse } from "next/server";
import { makeToken } from "@/lib/pdf-token";

const ALLOWED_HOSTS = [
  ".r2.cloudflarestorage.com",
  ".r2.dev",
  ".cloudflare.com",
];

// POST /api/pdf-token
// Body: { url: string }
// Header: Authorization: Bearer <jwt>  (proves request came from in-page JS, not browser nav)
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Any non-empty Bearer token proves the request came from page JS — browsers cannot set
  // custom Authorization headers on <a href> navigation or direct URL bar access.
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || auth.length < 20) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await req.json() as { url?: string };
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const url = body.url;
  if (!url) return new NextResponse("Missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!ALLOWED_HOSTS.some((h) => target.hostname.endsWith(h))) {
    return new NextResponse("Forbidden host", { status: 403 });
  }

  const token = await makeToken(url);
  return NextResponse.json({ token });
}
