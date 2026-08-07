"use client";

import { useEffect, useState } from "react";

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
  individual?: Individual;
  message?: string;
};

const sections = [
  ["Endereços", "Locais vinculados e histórico residencial"],
  ["Telefones", "Contatos e linhas relacionadas"],
  ["Veículos", "Propriedade, uso e vínculos"],
  ["Mandados", "Restrições e situação"],
  ["Fotografias", "Acervo visual autorizado"],
  ["Ocorrências", "Registros operacionais relacionados"],
  ["Relatórios", "Documentos e análises vinculadas"],
  ["Organizações", "Facções e grupos relacionados"],
  ["Vínculos", "Comparsas e conexões entre entidades"],
  ["Linha do tempo", "Eventos ordenados cronologicamente"],
  ["Geolocalização", "Pontos e movimentações no mapa"],
] as const;

export function IndividualProfileClient({ recordId }: { recordId: string }) {
  const [individual, setIndividual] = useState<Individual | null>(null);
  const [message, setMessage] = useState("Carregando ficha protegida...");
  const [auditPersisted, setAuditPersisted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/intelligence/individuals/${recordId}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json() as Payload;
          if (!response.ok || !payload.success || !payload.individual) {
            throw new Error(payload.message || "Falha ao carregar ficha.");
          }
          setIndividual(payload.individual);
          setAuditPersisted(Boolean(payload.auditPersisted));
          setMessage("");
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setMessage(error instanceof Error ? error.message : "Falha ao carregar ficha.");
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [recordId]);

  if (!individual) {
    return <div className="mx-auto max-w-[1500px] px-6 py-10 text-amber-200">{message}</div>;
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-6 py-10">
      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-cyan-950/40 p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Pessoa</p>
            <h2 className="mt-3 text-4xl font-bold text-white">{individual.legalName}</h2>
            <p className="mt-3 text-xl text-slate-300">{individual.alias || "Sem vulgo informado"}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/50 p-5 text-emerald-300">
            {auditPersisted ? "Acesso auditado" : "Auditoria indisponível"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Info label="Nascimento" value={individual.birthDate || "Não informado"} />
        <Info label="Filiação materna" value={individual.motherName || "Não informada"} />
        <Info label="CPF" value={individual.cpfPresent ? "Documento presente" : "Não informado"} />
        <Info label="RG" value={individual.identityDocumentPresent ? "Documento presente" : "Não informado"} />
      </section>

      <section>
        <h3 className="text-2xl font-semibold text-white">Informações relacionadas</h3>
        <p className="mt-2 text-slate-400">A ficha foi preparada para receber os próximos conjuntos de vínculos sem expor documentos nesta visão.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h4 className="font-semibold text-cyan-300">{title}</h4>
              <p className="mt-2 text-sm text-slate-400">{description}</p>
              <p className="mt-5 text-xs uppercase tracking-[0.14em] text-slate-600">Integração seguinte</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 font-medium text-white">{value}</p>
    </article>
  );
}
