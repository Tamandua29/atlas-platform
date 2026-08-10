import Link from "next/link";

import { OperationalMap } from "@/components/map/operational-map";

export default function OperationalMapPage() {
  return (
    <main className="min-h-screen bg-[#050814] text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#080d1b] px-6 py-5 lg:px-10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-slate-950">
            A
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              Atlas Intelligence Platform
            </p>
            <h1 className="mt-1 text-xl font-bold text-white">
              Mapa operacional expandido
            </h1>
          </div>
        </div>

        <nav className="flex gap-3">
          <Link
            href="/intelligence/individuals"
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-200 hover:border-cyan-400"
          >
            Indivíduos
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Painel geral
          </Link>
        </nav>
      </header>

      <section className="p-4 lg:p-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1020]">
          <OperationalMap expanded />
        </div>
      </section>
    </main>
  );
}
