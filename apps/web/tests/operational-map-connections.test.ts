import { describe, expect, it } from "vitest";

import { buildOperationalConnections } from "../src/features/operational-map/operational-map.connections";

import type { OperationalEntity } from "../src/features/operational-map/operational-map.types";

function entity(
  id: string,
  coordinates: [number, number],
  relationshipKeys: string[] = [],
): OperationalEntity {
  return {
    id,
    type: "person",
    title: id,
    description: "",
    coordinates,
    createdAt: "2026-08-09T00:00:00.000Z",
    status: "Ativo",
    reference: id,
    locationLabel: "Manaus",
    relationshipKeys,
  };
}

describe("buildOperationalConnections", () => {
  it("liga registros com vínculo explícito e coordenadas distintas", () => {
    const result = buildOperationalConnections(
      [
        entity("pessoa", [-60, -3.1], ["caso:1"]),
        entity("ocorrencia", [-59.9, -3.2], ["caso:1"]),
      ],
      null,
    );

    expect(result.features).toHaveLength(1);
    expect(result.features[0]).toMatchObject({
      properties: {
        fromEntityId: "pessoa",
        toEntityId: "ocorrencia",
        selected: false,
      },
      geometry: {
        coordinates: [
          [-60, -3.1],
          [-59.9, -3.2],
        ],
      },
    });
  });

  it("não infere ligação sem chave compartilhada", () => {
    const result = buildOperationalConnections(
      [
        entity("a", [-60, -3.1], ["caso:1"]),
        entity("b", [-59.9, -3.2], ["caso:2"]),
      ],
      null,
    );

    expect(result.features).toHaveLength(0);
  });

  it("não desenha linha entre registros na mesma coordenada", () => {
    const result = buildOperationalConnections(
      [
        entity("a", [-60, -3.1], ["caso:1"]),
        entity("b", [-60, -3.1], ["caso:1"]),
      ],
      null,
    );

    expect(result.features).toHaveLength(0);
  });

  it("destaca as ligações da entidade selecionada", () => {
    const result = buildOperationalConnections(
      [
        entity("a", [-60, -3.1], ["caso:1"]),
        entity("b", [-59.9, -3.2], ["caso:1"]),
      ],
      "b",
    );

    expect(result.features[0]?.properties.selected).toBe(true);
  });

  it("gera uma única ligação para cada par relacionado", () => {
    const result = buildOperationalConnections(
      [
        entity("a", [-60, -3.1], ["grupo:1"]),
        entity("b", [-59.9, -3.2], ["grupo:1"]),
        entity("c", [-59.8, -3.3], ["grupo:1"]),
      ],
      null,
    );

    expect(result.features).toHaveLength(3);
  });
});
