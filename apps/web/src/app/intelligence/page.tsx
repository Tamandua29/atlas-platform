import Link from "next/link";

const modules = [
  {
    href: "/intelligence/individuals",
    eyebrow: "Identificação canônica",
    title: "Indivíduos",
    description: "Diretório protegido de pessoas e acesso às fichas operacionais vinculadas.",
    accent: "border-cyan-400/30 text-cyan-300",
  },
  {
    href: "/intelligence/organizations",
    eyebrow: "Vínculos explícitos",
    title: "Organizações",
    description: "Consulta de organizações cadastradas e dos vínculos expressamente registrados na fonte.",
    accent: "border-violet-400/30 text-violet-300",
  },
  {
    href: "/intelligence/vehicles",
    eyebrow: "Ativos relacionados",
    title: "Veículos",
    description: "Diretório com identificação protegida, situação informada e vínculos autorizados.",
    accent: "border-sky-400/30 text-sky-300",
  },
  {
    href: "/intelligence/warrants",
    eyebrow: "Monitoramento controlado",
    title: "Mandados",
    description: "Triagem de referências mascaradas sem substituir a consulta oficial de validade.",
    accent: "border-amber-400/30 text-amber-300",
  },
] as const;

export default function IntelligencePage() {
  return (
    <main className="min-h-screen bg-[#050814] text-slate-100">
      <header className="border-b border-slate-800 bg-[#070b17]">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              Atlas Intelligence Platform
            </p>
            <h1 className="mt-1 text-xl font-semibold">Banco de Inteligência</h1>
          </div>
          <Link
            href="/identification-dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400"
          >
            Painel de identificação
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-8 px-6 py-10">
        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-cyan-950/40 p-8 md:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
            Inteligência integrada
          </p>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            Central segura de entidades operacionais
          </h2>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-400">
            Acesse os diretórios autorizados a partir de uma única visão. As consultas permanecem
            autenticadas e auditadas, com identificadores sensíveis protegidos.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2" aria-label="Módulos do Banco de Inteligência">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className={`group rounded-2xl border bg-slate-900/60 p-7 transition hover:-translate-y-0.5 hover:bg-slate-900 ${module.accent}`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em]">{module.eyebrow}</p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <h3 className="text-2xl font-semibold text-white">{module.title}</h3>
                <span aria-hidden="true" className="text-2xl transition group-hover:translate-x-1">
                  →
                </span>
              </div>
              <p className="mt-3 leading-7 text-slate-400">{module.description}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-950/10 p-5 text-sm text-emerald-200">
          Proteção ativa: esta central apenas direciona para consultas autorizadas e não realiza
          alterações nos registros de origem.
        </section>
      </div>
    </main>
  );
}
