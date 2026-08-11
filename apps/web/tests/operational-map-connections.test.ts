import { describe, expect, it } from "vitest";

import { buildOperationalConnections } from "../src/features/operational-map/operational-map.connections";
import type { OperationalEntity } from "../src/features/operational-map/operational-map.types";

function entity(
  id: string,
  coordinates: [number, number],
  relationshipKeys: string[],
): OperationalEntity {
  return {
    id,
    type: "person",
    title: id,
    description: "Teste",
    coordinates,
    createdAt: "2026-08-11T00:00:00.000Z",
    priority: "normal",
    status: "Ativo",
    reference: id,
    locationLabel: "Manaus",
    relationshipKeys,
  };
}

describe("buildOperationalConnections", () => {
  it("liga somente entidades com vínculo explícito e coordenadas distintas", () => {
    const result = buildOperationalConnections(
      [
        entity("person-1", [-60.01, -3.1], ["relation-a"]),
        entity("vehicle-1", [-60.02, -3.11], ["relation-a"]),
        entity("unrelated", [-60.03, -3.12], ["relation-b"]),
        entity("same-point", [-60.01, -3.1], ["relation-a"]),
      ],
      null,
    );

    expect(result.features).toHaveLength(2);
    expect(result.features.map((feature) => feature.properties)).toEqual([
      {
        fromEntityId: "person-1",
        toEntityId: "vehicle-1",
        selected: false,
      },
      {
        fromEntityId: "vehicle-1",
        toEntityId: "same-point",
        selected: false,
      },
    ]);
  });

  it("destaca as conexões da entidade selecionada", () => {
    const result = buildOperationalConnections(
      [
        entity("person-1", [-60.01, -3.1], ["relation-a"]),
        entity("vehicle-1", [-60.02, -3.11], ["relation-a"]),
      ],
      "person-1",
    );

    expect(result.features[0].properties.selected).toBe(true);
  });

  it("não cria linha sem vínculo explícito ou entre registros no mesmo ponto", () => {
    const result = buildOperationalConnections(
      [
        entity("person-1", [-60.01, -3.1], ["relation-a"]),
        entity("same-point", [-60.01, -3.1], ["relation-a"]),
        entity("unrelated", [-60.02, -3.11], ["relation-b"]),
      ],
      null,
    );

    expect(result.features).toHaveLength(0);
  });
});
