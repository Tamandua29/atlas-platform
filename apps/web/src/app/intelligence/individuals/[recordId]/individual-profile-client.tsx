"use client";

import { useEffect, useState } from "react";

type Photo = {
  evidenceRecordId: string;
  attachmentId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  capturedAt: string | null;
  verificationStatus: string | null;
  width: number | null;
  height: number | null;
};

type MainPhoto = Omit<Photo, "evidenceRecordId" | "attachmentId" | "title" | "capturedAt" | "verificationStatus"> & {
  id: string;
  filename: string | null;
};

type Individual = {
  recordId: string;
  legalName: string;
  alias: string | null;
  birthDate: string | null;
  motherName: string | null;
  cpfPresent: boolean;
  identityDocumentPresent: boolean;
  mainPhoto: MainPhoto | null;
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

type Occurrence = {
  recordId: string;
  maskedOccurrenceNumber: string;
  occurredAt: string | null;
  nature: string | null;
  category: string | null;
  status: string | null;
  source: string | null;
  confidence: string | null;
  verificationStatus: string | null;
};

type Organization = {
  linkRecordId: string;
  organizationRecordId: string;
  name: string;
  acronym: string | null;
  organizationType: string | null;
  organizationStatus: string | null;
  role: string | null;
  relationshipType: string | null;
  informationStatus: string | null;
  source: string | null;
  confidence: string | null;
  verificationStatus: string | null;
};

type PersonalRelationship = {
  relationshipRecordId: string;
  counterpartRecordId: string;
  counterpartName: string;
  counterpartAlias: string | null;
  direction: "origin" | "destination";
  relationshipType: string;
  confidence: string | null;
  verificationStatus: string | null;
  informationDate: string | null;
  riskCategory: string | null;
  informationClassification: string | null;
  sourceRegistered: boolean;
};

type Document = {
  recordId: string;
  documentReference: string;
  title: string;
  documentType: string | null;
  documentDate: string | null;
  originAgency: string | null;
  informationClassification: string | null;
  verificationStatus: string | null;
  protectedAttachmentCount: number;
  occurrenceReferenceCount: number;
  evidenceReferenceCount: number;
};

type TimelineEvent = {
  id: string;
  occurredAt: string;
  category: "occurrence" | "warrant" | "document" | "photo" | "vehicle" | "phone" | "relationship";
  title: string;
  summary: string | null;
};

type Payload = {
  success: boolean;
  auditPersisted?: boolean;
  individual?: Individual;
  timeline?: TimelineEvent[];
  relationships?: { addresses?: Address[]; phones?: Phone[]; vehicles?: Vehicle[]; warrants?: Warrant[]; photos?: Photo[]; occurrences?: Occurrence[]; organizations?: Organization[]; personalRelationships?: PersonalRelationship[]; documents?: Document[] };
  message?: string;
};


export function IndividualProfileClient({ recordId }: { recordId: string }) {
  const [individual, setIndividual] = useState<Individual | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [phones, setPhones] = useState<Phone[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [personalRelationships, setPersonalRelationships] = useState<PersonalRelationship[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
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
          setPhotos(payload.relationships?.photos || []);
          setOccurrences(payload.relationships?.occurrences || []);
          setOrganizations(payload.relationships?.organizations || []);
          setPersonalRelationships(payload.relationships?.personalRelationships || []);
          setDocuments(payload.relationships?.documents || []);
          setTimeline(payload.timeline || []);
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
            <div
              role={individual.mainPhoto ? "img" : undefined}
              aria-label={individual.mainPhoto ? `Foto principal de ${individual.legalName}` : undefined}
              className="flex h-36 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-950/70 bg-cover bg-center text-3xl font-black text-cyan-300"
              style={individual.mainPhoto ? { backgroundImage: `url("${individual.mainPhoto.thumbnailUrl}")` } : undefined}
            >
              {individual.mainPhoto ? null : initials}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Pessoa</p>
              <h2 className="mt-3 text-4xl font-bold text-white">{individual.legalName}</h2>
              <p className="mt-3 text-xl text-slate-300">{individual.alias || "Sem vulgo informado"}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">{individual.mainPhoto ? "Foto principal autorizada" : "Foto principal não cadastrada"}</p>
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

            <nav
        aria-label="Navegação da ficha individual"
        className="sticky top-0 z-20 -mx-2 overflow-x-auto rounded-2xl border border-slate-800 bg-[#070b17]/95 p-2 shadow-xl shadow-slate-950/30 backdrop-blur"
      >
        <div className="flex min-w-max gap-2">
          {[
            ["fotografias", "Fotos", photos.length],
            ["enderecos", "Endereços", addresses.length],
            ["telefones", "Telefones", phones.length],
            ["veiculos", "Veículos", vehicles.length],
            ["mandados", "Mandados", warrants.length],
            ["ocorrencias", "Ocorrências", occurrences.length],
            ["organizacoes", "Organizações", organizations.length],
            ["vinculos", "Vínculos", personalRelationships.length],
            ["documentos", "Relatórios", documents.length],
            ["linha-do-tempo", "Linha do tempo", timeline.length],
          ].map(([target, label, count]) => (
            <a
              key={target}
              href={`#${target}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span>{label}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{count}</span>
            </a>
          ))}
        </div>
      </nav>

<section id="fotografias" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Fotografias vinculadas</h3>
              <p className="mt-2 text-slate-400">Acervo visual autorizado, filtrado por tipo de evidência e acesso auditado.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
              {photos.length} vinculada(s)
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.length === 0 ? (
            <p className="text-slate-500">Nenhuma fotografia vinculada foi localizada.</p>
          ) : photos.map((photo) => (
            <article key={`${photo.evidenceRecordId}-${photo.attachmentId}`} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50">
              <a
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Abrir ${photo.title}`}
                className="block aspect-[4/3] bg-slate-900 bg-cover bg-center"
                style={{ backgroundImage: `url("${photo.thumbnailUrl}")` }}
              />
              <div className="p-4">
                <h4 className="font-semibold text-white">{photo.title}</h4>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-lg border border-slate-700 px-2.5 py-1.5">
                    {photo.verificationStatus || "Verificação não informada"}
                  </span>
                  {photo.capturedAt ? (
                    <span className="rounded-lg border border-slate-700 px-2.5 py-1.5">
                      {formatDateTime(photo.capturedAt)}
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="border-t border-slate-800 px-6 py-4 text-xs text-amber-300">
          Proteção ativa: somente anexos de imagem classificados como fotografia ou imagem de câmera são enviados.
        </p>
      </section>

      <section id="enderecos" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
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

      <section id="telefones" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
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

      <section id="veiculos" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
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

      <section id="mandados" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
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

      <section id="ocorrencias" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Ocorrências vinculadas</h3>
              <p className="mt-2 text-slate-400">Referências operacionais relacionadas à pessoa, com narrativa e anexos protegidos.</p>
            </div>
            <span className="rounded-full bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-300">
              {occurrences.length} vinculada(s)
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {occurrences.length === 0 ? (
            <p className="text-slate-500">Nenhuma ocorrência vinculada foi localizada.</p>
          ) : occurrences.map((occurrence) => (
            <article key={occurrence.recordId} className="rounded-2xl border border-rose-400/20 bg-slate-950/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300">
                    {occurrence.category || "Ocorrência"}
                  </p>
                  <h4 className="mt-3 text-xl font-semibold text-white">
                    {occurrence.nature || "Natureza não informada"}
                  </h4>
                </div>
                <span className="rounded-lg border border-rose-400/20 px-3 py-2 font-mono text-sm text-rose-200">
                  {occurrence.maskedOccurrenceNumber}
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <OccurrenceInfo label="Data e hora" value={occurrence.occurredAt ? formatDateTime(occurrence.occurredAt) : null} />
                <OccurrenceInfo label="Situação" value={occurrence.status} />
                <OccurrenceInfo label="Fonte" value={occurrence.source} />
                <OccurrenceInfo label="Confiabilidade" value={occurrence.confidence} />
                <OccurrenceInfo label="Verificação" value={occurrence.verificationStatus} />
              </div>
            </article>
          ))}
        </div>
        <p className="border-t border-slate-800 px-6 py-4 text-xs text-amber-300">
          Proteção ativa: descrição, resultado operacional, observações e anexos não são enviados ao navegador.
        </p>
      </section>

      <section id="organizacoes" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Organizações vinculadas</h3>
              <p className="mt-2 text-slate-400">Vínculos organizacionais registrados na fonte, sem inferência automática de pertencimento.</p>
            </div>
            <span className="rounded-full bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-300">
              {organizations.length} vinculada(s)
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          {organizations.length === 0 ? (
            <p className="text-slate-500">Nenhuma organização explicitamente vinculada foi localizada.</p>
          ) : organizations.map((organization) => (
            <article key={organization.linkRecordId} className="rounded-2xl border border-violet-400/20 bg-slate-950/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
                    {organization.organizationType || "Organização"}
                  </p>
                  <h4 className="mt-3 text-xl font-semibold text-white">{organization.name}</h4>
                  {organization.acronym ? <p className="mt-1 text-sm text-slate-400">{organization.acronym}</p> : null}
                </div>
                <span className="rounded-full border border-violet-400/20 px-3 py-1.5 text-xs text-violet-200">
                  {organization.organizationStatus || "Situação não informada"}
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <OrganizationInfo label="Função ou posição" value={organization.role} />
                <OrganizationInfo label="Tipo de vínculo" value={organization.relationshipType} />
                <OrganizationInfo label="Situação da informação" value={organization.informationStatus} />
                <OrganizationInfo label="Confiabilidade" value={organization.confidence} />
                <OrganizationInfo label="Verificação" value={organization.verificationStatus} />
                <OrganizationInfo label="Fonte" value={organization.source} />
              </div>
            </article>
          ))}
        </div>
        <p className="border-t border-slate-800 px-6 py-4 text-xs text-amber-300">
          Proteção ativa: somente vínculos explícitos e metadados mínimos são exibidos; observações e evidências não são enviadas ao navegador.
        </p>
      </section>

      <section id="vinculos" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Vínculos entre pessoas</h3>
              <p className="mt-2 text-slate-400">Relações explicitamente registradas na fonte, sem inferência automática.</p>
            </div>
            <span className="rounded-full bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-300">
              {personalRelationships.length} vinculado(s)
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          {personalRelationships.length === 0 ? (
            <p className="text-slate-500">Nenhum vínculo explícito entre pessoas foi localizado.</p>
          ) : personalRelationships.map((relationship) => (
            <article key={relationship.relationshipRecordId} className="rounded-2xl border border-sky-400/20 bg-slate-950/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">
                    {relationship.relationshipType}
                  </p>
                  <h4 className="mt-3 text-xl font-semibold text-white">{relationship.counterpartName}</h4>
                  {relationship.counterpartAlias ? <p className="mt-1 text-sm text-slate-400">{relationship.counterpartAlias}</p> : null}
                </div>
                <span className="rounded-full border border-sky-400/20 px-3 py-1.5 text-xs text-sky-200">
                  {relationship.direction === "origin" ? "Origem → destino" : "Destino ← origem"}
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <RelationshipInfo label="Confiabilidade" value={relationship.confidence} />
                <RelationshipInfo label="Verificação" value={relationship.verificationStatus} />
                <RelationshipInfo label="Data da informação" value={relationship.informationDate} />
                <RelationshipInfo label="Categoria de risco" value={relationship.riskCategory} />
                <RelationshipInfo label="Classificação" value={relationship.informationClassification} />
                <RelationshipInfo label="Fonte" value={relationship.sourceRegistered ? "Referência registrada" : null} />
              </div>
              <a
                href={`/intelligence/individuals/${relationship.counterpartRecordId}`}
                className="mt-5 inline-flex rounded-xl border border-sky-400/30 px-4 py-2.5 font-semibold text-sky-200 hover:bg-sky-400/10"
              >
                Abrir ficha relacionada
              </a>
            </article>
          ))}
        </div>
        <p className="border-t border-slate-800 px-6 py-4 text-xs text-amber-300">
          Proteção ativa: descrições, observações, resumos de IA e identificação da fonte não são enviados ao navegador. O vínculo não confirma participação criminal.
        </p>
      </section>

      <section id="documentos" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Relatórios e documentos vinculados</h3>
              <p className="mt-2 text-slate-400">Documentos explicitamente ligados à pessoa, com conteúdo e anexos protegidos.</p>
            </div>
            <span className="rounded-full bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-300">
              {documents.length} vinculado(s)
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          {documents.length === 0 ? (
            <p className="text-slate-500">Nenhum relatório ou documento vinculado foi localizado.</p>
          ) : documents.map((document) => (
            <article key={document.recordId} className="rounded-2xl border border-teal-400/20 bg-slate-950/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">
                    {document.documentType || "Documento"}
                  </p>
                  <h4 className="mt-3 text-xl font-semibold text-white">{document.title}</h4>
                  <p className="mt-2 font-mono text-xs text-slate-500">{document.documentReference}</p>
                </div>
                <span className="rounded-full border border-teal-400/20 px-3 py-1.5 text-xs text-teal-200">
                  {document.verificationStatus || "Verificação não informada"}
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <DocumentInfo label="Data do documento" value={document.documentDate} />
                <DocumentInfo label="Órgão de origem" value={document.originAgency} />
                <DocumentInfo label="Classificação" value={document.informationClassification} />
                <DocumentInfo label="Arquivos protegidos" value={document.protectedAttachmentCount.toString()} />
                <DocumentInfo label="Ocorrências relacionadas" value={document.occurrenceReferenceCount.toString()} />
                <DocumentInfo label="Evidências relacionadas" value={document.evidenceReferenceCount.toString()} />
              </div>
            </article>
          ))}
        </div>
        <p className="border-t border-slate-800 px-6 py-4 text-xs text-amber-300">
          Proteção ativa: arquivos, URLs, observações, conteúdo, responsável e identificação detalhada da fonte não são enviados ao navegador.
        </p>
      </section>

      <section id="linha-do-tempo" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Linha do tempo</h3>
              <p className="mt-2 text-slate-400">Eventos datados e ordenados cronologicamente a partir dos vínculos autorizados.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
              {timeline.length} evento(s)
            </span>
          </div>
        </div>
        <div className="p-6">
          {timeline.length === 0 ? (
            <p className="text-slate-500">Nenhum evento com data válida foi localizado.</p>
          ) : (
            <ol className="relative ml-3 border-l border-cyan-400/25">
              {timeline.map((event) => (
                <li key={event.id} className="relative pb-8 pl-8 last:pb-0">
                  <span className="absolute -left-2 top-1.5 h-4 w-4 rounded-full border-4 border-slate-900 bg-cyan-400" />
                  <time className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">
                    {formatDateTime(event.occurredAt)}
                  </time>
                  <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {timelineCategoryLabel(event.category)}
                    </p>
                    <h4 className="mt-2 font-semibold text-white">{event.title}</h4>
                    {event.summary ? <p className="mt-2 text-sm text-slate-400">{event.summary}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <p className="border-t border-slate-800 px-6 py-4 text-xs text-amber-300">
          Proteção ativa: somente eventos com data válida e metadados mínimos são exibidos; narrativas, anexos e dados documentais integrais permanecem protegidos.
        </p>
      </section>
    </div>
  );
}

function timelineCategoryLabel(category: TimelineEvent["category"]) {
  const labels: Record<TimelineEvent["category"], string> = {
    occurrence: "Ocorrência",
    warrant: "Mandado",
    document: "Documento",
    photo: "Fotografia",
    vehicle: "Veículo",
    phone: "Telefone",
    relationship: "Vínculo pessoal",
  };
  return labels[category];
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
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

function DocumentInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="block text-xs text-slate-600">{label}</span>
      <span className="text-sm text-slate-300">{value || "Não informado"}</span>
    </p>
  );
}

function RelationshipInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="block text-xs text-slate-600">{label}</span>
      <span className="text-sm text-slate-300">{value || "Não informado"}</span>
    </p>
  );
}

function OrganizationInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="block text-xs text-slate-600">{label}</span>
      <span className="text-sm text-slate-300">{value || "Não informado"}</span>
    </p>
  );
}

function OccurrenceInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="block text-xs text-slate-600">{label}</span>
      <span className="text-sm text-slate-300">{value || "Não informado"}</span>
    </p>
  );
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
