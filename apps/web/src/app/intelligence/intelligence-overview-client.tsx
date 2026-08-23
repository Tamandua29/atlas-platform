"use client";

import { useEffect, useState } from "react";

import type { IntelligenceOverview } from "@/features/intelligence/intelligence-overview";

type ResponsePayload = {
  success: boolean;
  auditPersisted?: boolean;
  overview?: IntelligenceOverview;
  message?: string;
};

let overviewRequest: Promise<ResponsePayload> | null = null;

function loadOverview() {
  overviewRequest ??= fetch("/api/intelligence/overview", { cache: "no-store" }).then(async (response) => {
    const payload = await response.json() as ResponsePayload;
    if (!response.ok || !payload.success || !payload.overview) {
      throw new Error(payload.message || "Não foi possível carregar a visão consolidada.");
    }
    return payload;
  });
  return overviewRequest;
}

const metricClass = "rounded-2xl border border-slate-800 bg-slate-900/60 p-5";

export function IntelligenceOverviewClient() {
  const [payload, setPayload] = useState<ResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadOverview()
      .then((result) => { if (active) setPayload(result); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Falha desconhecida.");
      });
    return () => { active = false; };
  }, []);

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-400/30 bg-rose-950/20 p-5 text-rose-200">
        {error}
      </section>
    );
  }

  const overview = payload?.overview;
  if (!overview) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
        Consolidando os diretórios autorizados…
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="intelligence-overview-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Consulta auditada</p>
          <h2 id="intelligence-overview-title" className="mt-2 text-2xl font-semibold text-white">
            Visão consolidada
          </h2>
          <p className="mt-1 text-sm text-slate-400">Somente indicadores agregados, sem dados pessoais.</p>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-300">
          {payload.auditPersisted ? "Auditoria persistida" : "Consulta protegida"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Registros monitorados", overview.totals.all],
          ["Indivíduos", overview.totals.individuals],
          ["Organizações", overview.totals.organizations],
          ["Veículos", overview.totals.vehicles],
          ["Mandados", overview.totals.warrants],
        ].map(([label, value]) => (
          <article key={label} className={metricClass}>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <article className={metricClass}>
          <p className="font-semibold text-white">Cobertura documental</p>
          <p className="mt-3 text-3xl font-bold text-cyan-300">{overview.identityCoverage.percentage}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={overview.identityCoverage.percentage} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${overview.identityCoverage.percentage}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-400">{overview.identityCoverage.complete} completas · {overview.identityCoverage.incomplete} incompletas</p>
        </article>
        <article className={metricClass}>
          <p className="font-semibold text-white">Vínculos organizacionais</p>
          <p className="mt-3 text-3xl font-bold text-violet-300">{overview.organizationLinks.explicitLinks}</p>
          <p className="mt-3 text-sm text-slate-400">{overview.organizationLinks.organizationsWithLinks} organizações com vínculo · {overview.organizationLinks.linkedIndividuals} referências individuais</p>
        </article>
        <article className={metricClass}>
          <p className="font-semibold text-white">Mandados que exigem atenção</p>
          <p className="mt-3 text-3xl font-bold text-amber-300">{overview.warrantAttention.requiringAttention}</p>
          <p className="mt-3 text-sm text-slate-400">{overview.warrantAttention.active} ativos · {overview.warrantAttention.expiring} próximos do vencimento · {overview.warrantAttention.expired} vencidos</p>
        </article>
        <article className={metricClass}>
          <p className="font-semibold text-white">Situação dos veículos</p>
          <p className="mt-3 text-3xl font-bold text-sky-300">{overview.vehicleStatus.informed}</p>
          <p className="mt-3 text-sm text-slate-400">com situação informada · {overview.vehicleStatus.notInformed} pendentes</p>
        </article>
      </div>
    </section>
  );
}
