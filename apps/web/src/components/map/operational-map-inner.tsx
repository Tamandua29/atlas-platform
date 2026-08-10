"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MANAUS_CENTER: [number, number] = [-60.0217, -3.119];

type EntityType = "occurrence" | "person" | "vehicle" | "alert";

const ENTITY_CONFIG: Record<EntityType, { label: string; color: string }> = {
  occurrence: { label: "Ocorrências", color: "#f97316" },
  person: { label: "Pessoas", color: "#22d3ee" },
  vehicle: { label: "Veículos", color: "#a78bfa" },
  alert: { label: "Alertas", color: "#ef4444" },
};

const DEMO_ENTITIES = [
  { id: "1", type: "occurrence", title: "Ocorrência demonstrativa", coordinates: [-60.013, -3.108] as [number, number] },
  { id: "2", type: "person", title: "Pessoa demonstrativa", coordinates: [-60.041, -3.095] as [number, number] },
  { id: "3", type: "vehicle", title: "Veículo demonstrativo", coordinates: [-60.026, -3.143] as [number, number] },
  { id: "4", type: "alert", title: "Alerta operacional", coordinates: [-59.997, -3.087] as [number, number] },
];

export default function OperationalMapInner() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [layers, setLayers] = useState<Record<EntityType, boolean>>({
    occurrence: true,
    person: true,
    vehicle: true,
    alert: true,
  });

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
      zoom: 10,
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

  // Atualização dos marcadores ao alternar camadas
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    DEMO_ENTITIES.filter((e) => layers[e.type as EntityType]).forEach((entity) => {
      const config = ENTITY_CONFIG[entity.type as EntityType];
      const marker = new maplibregl.Marker({ color: config.color })
        .setLngLat(entity.coordinates)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [layers]);

  return (
    <div className="relative h-[460px] w-full overflow-hidden bg-[#020617]">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* Painel de Camadas */}
      <div className="absolute left-4 top-4 z-20 w-52 rounded-xl border border-slate-700 bg-slate-950/90 p-3 shadow-xl backdrop-blur">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Camadas operacionais
        </p>

        <div className="space-y-2">
          {(Object.keys(ENTITY_CONFIG) as EntityType[]).map((type) => {
            const config = ENTITY_CONFIG[type];
            const active = layers[type];

            return (
              <button
                key={type}
                type="button"
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                  active
                    ? "border-slate-600 bg-slate-800/90 text-white"
                    : "border-slate-800 bg-slate-950/70 text-slate-500"
                }`}
                onClick={() =>
                  setLayers((prev) => ({ ...prev, [type]: !prev[type] }))
                }
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: active ? config.color : "#475569" }}
                  />
                  {config.label}
                </span>
                <span>{active ? "Ativa" : "Oculta"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}