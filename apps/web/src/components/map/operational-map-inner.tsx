"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { REAL_OPERATIONAL_ENTITIES } from "@/features/operational-map/operational-map.data";
import { EntityType, OperationalEntity } from "@/features/operational-map/operational-map.types";

const MANAUS_CENTER: [number, number] = [-60.018, -3.112];

const ENTITY_CONFIG: Record<EntityType, { label: string; color: string }> = {
  occurrence: { label: "Ocorrências", color: "#f97316" },
  person: { label: "Pessoas", color: "#22d3ee" },
  vehicle: { label: "Veículos", color: "#a78bfa" },
  alert: { label: "Alertas", color: "#ef4444" },
};

export default function OperationalMapInner() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [selectedEntity, setSelectedEntity] = useState<OperationalEntity | null>(null);
  const [layers, setLayers] = useState<Record<EntityType, boolean>>({
    occurrence: true,
    person: true,
    vehicle: true,
    alert: true,
  });

  // Inicialização do Mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
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
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    map.on("load", () => {
      map.resize();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Renderização e Atualização dos Marcadores no Mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove marcadores antigos
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Filtra as entidades visíveis com base nas camadas ativas
    const visible = REAL_OPERATIONAL_ENTITIES.filter((e) => layers[e.type]);

    visible.forEach((entity) => {
      const config = ENTITY_CONFIG[entity.type];

      // Cria elemento HTML personalizado do marcador
      const el = document.createElement("div");
      el.className = "cursor-pointer transition-transform hover:scale-125";
      el.innerHTML = `
        <div style="background-color: ${config.color}; border: 2px solid white;" class="h-4 w-4 rounded-full shadow-lg"></div>
      `;

      // Evento de clique para selecionar a entidade e abrir a ficha
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedEntity(entity);
        map.flyTo({ center: entity.coordinates, zoom: 13, speed: 0.8 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(entity.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [layers]);

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-2xl bg-[#020617]">
      {/* Container do Mapa Canvas */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* Painel de Controle de Camadas (Esquerda Superior) */}
      <div className="absolute left-4 top-4 z-20 w-52 rounded-xl border border-slate-800 bg-slate-950/90 p-3 shadow-2xl backdrop-blur">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Camadas operacionais
        </p>

        <div className="space-y-1.5">
          {(Object.keys(ENTITY_CONFIG) as EntityType[]).map((type) => {
            const config = ENTITY_CONFIG[type];
            const active = layers[type];

            return (
              <button
                key={type}
                type="button"
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-slate-700 bg-slate-900 text-white"
                    : "border-slate-800/60 bg-slate-950/50 text-slate-500"
                }`}
                onClick={() => setLayers((prev) => ({ ...prev, [type]: !prev[type] }))}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: active ? config.color : "#475569" }}
                  />
                  {config.label}
                </span>
                <span className="text-[10px]">{active ? "Ativa" : "Oculta"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ficha / Card de Detalhes ao Clicar em um Registro (Direita Superior) */}
      {selectedEntity && (
        <div className="absolute right-4 top-4 z-20 w-72 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur transition-all">
          <div className="flex items-start justify-between border-b border-slate-800 pb-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${ENTITY_CONFIG[selectedEntity.type].color}20`,
                color: ENTITY_CONFIG[selectedEntity.type].color,
                border: `1px solid ${ENTITY_CONFIG[selectedEntity.type].color}40`,
              }}
            >
              {ENTITY_CONFIG[selectedEntity.type].label}
            </span>

            <button
              onClick={() => setSelectedEntity(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <h4 className="mt-3 text-sm font-bold text-white">{selectedEntity.title}</h4>

          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {selectedEntity.description}
          </p>

          <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Endereço:</span>
              <span className="font-medium text-right">{selectedEntity.address}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Bairro / Zona:</span>
              <span className="font-medium text-cyan-300">
                {selectedEntity.neighborhood} ({selectedEntity.zone})
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Atualizado:</span>
              <span className="text-slate-400">{selectedEntity.updatedAt}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}