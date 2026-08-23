import Link from "next/link";

import { OperationalMap } from "@/components/map/operational-map";
import {
  OperationalDashboardActivity,
  OperationalDashboardDistributions,
  OperationalDashboardMetrics,
} from "@/app/operational-dashboard-client";

const navigation = [
  { label: "Visão geral", symbol: "◫", href: "/", active: true },
  { label: "Inteligência", symbol: "◎", href: "/identification-dashboard" },
  { label: "Pessoas", symbol: "♙", href: "/intelligence/individuals" },
  { label: "Mapa operacional", symbol: "⌖", href: "/operational-map" },
  { label: "Qualidade dos dados", symbol: "▥", href: "/data-quality" },
  { label: "Fila de revisão", symbol: "▤", href: "/review-queue" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050814] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-800/80 bg-[#080d1b] lg:flex lg:flex-col">
          <div className="flex h-20 items-center border-b border-slate-800/80 px-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 font-black text-slate-950">
              A
            </div>

            <div className="ml-3">
              <p className="text-base font-bold tracking-[0.16em] text-white">
                ATLAS
              </p>

              <p className="text-xs text-slate-500">Intelligence Platform</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Operações
            </p>

            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition",
                  item.active
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-lg border text-base",
                    item.active
                      ? "border-cyan-400/30 bg-cyan-400/10"
                      : "border-slate-800 bg-slate-900",
                  ].join(" ")}
                >
                  {item.symbol}
                </span>

                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-slate-800/80 p-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ambiente
              </p>

              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Sistemas operacionais
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Serviços essenciais disponíveis.
              </p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-800/80 bg-[#070b17]/90 px-5 backdrop-blur md:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                Centro de comando
              </p>

              <h1 className="mt-1 text-xl font-semibold text-white">
                Visão geral operacional
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                className="hidden h-10 min-w-72 items-center rounded-xl border border-slate-800 bg-slate-900/70 px-4 text-left text-sm text-slate-500 transition hover:border-slate-700 md:flex"
                href="/intelligence/individuals"
              >
                Pesquisar pessoas, veículos ou ocorrências...
              </Link>

              <button
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:text-white"
                type="button"
                aria-label="Notificações"
              >
                ◉
              </button>

              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400 font-bold text-slate-950">
                  AA
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-white">Operador</p>
                  <p className="text-xs text-slate-500">Administrador</p>
                </div>
              </div>
            </div>
          </header>

          <div className="p-5 md:p-8">
            <section className="overflow-hidden rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.15),transparent_35%),linear-gradient(135deg,#0b1326,#080d1b)] p-6 md:p-8">
              <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    Atualização em tempo real
                  </div>

                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Consciência situacional em uma única plataforma
                  </h2>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                    Centralize informações, identifique vínculos relevantes e
                    acompanhe indicadores operacionais com rastreabilidade.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/identification-dashboard"
                    className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Painel de identificação
                  </Link>

                  <Link
                    href="/data-quality"
                    className="rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-white transition hover:border-slate-600"
                  >
                    Qualidade dos dados
                  </Link>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <OperationalDashboardMetrics />
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-2">
              <OperationalDashboardDistributions />
            </section>

            <nav aria-label="Atalhos operacionais" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Mapa expandido", "/operational-map"],
                ["Diretório de indivíduos", "/intelligence/individuals"],
                ["Fila de identificação", "/review-queue"],
                ["Fila de saneamento", "/data-quality/queue"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="rounded-xl border border-slate-800 bg-[#0a1020] px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300">
                  {label}
                </Link>
              ))}
            </nav>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <article className="min-h-[430px] overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1020]">
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <div>
                    <h3 className="font-semibold text-white">
                      Mapa operacional
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Distribuição espacial dos registros monitorados
                    </p>
                  </div>

                  <Link
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-600 hover:text-white"
                    href="/operational-map"
                  >
                    Expandir
                  </Link>
                </div>

                <OperationalMap />
              </article>

              <article className="rounded-2xl border border-slate-800 bg-[#0a1020]">
                <div className="border-b border-slate-800 px-5 py-4">
                  <h3 className="font-semibold text-white">
                    Atividade recente
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Eventos relevantes processados pelo Atlas
                  </p>
                </div>

                <OperationalDashboardActivity />

              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
