import { describe, expect, it } from "vitest";

import { LoginAttemptGuard } from "../src/features/auth/login-attempt-policy";

describe("login attempt guard", () => {
  it("permite as quatro primeiras falhas", () => {
    const guard = new LoginAttemptGuard(() => 1_000);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect(guard.registerFailure("cliente").locked).toBe(false);
    }
    expect(guard.status("cliente").allowed).toBe(true);
  });

  it("bloqueia na quinta falha por quinze minutos", () => {
    const guard = new LoginAttemptGuard(() => 1_000);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      guard.registerFailure("cliente");
    }
    expect(guard.status("cliente")).toEqual({
      allowed: false,
      retryAfterSeconds: 900,
    });
  });

  it("isola clientes diferentes", () => {
    const guard = new LoginAttemptGuard(() => 1_000);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      guard.registerFailure("cliente-a");
    }
    expect(guard.status("cliente-a").allowed).toBe(false);
    expect(guard.status("cliente-b").allowed).toBe(true);
  });

  it("libera o cliente depois do prazo", () => {
    let now = 1_000;
    const guard = new LoginAttemptGuard(() => now);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      guard.registerFailure("cliente");
    }
    now += 15 * 60 * 1000;
    expect(guard.status("cliente").allowed).toBe(true);
  });

  it("limpa falhas após autenticação válida", () => {
    const guard = new LoginAttemptGuard(() => 1_000);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      guard.registerFailure("cliente");
    }
    guard.clear("cliente");
    expect(guard.registerFailure("cliente").locked).toBe(false);
  });
});
