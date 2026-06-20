const SIGNING_SECRET =
  process.env.PDF_PROXY_SECRET ??
  process.env.JWT_SECRET_KEY ??
  "5BCK/9W67UuVlc1O8VaFlvJj6XnOMmxN8QoDyP+k5ZI=";

// 10-second token lifetime — enough for the HTTP fetch to complete; useless after that.
const TTL_MS = 10_000;

async function getSigningKey(): Promise<CryptoKey> {
  const bytes = new TextEncoder().encode(SIGNING_SECRET);
  return crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function hmacHex(key: CryptoKey, payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeToken(pdfUrl: string): Promise<string> {
  const key = await getSigningKey();
  const expiry = Date.now() + TTL_MS;
  const sigHex = await hmacHex(key, `${pdfUrl}:${expiry}`);
  return `${expiry}.${sigHex}`;
}

export async function verifyToken(pdfUrl: string, token: string): Promise<boolean> {
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const expiry = Number(token.slice(0, dot));
  if (isNaN(expiry) || Date.now() > expiry) return false;
  const key = await getSigningKey();
  const expected = await hmacHex(key, `${pdfUrl}:${expiry}`);
  return `${expiry}.${expected}` === token;
}
