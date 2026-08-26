"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  filterOrganizationDirectory,
  type OrganizationDirectoryFilter,
} from "@/features/intelligence/organization-directory-filter";

type Organization = {
  recordId: string;
  name: string;
  acronym: string | null;
  organizationType: string | null;
  organizationStatus: string | null;
  explicitLinkCount: number;
  linkedIndividualCount: number;
};

type Payload = {
  success: boolean;
  auditPersisted?: boolean;
  organizations?: Organization[];
  message?: string;
};

export function OrganizationDirectoryClient() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrganizationDirectoryFilter>("all");
  const [status, setStatus] = useState("Carregando diretório protegido...");
  const [auditPersisted, setAuditPersisted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/intelligence/organizations?limit=100", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as Payload;
          if (!response.ok || !payload.success)
            throw new Error(
              payload.message || "Falha ao consultar organizações.",
            );
          setOrganizations(payload.organizations || []);
          setAuditPersisted(Boolean(payload.auditPersisted));
          setStatus("");
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setStatus(
              error instanceof Error
                ? error.message
                : "Falha ao consultar organizações.",
            );
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const filtered = useMemo(
    () => filterOrganizationDirectory(organizations, query, filter),
    [filter, organizations, query],
  );

  const filters: Array<{ value: OrganizationDirectoryFilter; label: string }> =
    [
      { value: "all", label: "Todas" },
      { value: "linked", label: "Com vínculos explícitos" },
      { value: "unlinked", label: "Sem vínculos" },
    ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-6 py-10">
      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-cyan-950/40 p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
          Vínculos expressamente registrados
        </p>
        <h2 className="mt-4 text-4xl font-bold text-white">
          Diretório seguro de organizações
        </h2>
        <p className="mt-4 max-w-4xl text-slate-400">
          Consulta autenticada e auditada de organizações cadastradas na fonte.
          A presença nesta lista ou um vínculo registrado não confirma
          participação criminal.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap gap-2" aria-label="Filtros do diretório">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                filter === option.value
                  ? "border-cyan-300 bg-cyan-400 text-slate-950"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-400/60"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
              Organizações localizadas
            </p>
            <p className="mt-2 text-3xl font-bold">{filtered.length}</p>
          </div>
          <div className="text-sm text-emerald-300">
            {auditPersisted ? "Consulta auditada" : status}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, sigla, tipo ou situação"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400 md:max-w-md"
          />
        </div>
      </section>

      {status ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5 text-amber-200">
          {status}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((organization) => (
          <article
            key={organization.recordId}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-violet-300">
              Organização cadastrada
            </p>
            <h3 className="mt-3 text-xl font-semibold text-white">
              {organization.name}
            </h3>
            <p className="mt-1 text-slate-400">
              {organization.acronym || "Sem sigla informada"}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <span className="rounded-lg bg-slate-950/70 p-3">
                Tipo: {organization.organizationType || "não informado"}
              </span>
              <span className="rounded-lg bg-slate-950/70 p-3">
                Situação: {organization.organizationStatus || "não informada"}
              </span>
            </div>
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <strong className="text-cyan-300">
                {organization.linkedIndividualCount}
              </strong>{" "}
              indivíduo(s) em {organization.explicitLinkCount} vínculo(s)
              explícito(s)
            </div>
            <Link
              href={`/intelligence/organizations/${organization.recordId}`}
              className="mt-5 inline-flex rounded-xl bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Abrir ficha
            </Link>
          </article>
        ))}
      </section>

      {!status && filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
          Nenhuma organização corresponde aos filtros selecionados.
        </div>
      ) : null}
    </div>
  );
}
