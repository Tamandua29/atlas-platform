import {
  OPERATIONAL_ENTITY_CONFIG,
  OPERATIONAL_PRIORITY_CONFIG,
} from "@/features/operational-map/operational-map.data";

import type { OperationalMapFilters } from "@/features/operational-map/operational-map.search";

import type {
  OperationalEntity,
  OperationalEntityType,
  OperationalLayerVisibility,
} from "@/features/operational-map/operational-map.types";

type DataStatus = "idle" | "loading" | "success" | "error";

type OperationalLayersPanelProps = {
  entities: OperationalEntity[];
  searchResults: OperationalEntity[];
  searchQuery: string;
  filters: OperationalMapFilters;
  statusOptions: string[];
  filtersActive: boolean;
  layers: OperationalLayerVisibility;
  visibleConnectionCount: number;
  connectionsEnabled: boolean;
  heatmapEnabled: boolean;
  heatmapPointCount: number;
  zonesEnabled: boolean;
  zoneCount: number;
  drawingEnabled: boolean;
  dataStatus: DataStatus;
  generatedAt: string | null;
  onToggleLayer: (type: OperationalEntityType) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onToggleHeatmap: () => void;
  onToggleConnections: () => void;
  onToggleZones: () => void;
  onToggleDrawing: () => void;
  onSearchQueryChange: (query: string) => void;
  onFiltersChange: (filters: OperationalMapFilters) => void;
  onClearSearchAndFilters: () => void;
  onSelectSearchResult: (entity: OperationalEntity) => void;
  onReturnToOverview: () => void;
  onReloadData: () => Promise<void>;
  onCopyShareLink?: () => Promise<void>;
  shareStatus?: "idle" | "copied" | "error";
};

