import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

import type { OperationalCoordinates } from "./operational-map.types";

export const MINIMUM_POLYGON_VERTICES = 3;
const EARTH_RADIUS_METERS = 6_371_008.8;

export type OperationalPolygonMetrics = {
  areaSquareMeters: number;
  perimeterMeters: number;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceInMeters(
  start: OperationalCoordinates,
  end: OperationalCoordinates,
): number {
  const latitudeDelta = toRadians(end[1] - start[1]);
  const longitudeDelta = toRadians(end[0] - start[0]);
  const startLatitude = toRadians(start[1]);
  const endLatitude = toRadians(end[1]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function canCompleteOperationalPolygon(
  coordinates: OperationalCoordinates[],
): boolean {
  return coordinates.length >= MINIMUM_POLYGON_VERTICES;
}

export function replaceOperationalPolygonVertex(
  coordinates: OperationalCoordinates[],
  index: number,
  coordinate: OperationalCoordinates,
): OperationalCoordinates[] {
  if (!Number.isInteger(index) || index < 0 || index >= coordinates.length) {
    return coordinates;
  }

  return coordinates.map((current, currentIndex) =>
    currentIndex === index ? coordinate : current,
  );
}

export function closeOperationalPolygon(
  coordinates: OperationalCoordinates[],
): OperationalCoordinates[] {
  if (!canCompleteOperationalPolygon(coordinates)) return coordinates;

  const first = coordinates[0];
  const last = coordinates.at(-1);

  if (last?.[0] === first[0] && last?.[1] === first[1]) {
    return coordinates;
  }

  return [...coordinates, first];
}

export function measureOperationalPolygon(
  coordinates: OperationalCoordinates[],
): OperationalPolygonMetrics | null {
  if (!canCompleteOperationalPolygon(coordinates)) return null;

  const closedCoordinates = closeOperationalPolygon(coordinates);
  const meanLatitude =
    coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) /
    coordinates.length;
  const longitudeScale = Math.cos(toRadians(meanLatitude));
  const projectedCoordinates = closedCoordinates.map(
    ([longitude, latitude]) =>
      [
        EARTH_RADIUS_METERS * toRadians(longitude) * longitudeScale,
        EARTH_RADIUS_METERS * toRadians(latitude),
      ] as const,
  );

  let signedDoubleArea = 0;
  let perimeterMeters = 0;

  for (let index = 0; index < closedCoordinates.length - 1; index += 1) {
    const current = projectedCoordinates[index];
    const next = projectedCoordinates[index + 1];
    signedDoubleArea += current[0] * next[1] - next[0] * current[1];
    perimeterMeters += distanceInMeters(
      closedCoordinates[index],
      closedCoordinates[index + 1],
    );
  }

  return {
    areaSquareMeters: Math.abs(signedDoubleArea) / 2,
    perimeterMeters,
  };
}

export function operationalDraftToFeatureCollection(
  coordinates: OperationalCoordinates[],
  completed: boolean,
): FeatureCollection<Geometry, GeoJsonProperties> {
  const features: FeatureCollection<Geometry, GeoJsonProperties>["features"] =
    coordinates.map((coordinate, index) => ({
      type: "Feature",
      properties: { kind: "vertex", index },
      geometry: { type: "Point", coordinates: coordinate },
    }));

  if (coordinates.length >= 2) {
    features.push({
      type: "Feature",
      properties: { kind: "outline" },
      geometry: {
        type: "LineString",
        coordinates: completed
          ? closeOperationalPolygon(coordinates)
          : coordinates,
      },
    });
  }

  if (completed && canCompleteOperationalPolygon(coordinates)) {
    features.push({
      type: "Feature",
      properties: { kind: "polygon" },
      geometry: {
        type: "Polygon",
        coordinates: [closeOperationalPolygon(coordinates)],
      },
    });
  }

  return { type: "FeatureCollection", features };
}
