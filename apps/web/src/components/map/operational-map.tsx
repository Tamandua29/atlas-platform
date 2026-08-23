"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "maplibre-gl/dist/maplibre-gl.css";

import { MANAUS_CENTER } from "@/features/operational-map/operational-map.data";
import { isCoordinateConsistentWithNeighborhood } from "@/features/operational-map/geographic-consistency";
import { useOperationalZones } from "@/features/operational-map/use-operational-zones";
import { useOperationalZoneData } from "@/features/operational-map/use-operational-zone-data";
import { useOperationalConnections } from "@/features/operational-map/use-operational-connections";
import { useOperationalHeatmap } from "@/features/operational-map/use-operational-heatmap";
import { useOperationalPolygonDraft } from "@/features/operational-map/use-operational-polygon-draft";
import { replaceOperationalPolygonVertex } from "@/features/operational-map/operational-map.drawing";
import {
  DEFAULT_OPERATIONAL_MAP_FILTERS,
  filterOperationalEntities,
  getOperationalStatusOptions,
  hasActiveOperationalMapFilters,
} from "@/features/operational-map/operational-map.search";
import {
  buildOperationalMapSearchParams,
  DEFAULT_OPERATIONAL_MAP_URL_STATE,
  type OperationalMapUrlState,
} from "@/features/operational-map/operational-map.url-state";

import type { OperationalMapFilters } from "@/features/operational-map/operational-map.search";

import type {
  OperationalEntity,
  OperationalCoordinates,
  OperationalEntityType,
  OperationalLayerVisibility,
  OperationalZone,
} from "@/features/operational-map/operational-map.types";

import { useOperationalEntities } from "./hooks/use-operational-entities";
import { useOperationalMarkers } from "./hooks/use-operational-markers";
import { MapStatusOverlays } from "./overlays/map-status-overlays";
import { EntityDetailsPanel } from "./panels/entity-details-panel";
import { OperationalLayersPanel } from "./panels/operational-layers-panel";
import { OperationalPolygonDraftPanel } from "./panels/operational-polygon-draft-panel";
import { OperationalZonesPanel } from "./panels/operational-zones-panel";
import { OperationalEntitiesProvider } from "./providers/operational-entities-provider";

type MapStatus = "loading" | "ready" | "error";

type FocusedIndividualResponse = {
  success: boolean;
  individual?: {
    recordId: string;
    legalName: string;
    alias: string | null;
  };
  relationships?: {
    addresses?: Array<{
      recordId: string;
      label: string;
      neighborhood: string | null;
      latitude: number | null;
      longitude: number | null;
    }>;
  };
};

function hasValidCoordinates(
  latitude: number | null,
  longitude: number | null,
) {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

type OperationalMapProps = {
  expanded?: boolean;
  initialUrlState?: OperationalMapUrlState;
};

type ShareStatus = "idle" | "copied" | "error";

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("Não foi possível copiar o link.");
}

