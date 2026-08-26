"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  reviewId: string;
  workflow: "execution" | "reversal";
  status: string;
  actorId: string | null;
  lastTransitionAt: string | null;
  severity: "attention" | "failure";
  errorPresent: boolean;
  recommendedAction: string;
};

type Reconciliation = {
  totalManaged: number;
  healthyCompleted: number;
  attentionRequired: number;
  failed: number;
  applying: number;
  reverting: number;
  items: Item[];
  generatedAt: string;
};

type Payload = {
  success?: boolean;
  auditPersisted?: boolean;
  reconciliation?: Reconciliation;
  message?: string;
};

export function ReconciliationClient() {
  const [data, setData] = useState<Reconciliation | null>(null);
  const [auditPersisted, setAuditPersisted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/data-quality/reconciliation", {
          cache: "no-store",
        });
        const payload = (await response.json()) as Payload;
        if (!response.ok || !payload.success || !payload.reconciliation) {
          throw new Error(
            payload.message ?? "A reconciliação não está disponível.",
          );
        }
        if (!cancelled) {
          setData(payload.reconciliation);
          setAuditPersisted(payload.auditPersisted ?? false);
        }
      } catch (caught) {
        if (!cancelled)
          setError(
            caught instanceof Error ? caught.message : "Falha desconhecida.",
          );
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
        Consolidando estados operacionais...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1500px] p-6 md:p-8">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-6">
          <h2 className="font-semibold text-amber-100">Acesso restrito</h2>
          <p className="mt-2 text-sm text-amber-100/70">{error}</p>
          <Link
            href="/review-queue"
            className="mt-4 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950"
          >
            Autenticar como auditor
          </Link>
        </div>
      </div>
    );
  }

  const cards = [
    ["Fluxos gerenciados", data.totalManaged, "text-white"],
    ["Concluídos com saúde", data.healthyCompleted, "text-emerald-300"],
    [
      "Exigem atenção",
      data.attentionRequired,
      data.attentionRequired ? "text-amber-300" : "text-cyan-300",
    ],
    [
      "Falhas registradas",
      data.failed,
      data.failed ? "text-rose-300" : "text-slate-300",
    ],
  ] as const;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8 md:py-8">
      <section className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.13),transparent_32%),linear-gradient(135deg,#0b1326,#080d1b)] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
              Controle operacional
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              Execuções e reversões sob vigilância
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Identifica fluxos interrompidos ou falhos sem revelar dados
              pessoais e sem realizar qualquer escrita.
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

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, tone]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`mt-3 text-3xl font-semibold ${tone}`}>{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1020]">
        <div className="border-b border-slate-800 p-5">
          <h3 className="font-semibold text-white">Fila de reconciliação</h3>
          <p className="mt-1 text-xs text-slate-600">
            Somente identificadores opacos e metadados operacionais.
          </p>
        </div>
        {data.items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-2xl text-emerald-300">
              ✓
            </div>
            <h4 className="mt-5 font-semibold text-white">
              Nenhuma interrupção detectada
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              Os fluxos controlados estão em estados finais consistentes.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {data.items.map((item) => (
              <article
                key={`${item.workflow}-${item.reviewId}`}
                className="rounded-2xl border border-amber-400/20 bg-slate-950/35 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-600">
                      {item.workflow === "execution" ? "Execução" : "Reversão"}
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-slate-300">
                      {item.reviewId}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.severity === "failure" ? "border-rose-400/30 text-rose-300" : "border-amber-400/30 text-amber-300"}`}
                  >
                    {item.status}
                  </span>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-600">Responsável</dt>
                    <dd className="mt-1 text-slate-300">
                      {item.actorId ?? "Não registrado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Erro técnico</dt>
                    <dd className="mt-1 text-slate-300">
                      {item.errorPresent
                        ? "Registrado e protegido"
                        : "Não registrado"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-5 text-sm leading-6 text-slate-400">
                  {item.recommendedAction}
                </p>
                <Link
                  href={`/data-quality/correction-requests/${item.reviewId}/proposal`}
                  className="mt-5 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200"
                >
                  Abrir contexto protegido
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="mt-5 text-right text-[11px] text-slate-600">
        Atualizado em{" "}
        {new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "medium",
        }).format(new Date(data.generatedAt))}
      </p>
    </div>
  );
}
