import { OPERATIONAL_ENTITY_CONFIG } from "@/features/operational-map/operational-map.data";

import type {
  OperationalEntity,
  OperationalEntityType,
  OperationalLayerVisibility,
} from "@/features/operational-map/operational-map.types";

type DataStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

type OperationalLayersPanelProps = {
  entities: OperationalEntity[];
  layers: OperationalLayerVisibility;
  dataStatus: DataStatus;
  generatedAt: string | null;
  onToggleLayer: (
    type: OperationalEntityType,
  ) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onReturnToOverview: () => void;
  onReloadData: () => Promise<void>;
};

function formatGeneratedAt(
  generatedAt: string | null,
): string {
  if (!generatedAt) {
    return "Ainda não sincronizado";
  }

  const date = new Date(generatedAt);

  if (Number.isNaN(date.getTime())) {
    return "Horário indisponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(
  status: DataStatus,
): string {
  if (status === "loading") {
    return "Sincronizando";
  }

  if (status === "success") {
    return "Sincronizado";
  }

  if (status === "error") {
    return "Falha na sincronização";
  }

  return "Aguardando";
}

function getStatusIndicatorClassName(
  status: DataStatus,
): string {
  if (status === "success") {
    return "bg-emerald-400";
  }

  if (status === "error") {
    return "bg-red-400";
  }

  if (status === "loading") {
    return "animate-pulse bg-amber-400";
  }

  return "bg-slate-500";
}

export function OperationalLayersPanel({
  entities,
  layers,
  dataStatus,
  generatedAt,
  onToggleLayer,
  onShowAll,
  onHideAll,
  onReturnToOverview,
  onReloadData,
}: OperationalLayersPanelProps) {
  const activeLayerCount =
    Object.values(layers).filter(
      Boolean,
    ).length;

  const visibleEntityCount =
    entities.filter(
      (entity) => layers[entity.type],
    ).length;

  const isReloading =
    dataStatus === "loading";

  return (
    <aside className="absolute left-4 top-4 z-20 w-64 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/90 shadow-xl backdrop-blur">
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Camadas operacionais
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              {activeLayerCount} camadas ·{" "}
              {visibleEntityCount} registros
            </p>
          </div>

          <span className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 text-xs font-bold text-cyan-300">
            {visibleEntityCount}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {(
            Object.keys(
              OPERATIONAL_ENTITY_CONFIG,
            ) as OperationalEntityType[]
          ).map((type) => {
            const configuration =
              OPERATIONAL_ENTITY_CONFIG[type];

            const active = layers[type];

            const entityCount =
              entities.filter(
                (entity) =>
                  entity.type === type,
              ).length;

            return (
              <button
                key={type}
                type="button"
                className={[
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition",

                  active
                    ? "border-slate-600 bg-slate-800/90 text-white"
                    : "border-slate-800 bg-slate-950/70 text-slate-500",
                ].join(" ")}
                onClick={() =>
                  onToggleLayer(type)
                }
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        active
                          ? configuration.color
                          : "#475569",
                    }}
                  />

                  {configuration.label}
                </span>

                <span className="flex items-center gap-2">
                  <span>{entityCount}</span>

                  <span>
                    {active
                      ? "Ativa"
                      : "Oculta"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            className="rounded-lg border border-slate-700 px-2 py-2 text-[11px] text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
            onClick={onShowAll}
          >
            Exibir todas
          </button>

          <button
            type="button"
            className="rounded-lg border border-slate-700 px-2 py-2 text-[11px] text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
            onClick={onHideAll}
          >
            Ocultar todas
          </button>
        </div>

        <button
          type="button"
          className="mt-2 w-full rounded-lg border border-slate-700 px-2 py-2 text-[11px] text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200"
          onClick={onReturnToOverview}
        >
          Retornar à visão geral
        </button>
      </div>

      <div className="border-t border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center gap-2">
          <span
            className={[
              "h-2.5 w-2.5 rounded-full",
              getStatusIndicatorClassName(
                dataStatus,
              ),
            ].join(" ")}
          />

          <span className="text-[11px] font-medium text-slate-300">
            {getStatusLabel(dataStatus)}
          </span>
        </div>

        <p className="mt-2 text-[10px] leading-4 text-slate-500">
          Última atualização:
          <br />
          {formatGeneratedAt(generatedAt)}
        </p>

        <button
          type="button"
          disabled={isReloading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            void onReloadData();
          }}
        >
          {isReloading && (
            <span className="h-3 w-3 animate-spin rounded-full border border-cyan-200/40 border-t-cyan-200" />
          )}

          {isReloading
            ? "Atualizando..."
            : "Atualizar dados"}
        </button>
      </div>
    </aside>
  );
}