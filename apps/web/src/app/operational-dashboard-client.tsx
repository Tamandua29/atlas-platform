"use client";

import { useEffect, useState } from "react";

import type { OperationalDashboardSummary } from "@/features/operational-dashboard/operational-dashboard";

type DashboardResponse = {
  success: boolean;
  summary?: OperationalDashboardSummary;
  message?: string;
};

let dashboardRequest: Promise<DashboardResponse> | null = null;

function loadDashboard() {
  dashboardRequest ??= fetch("/api/operational-dashboard", {
    cache: "no-store",
  }).then(async (response) => {
    const payload = (await response.json()) as DashboardResponse;
    if (!response.ok)
      throw new Error(payload.message ?? "Falha ao carregar o painel.");
    return payload;
  });
  return dashboardRequest;
}

function useOperationalDashboard() {
  const [summary, setSummary] = useState<OperationalDashboardSummary | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadDashboard()
      .then((payload) => {
        if (active && payload.summary) setSummary(payload.summary);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Falha na consulta.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  return { summary, error };
}

const typeLabels = {
  occurrence: "Ocorrência processada",
  person: "Pessoa monitorada",
  vehicle: "Veículo monitorado",
  address: "Local georreferenciado",
  organization: "Organização monitorada",
  "point-of-sale": "Ponto de venda sinalizado",
  alert: "Alerta operacional",
};

const priorityLabels = { normal: "Normal", medium: "Média", high: "Alta" };
const statusLabels = {
  active: "Ativo",
  completed: "Concluído",
  attention: "Requer atenção",
  other: "Registrado",
};

const distributionTypeLabels = {
  occurrence: "Ocorrências",
  person: "Pessoas",
  vehicle: "Veículos",
  address: "Endereços",
  organization: "Organizações",
  "point-of-sale": "Pontos de venda",
  alert: "Alertas",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(new Date(value));
}

export function OperationalDashboardMetrics() {
  const { summary, error } = useOperationalDashboard();
  const indicators = summary
    ? [
        {
          label: "Registros monitorados",
          value: summary.metrics.totalRecords,
          detail: "Agregado das camadas operacionais",
        },
        {
          label: "Alta prioridade",
          value: summary.metrics.highPriority,
          detail: "Registros que exigem atenção",
        },
        {
          label: "Ocorrências ativas",
          value: summary.metrics.activeOccurrences,
          detail: "Não concluídas ou encerradas",
        },
        {
          label: "Entidades vinculadas",
          value: summary.metrics.linkedEntities,
          detail: "Com relacionamento explícito",
        },
      ]
    : [];

  if (error) {
    return (
      <p className="col-span-full rounded-2xl border border-rose-400/25 bg-rose-400/10 p-5 text-sm text-rose-200">
        {error}
      </p>
    );
  }
  if (!summary) {
    return (
      <p className="col-span-full rounded-2xl border border-slate-800 bg-[#0a1020] p-5 text-sm text-slate-500">
        Carregando indicadores auditados…
      </p>
    );
  }

  return indicators.map((indicator) => (
    <article
      key={indicator.label}
      className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5 transition hover:border-slate-700"
    >
      <p className="text-sm text-slate-500">{indicator.label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">
        {indicator.value.toLocaleString("pt-BR")}
      </p>
      <p className="mt-3 text-xs text-cyan-300">{indicator.detail}</p>
    </article>
  ));
}

export function OperationalDashboardCommandCenter() {
  const { summary, error } = useOperationalDashboard();

  if (error) {
    return (
      <p className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-5 text-sm text-rose-200">
        {error}
      </p>
    );
  }
  if (!summary) {
    return (
      <p className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5 text-sm text-slate-500">
        Consolidando prontidão operacional…
      </p>
    );
  }

  const readinessTone =
    summary.metrics.readinessScore >= 80
      ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
      : summary.metrics.readinessScore >= 60
        ? "text-amber-300 border-amber-400/30 bg-amber-400/10"
        : "text-rose-300 border-rose-400/30 bg-rose-400/10";

  return (
    <section
      className="grid gap-6 xl:grid-cols-[1.15fr_1fr]"
      aria-label="Situação do centro de comando"
    >
      <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
              Prontidão operacional
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Qualidade para decisão
            </h3>
          </div>
          <span
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${readinessTone}`}
          >
            {summary.metrics.readinessScore}%
          </span>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
            style={{ width: `${summary.metrics.readinessScore}%` }}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <CommandMetric
            label="Cobertura geográfica"
            value={`${summary.metrics.geographicCoverage}%`}
          />
          <CommandMetric
            label="Georreferenciados"
            value={summary.metrics.georeferencedRecords.toLocaleString("pt-BR")}
          />
          <CommandMetric
            label="Fila de atenção"
            value={summary.metrics.attentionRecords.toLocaleString("pt-BR")}
            alert={summary.metrics.attentionRecords > 0}
          />
        </div>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Recomendações do turno
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">
          Prioridades de comando
        </h3>
        <div className="mt-5 space-y-3">
          {summary.commandInsights.map((insight, index) => (
            <div
              key={insight}
              className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-xs font-bold text-amber-300">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-slate-300">{insight}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function CommandMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${alert ? "text-amber-300" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

export function OperationalDashboardActivity() {
  const { summary, error } = useOperationalDashboard();

  if (error) return <p className="p-5 text-sm text-rose-300">{error}</p>;
  if (!summary)
    return (
      <p className="p-5 text-sm text-slate-500">
        Carregando atividade auditada…
      </p>
    );
  if (summary.recentActivity.length === 0)
    return (
      <p className="p-5 text-sm text-slate-500">
        Nenhuma atividade datada foi localizada.
      </p>
    );

  return (
    <div className="divide-y divide-slate-800">
      {summary.recentActivity.map((activity, index) => (
        <div
          key={`${activity.createdAt}-${activity.type}-${index}`}
          className="p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-white">
                {typeLabels[activity.type]}
              </h4>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {statusLabels[activity.status]} · resumo sem dados pessoais
              </p>
            </div>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">
              {priorityLabels[activity.priority]}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-slate-600">
            {formatDate(activity.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

function DistributionRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-white">
          {value.toLocaleString("pt-BR")} · {percentage}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function OperationalDashboardDistributions() {
  const { summary, error } = useOperationalDashboard();

  if (error)
    return (
      <p className="col-span-full rounded-2xl border border-rose-400/25 bg-rose-400/10 p-5 text-sm text-rose-200">
        {error}
      </p>
    );
  if (!summary)
    return (
      <p className="col-span-full rounded-2xl border border-slate-800 bg-[#0a1020] p-5 text-sm text-slate-500">
        Carregando distribuições auditadas…
      </p>
    );

  const typeEntries = Object.entries(summary.byType) as Array<
    [keyof typeof distributionTypeLabels, number]
  >;
  const statusEntries = Object.entries(summary.byStatus) as Array<
    [keyof typeof statusLabels, number]
  >;

  return (
    <>
      <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
        <h3 className="font-semibold text-white">Distribuição por categoria</h3>
        <p className="mt-1 text-xs text-slate-500">
          Composição agregada das camadas monitoradas
        </p>
        <div className="mt-6 space-y-5">
          {typeEntries.map(([type, value]) => (
            <DistributionRow
              key={type}
              label={distributionTypeLabels[type]}
              value={value}
              total={summary.metrics.totalRecords}
            />
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
        <h3 className="font-semibold text-white">Situação operacional</h3>
        <p className="mt-1 text-xs text-slate-500">
          Estados normalizados sem exposição de registros
        </p>
        <div className="mt-6 space-y-5">
          {statusEntries.map(([status, value]) => (
            <DistributionRow
              key={status}
              label={statusLabels[status]}
              value={value}
              total={summary.metrics.totalRecords}
            />
          ))}
        </div>
      </article>
    </>
  );
}
