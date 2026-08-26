import Link from "next/link";

import { UnifiedSearchClient } from "./unified-search-client";

export default function UnifiedSearchPage() {
  return (
    <main className="min-h-screen bg-[#050814] text-slate-100">
      <header className="border-b border-slate-800 bg-[#070b17]">
        <div className="mx-auto flex min-h-20 max-w-[1500px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              Atlas Intelligence Platform
            </p>
            <h1 className="mt-1 text-xl font-semibold">Pesquisa Unificada</h1>
          </div>
          <nav
            className="flex flex-wrap gap-3"
            aria-label="Navegação da inteligência"
          >
            <Link
              href="/intelligence"
              className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400"
            >
              Banco de Inteligência
            </Link>
            <Link
              href="/intelligence/individuals"
              className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400"
            >
              Indivíduos
            </Link>
          </nav>
        </div>
      </header>
      <UnifiedSearchClient />
    </main>
  );
}
