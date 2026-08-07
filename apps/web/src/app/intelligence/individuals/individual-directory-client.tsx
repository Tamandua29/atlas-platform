"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Individual = {
  recordId: string;
  legalName: string;
  alias: string | null;
  birthDate: string | null;
  motherName: string | null;
  cpfPresent: boolean;
  identityDocumentPresent: boolean;
};

type Payload = {
  success: boolean;
  auditPersisted?: boolean;
  individuals?: Individual[];
  message?: string;
};

export function IndividualDirectoryClient() {
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Carregando diretório protegido...");
  const [auditPersisted, setAuditPersisted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/intelligence/individuals?limit=100", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json() as Payload;
          if (!response.ok || !payload.success) throw new Error(payload.message || "Falha ao consultar diretório.");
          setIndividuals(payload.individuals || []);
          setAuditPersisted(Boolean(payload.auditPersisted));
          setStatus("");
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setStatus(error instanceof Error ? error.message : "Falha ao consultar diretório.");
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleUpperCase("pt-BR");
    if (!normalized) return individuals;
    return individuals.filter((individual) =>
      [individual.legalName, individual.alias || ""]
        .some((value) => value.toLocaleUpperCase("pt-BR").includes(normalized)),
    );
  }, [individuals, query]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-6 py-10">
      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-cyan-950/40 p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Identificação canônica</p>
        <h2 className="mt-4 text-4xl font-bold text-white">Diretório seguro de indivíduos</h2>
        <p className="mt-4 max-w-3xl text-slate-400">
          Consulte identidades consolidadas e abra a ficha operacional. O acesso é autenticado, auditado e não altera a origem.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Pessoas localizadas</p>
            <p className="mt-2 text-3xl font-bold">{filtered.length}</p>
          </div>
          <div className="text-sm text-emerald-300">{auditPersisted ? "Consulta auditada" : status}</div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou vulgo"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400 md:max-w-md"
          />
        </div>
      </section>

      {status ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5 text-amber-200">{status}</div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((individual) => (
          <article key={individual.recordId} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-400">Identidade protegida</p>
            <h3 className="mt-3 text-xl font-semibold text-white">{individual.legalName}</h3>
            <p className="mt-1 text-slate-400">{individual.alias || "Sem vulgo informado"}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <span className="rounded-lg bg-slate-950/70 p-3">CPF: {individual.cpfPresent ? "presente" : "ausente"}</span>
              <span className="rounded-lg bg-slate-950/70 p-3">RG: {individual.identityDocumentPresent ? "presente" : "ausente"}</span>
            </div>
            <Link
              href={`/intelligence/individuals/${individual.recordId}`}
              className="mt-6 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Abrir ficha
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
