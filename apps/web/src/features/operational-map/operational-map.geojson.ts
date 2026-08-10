import type {
  Feature,
  FeatureCollection,
  Polygon,
} from "geojson";

import {
  OPERATIONAL_ZONE_CONFIG,
} from "./operational-map.zones";

import type {
  OperationalCoordinates,
  OperationalZone,
  OperationalZoneStatus,
  OperationalZoneType,
} from "./operational-map.types";

export type OperationalZoneGeoJSONProperties = {
  id: string;
  name: string;
  description: string;
  type: OperationalZoneType;
  typeLabel: string;
  status: OperationalZoneStatus;
  priority: OperationalZone["priority"];
  reference: string;
  responsibleUnit: string;
  color: string;
  fillOpacity: number;
  createdAt: string;
  updatedAt: string;
};

export type OperationalZoneFeature = Feature<
  Polygon,
  OperationalZoneGeoJSONProperties
>;

export type OperationalZoneFeatureCollection =
  FeatureCollection<
    Polygon,
    OperationalZoneGeoJSONProperties
  >;

export type OperationalBounds = {
  southwest: OperationalCoordinates;
  northeast: OperationalCoordinates;
};

function clonePolygonCoordinates(
  coordinates: OperationalCoordinates[][],
): OperationalCoordinates[][] {
  return coordinates.map((ring) =>
    ring.map(
      ([longitude, latitude]) =>
        [longitude, latitude] as OperationalCoordinates,
    ),
  );
}

export function operationalZoneToFeature(
  zone: OperationalZone,
): OperationalZoneFeature {
  const configuration = OPERATIONAL_ZONE_CONFIG[zone.type];

  return {
    type: "Feature",
    id: zone.id,

    properties: {
      id: zone.id,
      name: zone.name,
      description: zone.description,
      type: zone.type,
      typeLabel: configuration.label,
      status: zone.status,
      priority: zone.priority,
      reference: zone.reference,
      responsibleUnit: zone.responsibleUnit,
      color: configuration.color,
      fillOpacity: configuration.fillOpacity,
      createdAt: zone.createdAt,
      updatedAt: zone.updatedAt,
    },

    geometry: {
      type: "Polygon",
      coordinates: clonePolygonCoordinates(zone.coordinates),
    },
  };
}

export function operationalZonesToFeatureCollection(
  zones: OperationalZone[],
): OperationalZoneFeatureCollection {
  return {
    type: "FeatureCollection",
    features: zones.map(operationalZoneToFeature),
  };
}

export function findOperationalZoneByFeatureId(
  zones: OperationalZone[],
  featureId: string | number | undefined,
): OperationalZone | null {
  if (featureId === undefined) {
    return null;
  }

  const normalizedFeatureId = String(featureId);

  return (
    zones.find((zone) => zone.id === normalizedFeatureId) ??
    null
  );
}

export function calculateOperationalZoneBounds(
  zone: OperationalZone,
): OperationalBounds | null {
  const points = zone.coordinates.flat();

  if (points.length === 0) {
    return null;
  }

  let minimumLongitude = Number.POSITIVE_INFINITY;
  let minimumLatitude = Number.POSITIVE_INFINITY;
  let maximumLongitude = Number.NEGATIVE_INFINITY;
  let maximumLatitude = Number.NEGATIVE_INFINITY;

  for (const [longitude, latitude] of points) {
    minimumLongitude = Math.min(
      minimumLongitude,
      longitude,
    );

    minimumLatitude = Math.min(
      minimumLatitude,
      latitude,
    );

    maximumLongitude = Math.max(
      maximumLongitude,
      longitude,
    );

    maximumLatitude = Math.max(
      maximumLatitude,
      latitude,
    );
  }

  if (
    !Number.isFinite(minimumLongitude) ||
    !Number.isFinite(minimumLatitude) ||
    !Number.isFinite(maximumLongitude) ||
    !Number.isFinite(maximumLatitude)
  ) {
    return null;
  }

  return {
    southwest: [
      minimumLongitude,
      minimumLatitude,
    ],

    northeast: [
      maximumLongitude,
      maximumLatitude,
    ],
  };
}

export function calculateOperationalZonesBounds(
  zones: OperationalZone[],
): OperationalBounds | null {
  const zoneBounds = zones
    .map(calculateOperationalZoneBounds)
    .filter(
      (
        bounds,
      ): bounds is OperationalBounds => bounds !== null,
    );

  if (zoneBounds.length === 0) {
    return null;
  }

  let minimumLongitude = Number.POSITIVE_INFINITY;
  let minimumLatitude = Number.POSITIVE_INFINITY;
  let maximumLongitude = Number.NEGATIVE_INFINITY;
  let maximumLatitude = Number.NEGATIVE_INFINITY;

  for (const bounds of zoneBounds) {
    minimumLongitude = Math.min(
      minimumLongitude,
      bounds.southwest[0],
    );

    minimumLatitude = Math.min(
      minimumLatitude,
      bounds.southwest[1],
    );

    maximumLongitude = Math.max(
      maximumLongitude,
      bounds.northeast[0],
    );

    maximumLatitude = Math.max(
      maximumLatitude,
      bounds.northeast[1],
    );
  }

  return {
    southwest: [
      minimumLongitude,
      minimumLatitude,
    ],

    northeast: [
      maximumLongitude,
      maximumLatitude,
    ],
  };
}