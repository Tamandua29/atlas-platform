"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "maplibre-gl/dist/maplibre-gl.css";

import { MANAUS_CENTER } from "@/features/operational-map/operational-map.data";

import type {
  OperationalEntity,
  OperationalEntityType,
  OperationalLayerVisibility,
} from "@/features/operational-map/operational-map.types";

import { useOperationalEntities } from "./hooks/use-operational-entities";
import { useOperationalMarkers } from "./hooks/use-operational-markers";
import { MapStatusOverlays } from "./overlays/map-status-overlays";
import { EntityDetailsPanel } from "./panels/entity-details-panel";
import { OperationalLayersPanel } from "./panels/operational-layers-panel";
import { OperationalEntitiesProvider } from "./providers/operational-entities-provider";

type MapStatus =
  | "loading"
  | "ready"
  | "error";

const INITIAL_LAYER_VISIBILITY: OperationalLayerVisibility = {
  occurrence: true,
  person: true,
  vehicle: true,
  alert: true,
};

function OperationalMapContent() {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const [map, setMap] =
    useState<import("maplibre-gl").Map | null>(
      null,
    );

  const [
    mapStatus,
    setMapStatus,
  ] = useState<MapStatus>("loading");

  const [
    mapErrorMessage,
    setMapErrorMessage,
  ] = useState("");

  const [layers, setLayers] =
    useState<OperationalLayerVisibility>(
      INITIAL_LAYER_VISIBILITY,
    );

  const [
    selectedEntityId,
    setSelectedEntityId,
  ] = useState<string | null>(null);

  const {
    entities,
    status: entitiesStatus,
    errorMessage:
      entitiesErrorMessage,
    generatedAt,
    isLoading: entitiesAreLoading,
    isEmpty,
    reload: reloadEntities,
  } = useOperationalEntities();

  const selectedEntity = useMemo(
    () =>
      entities.find(
        (entity) =>
          entity.id ===
          selectedEntityId,
      ) ?? null,
    [
      entities,
      selectedEntityId,
    ],
  );

  const visibleEntities = useMemo(
    () =>
      entities.filter(
        (entity) =>
          layers[entity.type],
      ),
    [entities, layers],
  );

  const interfaceStatus: MapStatus =
    useMemo(() => {
      if (
        mapStatus === "error" ||
        entitiesStatus === "error"
      ) {
        return "error";
      }

      if (
        mapStatus === "loading" ||
        entitiesAreLoading
      ) {
        return "loading";
      }

      return "ready";
    }, [
      entitiesAreLoading,
      entitiesStatus,
      mapStatus,
    ]);

  const interfaceErrorMessage =
    mapErrorMessage ||
    entitiesErrorMessage ||
    "Não foi possível carregar o mapa operacional.";

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (
        !containerRef.current ||
        map
      ) {
        return;
      }

      try {
        setMapStatus("loading");
        setMapErrorMessage("");

        const {
          Map,
          NavigationControl,
          FullscreenControl,
          ScaleControl,
        } = await import(
          "maplibre-gl"
        );

        if (
          cancelled ||
          !containerRef.current
        ) {
          return;
        }

        const mapInstance =
          new Map({
            container:
              containerRef.current,

            style: {
              version: 8,

              sources: {
                openStreetMap: {
                  type: "raster",

                  tiles: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                  ],

                  tileSize: 256,

                  attribution:
                    "© OpenStreetMap contributors",
                },
              },

              layers: [
                {
                  id: "openStreetMap",
                  type: "raster",
                  source:
                    "openStreetMap",
                },
              ],
            },

            center:
              MANAUS_CENTER,
            zoom: 10,
            attributionControl: {},
          });

        mapInstance.addControl(
          new NavigationControl({
            showCompass: true,
            showZoom: true,
          }),
          "top-right",
        );

        mapInstance.addControl(
          new FullscreenControl(),
          "top-right",
        );

        mapInstance.addControl(
          new ScaleControl({
            maxWidth: 120,
            unit: "metric",
          }),
          "bottom-left",
        );

        mapInstance.on(
          "load",
          () => {
            mapInstance.resize();

            if (!cancelled) {
              setMap(mapInstance);

              setMapStatus(
                "ready",
              );
            }
          },
        );

        mapInstance.on(
          "error",
          (event) => {
            console.error(
              "Erro do MapLibre:",
              event.error,
            );

            if (!cancelled) {
              setMapErrorMessage(
                event.error
                  ?.message ??
                  "Falha ao carregar a base cartográfica.",
              );

              setMapStatus(
                "error",
              );
            }
          },
        );
      } catch (error) {
        console.error(
          "Falha ao inicializar o mapa:",
          error,
        );

        if (!cancelled) {
          setMapErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível inicializar o mapa.",
          );

          setMapStatus(
            "error",
          );
        }
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
    };
  }, [map]);

  useEffect(() => {
    return () => {
      map?.remove();
    };
  }, [map]);

  const selectEntity =
    useCallback(
      (
        entity: OperationalEntity,
      ) => {
        setSelectedEntityId(
          entity.id,
        );

        if (!map) {
          return;
        }

        map.flyTo({
          center:
            entity.coordinates,

          zoom: Math.max(
            map.getZoom(),
            13,
          ),

          duration: 900,
          essential: true,
        });
      },
      [map],
    );

  useOperationalMarkers({
    map,
    entities:
      visibleEntities,
    selectedEntityId,
    enabled:
      mapStatus === "ready" &&
      entitiesStatus ===
        "success",
    onSelectEntity:
      selectEntity,
  });

  function toggleLayer(
    type: OperationalEntityType,
  ) {
    const layerWillBeHidden =
      layers[type];

    if (
      layerWillBeHidden &&
      selectedEntity?.type ===
        type
    ) {
      setSelectedEntityId(
        null,
      );
    }

    setLayers((current) => ({
      ...current,
      [type]: !current[type],
    }));
  }

  function showAllLayers() {
    setLayers({
      occurrence: true,
      person: true,
      vehicle: true,
      alert: true,
    });
  }

  function hideAllLayers() {
    setLayers({
      occurrence: false,
      person: false,
      vehicle: false,
      alert: false,
    });

    setSelectedEntityId(null);
  }

  function closeDetails() {
    setSelectedEntityId(null);
  }

  function centerSelectedEntity() {
    if (
      !map ||
      !selectedEntity
    ) {
      return;
    }

    map.flyTo({
      center:
        selectedEntity.coordinates,
      zoom: 15,
      duration: 900,
      essential: true,
    });
  }

  function returnToManaus() {
    if (!map) {
      return;
    }

    setSelectedEntityId(null);

    map.flyTo({
      center: MANAUS_CENTER,
      zoom: 10,
      duration: 900,
      essential: true,
    });
  }

  async function reloadInterface() {
    if (
      mapStatus === "error"
    ) {
      window.location.reload();
      return;
    }

    await reloadEntities();
  }

  return (
    <div className="relative h-[520px] w-full overflow-hidden bg-[#020617]">
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Mapa operacional de Manaus"
      />

      <OperationalLayersPanel
        entities={entities}
        layers={layers}
        dataStatus={
          entitiesStatus
        }
        generatedAt={
          generatedAt
        }
        onToggleLayer={
          toggleLayer
        }
        onShowAll={
          showAllLayers
        }
        onHideAll={
          hideAllLayers
        }
        onReturnToOverview={
          returnToManaus
        }
        onReloadData={
          reloadEntities
        }
      />

      {selectedEntity && (
        <EntityDetailsPanel
          entity={
            selectedEntity
          }
          onClose={
            closeDetails
          }
          onCenter={
            centerSelectedEntity
          }
        />
      )}

      <MapStatusOverlays
        status={
          interfaceStatus
        }
        errorMessage={
          interfaceErrorMessage
        }
        hasSelectedEntity={Boolean(
          selectedEntity,
        )}
        isEmpty={isEmpty}
        onReload={
          reloadInterface
        }
      />
    </div>
  );
}

export function OperationalMap() {
  return (
    <OperationalEntitiesProvider>
      <OperationalMapContent />
    </OperationalEntitiesProvider>
  );
}