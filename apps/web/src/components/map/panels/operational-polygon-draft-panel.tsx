import {
  canCompleteOperationalPolygon,
  measureOperationalPolygon,
} from "@/features/operational-map/operational-map.drawing";

import type { OperationalCoordinates } from "@/features/operational-map/operational-map.types";

type Props = {
  completed: boolean;
  coordinates: OperationalCoordinates[];
  onUndo: () => void;
  onComplete: () => void;
  onRestart: () => void;
  onClose: () => void;
};

const measurementFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

function formatArea(areaSquareMeters: number): string {
  if (areaSquareMeters >= 10_000) {
    return `${measurementFormatter.format(areaSquareMeters / 10_000)} ha`;
  }

  return `${measurementFormatter.format(areaSquareMeters)} m²`;
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters >= 1_000) {
    return `${measurementFormatter.format(distanceMeters / 1_000)} km`;
  }

  return `${measurementFormatter.format(distanceMeters)} m`;
}

export function OperationalPolygonDraftPanel({
  completed,
  coordinates,
  onUndo,
  onComplete,
  onRestart,
  onClose,
}: Props) {
  const metrics = completed ? measureOperationalPolygon(coordinates) : null;

  return (
    <aside className="absolute bottom-6 right-6 z-30 w-[min(370px,calc(100%-3rem))] overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur">
      <div className="border-b border-slate-800 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Rascunho de polígono
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {completed
            ? "Arraste os vértices para ajustar a geometria nesta sessão."
            : "Clique no mapa para adicionar os vértices."}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {coordinates.length} vértice(s) marcado(s)
        </p>
      </div>

      {metrics ? (
        <div className="grid grid-cols-2 gap-2 border-b border-slate-800 px-5 py-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Área estimada
            </p>
            <p className="mt-1 text-sm font-semibold text-cyan-200">
              {formatArea(metrics.areaSquareMeters)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Perímetro estimado
            </p>
            <p className="mt-1 text-sm font-semibold text-cyan-200">
              {formatDistance(metrics.perimeterMeters)}
            </p>
          </div>
          <p className="col-span-2 text-[11px] leading-4 text-slate-500">
            Medição geométrica aproximada, sem valor cadastral ou oficial.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 px-5 py-4">
        {!completed ? (
          <>
            <button
              type="button"
              disabled={coordinates.length === 0}
              onClick={onUndo}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold disabled:opacity-40"
            >
              Desfazer ponto
            </button>
            <button
              type="button"
              disabled={!canCompleteOperationalPolygon(coordinates)}
              onClick={onComplete}
              className="rounded-lg border border-cyan-400/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-40"
            >
              Concluir área
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onRestart}
            className="col-span-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold"
          >
            Iniciar novo rascunho
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="col-span-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300"
        >
          Fechar modo de desenho
        </button>
      </div>

      <p className="border-t border-amber-400/20 bg-amber-400/5 px-5 py-3 text-xs leading-5 text-amber-200">
        Rascunho local e temporário. Não representa limite oficial, área de
        domínio ou classificação criminal e não realiza gravação.
      </p>
    </aside>
  );
}
