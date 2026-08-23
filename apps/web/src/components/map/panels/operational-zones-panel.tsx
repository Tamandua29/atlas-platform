import { OPERATIONAL_ZONE_CONFIG } from "@/features/operational-map/operational-map.zones";

import type { OperationalZone } from "@/features/operational-map/operational-map.types";
import type { OperationalZoneSource } from "@/features/operational-map/operational-zones.client";

type OperationalZonesPanelProps = {
  enabled: boolean;
  zones: OperationalZone[];
  source: OperationalZoneSource;
  selectedZone: OperationalZone | null;
  onToggle: () => void;
  onSelect: (zone: OperationalZone) => void;
  onFitAll: () => void;
  onFitSelected: () => void;
  onClearSelection: () => void;
};

export function OperationalZonesPanel({
  enabled,
  zones,
  source,
  selectedZone,
  onToggle,
  onSelect,
  onFitAll,
  onFitSelected,
  onClearSelection,
}: OperationalZonesPanelProps) {
  return (
    <aside className="absolute bottom-6 right-6 z-20 w-[min(360px,calc(100%-3rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Áreas de referência
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {enabled ? "Camada visível" : "Camada oculta"} · {source === "airtable" ? "Fonte persistida" : "Fallback sintético"}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            enabled
              ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
              : "border-slate-600 text-slate-300 hover:border-cyan-400/50"
          }`}
          aria-pressed={enabled}
        >
          {enabled ? "Ocultar" : "Exibir"}
        </button>
      </div>

      {enabled && (
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-2">
            {zones.map((zone) => {
              const configuration = OPERATIONAL_ZONE_CONFIG[zone.type];
              const isSelected = selectedZone?.id === zone.id;

              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => onSelect(zone)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "border-cyan-400/60 bg-cyan-400/10"
                      : "border-slate-800 bg-slate-900/70 hover:border-slate-600"
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: configuration.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{zone.name}</span>
                    <span className="block text-xs text-slate-500">
                      {configuration.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {selectedZone && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
              <p className="text-xs uppercase tracking-wider text-cyan-300">
                Selecionada
              </p>
              <p className="mt-1 text-sm font-semibold">{selectedZone.name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {selectedZone.description}
              </p>
              <button
                type="button"
                onClick={onFitSelected}
                className="mt-3 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Centralizar área
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onFitAll}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:border-cyan-400/50"
            >
              Enquadrar áreas
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              disabled={!selectedZone}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:border-cyan-400/50"
            >
              Limpar seleção
            </button>
          </div>
        </div>
      )}

      <p className="border-t border-amber-400/20 bg-amber-400/5 px-5 py-3 text-xs leading-5 text-amber-200">
        {source === "airtable"
          ? "Geometrias explicitamente cadastradas na fonte. A exibição não infere domínio territorial nem classificação criminal."
          : "Referência visual sintética. Não representa limite institucional, domínio territorial ou classificação criminal."}
      </p>
    </aside>
  );
}
