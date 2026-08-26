"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Vehicle = {
  recordId: string;
  maskedPlate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
  status: string | null;
  relationshipType: string | null;
};

type Payload = {
  success: boolean;
  auditPersisted?: boolean;
  vehicle?: Vehicle;
  linkedIndividuals?: LinkedIndividual[];
  linkedOccurrences?: LinkedOccurrence[];
  message?: string;
};

type LinkedIndividual = {
  recordId: string;
  legalName: string;
  alias: string | null;
};

type LinkedOccurrence = {
  recordId: string;
  maskedOccurrenceNumber: string;
  occurredAt: string | null;
  category: string | null;
  status: string | null;
};

export function VehicleProfileClient({ recordId }: { recordId: string }) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [linkedIndividuals, setLinkedIndividuals] = useState<
    LinkedIndividual[]
  >([]);
  const [linkedOccurrences, setLinkedOccurrences] = useState<
    LinkedOccurrence[]
  >([]);
  const [status, setStatus] = useState("Carregando ficha protegida...");
  const [auditPersisted, setAuditPersisted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/intelligence/vehicles/${recordId}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as Payload;
          if (!response.ok || !payload.success || !payload.vehicle) {
            throw new Error(payload.message || "Falha ao consultar o veículo.");
          }
          setVehicle(payload.vehicle);
          setLinkedIndividuals(payload.linkedIndividuals || []);
          setLinkedOccurrences(payload.linkedOccurrences || []);
          setAuditPersisted(Boolean(payload.auditPersisted));
          setStatus("");
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setStatus(
              error instanceof Error
                ? error.message
                : "Falha ao consultar o veículo.",
            );
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [recordId]);

  if (!vehicle) {
    return (
      <div className="mx-auto max-w-[1500px] px-6 py-10 text-amber-200">
        {status}
      </div>
    );
  }

  const description =
    [vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
    "Veículo sem descrição";

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-6 py-10">
      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-cyan-950/40 p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Veículo
            </p>
            <h2 className="mt-4 text-4xl font-bold text-white">
              {description}
            </h2>
            <p className="mt-3 text-2xl text-slate-300">
              {vehicle.maskedPlate}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/40 px-6 py-5">
            <p className="font-semibold text-emerald-300">
              {auditPersisted
                ? "Acesso auditado"
                : "Auditoria em processamento"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Cor" value={vehicle.color} />
        <Field label="Ano" value={vehicle.year ? String(vehicle.year) : null} />
        <Field label="Situação" value={vehicle.status} />
        <Field label="Tipo de vínculo" value={vehicle.relationshipType} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <div>
            <h3 className="text-2xl font-semibold text-white">
              Pessoas vinculadas
            </h3>
            <p className="mt-2 text-slate-400">
              Vínculos explicitamente registrados na fonte, sem inferência
              automática.
            </p>
          </div>
          <span className="rounded-full bg-cyan-950 px-4 py-2 font-semibold text-cyan-300">
            {linkedIndividuals.length} vinculada(s)
          </span>
        </div>

        {linkedIndividuals.length === 0 ? (
          <p className="p-6 text-slate-400">
            Nenhuma pessoa explicitamente vinculada foi localizada.
          </p>
        ) : (
          <div className="grid gap-4 p-6 md:grid-cols-2">
            {linkedIndividuals.map((individual) => (
              <article
                key={individual.recordId}
                className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
                  Identidade protegida
                </p>
                <h4 className="mt-3 text-xl font-semibold text-white">
                  {individual.legalName}
                </h4>
                <p className="mt-1 text-slate-400">
                  {individual.alias || "Sem vulgo informado"}
                </p>
                <Link
                  href={`/intelligence/individuals/${individual.recordId}`}
                  className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  Abrir ficha individual
                </Link>
              </article>
            ))}
          </div>
        )}

        <p className="border-t border-slate-800 px-6 py-4 text-sm text-amber-300">
          Proteção ativa: CPF, RG, documentos e observações de vínculo não são
          enviados ao navegador.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <div>
            <h3 className="text-2xl font-semibold text-white">
              Ocorrências vinculadas
            </h3>
            <p className="mt-2 text-slate-400">
              Referências explicitamente relacionadas ao veículo.
            </p>
          </div>
          <span className="rounded-full bg-rose-950 px-4 py-2 font-semibold text-rose-300">
            {linkedOccurrences.length} vinculada(s)
          </span>
        </div>

        {linkedOccurrences.length === 0 ? (
          <p className="p-6 text-slate-400">
            Nenhuma ocorrência explicitamente vinculada foi localizada.
          </p>
        ) : (
          <div className="grid gap-4 p-6 md:grid-cols-2">
            {linkedOccurrences.map((occurrence) => (
              <article
                key={occurrence.recordId}
                className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">
                  {occurrence.category || "Ocorrência"}
                </p>
                <h4 className="mt-3 text-xl font-semibold text-white">
                  {occurrence.maskedOccurrenceNumber}
                </h4>
                <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                  <FieldValue
                    label="Data"
                    value={formatDate(occurrence.occurredAt)}
                  />
                  <FieldValue label="Situação" value={occurrence.status} />
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="border-t border-slate-800 px-6 py-4 text-sm text-amber-300">
          Proteção ativa: narrativas, anexos, observações e resultados
          operacionais não são enviados ao navegador.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-6">
        <h3 className="font-semibold text-amber-200">
          Proteção de identificadores ativa
        </h3>
        <p className="mt-2 text-sm text-amber-100/80">
          A placa permanece parcialmente mascarada. RENAVAM, chassi e
          identificadores integrais não são enviados ao navegador.
        </p>
      </section>
    </div>
  );
}

function FieldValue({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-white">{value || "Não informado"}</p>
    </div>
  );
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-white">
        {value || "Não informado"}
      </p>
    </div>
  );
}
