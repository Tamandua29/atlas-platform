"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { filterVehicleDirectory } from "@/features/intelligence/vehicle-directory-policy";

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
  vehicles?: Vehicle[];
  message?: string;
};

export function VehicleDirectoryClient() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Carregando diretório protegido...");
  const [auditPersisted, setAuditPersisted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/intelligence/vehicles?limit=100", { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const payload = await response.json() as Payload;
          if (!response.ok || !payload.success) throw new Error(payload.message || "Falha ao consultar veículos.");
          setVehicles(payload.vehicles || []);
          setAuditPersisted(Boolean(payload.auditPersisted));
          setStatus("");
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : "Falha ao consultar veículos.");
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const filtered = useMemo(() => filterVehicleDirectory(vehicles, query), [query, vehicles]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-6 py-10">
      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-cyan-950/40 p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Consulta operacional protegida</p>
        <h2 className="mt-4 text-4xl font-bold text-white">Diretório seguro de veículos</h2>
        <p className="mt-4 max-w-4xl text-slate-400">
          Veículos cadastrados na fonte com placa parcialmente mascarada. O RENAVAM e outros identificadores integrais não são enviados ao navegador.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Veículos localizados</p>
            <p className="mt-2 text-3xl font-bold">{filtered.length}</p>
          </div>
          <div className="text-sm text-emerald-300">{auditPersisted ? "Consulta auditada" : status}</div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por placa mascarada, marca, modelo, cor ou situação"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400 md:max-w-xl"
          />
        </div>
      </section>

      {status ? <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5 text-amber-200">{status}</div> : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((vehicle) => (
          <article key={vehicle.recordId} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Veículo protegido</p>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Veículo sem descrição"}
                </h3>
              </div>
              <span className="rounded-full border border-amber-400/30 bg-amber-950/30 px-3 py-1 text-sm font-semibold text-amber-200">{vehicle.maskedPlate}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <span className="rounded-lg bg-slate-950/70 p-3">Cor: {vehicle.color || "não informada"}</span>
              <span className="rounded-lg bg-slate-950/70 p-3">Ano: {vehicle.year || "não informado"}</span>
              <span className="rounded-lg bg-slate-950/70 p-3">Situação: {vehicle.status || "não informada"}</span>
              <span className="rounded-lg bg-slate-950/70 p-3">Vínculo: {vehicle.relationshipType || "não informado"}</span>
            </div>
            <Link
              href={`/intelligence/vehicles/${vehicle.recordId}`}
              className="mt-5 inline-flex rounded-xl bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Abrir ficha
            </Link>
          </article>
        ))}
      </section>

      {!status && filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">Nenhum veículo corresponde à consulta.</div>
      ) : null}
    </div>
  );
}
