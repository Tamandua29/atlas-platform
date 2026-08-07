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

type Phone = {
  recordId: string;
  maskedNumber: string;
  type: string | null;
  carrier: string | null;
  status: string | null;
  source: string | null;
  informationDate: string | null;
};

type Vehicle = {
  recordId: string;
  maskedPlate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
  relationshipType: string | null;
  status: string | null;
  source: string | null;
  informationDate: string | null;
};

type Warrant = {
  recordId: string;
  maskedWarrantNumber: string;
  maskedCaseNumber: string;
  issuingAuthority: string | null;
  court: string | null;
  type: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: string | null;
  sources: string[];
  consultedAt: string | null;
};

type Payload = {
  success: boolean;
  auditPersisted?: boolean;
  individual?: Individual;
  relationships?: { addresses?: Address[]; phones?: Phone[]; vehicles?: Vehicle[]; warrants?: Warrant[] };
  message?: string;
};

const sections = [
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
  const [phones, setPhones] = useState<Phone[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warrants, setWarrants] = useState<Warrant[]>([]);
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
          setPhones(payload.relationships?.phones || []);
          setVehicles(payload.relationships?.vehicles || []);
          setWarrants(payload.relationships?.warrants || []);
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
              ? openStreetMapUrl(address.latitude, address.longitude)
              : null;
            const mapEmbedUrl = hasCoordinates
              ? openStreetMapEmbedUrl(address.latitude, address.longitude)
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
                {mapUrl && mapEmbedUrl ? (
                  <div className="mt-5 space-y-3">
                    <div className="overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-900">
                      <iframe
                        title={`Mapa de ${address.label}`}
                        src={mapEmbedUrl}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-64 w-full"
                      />
                    </div>
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-300"
                    >
                      Abrir no OpenStreetMap
                    </a>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-amber-300">Sem coordenadas válidas</p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Telefones vinculados</h3>
              <p className="mt-2 text-slate-400">Linhas relacionadas à pessoa, exibidas de forma mascarada e auditada.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
              {phones.length} vinculado(s)
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          {phones.length === 0 ? (
            <p className="text-slate-500">Nenhum telefone vinculado foi localizado.</p>
          ) : phones.map((phone) => (
            <article key={phone.recordId} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">
                {phone.type || "Telefone"}
              </p>
              <h4 className="mt-3 text-xl font-semibold text-white">{phone.maskedNumber}</h4>
              <div className="mt-4 grid gap-3 text-sm text-slate-400">
                <PhoneInfo label="Operadora" value={phone.carrier} />
                <PhoneInfo label="Situação" value={phone.status} />
                <PhoneInfo label="Fonte" value={phone.source} />
                <PhoneInfo label="Data da informação" value={phone.informationDate} />
              </div>
            </article>
          ))}
        </div>
        <p className="border-t border-slate-800 px-6 py-4 text-xs text-amber-300">
          Proteção ativa: o número completo não é enviado ao navegador.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Veículos vinculados</h3>
              <p className="mt-2 text-slate-400">Veículos relacionados à pessoa, com identificação protegida e acesso auditado.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
              {vehicles.length} vinculado(s)
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.length === 0 ? (
            <p className="text-slate-500">Nenhum veículo vinculado foi localizado.</p>
          ) : vehicles.map((vehicle) => (
            <article key={vehicle.recordId} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">
                    {vehicle.relationshipType || "Veículo relacionado"}
                  </p>
                  <h4 className="mt-3 text-xl font-semibold text-white">
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Veículo sem descrição"}
                  </h4>
                </div>
                <span className="rounded-lg border border-cyan-400/20 px-3 py-2 font-mono text-sm text-cyan-300">
                  {vehicle.maskedPlate}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-400">
                <VehicleInfo label="Cor" value={vehicle.color} />
                <VehicleInfo label="Ano" value={vehicle.year?.toString() || null} />
                <VehicleInfo label="Situação" value={vehicle.status} />
                <VehicleInfo label="Fonte" value={vehicle.source} />
                <VehicleInfo label="Data da informação" value={vehicle.informationDate} />
              </div>
            </article>
          ))}
        </div>
        <p className="border-t border-slate-800 px-6 py-4 text-xs text-amber-300">
          Proteção ativa: placa parcialmente mascarada e RENAVAM não enviado ao navegador.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Mandados vinculados</h3>
              <p className="mt-2 text-slate-400">Referências judiciais vinculadas à pessoa, com dados sensíveis protegidos.</p>
            </div>
            <span className="rounded-full bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300">
              {warrants.length} vinculado(s)
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {warrants.length === 0 ? (
            <p className="text-slate-500">Nenhum mandado vinculado foi localizado.</p>
          ) : warrants.map((warrant) => (
            <article key={warrant.recordId} className="rounded-2xl border border-amber-400/20 bg-slate-950/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
                    {warrant.type || "Mandado"}
                  </p>
                  <h4 className="mt-3 font-mono text-lg font-semibold text-white">
                    {warrant.maskedWarrantNumber}
                  </h4>
                </div>
                <span className="rounded-full border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-200">
                  {warrant.status || "Status não informado"}
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <WarrantInfo label="Processo" value={warrant.maskedCaseNumber} />
                <WarrantInfo label="Tribunal" value={warrant.court} />
                <WarrantInfo label="Autoridade emissora" value={warrant.issuingAuthority} />
                <WarrantInfo label="Emissão" value={warrant.issuedAt} />
                <WarrantInfo label="Validade" value={warrant.expiresAt} />
                <WarrantInfo label="Última consulta" value={warrant.consultedAt} />
              </div>
              {warrant.sources.length > 0 ? (
                <p className="mt-5 text-xs text-slate-500">
                  Fonte(s): {warrant.sources.join(", ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
        <p className="border-t border-slate-800 px-6 py-4 text-xs text-amber-300">
          Proteção ativa: referências mascaradas; detalhes, observações e documentos não são enviados ao navegador.
        </p>
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

function openStreetMapUrl(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

function openStreetMapEmbedUrl(latitude: number, longitude: number) {
  const offset = 0.006;
  const boundingBox = [
    longitude - offset,
    latitude - offset,
    longitude + offset,
    latitude + offset,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(boundingBox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function WarrantInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="block text-xs text-slate-600">{label}</span>
      <span className="text-sm text-slate-300">{value || "Não informado"}</span>
    </p>
  );
}

function VehicleInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="block text-xs text-slate-600">{label}</span>
      <span className="text-slate-300">{value || "Não informado"}</span>
    </p>
  );
}

function PhoneInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="text-slate-600">{label}:</span>{" "}
      <span className="text-slate-300">{value || "Não informado"}</span>
    </p>
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
