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

type TestRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

const record = (id: string, fields: Record<string, unknown>): TestRecord => ({
  id,
  createdTime: "2026-08-11T12:00:00.000Z",
  fields,
});

function mockTables(addresses: TestRecord[], warrants: TestRecord[]) {
  listAllAirtableRecords.mockImplementation((tableId: string) => {
    if (tableId === "addresses") return Promise.resolve(addresses);
    if (tableId === "warrants") return Promise.resolve(warrants);
    return Promise.resolve([]);
  });
}

describe("operational map alert repository", () => {
  beforeEach(() => listAllAirtableRecords.mockReset());

  it("cria alerta georreferenciado sem expor números integrais", async () => {
    mockTables(
      [
        record("address-1", {
          "Endereço Completo": "Rua Teste, 100 — Japiim — Manaus",
          Bairro: "Japiim",
          Latitude: -3.101,
          Longitude: -59.982,
        }),
      ],
      [
        record("warrant-1", {
          "Número do Mandado": "MANDADO-123456789",
          "Número do Processo": "PROCESSO-987654321",
          "Tipo de Mandado": "Mandado de prisão",
          "Status do Mandado": "Vigente",
          "Data de Emissão": "2026-08-01",
          Endereços: ["address-1"],
        }),
      ],
    );

    const entities = await loadOperationalEntitiesFromAirtable();

    expect(entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
        id: "alert:warrant-1:address-1",
        type: "alert",
        title: "Mandado de prisão",
        coordinates: [-59.982, -3.101],
        priority: "medium",
        status: "Vigente",
        reference: "warrant-1",
        }),
      ]),
    );
    expect(JSON.stringify(entities)).not.toContain("MANDADO-123456789");
    expect(JSON.stringify(entities)).not.toContain("PROCESSO-987654321");
    const alert = entities.find((entity) => entity.type === "alert");
    expect(alert?.description).toContain("6789");
    expect(alert?.description).toContain("4321");
  });

  it("não publica mandado encerrado ou vencido como alerta", async () => {
    mockTables(
      [
        record("address-1", {
          Bairro: "Japiim",
          Latitude: -3.101,
          Longitude: -59.982,
          Mandados: ["warrant-closed", "warrant-expired"],
        }),
      ],
      [
        record("warrant-closed", { "Status do Mandado": "Cumprido" }),
        record("warrant-expired", {
          "Status do Mandado": "Vigente",
          "Data de Validade": "2020-01-01",
        }),
      ],
    );

    const entities = await loadOperationalEntitiesFromAirtable();

    expect(entities.filter((entity) => entity.type === "alert")).toEqual([]);
  });
});
