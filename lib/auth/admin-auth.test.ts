import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionCookieValue, isValidSessionCookie, verifyAdminKey } from "./admin-auth";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_KEY = "correct-horse-battery-staple";
  process.env.SESSION_SECRET = "test-session-secret";
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("verifyAdminKey", () => {
  it("accepts the correct key", () => {
    expect(verifyAdminKey("correct-horse-battery-staple")).toBe(true);
  });

  it("rejects an incorrect key", () => {
    expect(verifyAdminKey("wrong-key")).toBe(false);
  });

  it("rejects when ADMIN_KEY isn't configured", () => {
    delete process.env.ADMIN_KEY;
    expect(verifyAdminKey("anything")).toBe(false);
  });
});

describe("session cookie sign/verify", () => {
  it("round-trips a freshly created cookie as valid", async () => {
    const cookie = await createSessionCookieValue();
    expect(await isValidSessionCookie(cookie)).toBe(true);
  });

  it("rejects a missing cookie", async () => {
    expect(await isValidSessionCookie(undefined)).toBe(false);
    expect(await isValidSessionCookie(null)).toBe(false);
  });

  it("rejects a tampered payload", async () => {
    const cookie = await createSessionCookieValue();
    const [, signature] = cookie.split(".");
    const tampered = `${Date.now() + 999999999}.${signature}`;
    expect(await isValidSessionCookie(tampered)).toBe(false);
  });

  it("rejects a cookie signed with a different secret", async () => {
    const cookie = await createSessionCookieValue();
    process.env.SESSION_SECRET = "a-different-secret";
    expect(await isValidSessionCookie(cookie)).toBe(false);
  });

  it("rejects an expired cookie", async () => {
    const expiredPayload = String(Date.now() - 1000);
    // Reconstruct with a signature computed under the same secret as
    // createSessionCookieValue would use, but an already-past expiry.
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(process.env.SESSION_SECRET!),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expiredPayload));
    const signature = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(await isValidSessionCookie(`${expiredPayload}.${signature}`)).toBe(false);
  });
});