function OperationalMapContent({
  expanded = false,
  initialUrlState = DEFAULT_OPERATIONAL_MAP_URL_STATE,
}: OperationalMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [map, setMap] = useState<import("maplibre-gl").Map | null>(null);

  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");

  const [mapErrorMessage, setMapErrorMessage] = useState("");

  const [layers, setLayers] = useState<OperationalLayerVisibility>(() => ({
    ...initialUrlState.layers,
  }));

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const [zonesEnabled, setZonesEnabled] = useState(
    initialUrlState.zonesEnabled,
  );

  const [heatmapEnabled, setHeatmapEnabled] = useState(
    initialUrlState.heatmapEnabled,
  );

  const [connectionsEnabled, setConnectionsEnabled] = useState(
    initialUrlState.connectionsEnabled,
  );

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [draftCompleted, setDraftCompleted] = useState(false);
  const [draftCoordinates, setDraftCoordinates] = useState<
    OperationalCoordinates[]
  >([]);

  const { zones: operationalZones, source: operationalZoneSource } =
    useOperationalZoneData();

  const [focusedEntities, setFocusedEntities] = useState<OperationalEntity[]>(
    [],
  );

  const [focusRecordId, setFocusRecordId] = useState(
    initialUrlState.focusRecordId,
  );

  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");

  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState<OperationalMapFilters>(() => ({
    ...initialUrlState.filters,
  }));

  const safeSearchParams = useMemo(
    () =>
      buildOperationalMapSearchParams({
        filters,
        layers,
        heatmapEnabled,
        zonesEnabled,
        connectionsEnabled,
        focusRecordId,
      }).toString(),
    [
      connectionsEnabled,
      filters,
      focusRecordId,
      heatmapEnabled,
      layers,
      zonesEnabled,
    ],
  );

  useEffect(() => {
    if (!expanded) return;

    const query = safeSearchParams ? `?${safeSearchParams}` : "";
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query}${window.location.hash}`,
    );
  }, [expanded, safeSearchParams]);

  const copyShareLink = useCallback(async () => {
    try {
      const url = new URL(window.location.href);
      url.search = safeSearchParams;
      await copyTextToClipboard(url.toString());
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  }, [safeSearchParams]);

  const {
    entities,
    status: entitiesStatus,
    errorMessage: entitiesErrorMessage,
    generatedAt,
    isLoading: entitiesAreLoading,
    reload: reloadEntities,
  } = useOperationalEntities();

  const allEntities = useMemo(() => {
    if (focusedEntities.length === 0) {
      return entities;
    }

    return [
      ...focusedEntities.filter(
        (focusedEntity) =>
          !entities.some((entity) => entity.id === focusedEntity.id),
      ),
      ...entities,
    ];
  }, [entities, focusedEntities]);

  const selectedEntity = useMemo(
    () => allEntities.find((entity) => entity.id === selectedEntityId) ?? null,
    [allEntities, selectedEntityId],
  );

  const selectedZone = useMemo(
    () => operationalZones.find((zone) => zone.id === selectedZoneId) ?? null,
    [operationalZones, selectedZoneId],
  );

  const searchResults = useMemo(
    () => filterOperationalEntities(allEntities, searchQuery, filters),
    [allEntities, filters, searchQuery],
  );

  const statusOptions = useMemo(
    () => getOperationalStatusOptions(allEntities),
    [allEntities],
  );

  const filtersActive = useMemo(
    () => hasActiveOperationalMapFilters(filters),
    [filters],
  );

  const visibleEntities = useMemo(
    () => searchResults.filter((entity) => layers[entity.type]),
    [layers, searchResults],
  );

  const interfaceStatus: MapStatus = useMemo(() => {
    if (mapStatus === "error" || entitiesStatus === "error") {
      return "error";
    }

    if (mapStatus === "loading" || entitiesAreLoading) {
      return "loading";
    }

    return "ready";
  }, [entitiesAreLoading, entitiesStatus, mapStatus]);

  const interfaceErrorMessage =
    mapErrorMessage ||
    entitiesErrorMessage ||
    "Não foi possível carregar o mapa operacional.";

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!containerRef.current || map) {
        return;
      }

      try {
        setMapStatus("loading");
        setMapErrorMessage("");

        const { Map, NavigationControl, FullscreenControl, ScaleControl } =
          await import("maplibre-gl");

        if (cancelled || !containerRef.current) {
          return;
        }

        const mapInstance = new Map({
          container: containerRef.current,

          style: {
            version: 8,

            sources: {
              openStreetMap: {
                type: "raster",

                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],

                tileSize: 256,

                attribution: "© OpenStreetMap contributors",
              },
            },

            layers: [
              {
                id: "openStreetMap",
                type: "raster",
                source: "openStreetMap",
              },
            ],
          },

          center: MANAUS_CENTER,
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

        mapInstance.addControl(new FullscreenControl(), "top-right");

        mapInstance.addControl(
          new ScaleControl({
            maxWidth: 120,
            unit: "metric",
          }),
          "bottom-left",
        );

        mapInstance.on("load", () => {
          mapInstance.resize();

          if (!cancelled) {
            setMap(mapInstance);

            setMapStatus("ready");
          }
        });

        mapInstance.on("error", (event) => {
          console.error("Erro do MapLibre:", event.error);

          if (!cancelled) {
            setMapErrorMessage(
              event.error?.message ?? "Falha ao carregar a base cartográfica.",
            );

            setMapStatus("error");
          }
        });
      } catch (error) {
        console.error("Falha ao inicializar o mapa:", error);

        if (!cancelled) {
          setMapErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível inicializar o mapa.",
          );

          setMapStatus("error");
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

  useEffect(() => {
    if (!focusRecordId) return;

    const focusedRecordId = focusRecordId;

    const abortController = new AbortController();

    async function loadFocusedIndividual() {
      try {
        const response = await fetch(
          `/api/intelligence/individuals/${encodeURIComponent(
            focusedRecordId,
          )}`,
          {
            cache: "no-store",
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as FocusedIndividualResponse;

        const individual = payload.individual;
        const addresses = payload.relationships?.addresses?.filter(
          (candidate) =>
            hasValidCoordinates(candidate.latitude, candidate.longitude) &&
            candidate.latitude !== null &&
            candidate.longitude !== null &&
            isCoordinateConsistentWithNeighborhood({
              neighborhood: candidate.neighborhood,
              latitude: candidate.latitude,
              longitude: candidate.longitude,
            }),
        );

        if (
          !payload.success ||
          !individual ||
          !addresses ||
          addresses.length === 0
        ) {
          return;
        }

        const focusEntities = addresses.map((address, index) => ({
          id: `person:${individual.recordId}:${address.recordId}`,
          type: "person" as const,
          title: individual.legalName,
          description: individual.alias
            ? `Vulgo: ${individual.alias}`
            : "Pessoa vinculada ao local selecionado.",
          coordinates: [address.longitude!, address.latitude!] as [
            number,
            number,
          ],
          createdAt: "1970-01-01T00:00:00.000Z",
          priority: "normal" as const,
          status:
            index === 0
              ? "Endereço principal válido"
              : `Endereço vinculado ${index + 1}`,
          reference: individual.recordId,
          locationLabel: address.label,
        }));

        setFocusedEntities(focusEntities);
        setSelectedEntityId(focusEntities[0].id);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    void loadFocusedIndividual();

    return () => {
      abortController.abort();
    };
  }, [focusRecordId]);

  useEffect(() => {
    if (!map || focusedEntities.length === 0) {
      return;
    }

    if (focusedEntities.length === 1) {
      map.flyTo({
        center: focusedEntities[0].coordinates,
        zoom: Math.max(map.getZoom(), 15),
        duration: 900,
        essential: true,
      });
      return;
    }

    const longitudes = focusedEntities.map((entity) => entity.coordinates[0]);
    const latitudes = focusedEntities.map((entity) => entity.coordinates[1]);
    map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: 100, maxZoom: 15, duration: 900 },
    );
  }, [focusedEntities, map]);

  const selectEntity = useCallback(
    (entity: OperationalEntity) => {
      if (drawingEnabled) return;
      setSelectedZoneId(null);
      setSelectedEntityId(entity.id);
      setLayers((current) =>
        current[entity.type]
          ? current
          : {
              ...current,
              [entity.type]: true,
            },
      );

      if (!map) {
        return;
      }

      map.flyTo({
        center: entity.coordinates,

        zoom: Math.max(map.getZoom(), 13),

        duration: 900,
        essential: true,
      });
    },
    [drawingEnabled, map],
  );

  const selectZone = useCallback((zone: OperationalZone | null) => {
    setSelectedZoneId(zone?.id ?? null);

    if (zone) {
      setSelectedEntityId(null);
    }
  }, []);

  const operationalZoneController = useOperationalZones({
    map,
    zones: operationalZones,
    enabled: zonesEnabled && mapStatus === "ready",
    selectedZoneId,
    onSelectZone: selectZone,
  });

  useOperationalMarkers({
    map,
    entities: visibleEntities,
    selectedEntityId,
    enabled:
      !drawingEnabled && mapStatus === "ready" && entitiesStatus === "success",
    onSelectEntity: selectEntity,
  });

  const { visibleConnectionCount } = useOperationalConnections({
    map,
    entities: visibleEntities,
    selectedEntityId,
    enabled:
      connectionsEnabled &&
      mapStatus === "ready" &&
      entitiesStatus === "success",
  });

  const { heatmapPointCount } = useOperationalHeatmap({
    map,
    entities: layers.occurrence ? searchResults : [],
    enabled:
      heatmapEnabled && mapStatus === "ready" && entitiesStatus === "success",
  });

  const addDraftCoordinate = useCallback(
    (coordinate: OperationalCoordinates) => {
      setDraftCoordinates((current) => [...current, coordinate]);
    },
    [],
  );

  const moveDraftCoordinate = useCallback(
    (index: number, coordinate: OperationalCoordinates) => {
      setDraftCoordinates((current) =>
        replaceOperationalPolygonVertex(current, index, coordinate),
      );
    },
    [],
  );

  useOperationalPolygonDraft({
    map,
    enabled: drawingEnabled && mapStatus === "ready",
    completed: draftCompleted,
    coordinates: draftCoordinates,
    onAddCoordinate: addDraftCoordinate,
    onMoveCoordinate: moveDraftCoordinate,
  });

  function toggleLayer(type: OperationalEntityType) {
    const layerWillBeHidden = layers[type];

    if (layerWillBeHidden && selectedEntity?.type === type) {
      setSelectedEntityId(null);
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
      address: true,
      organization: true,
      "point-of-sale": true,
      alert: true,
    });
  }

  function hideAllLayers() {
    setLayers({
      occurrence: false,
      person: false,
      vehicle: false,
      address: false,
      organization: false,
      "point-of-sale": false,
      alert: false,
    });

    setSelectedEntityId(null);
  }

  function closeDetails() {
    setSelectedEntityId(null);
  }

  function toggleHeatmap() {
    setHeatmapEnabled((current) => !current);
  }

  function toggleConnections() {
    setConnectionsEnabled((current) => !current);
  }

  function toggleZones() {
    setZonesEnabled((current) => {
      if (current) {
        setSelectedZoneId(null);
      }

      return !current;
    });
  }

  function toggleDrawing() {
    setDrawingEnabled((current) => {
      const next = !current;

      setDraftCompleted(false);
      setDraftCoordinates([]);

      if (next) {
        setSelectedEntityId(null);
        setSelectedZoneId(null);
        setZonesEnabled(false);
      }

      return next;
    });
  }

  function centerSelectedEntity() {
    if (!map || !selectedEntity) {
      return;
    }

    map.flyTo({
      center: selectedEntity.coordinates,
      zoom: 15,
      duration: 900,
      essential: true,
    });
  }

  function returnToManaus() {
    setSelectedEntityId(null);
    setSearchQuery("");
    setFilters({ ...DEFAULT_OPERATIONAL_MAP_FILTERS });
    setLayers({ ...DEFAULT_OPERATIONAL_MAP_URL_STATE.layers });
    setZonesEnabled(false);
    setHeatmapEnabled(false);
    setConnectionsEnabled(true);
    setSelectedZoneId(null);
    setFocusedEntities([]);
    setFocusRecordId(null);
    setDrawingEnabled(false);
    setDraftCompleted(false);
    setDraftCoordinates([]);

    if (!map) return;

    map.flyTo({
      center: MANAUS_CENTER,
      zoom: 10,
      duration: 900,
      essential: true,
    });
  }

  async function reloadInterface() {
    if (mapStatus === "error") {
      window.location.reload();
      return;
    }

    await reloadEntities();
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#020617] ${
        expanded ? "h-[calc(100vh-9rem)] min-h-[680px]" : "h-[520px]"
      }`}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Mapa operacional de Manaus"
      />

      <OperationalLayersPanel
        entities={searchResults}
        searchResults={searchResults}
        searchQuery={searchQuery}
        filters={filters}
        statusOptions={statusOptions}
        filtersActive={filtersActive}
        layers={layers}
        visibleConnectionCount={visibleConnectionCount}
        connectionsEnabled={connectionsEnabled}
        heatmapEnabled={heatmapEnabled}
        heatmapPointCount={heatmapPointCount}
        zonesEnabled={zonesEnabled}
        zoneCount={operationalZones.length}
        drawingEnabled={drawingEnabled}
        dataStatus={entitiesStatus}
        generatedAt={generatedAt}
        onToggleLayer={toggleLayer}
        onShowAll={showAllLayers}
        onHideAll={hideAllLayers}
        onToggleHeatmap={toggleHeatmap}
        onToggleConnections={toggleConnections}
        onToggleZones={toggleZones}
        onToggleDrawing={toggleDrawing}
        onSearchQueryChange={(query) => {
          setSearchQuery(query);
          setSelectedEntityId(null);
        }}
        onFiltersChange={(nextFilters) => {
          setFilters(nextFilters);
          setSelectedEntityId(null);
        }}
        onClearSearchAndFilters={() => {
          setSearchQuery("");
          setFilters(DEFAULT_OPERATIONAL_MAP_FILTERS);
          setSelectedEntityId(null);
        }}
        onSelectSearchResult={selectEntity}
        onReturnToOverview={returnToManaus}
        onReloadData={reloadEntities}
        onCopyShareLink={expanded ? copyShareLink : undefined}
        shareStatus={shareStatus}
      />

      {selectedEntity && (
        <EntityDetailsPanel
          entity={selectedEntity}
          onClose={closeDetails}
          onCenter={centerSelectedEntity}
        />
      )}

      {!selectedEntity && !drawingEnabled && (
        <OperationalZonesPanel
          enabled={zonesEnabled}
          zones={operationalZones}
          source={operationalZoneSource}
          selectedZone={selectedZone}
          onToggle={toggleZones}
          onSelect={selectZone}
          onFitAll={operationalZoneController.fitAllZones}
          onFitSelected={operationalZoneController.fitSelectedZone}
          onClearSelection={operationalZoneController.clearSelection}
        />
      )}

      {drawingEnabled && (
        <OperationalPolygonDraftPanel
          completed={draftCompleted}
          coordinates={draftCoordinates}
          onUndo={() => setDraftCoordinates((current) => current.slice(0, -1))}
          onComplete={() => setDraftCompleted(true)}
          onRestart={() => {
            setDraftCompleted(false);
            setDraftCoordinates([]);
          }}
          onClose={() => {
            setDrawingEnabled(false);
            setDraftCompleted(false);
            setDraftCoordinates([]);
          }}
        />
      )}

      <MapStatusOverlays
        status={interfaceStatus}
        errorMessage={interfaceErrorMessage}
        hasSelectedEntity={Boolean(selectedEntity)}
        isEmpty={entitiesStatus === "success" && allEntities.length === 0}
        onReload={reloadInterface}
      />
    </div>
  );
}

export function OperationalMap(props: OperationalMapProps) {
  return (
    <OperationalEntitiesProvider>
      <OperationalMapContent {...props} />
    </OperationalEntitiesProvider>
  );
}
