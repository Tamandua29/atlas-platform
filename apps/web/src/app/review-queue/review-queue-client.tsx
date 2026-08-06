"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { ReviewComparisonPanel } from "./review-comparison-panel";

type ReviewStatus =
  | "open"
  | "completed"
  | "all";

type ReviewDecision =
  | "pending"
  | "same-person"
  | "different-people"
  | "inconclusive";

type ReviewItem = {
  recordId: string;
  reviewId: string;
  status:
    "open" | "completed";
  openedOn: string;
  completedOn:
    string | null;
  strategy:
    "cpf" | "biographic";
  confidence:
    "high" | "medium";
  recordCount: number;
  decision:
    ReviewDecision;
};

type ListResponse = {
  success: boolean;
  auditPersisted?: boolean;
  count?: number;
  items?: ReviewItem[];
  message?: string;
};

const statusOptions: Array<{
  value: ReviewStatus;
  label: string;
}> = [
  {
    value: "open",
    label: "Pendentes",
  },
  {
    value: "completed",
    label: "Concluídas",
  },
  {
    value: "all",
    label: "Todas",
  },
];

const decisionOptions = [
  {
    value: "same-person",
    label: "Mesma pessoa",
  },
  {
    value:
      "different-people",
    label: "Pessoas distintas",
  },
  {
    value: "inconclusive",
    label: "Inconclusiva",
  },
] as const;

function decisionLabel(
  decision: ReviewDecision,
): string {
  if (
    decision === "same-person"
  ) {
    return "Mesma pessoa";
  }

  if (
    decision ===
    "different-people"
  ) {
    return "Pessoas distintas";
  }

  if (
    decision === "inconclusive"
  ) {
    return "Inconclusiva";
  }

  return "Pendente";
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone: "UTC",
    },
  ).format(
    new Date(
      `${value}T00:00:00.000Z`,
    ),
  );
}

