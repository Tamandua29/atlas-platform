import { describe, expect, it } from "vitest";

import {
  calculateOperationalZoneBounds,
  operationalZonesToFeatureCollection,
} from "../src/features/operational-map/operational-map.geojson";
import { DEMO_OPERATIONAL_ZONES } from "../src/features/operational-map/operational-map.zones";
import {
  normalizeOperationalZonePriority,
  parseOperationalZonePolygon,
} from "../src/features/operational-map/operational-zones.parser";

describe("áreas operacionais demonstrativas", () => {
  it("mantém um conjunto explícito e exclusivamente sintético", () => {
    expect(DEMO_OPERATIONAL_ZONES).toHaveLength(3);
    expect(
      DEMO_OPERATIONAL_ZONES.every((zone) =>
        zone.name.toLowerCase().includes("demonstrativ"),
      ),
    ).toBe(true);
  });

  it("mantém todos os anéis fechados", () => {
    for (const zone of DEMO_OPERATIONAL_ZONES) {
      for (const ring of zone.coordinates) {
        expect(ring.length).toBeGreaterThanOrEqual(4);
        expect(ring.at(-1)).toEqual(ring[0]);
      }
    }
  });

  it("converte todas as áreas para GeoJSON", () => {
    const featureCollection = operationalZonesToFeatureCollection(
      DEMO_OPERATIONAL_ZONES,
    );

    expect(featureCollection.type).toBe("FeatureCollection");
    expect(featureCollection.features).toHaveLength(
      DEMO_OPERATIONAL_ZONES.length,
    );
  });

  it("calcula limites geográficos válidos", () => {
    for (const zone of DEMO_OPERATIONAL_ZONES) {
      const bounds = calculateOperationalZoneBounds(zone);

      expect(bounds).not.toBeNull();
      expect(bounds!.southwest[0]).toBeLessThan(bounds!.northeast[0]);
      expect(bounds!.southwest[1]).toBeLessThan(bounds!.northeast[1]);
    }
  });
});

describe("validação de áreas operacionais persistidas", () => {
  it("aceita um Polygon GeoJSON fechado dentro dos limites geográficos", () => {
    const polygon = parseOperationalZonePolygon({
      type: "Polygon",
      coordinates: [
        [
          [-60.1, -3.2],
          [-60.0, -3.2],
          [-60.0, -3.1],
          [-60.1, -3.2],
        ],
      ],
    });

    expect(polygon).toHaveLength(1);
  });

  it("rejeita anel aberto, coordenada inválida e MultiPolygon", () => {
    expect(
      parseOperationalZonePolygon([
        [
          [-60, -3],
          [-59, -3],
          [-59, -2],
          [-58, -2],
        ],
      ]),
    ).toBeNull();
    expect(
      parseOperationalZonePolygon([
        [
          [-200, -3],
          [-59, -3],
          [-59, -2],
          [-200, -3],
        ],
      ]),
    ).toBeNull();
    expect(
      parseOperationalZonePolygon({ type: "MultiPolygon", coordinates: [] }),
    ).toBeNull();
  });

  it("normaliza prioridades desconhecidas para o nível seguro", () => {
    expect(normalizeOperationalZonePriority("high")).toBe("high");
    expect(normalizeOperationalZonePriority("critical")).toBe("normal");
    expect(normalizeOperationalZonePriority(null)).toBe("normal");
  });
});
