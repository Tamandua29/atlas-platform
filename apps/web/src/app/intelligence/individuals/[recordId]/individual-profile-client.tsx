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

type Address = {
  recordId: string;
  label: string;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  verificationStatus: string | null;
  source: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Payload = {
  success: boolean;
  auditPersisted?: boolean;
  individual?: Individual;
  relationships?: { addresses?: Address[] };
  message?: string;
};

const sections = [
  ["Telefones", "Contatos e linhas relacionadas"],
  ["Veículos", "Propriedade, uso e vínculos"],
  ["Mandados", "Restrições e situação"],
  ["Fotografias", "Acervo visual autorizado"],
  ["Ocorrências", "Registros operacionais relacionados"],
  ["Relatórios", "Documentos e análises vinculadas"],
  ["Organizações", "Facções e grupos relacionados"],
  ["Vínculos", "Comparsas e conexões entre entidades"],
  ["Linha do tempo", "Eventos ordenados cronologicamente"],
] as const;

export function IndividualProfileClient({ recordId }: { recordId: string }) {
  const [individual, setIndividual] = useState<Individual | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
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
          setAddresses(payload.relationships?.addresses || []);
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

  const initials = individual.legalName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-6 py-10">
      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-cyan-950/40 p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-36 w-28 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-slate-950/70 text-3xl font-black text-cyan-300">
              {initials}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Pessoa</p>
              <h2 className="mt-3 text-4xl font-bold text-white">{individual.legalName}</h2>
              <p className="mt-3 text-xl text-slate-300">{individual.alias || "Sem vulgo informado"}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">Foto principal será exibida neste espaço</p>
            </div>
          </div>
          <div className="h-fit rounded-2xl border border-emerald-400/20 bg-slate-950/50 p-5 text-emerald-300">
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

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Endereços e geolocalização</h3>
              <p className="mt-2 text-slate-400">Locais vinculados à pessoa, sem alteração dos registros de origem.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
              {addresses.length} vinculado(s)
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {addresses.length === 0 ? (
            <p className="text-slate-500">Nenhum endereço vinculado foi localizado.</p>
          ) : addresses.map((address) => {
            const hasCoordinates = address.latitude !== null && address.longitude !== null;
            const mapUrl = hasCoordinates
              ? `https://www.openstreetmap.org/?mlat=${address.latitude}&mlon=${address.longitude}#map=17/${address.latitude}/${address.longitude}`
              : null;

            return (
              <article key={address.recordId} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">Local vinculado</p>
                <h4 className="mt-3 font-semibold text-white">{address.label}</h4>
                <p className="mt-2 text-sm text-slate-400">
                  {[address.neighborhood, address.city, address.state].filter(Boolean).join(" — ") || "Localidade não detalhada"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg border border-slate-700 px-3 py-2">
                    {address.verificationStatus || "Verificação não informada"}
                  </span>
                  {address.source ? <span className="rounded-lg border border-slate-700 px-3 py-2">Fonte: {address.source}</span> : null}
                </div>
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    Ver coordenadas
                  </a>
                ) : (
                  <p className="mt-5 text-sm text-amber-300">Sem coordenadas válidas</p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-2xl font-semibold text-white">Outras informações relacionadas</h3>
        <p className="mt-2 text-slate-400">Os próximos vínculos serão conectados progressivamente a esta ficha.</p>
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
