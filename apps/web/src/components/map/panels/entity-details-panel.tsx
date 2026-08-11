import Link from "next/link";

import {
  OPERATIONAL_ENTITY_CONFIG,
  OPERATIONAL_PRIORITY_CONFIG,
} from "@/features/operational-map/operational-map.data";
import { getOperationalEntityProfileHref } from "@/features/operational-map/operational-entity-profile-link";

import type { OperationalEntity } from "@/features/operational-map/operational-map.types";

type EntityDetailsPanelProps = {
  entity: OperationalEntity;
  onClose: () => void;
  onCenter: () => void;
};

function formatEntityDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function EntityDetailsPanel({
  entity,
  onClose,
  onCenter,
}: EntityDetailsPanelProps) {
  const entityConfiguration =
    OPERATIONAL_ENTITY_CONFIG[entity.type];

  const priority = entity.priority ?? "normal";

  const priorityConfiguration =
    OPERATIONAL_PRIORITY_CONFIG[priority];

  const formattedDate = formatEntityDate(
    entity.createdAt,
  );

  const profileHref = getOperationalEntityProfileHref(entity);

  return (
    <aside className="absolute bottom-4 right-4 top-4 z-20 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl backdrop-blur">
      <div
        className="h-1.5 w-full"
        style={{
          backgroundColor:
            entityConfiguration.color,
        }}
      />

      <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              color: entityConfiguration.color,
            }}
          >
            {entityConfiguration.singularLabel}
          </p>

          <h3 className="mt-2 text-lg font-semibold leading-6 text-white">
            {entity.title}
          </h3>
        </div>

        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-sm text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          onClick={onClose}
          aria-label="Fechar painel de detalhes"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{
              color:
                priorityConfiguration.color,
              backgroundColor:
                priorityConfiguration.backgroundColor,
            }}
          >
            Prioridade{" "}
            {priorityConfiguration.label}
          </span>

          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-300">
            {entity.status}
          </span>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-300">
          {entity.description}
        </p>

        <dl className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Referência
            </dt>

            <dd className="mt-2 text-sm font-medium text-white">
              {entity.reference}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Localização
            </dt>

            <dd className="mt-2 text-sm font-medium text-white">
              {entity.locationLabel}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Coordenadas
            </dt>

            <dd className="mt-2 font-mono text-xs text-cyan-300">
              {entity.coordinates[1].toFixed(6)},{" "}
              {entity.coordinates[0].toFixed(6)}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Data do registro
            </dt>

            <dd className="mt-2 text-sm font-medium text-white">
              {formattedDate}
            </dd>
          </div>
        </dl>
      </div>

      <footer className="grid grid-cols-2 gap-3 border-t border-slate-800 p-4">
        <button
          type="button"
          className="rounded-xl border border-slate-700 px-3 py-3 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          onClick={onClose}
        >
          Fechar
        </button>

        {profileHref && (
          <Link
            href={profileHref}
            className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-3 py-3 text-center text-xs font-semibold text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-400/20 hover:text-white"
          >
            Abrir ficha
          </Link>
        )}

        <button
          type="button"
          className={`rounded-xl bg-cyan-400 px-3 py-3 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 ${
            profileHref ? "col-span-2" : ""
          }`}
          onClick={onCenter}
        >
          Centralizar
        </button>
      </footer>
    </aside>
  );
}
