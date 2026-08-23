import { beforeEach, describe, expect, it, vi } from "vitest";

const { listAllAirtableRecords } = vi.hoisted(() => ({
  listAllAirtableRecords: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/lib/airtable/airtable.client", () => ({
  listAllAirtableRecords,
}));
vi.mock("../src/lib/airtable/airtable.config", () => ({
  getAirtableConfiguration: () => ({
    occurrencesTableId: "occurrences",
    addressesTableId: "addresses",
    individualsTableId: "individuals",
    vehiclesTableId: "vehicles",
    warrantsTableId: "warrants",
    organizationsTableId: "organizations",
    organizationalLinksTableId: "organizational-links",
    baseId: "operational-base",
    individualsPreviewBaseId: "intelligence-base",
  }),
}));

import { loadOperationalEntitiesFromAirtable } from "../src/features/operational-map/operational-map.airtable-repository";

const address = {
  id: "address-1",
  createdTime: "2026-08-22T12:00:00.000Z",
  fields: {
    Bairro: "Japiim",
    Latitude: -3.101,
    Longitude: -59.982,
  },
};

function mockOccurrence(fields: Record<string, unknown>) {
  listAllAirtableRecords.mockImplementation((tableId: string) => {
    if (tableId === "addresses") return Promise.resolve([address]);
    if (tableId === "occurrences") {
      return Promise.resolve([
        {
          id: "occurrence-1",
          createdTime: "2026-08-22T12:00:00.000Z",
          fields: { ...fields, Endereços: [address.id] },
        },
      ]);
    }
    return Promise.resolve([]);
  });
}

describe("camada operacional de pontos de venda", () => {
  beforeEach(() => listAllAirtableRecords.mockReset());

  it("publica somente uma classificação explícita como ponto de venda", async () => {
    mockOccurrence({
      Natureza: "Ponto de venda",
      Descrição: "Narrativa operacional sensível que não pode sair.",
    });

    const entities = await loadOperationalEntitiesFromAirtable();
    const entity = entities.find((item) => item.id === "occurrence-1");

    expect(entity).toMatchObject({
      type: "point-of-sale",
      title: "Ponto de venda sinalizado",
      description: "Classificação explícita na fonte; requer validação humana.",
    });
    expect(JSON.stringify(entity)).not.toContain("Narrativa operacional sensível");
  });

  it("mantém ocorrência genérica de tráfico fora da camada", async () => {
    mockOccurrence({ Natureza: "Tráfico de drogas" });

    const entities = await loadOperationalEntitiesFromAirtable();
    expect(entities.find((item) => item.id === "occurrence-1")?.type).toBe(
      "occurrence",
    );
  });
});
