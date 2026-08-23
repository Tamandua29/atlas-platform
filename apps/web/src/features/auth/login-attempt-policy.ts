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

export class LoginAttemptGuard {
  private readonly attempts = new Map<string, AttemptState>();

  constructor(private readonly now: () => number = Date.now) {}

  private cleanup(now: number): void {
    if (this.attempts.size < MAX_ENTRIES) return;
    const expiredBefore = now - Math.max(WINDOW_MS, LOCK_MS) * 2;
    for (const [key, value] of this.attempts) {
      if (value.lastSeenAt < expiredBefore) this.attempts.delete(key);
    }
    if (this.attempts.size >= MAX_ENTRIES) {
      const oldest = [...this.attempts.entries()]
        .sort((left, right) => left[1].lastSeenAt - right[1].lastSeenAt)
        .slice(0, Math.ceil(MAX_ENTRIES / 4));
      for (const [key] of oldest) this.attempts.delete(key);
    }
  }

  status(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = this.now();
    this.cleanup(now);
    const state = this.attempts.get(key);
    if (!state || state.lockedUntil <= now) {
      if (state?.lockedUntil && state.lockedUntil <= now) this.attempts.delete(key);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.lockedUntil - now) / 1000)),
    };
  }

  registerFailure(key: string): { locked: boolean; retryAfterSeconds: number } {
    const now = this.now();
    const current = this.attempts.get(key);
    const state: AttemptState = !current || now - current.windowStartedAt >= WINDOW_MS
      ? { failures: 0, windowStartedAt: now, lockedUntil: 0, lastSeenAt: now }
      : current;

    state.failures += 1;
    state.lastSeenAt = now;
    if (state.failures >= MAX_FAILURES) state.lockedUntil = now + LOCK_MS;
    this.attempts.set(key, state);
    return {
      locked: state.lockedUntil > now,
      retryAfterSeconds: state.lockedUntil > now
        ? Math.ceil((state.lockedUntil - now) / 1000)
        : 0,
    };
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }
}
