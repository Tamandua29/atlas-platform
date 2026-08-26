"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OrganizationLink = {
  linkRecordId: string;
  individualRecordId: string;
  legalName: string;
  alias: string | null;
  role: string | null;
  relationshipType: string | null;
  informationStatus: string | null;
  verificationStatus: string | null;
};

type Organization = {
  recordId: string;
  name: string;
  acronym: string | null;
  organizationType: string | null;
  organizationStatus: string | null;
  links: OrganizationLink[];
};

type Payload = {
  success: boolean;
  auditPersisted?: boolean;
  organization?: Organization;
  message?: string;
};

export function OrganizationProfileClient({ recordId }: { recordId: string }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [status, setStatus] = useState("Carregando ficha protegida...");
  const [auditPersisted, setAuditPersisted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(
        `/api/intelligence/organizations/${encodeURIComponent(recordId)}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      )
        .then(async (response) => {
          const payload = (await response.json()) as Payload;
          if (!response.ok || !payload.success || !payload.organization) {
            throw new Error(
              payload.message || "Falha ao consultar a organização.",
            );
          }
          setOrganization(payload.organization);
          setAuditPersisted(Boolean(payload.auditPersisted));
          setStatus("");
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setStatus(
              error instanceof Error
                ? error.message
                : "Falha ao consultar a organização.",
            );
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [recordId]);

  if (status) {
    return (
      <div className="mx-auto max-w-[1500px] px-6 py-10 text-amber-200">
        {status}
      </div>
    );
  }
  if (!organization) return null;

  const distinctIndividualCount = new Set(
    organization.links.map((link) => link.individualRecordId),
  ).size;
  const verifiedLinkCount = organization.links.filter((link) =>
    link.verificationStatus?.toLocaleLowerCase("pt-BR").includes("verific"),
  ).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-6 py-10">
      <section className="rounded-3xl border border-violet-400/20 bg-gradient-to-r from-slate-900 to-violet-950/40 p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">
              Organização cadastrada
            </p>
            <h2 className="mt-4 text-4xl font-bold text-white">
              {organization.name}
            </h2>
            <p className="mt-2 text-xl text-slate-300">
              {organization.acronym || "Sem sigla informada"}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/50 px-5 py-4 text-emerald-300">
            {auditPersisted ? "Acesso auditado" : "Auditoria pendente"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
            Vínculos explícitos
          </p>
          <p className="mt-2 text-3xl font-bold text-cyan-300">
            {organization.links.length}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
            Pessoas distintas
          </p>
          <p className="mt-2 text-3xl font-bold text-violet-300">
            {distinctIndividualCount}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
            Vínculos verificados
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">
            {verifiedLinkCount}
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
            Tipo
          </p>
          <p className="mt-2 text-lg text-white">
            {organization.organizationType || "Não informado"}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
            Situação
          </p>
          <p className="mt-2 text-lg text-white">
            {organization.organizationStatus || "Não informada"}
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 p-6">
          <div>
            <h3 className="text-2xl font-bold text-white">
              Vínculos explícitos com indivíduos
            </h3>
            <p className="mt-2 text-slate-400">
              Somente relações expressamente registradas na fonte são exibidas.
            </p>
          </div>
          <span className="rounded-full bg-violet-950/70 px-4 py-2 font-semibold text-violet-200">
            {organization.links.length} vínculo(s)
          </span>
        </div>

        {organization.links.length ? (
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {organization.links.map((link) => (
              <article
                key={`${link.linkRecordId}:${link.individualRecordId}`}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-400">
                  Pessoa vinculada
                </p>
                <h4 className="mt-3 text-lg font-semibold text-white">
                  {link.legalName}
                </h4>
                <p className="mt-1 text-slate-400">
                  {link.alias || "Sem vulgo informado"}
                </p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Função ou posição</dt>
                    <dd>{link.role || "Não informada"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tipo de vínculo</dt>
                    <dd>{link.relationshipType || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Situação da informação</dt>
                    <dd>{link.informationStatus || "Não informada"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Verificação</dt>
                    <dd>{link.verificationStatus || "Não informada"}</dd>
                  </div>
                </dl>
                <Link
                  href={`/intelligence/individuals/${link.individualRecordId}`}
                  className="mt-5 inline-flex rounded-xl bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Abrir ficha individual
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-6 text-slate-400">
            Nenhum vínculo explícito com indivíduo foi localizado.
          </p>
        )}

        <p className="border-t border-amber-400/20 bg-amber-950/20 p-5 text-sm text-amber-200">
          Um vínculo cadastrado indica apenas uma relação registrada na fonte e
          não confirma participação criminal.
        </p>
      </section>
    </div>
  );
}