export function ReviewQueueClient() {
  const [apiKey, setApiKey] =
    useState("");
  const [
    connected,
    setConnected,
  ] = useState(false);
  const [status, setStatus] =
    useState<ReviewStatus>(
      "open",
    );
  const [items, setItems] =
    useState<ReviewItem[]>([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [
    auditPersisted,
    setAuditPersisted,
  ] = useState<boolean | null>(
    null,
  );
  const [
    selected,
    setSelected,
  ] =
    useState<ReviewItem | null>(
      null,
    );
  const [
    comparisonReview,
    setComparisonReview,
  ] =
    useState<ReviewItem | null>(
      null,
    );
  const [
    decision,
    setDecision,
  ] = useState<
    | "same-person"
    | "different-people"
    | "inconclusive"
  >("same-person");
  const [
    justification,
    setJustification,
  ] = useState("");
  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const pendingCount =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.status ===
            "open",
        ).length,
      [items],
    );

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        if (!response.ok || cancelled) {
          return;
        }

        const payload = (await response.json()) as {
          authenticated?: boolean;
        };

        if (payload.authenticated && !cancelled) {
          setConnected(true);
          await loadReviews("open");
        }
      } catch {
        // A ausência de sessão mantém a tela protegida sem expor detalhes.
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function authenticateAndLoad() {
    const credential = apiKey.trim();

    if (!credential) {
      setError("Informe sua credencial institucional.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const payload = (await response.json()) as {
        authenticated?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.authenticated) {
        throw new Error(payload.message ?? "Não foi possível iniciar a sessão.");
      }
      setConnected(true);
      setApiKey("");
      await loadReviews(status);
    } catch (caught) {
      setConnected(false);
      setItems([]);
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews(
    nextStatus:
      ReviewStatus = status,
  ) {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/canonical-individuals/review-queue?status=${nextStatus}&limit=50`,
          {
            cache: "no-store",
          },
        );

      const payload =
        (await response.json()) as
          ListResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.message ??
            "Não foi possível consultar a fila.",
        );
      }

      setItems(
        payload.items ?? [],
      );
      setAuditPersisted(
        payload.auditPersisted ??
          false,
      );
      setConnected(true);
      setStatus(nextStatus);
      setSelected(null);
      setComparisonReview(null);
    } catch (caught) {
      setConnected(false);
      setItems([]);
      setError(
        caught instanceof Error
          ? caught.message
          : "Falha desconhecida.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(
    nextStatus: ReviewStatus,
  ) {
    setStatus(nextStatus);
    await loadReviews(
      nextStatus,
    );
  }

  function openDecision(
    item: ReviewItem,
  ) {
    setSelected(item);
    setDecision(
      "same-person",
    );
    setJustification("");
    setError("");
  }

  async function submitDecision() {
    if (!selected) {
      return;
    }

    if (
      justification.trim()
        .length < 10
    ) {
      setError(
        "A justificativa deve possuir ao menos 10 caracteres.",
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/canonical-individuals/review-queue/${selected.recordId}/decision`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              decision,
              justification:
                justification.trim(),
            }),
          },
        );

      const payload =
        (await response.json()) as {
          success?: boolean;
          message?: string;
        };

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.message ??
            "Não foi possível registrar a decisão.",
        );
      }

      setSelected(null);
      setJustification("");
      await loadReviews(status);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Falha desconhecida.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8 md:py-8">
      <section className="overflow-hidden rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.13),transparent_32%),linear-gradient(135deg,#0b1326,#080d1b)] p-6 md:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              Decisão humana obrigatória
            </div>

            <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Análise segura de possíveis duplicidades
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
              Revise correspondências sugeridas pelo sistema. Nenhuma decisão desta tela realiza mesclagem automática ou altera os registros de origem.
            </p>
          </div>

          <form
            className="rounded-2xl border border-slate-700/80 bg-slate-950/45 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void authenticateAndLoad();
            }}
          >
            <label
              htmlFor="atlas-key"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              Credencial institucional
            </label>

            <div className="mt-3 flex gap-2">
              <input
                id="atlas-key"
                type="password"
                value={apiKey}
                onChange={(event) =>
                  setApiKey(
                    event.target
                      .value,
                  )
                }
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                placeholder="Informe sua credencial"
              />

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
              >
                {loading
                  ? "Acessando..."
                  : "Acessar"}
              </button>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              A credencial é trocada por uma sessão segura e não permanece disponível ao navegador.
            </p>
          </form>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-200"
        >
          {error}
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Registros exibidos
          </p>

          <p className="mt-3 text-3xl font-semibold text-white">
            {items.length}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Pendentes nesta visão
          </p>

          <p className="mt-3 text-3xl font-semibold text-amber-300">
            {pendingCount}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Auditoria da consulta
          </p>

          <p className={[
            "mt-3 text-sm font-semibold",
            auditPersisted
              ? "text-emerald-300"
              : "text-slate-500",
          ].join(" ")}>
            {auditPersisted
              ? "Persistida"
              : "Aguardando consulta"}
          </p>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1020]">
        <div className="flex flex-col gap-4 border-b border-slate-800 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-white">
              Fila de análise
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Metadados mínimos necessários para a decisão.
            </p>
          </div>

          <div className="flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            {statusOptions.map(
              (option) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  disabled={
                    !connected ||
                    loading
                  }
                  onClick={() =>
                    void changeStatus(
                      option.value,
                    )
                  }
                  className={[
                    "rounded-lg px-4 py-2 text-xs font-semibold transition",
                    status ===
                    option.value
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-400 hover:text-white",
                    !connected
                      ? "cursor-not-allowed opacity-50"
                      : "",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ),
            )}
          </div>
        </div>

        {!connected ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-xl text-cyan-300">
              ◈
            </div>

            <h4 className="mt-5 font-semibold text-white">
              Acesso protegido
            </h4>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Autentique-se para consultar a fila. Nenhum dado é carregado antes da autorização.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-xl text-emerald-300">
              ✓
            </div>

            <h4 className="mt-5 font-semibold text-white">
              Nenhuma revisão nesta categoria
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              A fila selecionada está vazia.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 xl:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.recordId}
                className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5 transition hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-600">
                      Revisão
                    </p>

                    <p className="mt-1 font-mono text-xs text-slate-300">
                      {item.reviewId}
                    </p>
                  </div>

                  <span className={[
                    "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider",
                    item.status ===
                    "open"
                      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                      : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
                  ].join(" ")}>
                    {item.status ===
                    "open"
                      ? "Pendente"
                      : "Concluída"}
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-600">
                      Estratégia
                    </dt>
                    <dd className="mt-1 text-slate-300">
                      {item.strategy ===
                      "cpf"
                        ? "CPF estrutural"
                        : "Biográfica"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-600">
                      Confiança
                    </dt>
                    <dd className="mt-1 text-slate-300">
                      {item.confidence ===
                      "high"
                        ? "Alta"
                        : "Média"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-600">
                      Registros
                    </dt>
                    <dd className="mt-1 text-slate-300">
                      {item.recordCount}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-600">
                      Abertura
                    </dt>
                    <dd className="mt-1 text-slate-300">
                      {formatDate(
                        item.openedOn,
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-800 pt-4">
                  <div>
                    <p className="text-xs text-slate-600">
                      Decisão
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {decisionLabel(
                        item.decision,
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonReview(
                          item,
                        );
                        setSelected(
                          null,
                        );
                      }}
                      className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
                    >
                      Comparar
                    </button>

                    {item.status ===
                      "open" && (
                      <button
                        type="button"
                        onClick={() =>
                          openDecision(
                            item,
                          )
                        }
                        className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                      >
                        Revisar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {comparisonReview && (
        <ReviewComparisonPanel
          review={comparisonReview}
          onClose={() =>
            setComparisonReview(
              null,
            )
          }
        />
      )}

      {selected && (
        <section className="mt-6 rounded-2xl border border-cyan-400/20 bg-[#0a1020] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                Decisão humana
              </p>

              <h3 className="mt-2 text-xl font-semibold text-white">
                Concluir revisão selecionada
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                A decisão será definitiva e auditada. Nenhuma mesclagem será executada.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelected(null)
              }
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
            <div>
              <label
                htmlFor="decision"
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Decisão
              </label>

              <select
                id="decision"
                value={decision}
                onChange={(event) =>
                  setDecision(
                    event.target
                      .value as typeof decision,
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              >
                {decisionOptions.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="justification"
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Justificativa obrigatória
              </label>

              <textarea
                id="justification"
                value={
                  justification
                }
                onChange={(event) =>
                  setJustification(
                    event.target
                      .value,
                  )
                }
                rows={4}
                className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-700 focus:border-cyan-400"
                placeholder="Registre os fundamentos da decisão sem inserir dados pessoais desnecessários."
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                void submitDecision()
              }
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting
                ? "Registrando..."
                : "Registrar decisão"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
