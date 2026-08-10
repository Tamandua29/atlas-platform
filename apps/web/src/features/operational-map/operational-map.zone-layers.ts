import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map,
  MapLayerMouseEvent,
} from "maplibre-gl";

import type { OperationalZoneFeatureCollection } from "./operational-map.geojson";

export const OPERATIONAL_ZONES_SOURCE_ID =
  "atlas-operational-zones-source";

export const OPERATIONAL_ZONES_FILL_LAYER_ID =
  "atlas-operational-zones-fill";

export const OPERATIONAL_ZONES_OUTLINE_LAYER_ID =
  "atlas-operational-zones-outline";

export const OPERATIONAL_ZONES_SELECTED_FILL_LAYER_ID =
  "atlas-operational-zones-selected-fill";

export const OPERATIONAL_ZONES_SELECTED_OUTLINE_LAYER_ID =
  "atlas-operational-zones-selected-outline";

export const OPERATIONAL_ZONES_LABEL_LAYER_ID =
  "atlas-operational-zones-label";

export const OPERATIONAL_ZONE_LAYER_IDS = [
  OPERATIONAL_ZONES_FILL_LAYER_ID,
  OPERATIONAL_ZONES_OUTLINE_LAYER_ID,
  OPERATIONAL_ZONES_SELECTED_FILL_LAYER_ID,
  OPERATIONAL_ZONES_SELECTED_OUTLINE_LAYER_ID,
  OPERATIONAL_ZONES_LABEL_LAYER_ID,
] as const;

export type OperationalZoneClickHandler = (
  event: MapLayerMouseEvent,
) => void;

export type OperationalZoneLayerHandlers = {
  onZoneClick: OperationalZoneClickHandler;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export type AddOperationalZoneLayersOptions = {
  map: Map;
  data: OperationalZoneFeatureCollection;
  handlers: OperationalZoneLayerHandlers;
};

function sourceExists(map: Map) {
  return Boolean(map.getSource(OPERATIONAL_ZONES_SOURCE_ID));
}

function layerExists(map: Map, layerId: string) {
  return Boolean(map.getLayer(layerId));
}

function getZonesSource(map: Map) {
  return map.getSource(
    OPERATIONAL_ZONES_SOURCE_ID,
  ) as GeoJSONSource | undefined;
}

function createZoneVisibilityExpression(): ExpressionSpecification {
  return [
    "case",
    ["boolean", ["feature-state", "visible"], true],
    1,
    0,
  ];
}

function createSelectedZoneFilter(
  selectedZoneId: string | null,
): ["==", ["get", "id"], string] {
  return [
    "==",
    ["get", "id"],
    selectedZoneId ?? "__none__",
  ];
}

export function addOperationalZoneLayers({
  map,
  data,
  handlers,
}: AddOperationalZoneLayersOptions) {
  if (!sourceExists(map)) {
    map.addSource(OPERATIONAL_ZONES_SOURCE_ID, {
      type: "geojson",
      data,
      promoteId: "id",
    });
  }

  if (!layerExists(map, OPERATIONAL_ZONES_FILL_LAYER_ID)) {
    map.addLayer({
      id: OPERATIONAL_ZONES_FILL_LAYER_ID,
      type: "fill",
      source: OPERATIONAL_ZONES_SOURCE_ID,

      paint: {
        "fill-color": [
          "coalesce",
          ["get", "color"],
          "#22d3ee",
        ],

        "fill-opacity": [
          "*",
          [
            "coalesce",
            ["get", "fillOpacity"],
            0.18,
          ],
          createZoneVisibilityExpression(),
        ],
      },
    });
  }

  if (
    !layerExists(
      map,
      OPERATIONAL_ZONES_OUTLINE_LAYER_ID,
    )
  ) {
    map.addLayer({
      id: OPERATIONAL_ZONES_OUTLINE_LAYER_ID,
      type: "line",
      source: OPERATIONAL_ZONES_SOURCE_ID,

      paint: {
        "line-color": [
          "coalesce",
          ["get", "color"],
          "#22d3ee",
        ],

        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          1.5,
          13,
          2.5,
          17,
          4,
        ],

        "line-opacity": createZoneVisibilityExpression(),
      },
    });
  }

  if (
    !layerExists(
      map,
      OPERATIONAL_ZONES_SELECTED_FILL_LAYER_ID,
    )
  ) {
    map.addLayer({
      id: OPERATIONAL_ZONES_SELECTED_FILL_LAYER_ID,
      type: "fill",
      source: OPERATIONAL_ZONES_SOURCE_ID,

      filter: createSelectedZoneFilter(null),

      paint: {
        "fill-color": [
          "coalesce",
          ["get", "color"],
          "#22d3ee",
        ],

        "fill-opacity": 0.38,
      },
    });
  }

  if (
    !layerExists(
      map,
      OPERATIONAL_ZONES_SELECTED_OUTLINE_LAYER_ID,
    )
  ) {
    map.addLayer({
      id: OPERATIONAL_ZONES_SELECTED_OUTLINE_LAYER_ID,
      type: "line",
      source: OPERATIONAL_ZONES_SOURCE_ID,

      filter: createSelectedZoneFilter(null),

      paint: {
        "line-color": "#ffffff",
        "line-width": 4,
        "line-opacity": 1,
      },
    });
  }

  if (!layerExists(map, OPERATIONAL_ZONES_LABEL_LAYER_ID)) {
    map.addLayer({
      id: OPERATIONAL_ZONES_LABEL_LAYER_ID,
      type: "symbol",
      source: OPERATIONAL_ZONES_SOURCE_ID,

      layout: {
        "text-field": ["get", "name"],

        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          10,
          13,
          12,
          16,
          14,
        ],

        "text-anchor": "center",
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "symbol-placement": "point",
      },

      paint: {
        "text-color": "#f8fafc",
        "text-halo-color": "#020617",
        "text-halo-width": 2,
        "text-halo-blur": 1,
        "text-opacity": createZoneVisibilityExpression(),
      },
    });
  }

  map.on(
    "click",
    OPERATIONAL_ZONES_FILL_LAYER_ID,
    handlers.onZoneClick,
  );

  map.on(
    "mouseenter",
    OPERATIONAL_ZONES_FILL_LAYER_ID,
    handlers.onMouseEnter,
  );

  map.on(
    "mouseleave",
    OPERATIONAL_ZONES_FILL_LAYER_ID,
    handlers.onMouseLeave,
  );
}

