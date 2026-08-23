"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

import type { UnifiedSearchCategory, UnifiedSearchResult } from "@/features/intelligence/unified-search";

type SearchResponse = {
  success: boolean;
  auditPersisted?: boolean;
  count?: number;
  results?: UnifiedSearchResult[];
  message?: string;
};

const categoryLabels: Record<UnifiedSearchCategory, string> = {
  all: "Todos", individual: "Pessoas", organization: "Organizações", vehicle: "Veículos", warrant: "Mandados",
};

const resultLabels: Record<UnifiedSearchResult["category"], string> = {
  individual: "Pessoa", organization: "Organização", vehicle: "Veículo", warrant: "Mandado",
};

export function UnifiedSearchClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<UnifiedSearchCategory>("all");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [auditPersisted, setAuditPersisted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeQuery = query.trim();
    if (safeQuery.length < 2) { setMessage("Informe pelo menos 2 caracteres."); return; }
    setLoading(true); setMessage(null);
    try {
      const response = await fetch(`/api/intelligence/search?q=${encodeURIComponent(safeQuery)}&category=${category}`, { cache: "no-store" });
      const body = await response.json() as SearchResponse;
      if (!response.ok || !body.success) throw new Error(body.message || "Não foi possível concluir a pesquisa.");
      setResults(body.results || []); setAuditPersisted(Boolean(body.auditPersisted)); setSearched(true);
    } catch (error) {
      setResults([]); setAuditPersisted(null); setSearched(true);
      setMessage(error instanceof Error ? error.message : "Falha inesperada na pesquisa.");
    } finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 px-6 py-10">
      <section className="rounded-3xl border border-emerald-400/20 bg-gradient-to-r from-slate-900 to-emerald-950/30 p-8 md:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Consulta transversal protegida</p>
        <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">Encontre entidades em uma única busca</h2>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-400">Pesquise somente por referências autorizadas. O conteúdo digitado não é gravado na auditoria e documentos permanecem mascarados.</p>
      </section>

      <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <label htmlFor="unified-query" className="text-sm font-semibold text-white">Nome, vulgo, organização, placa mascarada ou referência de mandado</label>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row">
          <input id="unified-query" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} autoComplete="off" placeholder="Digite pelo menos 2 caracteres" className="min-h-14 flex-1 rounded-xl border border-slate-700 bg-[#050814] px-4 text-lg outline-none placeholder:text-slate-600 focus:border-cyan-400" />
          <button disabled={loading} className="min-h-14 rounded-xl bg-cyan-400 px-7 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">{loading ? "Pesquisando..." : "Pesquisar"}</button>
        </div>
        <fieldset className="mt-5 flex flex-wrap gap-2">
          <legend className="sr-only">Categoria</legend>
          {(Object.keys(categoryLabels) as UnifiedSearchCategory[]).map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`rounded-full border px-4 py-2 text-sm font-semibold ${category === item ? "border-cyan-400 bg-cyan-400 text-slate-950" : "border-slate-700 text-slate-300 hover:border-cyan-400"}`}>{categoryLabels[item]}</button>
          ))}
        </fieldset>
      </form>

      {message && <section className="rounded-2xl border border-rose-400/30 bg-rose-950/20 p-5 text-rose-200">{message}</section>}

      {searched && !message && (
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-6">
            <div><h3 className="text-xl font-semibold">Resultados autorizados</h3><p className="mt-1 text-sm text-slate-500">{results.length} resultado(s) nesta consulta</p></div>
            <span className={`rounded-full border px-3 py-1.5 text-sm ${auditPersisted ? "border-emerald-400/30 text-emerald-300" : "border-amber-400/30 text-amber-300"}`}>{auditPersisted ? "Consulta auditada" : "Auditoria indisponível"}</span>
          </div>
          {results.length === 0 ? <div className="p-12 text-center text-slate-400">Nenhum resultado autorizado foi localizado.</div> : (
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((result) => <Link key={`${result.category}:${result.id}`} href={result.href} className="rounded-2xl border border-slate-800 bg-[#070b17] p-5 hover:border-cyan-400/60">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">{resultLabels[result.category]}</p>
                <h4 className="mt-3 text-xl font-semibold text-white">{result.title}</h4>
                {result.subtitle && <p className="mt-2 text-slate-400">{result.subtitle}</p>}
                {result.badges.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{result.badges.map((badge) => <span key={badge} className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{badge}</span>)}</div>}
                <p className="mt-5 text-sm font-semibold text-cyan-300">Abrir registro →</p>
              </Link>)}
            </div>
          )}
        </section>
      )}
      <section className="rounded-2xl border border-amber-400/20 bg-amber-950/10 p-5 text-sm text-amber-200">Proteção ativa: esta pesquisa não altera registros e não substitui consultas oficiais de validade.</section>
    </div>
  );
}
