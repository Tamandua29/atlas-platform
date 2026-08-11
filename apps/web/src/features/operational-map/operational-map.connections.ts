import type { OperationalEntity } from "./operational-map.types";

type ConnectionProperties = {
  fromEntityId: string;
  toEntityId: string;
  selected: boolean;
};

type ConnectionFeature = {
  type: "Feature";
  properties: ConnectionProperties;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

export type OperationalConnectionFeatureCollection = {
  type: "FeatureCollection";
  features: ConnectionFeature[];
};

function shareExplicitRelationship(
  first: OperationalEntity,
  second: OperationalEntity,
): boolean {
  const secondKeys = new Set(second.relationshipKeys ?? []);
  return (first.relationshipKeys ?? []).some((key) => secondKeys.has(key));
}

function haveDistinctCoordinates(
  first: OperationalEntity,
  second: OperationalEntity,
): boolean {
  return (
    first.coordinates[0] !== second.coordinates[0] ||
    first.coordinates[1] !== second.coordinates[1]
  );
}

export function buildOperationalConnections(
  entities: OperationalEntity[],
  selectedEntityId: string | null,
): OperationalConnectionFeatureCollection {
  const features: ConnectionFeature[] = [];

  for (let firstIndex = 0; firstIndex < entities.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < entities.length;
      secondIndex += 1
    ) {
      const first = entities[firstIndex];
      const second = entities[secondIndex];

      if (
        !shareExplicitRelationship(first, second) ||
        !haveDistinctCoordinates(first, second)
      ) {
        continue;
      }

      features.push({
        type: "Feature",
        properties: {
          fromEntityId: first.id,
          toEntityId: second.id,
          selected:
            first.id === selectedEntityId || second.id === selectedEntityId,
        },
        geometry: {
          type: "LineString",
          coordinates: [first.coordinates, second.coordinates],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}