export function updateOperationalZoneSource(
  map: Map,
  data: OperationalZoneFeatureCollection,
) {
  const source = getZonesSource(map);

  source?.setData(data);
}

export function selectOperationalZoneLayer(
  map: Map,
  selectedZoneId: string | null,
) {
  const filter = createSelectedZoneFilter(
    selectedZoneId,
  );

  if (
    layerExists(
      map,
      OPERATIONAL_ZONES_SELECTED_FILL_LAYER_ID,
    )
  ) {
    map.setFilter(
      OPERATIONAL_ZONES_SELECTED_FILL_LAYER_ID,
      filter,
    );
  }

  if (
    layerExists(
      map,
      OPERATIONAL_ZONES_SELECTED_OUTLINE_LAYER_ID,
    )
  ) {
    map.setFilter(
      OPERATIONAL_ZONES_SELECTED_OUTLINE_LAYER_ID,
      filter,
    );
  }
}

export function setOperationalZoneLayersVisibility(
  map: Map,
  visible: boolean,
) {
  const visibility = visible ? "visible" : "none";

  for (const layerId of OPERATIONAL_ZONE_LAYER_IDS) {
    if (layerExists(map, layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        visibility,
      );
    }
  }
}

export function removeOperationalZoneLayers(
  map: Map,
  handlers: OperationalZoneLayerHandlers,
) {
  if (
    layerExists(map, OPERATIONAL_ZONES_FILL_LAYER_ID)
  ) {
    map.off(
      "click",
      OPERATIONAL_ZONES_FILL_LAYER_ID,
      handlers.onZoneClick,
    );

    map.off(
      "mouseenter",
      OPERATIONAL_ZONES_FILL_LAYER_ID,
      handlers.onMouseEnter,
    );

    map.off(
      "mouseleave",
      OPERATIONAL_ZONES_FILL_LAYER_ID,
      handlers.onMouseLeave,
    );
  }

  const layersInRemovalOrder = [
    OPERATIONAL_ZONES_LABEL_LAYER_ID,
    OPERATIONAL_ZONES_SELECTED_OUTLINE_LAYER_ID,
    OPERATIONAL_ZONES_SELECTED_FILL_LAYER_ID,
    OPERATIONAL_ZONES_OUTLINE_LAYER_ID,
    OPERATIONAL_ZONES_FILL_LAYER_ID,
  ];

  for (const layerId of layersInRemovalOrder) {
    if (layerExists(map, layerId)) {
      map.removeLayer(layerId);
    }
  }

  if (sourceExists(map)) {
    map.removeSource(OPERATIONAL_ZONES_SOURCE_ID);
  }
}