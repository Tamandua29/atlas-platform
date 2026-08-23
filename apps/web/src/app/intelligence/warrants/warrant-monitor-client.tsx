"use client";

import { useEffect, useMemo, useState } from "react";

import { classifyWarrantAttention, type WarrantAttention } from "@/features/intelligence/warrant-monitoring";

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
  consultedAt: string | null;
};

type ResponsePayload = { success: boolean; auditPersisted?: boolean; warrants?: Warrant[]; message?: string };

const labels: Record<WarrantAttention, string> = {
  active: "Ativo na fonte",
  expiring: "Validade próxima",
  expired: "Data vencida",
  closed: "Encerrado na fonte",
  unknown: "Situação indefinida",
};

function formatDate(value: string | null): string {
  if (!value) return "Não informada";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

export function WarrantMonitorClient() {
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WarrantAttention | "all">("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [auditPersisted, setAuditPersisted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/intelligence/warrants?limit=200", { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as ResponsePayload;
        if (!response.ok || !payload.success) throw new Error(payload.message || "Falha ao consultar os mandados.");
        setWarrants(payload.warrants || []);
        setAuditPersisted(Boolean(payload.auditPersisted));
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Falha ao consultar os mandados.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);

  const enriched = useMemo(() => warrants.map((warrant) => ({
    ...warrant,
    attention: classifyWarrantAttention(warrant.status, warrant.expiresAt),
  })), [warrants]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return enriched.filter((warrant) => {
      if (filter !== "all" && warrant.attention !== filter) return false;
      if (!needle) return true;
      return [warrant.maskedWarrantNumber, warrant.maskedCaseNumber, warrant.issuingAuthority, warrant.court, warrant.type, warrant.status]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(needle));
    });
  }, [enriched, filter, query]);

  const count = (attention: WarrantAttention) => enriched.filter((item) => item.attention === attention).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-6 py-10">
      <section className="rounded-3xl border border-cyan-900 bg-gradient-to-r from-[#0b1429] to-[#082331] p-9">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-400">Consulta operacional controlada</p>
        <h2 className="mt-4 text-4xl font-bold">Situação informada dos mandados</h2>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-blue-300">Referências mascaradas para triagem. Este painel não determina validade jurídica, não substitui consulta oficial e não altera registros.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[["Monitorados", enriched.length, "text-white"], ["Ativos na fonte", count("active"), "text-emerald-300"], ["Validade próxima", count("expiring"), "text-amber-300"], ["Situação indefinida", count("unknown"), "text-cyan-300"]].map(([title, value, color]) => (
          <div key={String(title)} className="rounded-2xl border border-slate-800 bg-[#0a1123] p-6">
            <p className="text-blue-300">{title}</p><p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#0a1123]">
        <div className="flex flex-col gap-4 border-b border-slate-800 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div><h3 className="text-xl font-semibold">Fila de monitoramento</h3><p className="mt-1 text-sm text-blue-400">{auditPersisted ? "Consulta auditada" : "Auditoria aguardando confirmação"}</p></div>
          <div className="flex flex-wrap gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar referência, tipo ou órgão" className="min-w-72 rounded-xl border border-slate-700 bg-[#050814] px-4 py-2.5 outline-none focus:border-cyan-400" />
            {(["all", "active", "expiring", "expired", "closed", "unknown"] as const).map((option) => (
              <button key={option} onClick={() => setFilter(option)} className={`rounded-xl border px-3 py-2 text-sm ${filter === option ? "border-cyan-400 bg-cyan-500 text-slate-950" : "border-slate-700 text-blue-200"}`}>
                {option === "all" ? "Todos" : labels[option]}
              </button>
            ))}
          </div>
        </div>
        {loading ? <p className="p-10 text-center text-blue-300">Consultando referências protegidas...</p> : message ? <p className="m-6 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-rose-200">{message}</p> : visible.length === 0 ? <p className="p-10 text-center text-blue-300">Nenhum mandado nesta seleção.</p> : (
          <div className="grid gap-5 p-6 lg:grid-cols-2">
            {visible.map((warrant) => <article key={warrant.recordId} className="rounded-2xl border border-slate-800 bg-[#070d1d] p-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-cyan-400">Referência protegida</p><h4 className="mt-2 text-xl font-semibold">{warrant.maskedWarrantNumber}</h4><p className="mt-1 text-blue-300">Processo {warrant.maskedCaseNumber}</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-blue-200">{labels[warrant.attention]}</span></div>
              <dl className="mt-6 grid gap-4 border-t border-slate-800 pt-5 sm:grid-cols-2">
                <div><dt className="text-sm text-blue-400">Tipo informado</dt><dd className="mt-1">{warrant.type || "Não informado"}</dd></div>
                <div><dt className="text-sm text-blue-400">Situação na fonte</dt><dd className="mt-1">{warrant.status || "Não informada"}</dd></div>
                <div><dt className="text-sm text-blue-400">Autoridade / tribunal</dt><dd className="mt-1">{warrant.issuingAuthority || warrant.court || "Não informado"}</dd></div>
                <div><dt className="text-sm text-blue-400">Emissão / validade</dt><dd className="mt-1">{formatDate(warrant.issuedAt)} · {formatDate(warrant.expiresAt)}</dd></div>
              </dl>
            </article>)}
          </div>
        )}
        <p className="border-t border-slate-800 p-5 text-sm text-amber-300">Proteção ativa: números integrais, fontes, documentos, observações e vínculos pessoais não são enviados ao navegador.</p>
      </section>
    </div>
  );
}
