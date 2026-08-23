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

describe("operational map address repository", () => {
  beforeEach(() => listAllAirtableRecords.mockReset());

  it("publica endereço georreferenciado como entidade operacional", async () => {
    listAllAirtableRecords.mockImplementation((tableId: string) =>
      Promise.resolve(
        tableId === "addresses"
          ? [
              {
                id: "address-1",
                createdTime: "2026-08-11T12:00:00.000Z",
                fields: {
                  "Endereço Completo": "Rua Teste, 100 — Japiim — Manaus",
                  Bairro: "Japiim",
                  Latitude: -3.101,
                  Longitude: -59.982,
                  Indivíduos: ["person-1"],
                },
              },
            ]
          : [],
      ),
    );

    await expect(loadOperationalEntitiesFromAirtable()).resolves.toEqual([
      expect.objectContaining({
        id: "address:address-1",
        type: "address",
        title: "Rua Teste, 100 — Japiim — Manaus",
        description: "Japiim",
        coordinates: [-59.982, -3.101],
        status: "Georreferenciado",
        reference: "address-1",
      }),
    ]);
  });

  it("descarta endereço com coordenadas incompatíveis com o bairro", async () => {
    listAllAirtableRecords.mockImplementation((tableId: string) =>
      Promise.resolve(
        tableId === "addresses"
          ? [
              {
                id: "address-invalid",
                createdTime: "2026-08-11T12:00:00.000Z",
                fields: {
                  Bairro: "Japiim",
                  Latitude: -3.011942,
                  Longitude: -59.979328,
                },
              },
            ]
          : [],
      ),
    );

    await expect(loadOperationalEntitiesFromAirtable()).resolves.toEqual([]);
  });
});
