"use client";

import { useEffect, useRef } from "react";

import { OPERATIONAL_ENTITY_CONFIG } from "@/features/operational-map/operational-map.data";

import type { OperationalEntity } from "@/features/operational-map/operational-map.types";

type UseOperationalMarkersOptions = {
  map: import("maplibre-gl").Map | null;
  entities: OperationalEntity[];
  selectedEntityId: string | null;
  enabled: boolean;
  onSelectEntity: (entity: OperationalEntity) => void;
};

function createMarkerElement(entity: OperationalEntity, selected: boolean) {
  const configuration = OPERATIONAL_ENTITY_CONFIG[entity.type];

  /*
   * O elemento externo é usado pelo MapLibre para posicionar
   * o marcador por meio da propriedade CSS transform.
   *
   * Portanto, nunca devemos aplicar scale, translate ou outra
   * transformação diretamente neste elemento.
   */
  const markerContainer = document.createElement("div");

  markerContainer.style.width = selected ? "42px" : "34px";

  markerContainer.style.height = selected ? "42px" : "34px";

  markerContainer.style.display = "block";
  markerContainer.style.position = "relative";
  markerContainer.style.cursor = "pointer";

  /*
   * O botão interno pode receber animações sem interferir
   * no posicionamento realizado pelo MapLibre.
   */
  const markerButton = document.createElement("button");

  markerButton.type = "button";

  markerButton.setAttribute(
    "aria-label",
    `Selecionar ${configuration.singularLabel.toLowerCase()}: ${entity.title}`,
  );

  markerButton.title = entity.title;

  markerButton.style.width = "100%";
  markerButton.style.height = "100%";
  markerButton.style.display = "block";
  markerButton.style.position = "relative";
  markerButton.style.padding = "0";
  markerButton.style.margin = "0";
  markerButton.style.borderRadius = "999px";

  markerButton.style.border = selected
    ? "4px solid #ffffff"
    : "3px solid rgba(255, 255, 255, 0.95)";

  markerButton.style.backgroundColor = configuration.color;

  markerButton.style.boxShadow = selected
    ? `0 0 0 6px ${configuration.color}55, 0 10px 25px rgba(15, 23, 42, 0.45)`
    : "0 8px 18px rgba(15, 23, 42, 0.35)";

  markerButton.style.cursor = "pointer";

  markerButton.style.transform = "scale(1)";

  markerButton.style.transformOrigin = "center center";

  markerButton.style.transition = [
    "transform 160ms ease",
    "border 160ms ease",
    "box-shadow 160ms ease",
  ].join(", ");

  const centerDot = document.createElement("span");

  centerDot.setAttribute("aria-hidden", "true");

  centerDot.style.position = "absolute";
  centerDot.style.left = "50%";
  centerDot.style.top = "50%";

  centerDot.style.width = selected ? "10px" : "8px";

  centerDot.style.height = selected ? "10px" : "8px";

  centerDot.style.borderRadius = "999px";
  centerDot.style.backgroundColor = "#ffffff";

  centerDot.style.transform = "translate(-50%, -50%)";

  centerDot.style.pointerEvents = "none";

  markerButton.appendChild(centerDot);

  markerButton.addEventListener("mouseenter", () => {
    markerButton.style.transform = "scale(1.08)";
  });

  markerButton.addEventListener("mouseleave", () => {
    markerButton.style.transform = "scale(1)";
  });

  markerContainer.appendChild(markerButton);

  return {
    markerContainer,
    markerButton,
  };
}

export function useOperationalMarkers({
  map,
  entities,
  selectedEntityId,
  enabled,
  onSelectEntity,
}: UseOperationalMarkersOptions) {
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);

  useEffect(() => {
    let cancelled = false;

    function removeMarkers() {
      markersRef.current.forEach((marker) => marker.remove());

      markersRef.current = [];
    }

    async function renderMarkers() {
      removeMarkers();

      if (!map || !enabled || entities.length === 0) {
        return;
      }

      const { Marker } = await import("maplibre-gl");

      if (cancelled) {
        return;
      }

      const newMarkers = entities.map((entity) => {
        const selected = selectedEntityId === entity.id;

        const { markerContainer, markerButton } = createMarkerElement(
          entity,
          selected,
        );

        markerButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          onSelectEntity(entity);
        });

        return new Marker({
          element: markerContainer,
          anchor: "center",
        })
          .setLngLat(entity.coordinates)
          .addTo(map);
      });

      if (cancelled) {
        newMarkers.forEach((marker) => marker.remove());

        return;
      }

      markersRef.current = newMarkers;
    }

    void renderMarkers();

    return () => {
      cancelled = true;
      removeMarkers();
    };
  }, [enabled, entities, map, onSelectEntity, selectedEntityId]);
}
