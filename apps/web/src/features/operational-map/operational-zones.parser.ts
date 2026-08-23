import type {
  OperationalCoordinates,
  OperationalZone,
} from "./operational-map.types";

const ZONE_PRIORITIES = new Set<OperationalZone["priority"]>([
  "normal",
  "medium",
  "high",
]);

function isCoordinate(value: unknown): value is OperationalCoordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

export function parseOperationalZonePolygon(
  value: unknown,
): OperationalCoordinates[][] | null {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "type" in parsed &&
    "coordinates" in parsed
  ) {
    if (parsed.type !== "Polygon") return null;
    parsed = parsed.coordinates;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const rings: OperationalCoordinates[][] = [];

  for (const candidate of parsed) {
    if (!Array.isArray(candidate) || candidate.length < 4) return null;
    if (!candidate.every(isCoordinate)) return null;
    const ring = candidate as OperationalCoordinates[];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) return null;
    rings.push(ring);
  }

  return rings;
}

export function normalizeOperationalZonePriority(
  value: string | null,
): OperationalZone["priority"] {
  if (value && ZONE_PRIORITIES.has(value as OperationalZone["priority"])) {
    return value as OperationalZone["priority"];
  }
  return "normal";
}