function formatGeneratedAt(generatedAt: string | null): string {
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

function getStatusLabel(status: DataStatus): string {
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

function getStatusIndicatorClassName(status: DataStatus): string {
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
  searchResults,
  searchQuery,
  filters,
  statusOptions,
  filtersActive,
  layers,
  visibleConnectionCount,
  connectionsEnabled,
  heatmapEnabled,
  heatmapPointCount,
  zonesEnabled,
  zoneCount,
  drawingEnabled,
  dataStatus,
  generatedAt,
  onToggleLayer,
  onShowAll,
  onHideAll,
  onToggleHeatmap,
  onToggleConnections,
  onToggleZones,
  onToggleDrawing,
  onSearchQueryChange,
  onFiltersChange,
  onClearSearchAndFilters,
  onSelectSearchResult,
  onReturnToOverview,
  onReloadData,
  onCopyShareLink,
  shareStatus = "idle",
}: OperationalLayersPanelProps) {
  const activeLayerCount =
    Object.values(layers).filter(Boolean).length +
    (connectionsEnabled ? 1 : 0) +
    (zonesEnabled ? 1 : 0) +
    (heatmapEnabled ? 1 : 0) +
    (drawingEnabled ? 1 : 0);

  const visibleEntityCount = entities.filter(
    (entity) => layers[entity.type],
  ).length;

  const isReloading = dataStatus === "loading";

  return (
    <aside className="absolute left-4 top-4 z-20 max-h-[calc(100%-2rem)] w-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/90 shadow-xl backdrop-blur">
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Camadas operacionais
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              {activeLayerCount} camadas · {visibleEntityCount} registros
            </p>
          </div>

          <span className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 text-xs font-bold text-cyan-300">
            {visibleEntityCount}
          </span>
        </div>

        <div className="mt-3">
          <label htmlFor="operational-map-search" className="sr-only">
            Buscar registros no mapa
          </label>

          <input
            id="operational-map-search"
            type="search"
            value={searchQuery}
            placeholder="Nome, referência ou local"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />

          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-[9px] uppercase tracking-wide text-slate-500">
              Camada
              <select
                value={filters.entityType}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[10px] normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-400/60"
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    entityType: event.target
                      .value as OperationalMapFilters["entityType"],
                  })
                }
              >
                <option value="all">Todas</option>
                {(
                  Object.keys(
                    OPERATIONAL_ENTITY_CONFIG,
                  ) as OperationalEntityType[]
                ).map((type) => (
                  <option key={type} value={type}>
                    {OPERATIONAL_ENTITY_CONFIG[type].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[9px] uppercase tracking-wide text-slate-500">
              Prioridade
              <select
                value={filters.priority}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[10px] normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-400/60"
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    priority: event.target
                      .value as OperationalMapFilters["priority"],
                  })
                }
              >
                <option value="all">Todas</option>
                {(
                  Object.keys(OPERATIONAL_PRIORITY_CONFIG) as Array<
                    Exclude<OperationalMapFilters["priority"], "all">
                  >
                ).map((priority) => (
                  <option key={priority} value={priority}>
                    {OPERATIONAL_PRIORITY_CONFIG[priority].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[9px] uppercase tracking-wide text-slate-500">
              Status
              <select
                value={filters.status}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[10px] normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-400/60"
                onChange={(event) =>
                  onFiltersChange({ ...filters, status: event.target.value })
                }
              >
                <option value="all">Todos</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[9px] uppercase tracking-wide text-slate-500">
              Período
              <select
                value={filters.period}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[10px] normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-400/60"
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    period: event.target
                      .value as OperationalMapFilters["period"],
                  })
                }
              >
                <option value="all">Todo o período</option>
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
              </select>
            </label>
          </div>

          {(searchQuery.trim() || filtersActive) && (
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-slate-700 px-2 py-1.5 text-[10px] text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-200"
              onClick={onClearSearchAndFilters}
            >
              Limpar busca e filtros
            </button>
          )}

          {(searchQuery.trim() || filtersActive) && (
            <div className="mt-2 max-h-28 space-y-1 overflow-y-auto pr-1">
              {searchResults.length > 0 ? (
                searchResults.slice(0, 8).map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    className="w-full rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                    onClick={() => onSelectSearchResult(entity)}
                  >
                    <span className="block truncate text-[11px] font-semibold text-slate-200">
                      {entity.title}
                    </span>
                    <span className="block truncate text-[9px] text-slate-500">
                      {entity.reference} · {entity.locationLabel}
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-md border border-slate-800 px-2 py-2 text-[10px] text-slate-500">
                  Nenhum registro localizado.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {(
            Object.keys(OPERATIONAL_ENTITY_CONFIG) as OperationalEntityType[]
          ).map((type) => {
            const configuration = OPERATIONAL_ENTITY_CONFIG[type];

            const active = layers[type];

            const entityCount = entities.filter(
              (entity) => entity.type === type,
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
                onClick={() => onToggleLayer(type)}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: active ? configuration.color : "#475569",
                    }}
                  />

                  {configuration.label}
                </span>

                <span className="flex items-center gap-2">
                  <span>{entityCount}</span>

                  <span>{active ? "Ativa" : "Oculta"}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={[
            "mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition",
            heatmapEnabled
              ? "border-orange-400/50 bg-orange-400/10 text-orange-100"
              : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-orange-400/40",
          ].join(" ")}
          onClick={onToggleHeatmap}
          aria-pressed={heatmapEnabled}
        >
          <span className="flex items-center gap-2">
            <span
              className={[
                "h-2.5 w-2.5 rounded-full",
                heatmapEnabled ? "bg-orange-400" : "bg-slate-600",
              ].join(" ")}
            />
            Heatmap de ocorrências
          </span>
          <span className="flex items-center gap-2">
            <span>{heatmapPointCount}</span>
            <span>{heatmapEnabled ? "Ativo" : "Oculto"}</span>
          </span>
        </button>

        <p className="mt-1 text-[9px] leading-3 text-slate-500">
          Densidade calculada somente com ocorrências georreferenciadas
          carregadas.
        </p>

        <button
          type="button"
          className={[
            "mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition",
            zonesEnabled
              ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
              : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-cyan-400/40",
          ].join(" ")}
          onClick={onToggleZones}
          aria-pressed={zonesEnabled}
        >
          <span className="flex items-center gap-2">
            <span
              className={[
                "h-2.5 w-2.5 rounded-sm",
                zonesEnabled ? "bg-cyan-300" : "bg-slate-600",
              ].join(" ")}
            />
            Áreas de referência
          </span>
          <span className="flex items-center gap-2">
            <span>{zoneCount}</span>
            <span>{zonesEnabled ? "Ativa" : "Oculta"}</span>
          </span>
        </button>

        <p className="mt-1 text-[9px] leading-3 text-amber-200/70">
          Polígonos sintéticos para validação visual; não representam limites
          oficiais.
        </p>

        <button
          type="button"
          className={`mt-3 w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
            drawingEnabled
              ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
              : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-cyan-400/40"
          }`}
          onClick={onToggleDrawing}
          aria-pressed={drawingEnabled}
        >
          {drawingEnabled ? "Encerrar desenho" : "Desenhar polígono"}
        </button>

        <p className="mt-1 text-[9px] leading-3 text-slate-500">
          Rascunho temporário, local e sem gravação na fonte.
        </p>

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
          onClick={onToggleConnections}
          aria-pressed={connectionsEnabled}
          className={`mt-3 w-full rounded-lg border px-3 py-2 text-left transition ${
            connectionsEnabled
              ? "border-cyan-400/20 bg-cyan-400/5"
              : "border-slate-800 bg-slate-950/70 hover:border-cyan-400/40"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium text-cyan-200">
              Ligações visíveis
            </span>

            <span className="rounded-md bg-cyan-400/10 px-2 py-0.5 text-[11px] font-bold text-cyan-300">
              {connectionsEnabled ? visibleConnectionCount : "Ocultas"}
            </span>
          </div>

          <p className="mt-1 text-[9px] leading-3 text-slate-500">
            {!connectionsEnabled
              ? "Ative para exibir relações explícitas entre registros localizados."
              : visibleConnectionCount > 0
                ? "Linhas geradas por vínculos explícitos entre registros localizados."
                : "As linhas surgem quando registros vinculados possuem locais distintos."}
          </p>
        </button>

        <button
          type="button"
          className="mt-2 w-full rounded-lg border border-slate-700 px-2 py-2 text-[11px] text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200"
          onClick={onReturnToOverview}
        >
          Retornar à visão geral
        </button>

        {onCopyShareLink && (
          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-2 py-2 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
            onClick={() => void onCopyShareLink()}
          >
            {shareStatus === "copied"
              ? "Link seguro copiado"
              : shareStatus === "error"
                ? "Não foi possível copiar"
                : "Copiar link desta visão"}
          </button>
        )}
      </div>

      <div className="border-t border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center gap-2">
          <span
            className={[
              "h-2.5 w-2.5 rounded-full",
              getStatusIndicatorClassName(dataStatus),
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

          {isReloading ? "Atualizando..." : "Atualizar dados"}
        </button>
      </div>
    </aside>
  );
}
