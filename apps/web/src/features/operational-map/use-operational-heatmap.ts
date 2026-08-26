"use client";

import { useEffect, useMemo } from "react";

import type { FeatureCollection, Point } from "geojson";

import type { OperationalEntity } from "./operational-map.types";

const SOURCE_ID = "operational-occurrence-heatmap";
const HEATMAP_LAYER_ID = "operational-occurrence-heatmap-density";
const POINT_LAYER_ID = "operational-occurrence-heatmap-points";

type HeatmapProperties = {
  priority: string;
};

type UseOperationalHeatmapOptions = {
  map: import("maplibre-gl").Map | null;
  entities: OperationalEntity[];
  enabled: boolean;
};

function buildOccurrenceHeatmap(
  entities: OperationalEntity[],
): FeatureCollection<Point, HeatmapProperties> {
  return {
    type: "FeatureCollection",
    features: entities
      .filter((entity) => entity.type === "occurrence")
      .map((entity) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: entity.coordinates,
        },
        properties: {
          priority: entity.priority ?? "normal",
        },
      })),
  };
}

export function useOperationalHeatmap({
  map,
  entities,
  enabled,
}: UseOperationalHeatmapOptions) {
  const data = useMemo(() => buildOccurrenceHeatmap(entities), [entities]);

  useEffect(() => {
    if (!map || !enabled || !map.isStyleLoaded()) return;

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data,
    });

    map.addLayer({
      id: HEATMAP_LAYER_ID,
      type: "heatmap",
      source: SOURCE_ID,
      maxzoom: 16,
      paint: {
        "heatmap-weight": [
          "match",
          ["get", "priority"],
          "high",
          1,
          "medium",
          0.7,
          0.45,
        ],
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          0.8,
          15,
          1.8,
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 18, 15, 42],
        "heatmap-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          0.78,
          16,
          0.18,
        ],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(2, 6, 23, 0)",
          0.2,
          "#22d3ee",
          0.45,
          "#facc15",
          0.7,
          "#fb923c",
          1,
          "#ef4444",
        ],
      },
    });

    map.addLayer({
      id: POINT_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      minzoom: 14,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 3, 17, 7],
        "circle-color": "#fb923c",
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14,
          0.35,
          17,
          0.75,
        ],
        "circle-stroke-color": "#fff7ed",
        "circle-stroke-width": 1,
      },
    });

    return () => {
      if (map.getLayer(POINT_LAYER_ID)) map.removeLayer(POINT_LAYER_ID);
      if (map.getLayer(HEATMAP_LAYER_ID)) map.removeLayer(HEATMAP_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [data, enabled, map]);

  return {
    heatmapPointCount: data.features.length,
  };
}
