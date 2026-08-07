import "server-only";

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_ENTRIES = 2000;

type AttemptState = {
  failures: number;
  windowStartedAt: number;
  lockedUntil: number;
  lastSeenAt: number;
};

const attempts = new Map<string, AttemptState>();

function cleanup(now: number) {
  if (attempts.size < MAX_ENTRIES) return;

  const expiredBefore = now - Math.max(WINDOW_MS, LOCK_MS) * 2;
  for (const [key, value] of attempts) {
    if (value.lastSeenAt < expiredBefore) attempts.delete(key);
  }

  if (attempts.size >= MAX_ENTRIES) {
    const oldest = [...attempts.entries()]
      .sort((left, right) => left[1].lastSeenAt - right[1].lastSeenAt)
      .slice(0, Math.ceil(MAX_ENTRIES / 4));
    for (const [key] of oldest) attempts.delete(key);
  }
}

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
  const now = Date.now();
  cleanup(now);
  const state = attempts.get(key);

  if (!state || state.lockedUntil <= now) {
    if (state?.lockedUntil && state.lockedUntil <= now) attempts.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((state.lockedUntil - now) / 1000)),
  };
}

export function registerLoginFailure(key: string): {
  locked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const current = attempts.get(key);
  const state: AttemptState = !current || now - current.windowStartedAt >= WINDOW_MS
    ? { failures: 0, windowStartedAt: now, lockedUntil: 0, lastSeenAt: now }
    : current;

  state.failures += 1;
  state.lastSeenAt = now;

  if (state.failures >= MAX_FAILURES) {
    state.lockedUntil = now + LOCK_MS;
  }

  attempts.set(key, state);

  return {
    locked: state.lockedUntil > now,
    retryAfterSeconds: state.lockedUntil > now
      ? Math.ceil((state.lockedUntil - now) / 1000)
      : 0,
  };
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
