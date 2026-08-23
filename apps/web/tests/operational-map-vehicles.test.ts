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

type AirtableTestRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

const createdTime = "2026-08-11T12:00:00.000Z";

function record(
  id: string,
  fields: Record<string, unknown>,
): AirtableTestRecord {
  return { id, createdTime, fields };
}

function mockAirtableTables({
  addresses,
  vehicles,
}: {
  addresses: AirtableTestRecord[];
  vehicles: AirtableTestRecord[];
}) {
  listAllAirtableRecords.mockImplementation((tableId: string) => {
    if (tableId === "addresses") return Promise.resolve(addresses);
    if (tableId === "vehicles") return Promise.resolve(vehicles);
    return Promise.resolve([]);
  });
}

describe("operational map vehicle repository", () => {
  beforeEach(() => {
    listAllAirtableRecords.mockReset();
  });

  it("cria marcador seguro para veículo vinculado a endereço", async () => {
    mockAirtableTables({
      addresses: [
        record("address-1", {
          "Endereço Completo": "Rua Teste, 100 — Japiim — Manaus",
          Bairro: "Japiim",
          Latitude: -3.101,
          Longitude: -59.982,
        }),
      ],
      vehicles: [
        record("vehicle-1", {
          Placa: "ABC1D23",
          Marca: "Toyota",
          Modelo: "Corolla",
          Cor: "Prata",
          Ano: 2024,
          Situação: "Apreendido",
          RENAVAM: "12345678901",
          Endereços: ["address-1"],
        }),
      ],
    });

    const entities = await loadOperationalEntitiesFromAirtable();

    expect(entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
        id: "vehicle:vehicle-1:address-1",
        type: "vehicle",
        title: "Toyota Corolla",
        description: "ABC•••3 — Cor: Prata — Ano: 2024",
        coordinates: [-59.982, -3.101],
        priority: "high",
        status: "Apreendido",
        reference: "vehicle-1",
        locationLabel: "Rua Teste, 100 — Japiim — Manaus",
        }),
      ]),
    );
    expect(JSON.stringify(entities)).not.toContain("12345678901");
    expect(JSON.stringify(entities)).not.toContain("ABC1D23");
  });

  it("aceita vínculo reverso e não duplica o mesmo veículo no endereço", async () => {
    mockAirtableTables({
      addresses: [
        record("address-1", {
          Bairro: "Japiim",
          Latitude: -3.101,
          Longitude: -59.982,
          Veículos: ["vehicle-1"],
        }),
      ],
      vehicles: [
        record("vehicle-1", {
          Placa: "XYZ9K87",
          Marca: "Honda",
          Modelo: "Civic",
          Endereços: ["address-1"],
        }),
      ],
    });

    const entities = await loadOperationalEntitiesFromAirtable();

    const vehicleEntities = entities.filter(
      (entity) => entity.type === "vehicle",
    );

    expect(vehicleEntities).toHaveLength(1);
    expect(vehicleEntities[0]).toMatchObject({
      id: "vehicle:vehicle-1:address-1",
      description: "XYZ•••7",
    });
  });

  it("descarta coordenada incompatível com o bairro informado", async () => {
    mockAirtableTables({
      addresses: [
        record("address-north", {
          Bairro: "Japiim",
          Latitude: -3.011942,
          Longitude: -59.979328,
          Veículos: ["vehicle-1"],
        }),
      ],
      vehicles: [
        record("vehicle-1", {
          Placa: "ABC1D23",
          Endereços: ["address-north"],
        }),
      ],
    });

    await expect(loadOperationalEntitiesFromAirtable()).resolves.toEqual([]);
  });
});
