import { describe, expect, it } from "vitest";

import {
  canCompleteOperationalPolygon,
  closeOperationalPolygon,
  measureOperationalPolygon,
  operationalDraftToFeatureCollection,
  replaceOperationalPolygonVertex,
} from "../src/features/operational-map/operational-map.drawing";

const triangle: [number, number][] = [
  [-60.02, -3.11],
  [-60.01, -3.11],
  [-60.01, -3.1],
];

describe("operational polygon drawing", () => {
  it("requires three vertices", () => {
    expect(canCompleteOperationalPolygon(triangle.slice(0, 2))).toBe(false);
    expect(canCompleteOperationalPolygon(triangle)).toBe(true);
  });

  it("closes the polygon exactly once", () => {
    const closed = closeOperationalPolygon(triangle);
    expect(closed).toHaveLength(4);
    expect(closed.at(-1)).toEqual(closed[0]);
    expect(closeOperationalPolygon(closed)).toHaveLength(4);
  });

  it("only creates a polygon after completion", () => {
    const draft = operationalDraftToFeatureCollection(triangle, false);
    const completed = operationalDraftToFeatureCollection(triangle, true);
    expect(
      draft.features.some((feature) => feature.geometry.type === "Polygon"),
    ).toBe(false);
    expect(
      completed.features.some((feature) => feature.geometry.type === "Polygon"),
    ).toBe(true);
  });

  it("moves one vertex without mutating the original coordinates", () => {
    const moved = replaceOperationalPolygonVertex(triangle, 1, [-60, -3.12]);

    expect(moved).not.toBe(triangle);
    expect(moved[1]).toEqual([-60, -3.12]);
    expect(triangle[1]).toEqual([-60.01, -3.11]);
    expect(moved[0]).toBe(triangle[0]);
  });

  it("ignores an invalid vertex index", () => {
    expect(replaceOperationalPolygonVertex(triangle, 20, [-60, -3.12])).toBe(
      triangle,
    );
  });

  it("does not measure an incomplete polygon", () => {
    expect(measureOperationalPolygon(triangle.slice(0, 2))).toBeNull();
  });

  it("estimates area and perimeter for a small operational polygon", () => {
    const squareNearManaus: [number, number][] = [
      [-60, -3],
      [-59.999, -3],
      [-59.999, -2.999],
      [-60, -2.999],
    ];
    const metrics = measureOperationalPolygon(squareNearManaus);

    expect(metrics).not.toBeNull();
    expect(metrics?.areaSquareMeters).toBeGreaterThan(12_000);
    expect(metrics?.areaSquareMeters).toBeLessThan(12_500);
    expect(metrics?.perimeterMeters).toBeGreaterThan(440);
    expect(metrics?.perimeterMeters).toBeLessThan(450);
  });
});
