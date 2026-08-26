import { describe, expect, it } from "vitest";
import { buildRasterMapTiles } from "../src/features/individuals/raster-map-preview";

describe("buildRasterMapTiles", () => {
  it("builds a raster preview without a WebGL dependency", () => {
    const tiles = buildRasterMapTiles(-3.011942, -59.979328);

    expect(tiles).toHaveLength(15);
    expect(
      tiles.every((tile) =>
        tile.url.startsWith("https://tile.openstreetmap.org/15/"),
      ),
    ).toBe(true);
    expect(new Set(tiles.map((tile) => tile.key)).size).toBe(15);
  });

  it("keeps tile indexes valid near the antimeridian", () => {
    const tiles = buildRasterMapTiles(0, 180);

    expect(tiles.every((tile) => !tile.url.includes("/-"))).toBe(true);
  });
});
