import { cookies } from "next/headers";

export type AtlasRole = "reviewer" | "auditor" | "administrator";

export type AtlasSession = {
  actorId: string;
  role: AtlasRole;
  issuedAt: number;
  expiresAt: number;
};

const COOKIE_NAME = "atlas_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function sessionSecret(): string | null {
  return process.env.ATLAS_SESSION_SECRET?.trim()
    || process.env.ATLAS_INTERNAL_API_KEY?.trim()
    || null;
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    new TextEncoder().encode(payload),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function configuredRole(): AtlasRole {
  const configured = process.env.ATLAS_REVIEWER_ROLE?.trim();

  if (configured === "administrator" || configured === "auditor") {
    return configured;
  }

  return "reviewer";
}

export function configuredActorId(): string {
  return process.env.ATLAS_REVIEWER_ID?.trim() || "internal-reviewer";
}

export async function createAtlasSession(): Promise<AtlasSession> {
  const now = Math.floor(Date.now() / 1000);
  const session: AtlasSession = {
    actorId: configuredActorId(),
    role: configuredRole(),
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_SECONDS,
  };
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  const secret = sessionSecret();
  if (!secret) throw new Error("O segredo de sessão do Atlas não foi configurado.");
  const token = `${payload}.${await sign(payload, secret)}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
    priority: "high",
  });
  return session;
}

export async function clearAtlasSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    priority: "high",
  });
}

export async function readAtlasSession(): Promise<AtlasSession | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length > 0) return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(secret),
    base64UrlToBytes(signature),
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;
  try {
    const session = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload)),
    ) as AtlasSession;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof session.actorId !== "string"
      || session.actorId.length < 3
      || (
        session.role !== "reviewer"
        && session.role !== "auditor"
        && session.role !== "administrator"
      )
      || typeof session.issuedAt !== "number"
      || session.issuedAt > now + 60
      || typeof session.expiresAt !== "number"
      || session.expiresAt <= now
      || session.expiresAt - session.issuedAt > SESSION_DURATION_SECONDS
    ) return null;
    return session;
  } catch {
    return null;
  }
}

async function credentialDigest(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return new Uint8Array(digest);
}

export async function validBootstrapCredential(value: unknown): Promise<boolean> {
  const expected = process.env.ATLAS_INTERNAL_API_KEY?.trim();
  if (!expected || typeof value !== "string") return false;

  const candidate = value.trim();
  const [expectedDigest, candidateDigest] = await Promise.all([
    credentialDigest(expected),
    credentialDigest(candidate),
  ]);

  let difference = 0;
  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= expectedDigest[index]! ^ candidateDigest[index]!;
  }
  return difference === 0;
}

export function hasRole(session: AtlasSession, allowed: AtlasRole[]): boolean {
  return session.role === "administrator" || allowed.includes(session.role);
}
