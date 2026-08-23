import { describe, expect, it } from "vitest";

import {
  DEFAULT_OPERATIONAL_MAP_FILTERS,
  filterOperationalEntities,
  getOperationalStatusOptions,
  hasActiveOperationalMapFilters,
  matchesOperationalEntitySearch,
} from "../src/features/operational-map/operational-map.search";

import type { OperationalEntity } from "../src/features/operational-map/operational-map.types";

const entities: OperationalEntity[] = [
  {
    id: "person:1",
    type: "person",
    title: "Érinaldo Soares da Silva",
    description: "Dado protegido que não deve participar da busca.",
    coordinates: [-60.01, -3.1],
    createdAt: "2026-08-01T12:00:00.000Z",
    status: "Ativo",
    reference: "REC-PESSOA-001",
    locationLabel: "Japiim, Manaus - AM",
    relationshipKeys: ["opaque-secret-key"],
  },
  {
    id: "occurrence:1",
    type: "occurrence",
    title: "Tráfico de drogas",
    description: "Narrativa protegida.",
    coordinates: [-59.98, -3.11],
    createdAt: "2026-08-01T13:00:00.000Z",
    priority: "high",
    status: "Em andamento",
    reference: "TESTE-ATLAS-001",
    locationLabel: "Distrito Industrial, Manaus - AM",
  },
];

describe("operational map search", () => {
  it("matches names without depending on case or accents", () => {
    expect(matchesOperationalEntitySearch(entities[0], "erinaldo")).toBe(true);
  });

  it("matches reference, location and entity category", () => {
    expect(filterOperationalEntities(entities, "ATLAS-001")).toEqual([
      entities[1],
    ]);
    expect(filterOperationalEntities(entities, "japiim")).toEqual([
      entities[0],
    ]);
    expect(filterOperationalEntities(entities, "ocorrencias")).toEqual([
      entities[1],
    ]);
  });

  it("returns every entity for an empty query", () => {
    expect(filterOperationalEntities(entities, "   ")).toEqual(entities);
  });

  it("does not expose protected descriptions or relationship keys to search", () => {
    expect(filterOperationalEntities(entities, "dado protegido")).toEqual([]);
    expect(filterOperationalEntities(entities, "opaque-secret-key")).toEqual(
      [],
    );
  });

  it("combines text, type, priority and status filters", () => {
    expect(
      filterOperationalEntities(entities, "atlas", {
        entityType: "occurrence",
        priority: "high",
        status: "em ANDAMENTO",
        period: "all",
      }),
    ).toEqual([entities[1]]);
  });

  it("treats an omitted priority as normal", () => {
    expect(
      filterOperationalEntities(entities, "", {
        ...DEFAULT_OPERATIONAL_MAP_FILTERS,
        priority: "normal",
      }),
    ).toEqual([entities[0]]);
  });

  it("filters by a deterministic period and excludes future records", () => {
    expect(
      filterOperationalEntities(
        entities,
        "",
        { ...DEFAULT_OPERATIONAL_MAP_FILTERS, period: "24h" },
        new Date("2026-08-02T12:30:00.000Z"),
      ),
    ).toEqual([entities[1]]);
  });

  it("reports active filters and unique status options", () => {
    expect(
      hasActiveOperationalMapFilters(DEFAULT_OPERATIONAL_MAP_FILTERS),
    ).toBe(false);
    expect(
      hasActiveOperationalMapFilters({
        ...DEFAULT_OPERATIONAL_MAP_FILTERS,
        entityType: "person",
      }),
    ).toBe(true);
    expect(getOperationalStatusOptions([...entities, entities[0]])).toEqual([
      "Ativo",
      "Em andamento",
    ]);
  });
});
