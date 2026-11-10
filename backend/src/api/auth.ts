import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless signed tokens (HMAC-SHA256). This is a stand-in for a real auth
 * provider: the token carries a user id and an expiry, so swapping in real
 * JWT/OIDC later does not change how routes read `req.userId`.
 */
export interface TokenPayload {
  uid: string;
  exp: number; // epoch seconds
}

export function signToken(payload: TokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string, secret: string): TokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function tokenForUser(userId: string, secret: string, ttlSeconds = 60 * 60 * 24 * 90): string {
  return signToken({ uid: userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds }, secret);
}