"use client";

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
  message?: string;
};

export function VehicleProfileClient({ recordId }: { recordId: string }) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
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
          const payload = await response.json() as Payload;
          if (!response.ok || !payload.success || !payload.vehicle) {
            throw new Error(payload.message || "Falha ao consultar o veículo.");
          }
          setVehicle(payload.vehicle);
          setAuditPersisted(Boolean(payload.auditPersisted));
          setStatus("");
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setStatus(error instanceof Error ? error.message : "Falha ao consultar o veículo.");
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [recordId]);

  if (!vehicle) {
    return <div className="mx-auto max-w-[1500px] px-6 py-10 text-amber-200">{status}</div>;
  }

  const description = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Veículo sem descrição";

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-6 py-10">
      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-cyan-950/40 p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Veículo</p>
            <h2 className="mt-4 text-4xl font-bold text-white">{description}</h2>
            <p className="mt-3 text-2xl text-slate-300">{vehicle.maskedPlate}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/40 px-6 py-5">
            <p className="font-semibold text-emerald-300">{auditPersisted ? "Acesso auditado" : "Auditoria em processamento"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Cor" value={vehicle.color} />
        <Field label="Ano" value={vehicle.year ? String(vehicle.year) : null} />
        <Field label="Situação" value={vehicle.status} />
        <Field label="Tipo de vínculo" value={vehicle.relationshipType} />
      </section>

      <section className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-6">
        <h3 className="font-semibold text-amber-200">Proteção de identificadores ativa</h3>
        <p className="mt-2 text-sm text-amber-100/80">
          A placa permanece parcialmente mascarada. RENAVAM, chassi e identificadores integrais não são enviados ao navegador.
        </p>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <p className="text-sm uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value || "Não informado"}</p>
    </div>
  );
}
