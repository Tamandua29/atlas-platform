import Link from "next/link";

import { OrganizationDirectoryClient } from "./organization-directory-client";

export default function OrganizationDirectoryPage() {
  return (
    <main className="min-h-screen bg-[#050814] text-slate-100">
      <header className="border-b border-slate-800 bg-[#070b17]">
        <div className="mx-auto flex min-h-20 max-w-[1500px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              Atlas Intelligence Platform
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              Banco de Inteligência
            </h1>
          </div>
          <nav
            aria-label="Navegação da inteligência"
            className="flex flex-wrap gap-3"
          >
            <Link
              href="/intelligence"
              className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400"
            >
              Central
            </Link>
            <Link
              href="/intelligence/vehicles"
              className="rounded-xl border border-cyan-400/50 px-4 py-2.5 text-cyan-200 hover:border-cyan-300"
            >
              Veículos
            </Link>
            <Link
              href="/intelligence/individuals"
              className="rounded-xl bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Indivíduos
            </Link>
            <Link
              href="/identification-dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400"
            >
              Painel de identificação
            </Link>
          </nav>
        </div>
      </header>
      <OrganizationDirectoryClient />
    </main>
  );
}
