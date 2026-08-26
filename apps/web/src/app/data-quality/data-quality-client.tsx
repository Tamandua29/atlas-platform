"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Metrics = {
  totalRecords: number;
  qualityScore: number;
  completeCoreIdentity: number;
  missingLegalName: number;
  missingBirthDate: number;
  missingMotherName: number;
  missingCpf: number;
  invalidCpf: number;
  missingIdentityDocument: number;
  criticalPriority: number;
  highPriority: number;
  mediumPriority: number;
  generatedAt: string;
};

type Payload = {
  success?: boolean;
  auditPersisted?: boolean;
  writesPerformed?: number;
  metrics?: Metrics;
  message?: string;
};

function share(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export function DataQualityClient() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [auditPersisted, setAuditPersisted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/data-quality/individuals", {
          cache: "no-store",
        });
        const payload = (await response.json()) as Payload;
        if (!response.ok || !payload.success || !payload.metrics) {
          throw new Error(
            payload.message ?? "Não foi possível analisar a qualidade.",
          );
        }
        if (!cancelled) {
          setMetrics(payload.metrics);
          setAuditPersisted(payload.auditPersisted ?? false);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Falha desconhecida.",
          );
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
    return (
      <div className="mx-auto max-w-[1500px] p-8 text-sm text-slate-500">
        Analisando qualidade em modo somente leitura...
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="mx-auto max-w-[1500px] p-6 md:p-8">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-6">
          <h2 className="font-semibold text-amber-100">Análise indisponível</h2>
          <p className="mt-2 text-sm text-amber-100/70">{error}</p>
          <Link
            href="/review-queue"
            className="mt-4 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950"
          >
            Autenticar
          </Link>
        </div>
      </div>
    );
  }

  const omissions = [
    {
      label: "Nome completo ausente",
      value: metrics.missingLegalName,
      tone: "bg-rose-400",
    },
    {
      label: "Nascimento ausente",
      value: metrics.missingBirthDate,
      tone: "bg-amber-400",
    },
    {
      label: "Filiação materna ausente",
      value: metrics.missingMotherName,
      tone: "bg-amber-400",
    },
    { label: "CPF ausente", value: metrics.missingCpf, tone: "bg-cyan-400" },
    {
      label: "CPF estruturalmente inválido",
      value: metrics.invalidCpf,
      tone: "bg-rose-400",
    },
    {
      label: "RG ausente",
      value: metrics.missingIdentityDocument,
      tone: "bg-violet-400",
    },
  ];

  const priorities = [
    {
      label: "Crítica",
      detail: "Nome ausente ou CPF inválido",
      value: metrics.criticalPriority,
      border: "border-rose-400/25",
      text: "text-rose-300",
    },
    {
      label: "Alta",
      detail: "Nascimento ou filiação ausente",
      value: metrics.highPriority,
      border: "border-amber-400/25",
      text: "text-amber-300",
    },
    {
      label: "Média",
      detail: "Documento ausente",
      value: metrics.mediumPriority,
      border: "border-cyan-400/25",
      text: "text-cyan-300",
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8 md:py-8">
      <section className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.13),transparent_32%),linear-gradient(135deg,#0b1326,#080d1b)] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
              Saneamento orientado
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              Diagnóstico agregado de completude
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Leitura dos campos essenciais para priorizar conferência humana.
              Nenhum registro é alterado automaticamente.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/45 px-5 py-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Segurança
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              {auditPersisted ? "Consulta auditada" : "Auditoria pendente"}
            </p>
            <p className="mt-1 text-xs text-slate-600">0 escritas realizadas</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
          <p className="text-sm text-slate-500">Registros analisados</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.totalRecords}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
          <p className="text-sm text-slate-500">Índice de completude</p>
          <p className="mt-3 text-3xl font-semibold text-cyan-300">
            {metrics.qualityScore}%
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
          <p className="text-sm text-slate-500">Identidade nuclear completa</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-300">
            {metrics.completeCoreIdentity}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            {share(metrics.completeCoreIdentity, metrics.totalRecords)}% do
            total
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
          <h3 className="font-semibold text-white">
            Ausências e inconsistências
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Contagens agregadas; um registro pode aparecer em mais de uma
            categoria.
          </p>
          <div className="mt-6 space-y-4">
            {omissions.map((item) => {
              const percentage = share(item.value, metrics.totalRecords);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="font-semibold text-white">
                      {item.value} · {percentage}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${item.tone}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
          <h3 className="font-semibold text-white">Prioridade de saneamento</h3>
          <div className="mt-5 space-y-4">
            {priorities.map((priority) => (
              <div
                key={priority.label}
                className={`rounded-xl border ${priority.border} bg-slate-950/40 p-4`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${priority.text}`}>
                    {priority.label}
                  </span>
                  <span className="text-2xl font-semibold text-white">
                    {priority.value}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">{priority.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100/70">
            As prioridades são recomendações para conferência humana, não
            comandos de alteração.
          </div>
        </article>
      </section>

      <p className="mt-5 text-right text-[11px] text-slate-600">
        Atualizado em{" "}
        {new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "medium",
        }).format(new Date(metrics.generatedAt))}
      </p>
    </div>
  );
}
