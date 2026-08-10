import { describe, expect, it } from "vitest";

import {
  calculateOperationalZoneBounds,
  operationalZonesToFeatureCollection,
} from "../src/features/operational-map/operational-map.geojson";
import { DEMO_OPERATIONAL_ZONES } from "../src/features/operational-map/operational-map.zones";

describe("áreas operacionais demonstrativas", () => {
  it("mantém um conjunto explícito e exclusivamente sintético", () => {
    expect(DEMO_OPERATIONAL_ZONES).toHaveLength(3);
    expect(DEMO_OPERATIONAL_ZONES.every((zone) => zone.name.toLowerCase().includes("demonstrativ"))).toBe(true);
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
