import { describe, expect, it } from "vitest";

import { buildIntelligenceOverview } from "../src/features/intelligence/intelligence-overview";

describe("buildIntelligenceOverview", () => {
  it("consolida somente métricas agregadas dos diretórios", () => {
    const overview = buildIntelligenceOverview({
      individuals: [
        { recordId: "rec1", legalName: "Protegido", alias: null, birthDate: null, motherName: null, cpfPresent: true, identityDocumentPresent: true, mainPhoto: null, createdAt: "2026-01-01" },
        { recordId: "rec2", legalName: "Reservado", alias: null, birthDate: null, motherName: null, cpfPresent: true, identityDocumentPresent: false, mainPhoto: null, createdAt: "2026-01-01" },
      ],
      organizations: [
        { recordId: "org1", name: "Restrita", acronym: null, organizationType: null, organizationStatus: null, explicitLinkCount: 2, linkedIndividualCount: 1 },
      ],
      vehicles: [
        { recordId: "veh1", maskedPlate: "•••1234", brand: null, model: null, color: null, year: null, status: "Ativo", relationshipType: null },
        { recordId: "veh2", maskedPlate: "•••5678", brand: null, model: null, color: null, year: null, status: null, relationshipType: null },
      ],
      warrants: [
        { recordId: "war1", maskedWarrantNumber: "•••1", maskedCaseNumber: "•••2", issuingAuthority: null, court: null, type: null, issuedAt: null, expiresAt: "2026-09-01", status: "Vigente", consultedAt: null },
        { recordId: "war2", maskedWarrantNumber: "•••3", maskedCaseNumber: "•••4", issuingAuthority: null, court: null, type: null, issuedAt: null, expiresAt: "2025-01-01", status: null, consultedAt: null },
      ],
    }, new Date("2026-08-13T00:00:00.000Z"));

    expect(overview.totals).toEqual({ individuals: 2, organizations: 1, vehicles: 2, warrants: 2, all: 7 });
    expect(overview.identityCoverage).toEqual({ complete: 1, incomplete: 1, percentage: 50 });
    expect(overview.organizationLinks).toEqual({ organizationsWithLinks: 1, explicitLinks: 2, linkedIndividuals: 1 });
    expect(overview.warrantAttention).toMatchObject({ expiring: 1, expired: 1, requiringAttention: 2 });
    expect(overview.vehicleStatus).toEqual({ informed: 1, notInformed: 1 });
  });

  it("mantém percentuais seguros quando os diretórios estão vazios", () => {
    const overview = buildIntelligenceOverview({ individuals: [], organizations: [], vehicles: [], warrants: [] });
    expect(overview.totals.all).toBe(0);
    expect(overview.identityCoverage.percentage).toBe(0);
    expect(overview.warrantAttention.requiringAttention).toBe(0);
  });
});
