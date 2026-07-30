import { ADMIN_PASSWORD, ADMIN_USER, AUTH_SECRET } from "astro:env/server";

export const SESSION_COOKIE_NAME = "cc_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 horas

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function hmac(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

export function verifyCredentials(username: string, password: string): boolean {
  return username === ADMIN_USER && password === ADMIN_PASSWORD;
}

export async function createSessionToken(): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const payloadEncoded = toBase64Url(new TextEncoder().encode(payload));
  const signature = toBase64Url(await hmac(payloadEncoded));
  return `${payloadEncoded}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return false;

  const expectedBytes = await hmac(payloadEncoded);
  let actualBytes: Uint8Array;
  try {
    actualBytes = fromBase64Url(signature);
  } catch {
    return false;
  }
  if (expectedBytes.length !== actualBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < expectedBytes.length; i++) diff |= expectedBytes[i] ^ actualBytes[i];
  if (diff !== 0) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadEncoded)));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
