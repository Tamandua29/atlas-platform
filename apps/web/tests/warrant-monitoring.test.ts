import { describe, expect, it } from "vitest";

import { classifyWarrantAttention } from "@/features/intelligence/warrant-monitoring";

const now = new Date("2026-08-09T12:00:00Z");

describe("classifyWarrantAttention", () => {
  it("prioriza estados finais informados pela fonte", () => {
    expect(classifyWarrantAttention("Cumprido", "2027-01-01", now)).toBe("closed");
  });

  it("sinaliza validade próxima sem declarar validade jurídica", () => {
    expect(classifyWarrantAttention("Vigente", "2026-08-25", now)).toBe("expiring");
  });

  it("sinaliza data vencida", () => {
    expect(classifyWarrantAttention("Ativo", "2026-08-01", now)).toBe("expired");
  });

  it("mantém como desconhecido quando a fonte não permite concluir", () => {
    expect(classifyWarrantAttention(null, null, now)).toBe("unknown");
  });
});
