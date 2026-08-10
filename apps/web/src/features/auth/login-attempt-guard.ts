import "server-only";

import { LoginAttemptGuard } from "@/features/auth/login-attempt-policy";

const guard = new LoginAttemptGuard();

export function loginAttemptKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const address = forwarded || realIp || "local";
  const agent = request.headers.get("user-agent")?.slice(0, 160) || "unknown";
  return `${address}:${agent}`;
}

export function loginAttemptStatus(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  return guard.status(key);
}

export function registerLoginFailure(key: string): {
  locked: boolean;
  retryAfterSeconds: number;
} {
  return guard.registerFailure(key);
}

export function clearLoginFailures(key: string): void {
  guard.clear(key);
}
