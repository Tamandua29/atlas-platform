import { describe, expect, it } from "vitest";

import {
  atlasSessionCookieOptions,
  hasRole,
  isValidAtlasSession,
  type AtlasSession,
} from "../src/features/auth/atlas-session";

const NOW = 2_000_000_000;

function session(overrides: Partial<AtlasSession> = {}): AtlasSession {
  return {
    actorId: "operador-29",
    role: "reviewer",
    issuedAt: NOW,
    expiresAt: NOW + 60 * 60,
    ...overrides,
  };
}

describe("política de sessão do Atlas", () => {
  it("aceita sessão íntegra e ainda válida", () => {
    expect(isValidAtlasSession(session(), NOW)).toBe(true);
  });

  it("rejeita sessão expirada, futura ou com duração excessiva", () => {
    expect(isValidAtlasSession(session({ expiresAt: NOW }), NOW)).toBe(false);
    expect(isValidAtlasSession(session({ issuedAt: NOW + 61 }), NOW)).toBe(
      false,
    );
    expect(
      isValidAtlasSession(
        session({ issuedAt: NOW, expiresAt: NOW + 8 * 60 * 60 + 1 }),
        NOW,
      ),
    ).toBe(false);
  });

  it("rejeita ator ou papel inválido", () => {
    expect(isValidAtlasSession(session({ actorId: "x" }), NOW)).toBe(false);
    expect(isValidAtlasSession({ ...session(), role: "guest" }, NOW)).toBe(
      false,
    );
  });

  it("permite ao administrador todas as operações e limita os demais papéis", () => {
    expect(hasRole(session({ role: "administrator" }), ["reviewer"])).toBe(
      true,
    );
    expect(hasRole(session({ role: "auditor" }), ["auditor"])).toBe(true);
    expect(hasRole(session({ role: "auditor" }), ["reviewer"])).toBe(false);
    expect(hasRole(session({ role: "reviewer" }), ["auditor"])).toBe(false);
  });

  it("mantém cookie HttpOnly, SameSite Strict e Secure em produção", () => {
    expect(atlasSessionCookieOptions(true)).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
      priority: "high",
    });
  });
});
