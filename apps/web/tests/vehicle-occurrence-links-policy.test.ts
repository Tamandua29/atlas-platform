import { describe, expect, it } from "vitest";

import {
  recordLinksToVehicle,
  toSafeVehicleOccurrence,
} from "../src/features/intelligence/vehicle-occurrence-links-policy";

describe("vehicle occurrence links policy", () => {
  it("reconhece somente vínculos explícitos em campos relacionados", () => {
    expect(recordLinksToVehicle({ Veículos: ["recVehicle01"] }, "recVehicle01")).toBe(true);
    expect(recordLinksToVehicle({ Observação: "recVehicle01" }, "recVehicle01")).toBe(false);
  });

  it("expõe apenas metadados mínimos e mascara a referência", () => {
    const safe = toSafeVehicleOccurrence({
      id: "recOccurrence01",
      fields: {
        "Número da Ocorrência": "2026-123456789",
        "Data e Hora": "2026-08-11T12:00:00.000Z",
        Natureza: "Abordagem",
        Situação: "Concluída",
        Narrativa: "conteúdo sigiloso",
        Anexos: [{ url: "https://example.invalid/secret" }],
        Observações: "não expor",
      },
    });

    expect(safe).toEqual({
      recordId: "recOccurrence01",
      maskedOccurrenceNumber: "202••••••••789",
      occurredAt: "2026-08-11T12:00:00.000Z",
      category: "Abordagem",
      status: "Concluída",
    });
    expect(JSON.stringify(safe)).not.toContain("sigiloso");
    expect(JSON.stringify(safe)).not.toContain("secret");
    expect(JSON.stringify(safe)).not.toContain("não expor");
  });
});
