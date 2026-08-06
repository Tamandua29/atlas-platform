import Link from "next/link";

import { IdentificationDashboardClient } from "./identification-dashboard-client";

export default function IdentificationDashboardPage() {
  return (
    <main className="min-h-screen bg-[#050814] text-slate-100">
      <header className="border-b border-slate-800/80 bg-[#070b17]/95">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 font-black text-slate-950">
              A
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                Atlas Intelligence Platform
              </p>
              <h1 className="mt-1 text-lg font-semibold text-white">
                Painel operacional de identificação
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/data-quality" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/15">
              Qualidade dos dados
            </Link>
            <Link href="/review-queue" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
              Fila de revisão
            </Link>
            <Link href="/" className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white">
              Visão geral
            </Link>
          </div>
        </div>
      </header>
      <IdentificationDashboardClient />
    </main>
  );
}
