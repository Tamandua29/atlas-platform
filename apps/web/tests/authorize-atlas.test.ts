import { beforeEach, describe, expect, it, vi } from "vitest";

const { readAtlasSession } = vi.hoisted(() => ({
  readAtlasSession: vi.fn(),
}));

vi.mock("../src/features/auth/atlas-session", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/features/auth/atlas-session")>();
  return { ...actual, readAtlasSession };
});

import { authorizeAtlas } from "../src/features/auth/authorize-atlas";

describe("autorização do Atlas", () => {
  beforeEach(() => readAtlasSession.mockReset());

  it("retorna 401 para sessão ausente ou expirada", async () => {
    readAtlasSession.mockResolvedValue(null);

    const result = await authorizeAtlas(["reviewer"]);

    expect(result.authorized).toBe(false);
    if (!result.authorized) expect(result.response.status).toBe(401);
  });

  it("retorna 403 quando o papel não possui permissão", async () => {
    readAtlasSession.mockResolvedValue({
      actorId: "auditor-29",
      role: "auditor",
      issuedAt: 1,
      expiresAt: 2,
    });

    const result = await authorizeAtlas(["reviewer"]);

    expect(result.authorized).toBe(false);
    if (!result.authorized) expect(result.response.status).toBe(403);
  });

  it("autoriza o papel explicitamente permitido", async () => {
    readAtlasSession.mockResolvedValue({
      actorId: "auditor-29",
      role: "auditor",
      issuedAt: 1,
      expiresAt: 2,
    });

    const result = await authorizeAtlas(["auditor"]);

    expect(result.authorized).toBe(true);
  });
});
