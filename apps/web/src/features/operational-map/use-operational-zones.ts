"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import type {
  Map,
  MapLayerMouseEvent,
} from "maplibre-gl";

import {
  calculateOperationalZoneBounds,
  findOperationalZoneByFeatureId,
  operationalZonesToFeatureCollection,
} from "./operational-map.geojson";

import {
  addOperationalZoneLayers,
  removeOperationalZoneLayers,
  selectOperationalZoneLayer,
  setOperationalZoneLayersVisibility,
  updateOperationalZoneSource,
  type OperationalZoneLayerHandlers,
} from "./operational-map.zone-layers";

import type {
  OperationalZone,
} from "./operational-map.types";

export type UseOperationalZonesOptions = {
  map: Map | null;
  zones: OperationalZone[];
  enabled: boolean;
  selectedZoneId: string | null;
  onSelectZone: (zone: OperationalZone | null) => void;
};

export type OperationalZoneController = {
  fitSelectedZone: () => void;
  fitAllZones: () => void;
  clearSelection: () => void;
};

const EMPTY_ZONE_ID = "__none__";

export function useOperationalZones({
  map,
  zones,
  enabled,
  selectedZoneId,
  onSelectZone,
}: UseOperationalZonesOptions): OperationalZoneController {
  const initializedMapRef = useRef<Map | null>(null);

  const featureCollection = useMemo(
    () => operationalZonesToFeatureCollection(zones),
    [zones],
  );

  const selectedZone = useMemo(
    () =>
      zones.find((zone) => zone.id === selectedZoneId) ??
      null,
    [selectedZoneId, zones],
  );

  const handleZoneClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const clickedFeature = event.features?.[0];

      const featureIdentifier =
        clickedFeature?.properties?.id ??
        clickedFeature?.id ??
        EMPTY_ZONE_ID;

      const zone = findOperationalZoneByFeatureId(
        zones,
        featureIdentifier,
      );

      onSelectZone(zone);
    },
    [onSelectZone, zones],
  );

  const handleMouseEnter = useCallback(() => {
    if (!map) {
      return;
    }

    map.getCanvas().style.cursor = "pointer";
  }, [map]);

  const handleMouseLeave = useCallback(() => {
    if (!map) {
      return;
    }

    map.getCanvas().style.cursor = "";
  }, [map]);

  const handlers = useMemo<OperationalZoneLayerHandlers>(
    () => ({
      onZoneClick: handleZoneClick,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    }),
    [
      handleMouseEnter,
      handleMouseLeave,
      handleZoneClick,
    ],
  );

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    if (initializedMapRef.current === map) {
      return;
    }

    addOperationalZoneLayers({
      map,
      data: featureCollection,
      handlers,
    });

    initializedMapRef.current = map;

    return () => {
      if (initializedMapRef.current !== map) {
        return;
      }

      removeOperationalZoneLayers(map, handlers);
      initializedMapRef.current = null;
    };
  }, [featureCollection, handlers, map]);

  useEffect(() => {
    if (!map || initializedMapRef.current !== map) {
      return;
    }

    updateOperationalZoneSource(
      map,
      featureCollection,
    );
  }, [featureCollection, map]);

  useEffect(() => {
    if (!map || initializedMapRef.current !== map) {
      return;
    }

    setOperationalZoneLayersVisibility(map, enabled);
  }, [enabled, map]);

  useEffect(() => {
    if (!map || initializedMapRef.current !== map) {
      return;
    }

    selectOperationalZoneLayer(
      map,
      selectedZoneId,
    );
  }, [map, selectedZoneId]);

  const fitSelectedZone = useCallback(() => {
    if (!map || !selectedZone) {
      return;
    }

    const bounds =
      calculateOperationalZoneBounds(selectedZone);

    if (!bounds) {
      return;
    }

    map.fitBounds(
      [
        bounds.southwest,
        bounds.northeast,
      ],
      {
        padding: {
          top: 80,
          right: 380,
          bottom: 80,
          left: 340,
        },
        duration: 900,
        maxZoom: 15,
        essential: true,
      },
    );
  }, [map, selectedZone]);

  const fitAllZones = useCallback(() => {
    if (!map || zones.length === 0) {
      return;
    }

    let minimumLongitude =
      Number.POSITIVE_INFINITY;

    let minimumLatitude =
      Number.POSITIVE_INFINITY;

    let maximumLongitude =
      Number.NEGATIVE_INFINITY;

    let maximumLatitude =
      Number.NEGATIVE_INFINITY;

    for (const zone of zones) {
      const bounds =
        calculateOperationalZoneBounds(zone);

      if (!bounds) {
        continue;
      }

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

    if (
      !Number.isFinite(minimumLongitude) ||
      !Number.isFinite(minimumLatitude) ||
      !Number.isFinite(maximumLongitude) ||
      !Number.isFinite(maximumLatitude)
    ) {
      return;
    }

    map.fitBounds(
      [
        [minimumLongitude, minimumLatitude],
        [maximumLongitude, maximumLatitude],
      ],
      {
        padding: {
          top: 80,
          right: 80,
          bottom: 80,
          left: 340,
        },
        duration: 900,
        maxZoom: 13,
        essential: true,
      },
    );
  }, [map, zones]);

  const clearSelection = useCallback(() => {
    onSelectZone(null);
  }, [onSelectZone]);

  return {
    fitSelectedZone,
    fitAllZones,
    clearSelection,
  };
}