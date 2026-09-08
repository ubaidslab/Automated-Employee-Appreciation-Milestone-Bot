/**
 * Deliberately demo-grade: a single shared admin key (ADMIN_KEY) rather than
 * per-user accounts — there's exactly one "admin" role here, not a
 * multi-tenant org model. Uses Web Crypto (crypto.subtle) rather than
 * Node's `crypto` module so the same code works in both this app's regular
 * Node.js API routes AND Next.js middleware, which always runs on the Edge
 * runtime and can't use Node-only APIs.
 *
 * Real production auth (multi-user, SSO, proper session store) is listed as
 * out of scope in the README — don't oversell this as more than it is.
 */

const COOKIE_NAME = "kudos_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export const ADMIN_SESSION_COOKIE = COOKIE_NAME;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured (see .env.example).");
  }
  return secret;
}

/** Simple constant-time comparison for equal-length secrets — good enough for
 * a single shared admin key, not a substitute for a real credential store. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function verifyAdminKey(providedKey: string): boolean {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return false;
  return constantTimeEqual(providedKey, adminKey);
}

/** Signed, expiring cookie value: "<expiresAtMs>.<hmac>". Not encrypted (the
 * payload is just a timestamp, nothing sensitive), but tamper-evident. */
export async function createSessionCookieValue(): Promise<string> {
  const secret = getSessionSecret();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const signature = await hmacSign(payload, secret);
  return `${payload}.${signature}`;
}

export async function isValidSessionCookie(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;

  const secret = getSessionSecret();
  const expectedSignature = await hmacSign(payload, secret);
  if (!constantTimeEqual(signature, expectedSignature)) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return true;
}
