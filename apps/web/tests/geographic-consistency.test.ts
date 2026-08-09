import { describe, expect, it } from "vitest";

import {
  isCoordinateConsistentWithNeighborhood,
  normalizeGeographicName,
} from "../src/features/operational-map/geographic-consistency";

describe("operational map geographic consistency", () => {
  it("normaliza bairro sem depender de acentos ou caixa", () => {
    expect(normalizeGeographicName("  JAPIÍM  ")).toBe("japiim");
  });

  it("aceita coordenada compatível com o Japiim", () => {
    expect(isCoordinateConsistentWithNeighborhood({
      neighborhood: "Japiim",
      latitude: -3.12,
      longitude: -59.99,
    })).toBe(true);
  });

  it("bloqueia coordenada do norte de Manaus rotulada como Japiim", () => {
    expect(isCoordinateConsistentWithNeighborhood({
      neighborhood: "Japiim",
      latitude: -3.011942,
      longitude: -59.979328,
    })).toBe(false);
  });

  it("não inventa regra para bairro ainda não cadastrado", () => {
    expect(isCoordinateConsistentWithNeighborhood({
      neighborhood: "Nova Cidade",
      latitude: -3.011942,
      longitude: -59.979328,
    })).toBe(true);
  });

  it("não aplica limite de bairro quando o campo está ausente", () => {
    expect(isCoordinateConsistentWithNeighborhood({
      neighborhood: undefined,
      latitude: -3.011942,
      longitude: -59.979328,
    })).toBe(true);
  });
});
