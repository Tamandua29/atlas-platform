import Link from "next/link";

import { QualityQueueClient } from "./quality-queue-client";

export default function DataQualityQueuePage() {
  return (
    <main className="min-h-screen bg-[#050814] text-slate-100">
      <header className="border-b border-slate-800/80 bg-[#070b17]/95">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 font-black text-slate-950">A</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Atlas Intelligence Platform</p>
              <h1 className="mt-1 text-lg font-semibold text-white">Fila segura de saneamento</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/data-quality" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950">Diagnóstico</Link>
            <Link href="/identification-dashboard" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300">Painel</Link>
          </div>
        </div>
      </header>
      <QualityQueueClient />
    </main>
  );
}
