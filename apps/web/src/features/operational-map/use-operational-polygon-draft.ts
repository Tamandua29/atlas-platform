"use client";

import { useEffect, useMemo } from "react";

import { operationalDraftToFeatureCollection } from "./operational-map.drawing";

import type { OperationalCoordinates } from "./operational-map.types";
import type {
  GeoJSONSource,
  Map,
  MapLayerMouseEvent,
  MapMouseEvent,
} from "maplibre-gl";

const SOURCE_ID = "operational-polygon-draft";
const FILL_LAYER_ID = "operational-polygon-draft-fill";
const LINE_LAYER_ID = "operational-polygon-draft-line";
const POINT_LAYER_ID = "operational-polygon-draft-points";
const EMPTY_FEATURE_COLLECTION = {
  type: "FeatureCollection" as const,
  features: [],
};

type Options = {
  map: Map | null;
  enabled: boolean;
  completed: boolean;
  coordinates: OperationalCoordinates[];
  onAddCoordinate: (coordinate: OperationalCoordinates) => void;
  onMoveCoordinate: (index: number, coordinate: OperationalCoordinates) => void;
};

export function useOperationalPolygonDraft({
  map,
  enabled,
  completed,
  coordinates,
  onAddCoordinate,
  onMoveCoordinate,
}: Options) {
  const data = useMemo(
    () => operationalDraftToFeatureCollection(coordinates, completed),
    [completed, coordinates],
  );

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: EMPTY_FEATURE_COLLECTION,
      });
      map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        filter: ["==", ["get", "kind"], "polygon"],
        paint: { "fill-color": "#22d3ee", "fill-opacity": 0.16 },
      });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "kind"], "outline"],
        paint: { "line-color": "#22d3ee", "line-width": 3 },
      });
      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "kind"], "vertex"],
        paint: {
          "circle-color": "#e2e8f0",
          "circle-radius": 5,
          "circle-stroke-color": "#0891b2",
          "circle-stroke-width": 2,
        },
      });
    }

    return () => {
      for (const layerId of [POINT_LAYER_ID, LINE_LAYER_ID, FILL_LAYER_ID]) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(data);
  }, [data, map]);

  useEffect(() => {
    if (!map || !enabled || completed) return;

    const canvas = map.getCanvas();
    canvas.style.cursor = "crosshair";

    const handleClick = (event: MapMouseEvent) => {
      onAddCoordinate([event.lngLat.lng, event.lngLat.lat]);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
      canvas.style.cursor = "";
    };
  }, [completed, enabled, map, onAddCoordinate]);

  useEffect(() => {
    if (!map || !enabled || !completed) return;

    const canvas = map.getCanvas();
    let draggedVertexIndex: number | null = null;
    let dragPanWasEnabled = false;

    const handleVertexEnter = () => {
      if (draggedVertexIndex === null) canvas.style.cursor = "grab";
    };

    const handleVertexLeave = () => {
      if (draggedVertexIndex === null) canvas.style.cursor = "";
    };

    const handleVertexMouseDown = (event: MapLayerMouseEvent) => {
      const rawIndex = event.features?.[0]?.properties?.index;
      const index = typeof rawIndex === "number" ? rawIndex : Number(rawIndex);

      if (!Number.isInteger(index)) return;

      event.preventDefault();
      draggedVertexIndex = index;
      dragPanWasEnabled = map.dragPan.isEnabled();
      if (dragPanWasEnabled) map.dragPan.disable();
      canvas.style.cursor = "grabbing";
    };

    const handleMouseMove = (event: MapMouseEvent) => {
      if (draggedVertexIndex === null) return;
      onMoveCoordinate(draggedVertexIndex, [
        event.lngLat.lng,
        event.lngLat.lat,
      ]);
    };

    const finishDragging = () => {
      if (draggedVertexIndex === null) return;
      draggedVertexIndex = null;
      if (dragPanWasEnabled) map.dragPan.enable();
      dragPanWasEnabled = false;
      canvas.style.cursor = "grab";
    };

    map.on("mouseenter", POINT_LAYER_ID, handleVertexEnter);
    map.on("mouseleave", POINT_LAYER_ID, handleVertexLeave);
    map.on("mousedown", POINT_LAYER_ID, handleVertexMouseDown);
    map.on("mousemove", handleMouseMove);
    map.on("mouseup", finishDragging);

    return () => {
      map.off("mouseenter", POINT_LAYER_ID, handleVertexEnter);
      map.off("mouseleave", POINT_LAYER_ID, handleVertexLeave);
      map.off("mousedown", POINT_LAYER_ID, handleVertexMouseDown);
      map.off("mousemove", handleMouseMove);
      map.off("mouseup", finishDragging);
      if (dragPanWasEnabled) map.dragPan.enable();
      canvas.style.cursor = "";
    };
  }, [completed, enabled, map, onMoveCoordinate]);
}
