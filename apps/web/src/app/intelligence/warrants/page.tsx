import Link from "next/link";

import { WarrantMonitorClient } from "./warrant-monitor-client";

export default function WarrantMonitorPage() {
  return (
    <main className="min-h-screen bg-[#050814] text-slate-100">
      <header className="border-b border-slate-800 bg-[#070b17]">
        <div className="mx-auto flex min-h-20 max-w-[1500px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Atlas Intelligence Platform</p>
            <h1 className="mt-1 text-xl font-semibold">Monitor protegido de mandados</h1>
          </div>
          <nav aria-label="Navegação da inteligência" className="flex flex-wrap gap-3">
            <Link href="/intelligence" className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400">Central</Link>
            <Link href="/intelligence/individuals" className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400">Indivíduos</Link>
            <Link href="/identification-dashboard" className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400">Painel</Link>
          </nav>
        </div>
      </header>
      <WarrantMonitorClient />
    </main>
  );
}
