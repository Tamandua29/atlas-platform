import Link from "next/link";

import { ReviewQueueClient } from "./review-queue-client";

export default function ReviewQueuePage() {
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
                Fila de revisão de identidades
              </h1>
            </div>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            Voltar à visão geral
          </Link>
        </div>
      </header>

      <ReviewQueueClient />
    </main>
  );
}
