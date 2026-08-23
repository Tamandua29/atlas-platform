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
    baseId: "operational-base",
    occurrencesTableId: "occurrences",
    addressesTableId: "addresses",
    individualsTableId: "individuals",
    vehiclesTableId: "vehicles",
    warrantsTableId: "warrants",
    organizationsTableId: "organizations",
    organizationalLinksTableId: "organizational-links",
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
  individuals,
  organizations,
  links,
}: {
  addresses: AirtableTestRecord[];
  individuals: AirtableTestRecord[];
  organizations: AirtableTestRecord[];
  links: AirtableTestRecord[];
}) {
  listAllAirtableRecords.mockImplementation((tableId: string) => {
    if (tableId === "addresses") return Promise.resolve(addresses);
    if (tableId === "individuals") return Promise.resolve(individuals);
    if (tableId === "organizations") return Promise.resolve(organizations);
    if (tableId === "organizational-links") return Promise.resolve(links);
    return Promise.resolve([]);
  });
}

describe("operational map organization repository", () => {
  beforeEach(() => {
    listAllAirtableRecords.mockReset();
  });

  it("maps only an explicit active organization link without personal metadata", async () => {
    mockAirtableTables({
      addresses: [
        record("address-1", {
          Bairro: "Japiim",
          Latitude: -3.101,
          Longitude: -59.982,
          Indivíduos: ["individual-1"],
        }),
      ],
      individuals: [
        record("individual-1", {
          "Nome Completo": "Pessoa protegida",
        }),
      ],
      organizations: [
        record("recOrganization001", {
          "Nome da Organização": "Organização demonstrativa",
          Sigla: "OD",
          Tipo: "Grupo",
          Situação: "Monitorada",
          Observações: "segredo operacional",
        }),
      ],
      links: [
        record("link-1", {
          Indivíduo: ["individual-1"],
          Organização: ["recOrganization001"],
          "Registro Ativo": true,
          Fonte: "fonte protegida",
        }),
      ],
    });

    const entities = await loadOperationalEntitiesFromAirtable();
    const organization = entities.find(
      (entity) => entity.type === "organization",
    );

    expect(organization).toMatchObject({
      id: "organization:recOrganization001:address-1",
      type: "organization",
      title: "Organização demonstrativa (OD)",
      description: "Grupo",
      coordinates: [-59.982, -3.101],
      priority: "normal",
      status: "Monitorada",
      reference: "recOrganization001",
    });
    expect(JSON.stringify(organization)).not.toContain("Pessoa protegida");
    expect(JSON.stringify(organization)).not.toContain("segredo operacional");
    expect(JSON.stringify(organization)).not.toContain("fonte protegida");
  });

  it("does not map an inactive organization link", async () => {
    mockAirtableTables({
      addresses: [
        record("address-1", {
          Bairro: "Japiim",
          Latitude: -3.101,
          Longitude: -59.982,
          Indivíduos: ["individual-1"],
        }),
      ],
      individuals: [record("individual-1", { "Nome Completo": "Pessoa" })],
      organizations: [
        record("recOrganization001", {
          "Nome da Organização": "Organização demonstrativa",
        }),
      ],
      links: [
        record("link-1", {
          Indivíduo: ["individual-1"],
          Organização: ["recOrganization001"],
          "Registro Ativo": false,
        }),
      ],
    });

    const entities = await loadOperationalEntitiesFromAirtable();

    expect(entities.some((entity) => entity.type === "organization")).toBe(
      false,
    );
  });

  it("discards an organization location inconsistent with Japiim", async () => {
    mockAirtableTables({
      addresses: [
        record("address-north", {
          Bairro: "Japiim",
          Latitude: -3.011942,
          Longitude: -59.979328,
          Indivíduos: ["individual-1"],
        }),
      ],
      individuals: [record("individual-1", { "Nome Completo": "Pessoa" })],
      organizations: [
        record("recOrganization001", {
          "Nome da Organização": "Organização demonstrativa",
        }),
      ],
      links: [
        record("link-1", {
          Indivíduo: ["individual-1"],
          Organização: ["recOrganization001"],
        }),
      ],
    });

    const entities = await loadOperationalEntitiesFromAirtable();

    expect(entities.some((entity) => entity.type === "organization")).toBe(
      false,
    );
  });
});
