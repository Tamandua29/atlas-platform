"use client";

import { useEffect, useMemo } from "react";

import { buildOperationalConnections } from "./operational-map.connections";
import type { OperationalEntity } from "./operational-map.types";

const SOURCE_ID = "operational-connections";
const LAYER_ID = "operational-connections-lines";

type UseOperationalConnectionsOptions = {
  map: import("maplibre-gl").Map | null;
  entities: OperationalEntity[];
  selectedEntityId: string | null;
  enabled: boolean;
};

export function useOperationalConnections({
  map,
  entities,
  selectedEntityId,
  enabled,
}: UseOperationalConnectionsOptions) {
  const data = useMemo(
    () => buildOperationalConnections(entities, selectedEntityId),
    [entities, selectedEntityId],
  );

  useEffect(() => {
    if (!map || !enabled || !map.isStyleLoaded()) return;

    const existingSource = map.getSource(SOURCE_ID) as
      | import("maplibre-gl").GeoJSONSource
      | undefined;

    if (existingSource) {
      existingSource.setData(data);
      return;
    }

    map.addSource(SOURCE_ID, { type: "geojson", data });
    map.addLayer({
      id: LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "selected"], true],
          "#f8fafc",
          "#22d3ee",
        ],
        "line-width": [
          "case",
          ["==", ["get", "selected"], true],
          4,
          2,
        ],
        "line-opacity": [
          "case",
          ["==", ["get", "selected"], true],
          0.95,
          0.55,
        ],
        "line-dasharray": [2, 2],
      },
    });

    return () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [data, enabled, map]);

  return {
    visibleConnectionCount: enabled ? data.features.length : 0,
  };
}
