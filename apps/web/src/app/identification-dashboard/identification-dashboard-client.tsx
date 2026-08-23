"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Actor = {
  id: string;
  role: "reviewer" | "auditor" | "administrator";
};

type Metrics = {
  totalReviews: number;
  pendingReviews: number;
  completedReviews: number;
  resolutionRate: number;
  highConfidence: number;
  mediumConfidence: number;
  cpfStrategy: number;
  biographicStrategy: number;
  samePerson: number;
  differentPeople: number;
  inconclusive: number;
  sourceRecordsInReview: number;
  generatedAt: string;
};

type DashboardResponse = {
  success?: boolean;
  auditPersisted?: boolean;
  metrics?: Metrics;
  message?: string;
};

function percentage(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function roleLabel(role: Actor["role"]): string {
  if (role === "administrator") return "Administrador";
  if (role === "auditor") return "Auditor";
  return "Revisor";
}

export function IdentificationDashboardClient() {
  const [actor, setActor] = useState<Actor | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [auditPersisted, setAuditPersisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionResponse.ok) {
          throw new Error("Autentique-se na fila de revisão para acessar o painel.");
        }
        const session = (await sessionResponse.json()) as {
          authenticated?: boolean;
          actor?: Actor;
        };
        if (!session.authenticated || !session.actor) {
          throw new Error("Sessão não autenticada.");
        }

        const dashboardResponse = await fetch("/api/identification-dashboard", {
          cache: "no-store",
        });
        const dashboard = (await dashboardResponse.json()) as DashboardResponse;
        if (!dashboardResponse.ok || !dashboard.success || !dashboard.metrics) {
          throw new Error(dashboard.message ?? "Não foi possível carregar os indicadores.");
        }

        if (!cancelled) {
          setActor(session.actor);
          setMetrics(dashboard.metrics);
          setAuditPersisted(dashboard.auditPersisted ?? false);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="mx-auto max-w-[1500px] p-8 text-sm text-slate-500">Carregando indicadores protegidos...</div>;
  }

  if (error || !metrics || !actor) {
    return (
      <div className="mx-auto max-w-[1500px] p-6 md:p-8">
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-6">
          <h2 className="font-semibold text-amber-100">Acesso protegido</h2>
          <p className="mt-2 text-sm text-amber-100/70">{error}</p>
          <Link href="/review-queue" className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950">
            Ir para autenticação
          </Link>
        </section>
      </div>
    );
  }

  const cards = [
    { label: "Revisões registradas", value: metrics.totalReviews, detail: `${metrics.sourceRecordsInReview} registros envolvidos`, tone: "text-white" },
    { label: "Pendentes", value: metrics.pendingReviews, detail: "Exigem decisão humana", tone: "text-amber-300" },
    { label: "Concluídas", value: metrics.completedReviews, detail: "Decisões auditadas", tone: "text-emerald-300" },
    { label: "Taxa de resolução", value: `${metrics.resolutionRate}%`, detail: "Concluídas sobre o total", tone: "text-cyan-300" },
  ];

  const groups = [
    {
      title: "Estratégia de correspondência",
      total: metrics.totalReviews,
      items: [
        { label: "Biográfica", value: metrics.biographicStrategy, color: "bg-cyan-400" },
        { label: "CPF estrutural", value: metrics.cpfStrategy, color: "bg-violet-400" },
      ],
    },
    {
      title: "Nível de confiança",
      total: metrics.totalReviews,
      items: [
        { label: "Alta", value: metrics.highConfidence, color: "bg-emerald-400" },
        { label: "Média", value: metrics.mediumConfidence, color: "bg-amber-400" },
      ],
    },
    {
      title: "Resultado das decisões",
      total: metrics.completedReviews,
      items: [
        { label: "Mesma pessoa", value: metrics.samePerson, color: "bg-emerald-400" },
        { label: "Pessoas distintas", value: metrics.differentPeople, color: "bg-cyan-400" },
        { label: "Inconclusiva", value: metrics.inconclusive, color: "bg-amber-400" },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8 md:py-8">
      <section className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.13),transparent_32%),linear-gradient(135deg,#0b1326,#080d1b)] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Identificação canônica</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Visão segura da qualidade e revisão</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Indicadores agregados da fila humana. Nenhum dado pessoal ou documento é exibido nesta visão.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/45 px-5 py-4 text-sm">
            <p className="font-semibold text-white">{actor.id}</p>
            <p className="mt-1 text-xs text-slate-500">Perfil: {roleLabel(actor.role)}</p>
            <p className={`mt-2 text-xs ${auditPersisted ? "text-emerald-300" : "text-amber-300"}`}>
              {auditPersisted ? "Consulta auditada" : "Auditoria pendente"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`mt-3 text-3xl font-semibold ${card.tone}`}>{card.value}</p>
            <p className="mt-3 text-xs text-slate-600">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-3">
        {groups.map((group) => (
          <article key={group.title} className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
            <h3 className="font-semibold text-white">{group.title}</h3>
            <div className="mt-6 space-y-5">
              {group.items.map((item) => {
                const share = percentage(item.value, group.total);
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-semibold text-white">{item.value} · {share}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <p className="mt-5 text-right text-[11px] text-slate-600">
        Atualizado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(metrics.generatedAt))}
      </p>
    </div>
  );
}
