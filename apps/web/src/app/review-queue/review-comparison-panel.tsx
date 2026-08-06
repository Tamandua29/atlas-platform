"use client";

import {
  useEffect,
  useState,
} from "react";

type ComparisonState =
  | "match"
  | "different"
  | "missing";

type ComparisonRecord = {
  sourceRecordId: string;
  legalName: string | null;
  alias: string | null;
  birthDate: string | null;
  motherName: string | null;
  maskedCpf: string | null;
  maskedIdentityDocument:
    string | null;
};

type ComparisonPayload = {
  success: boolean;
  auditPersisted?: boolean;
  message?: string;
  comparison?: {
    reviewRecordId: string;
    reviewId: string;
    status: string;
    decision: string;
    records:
      ComparisonRecord[];
    comparison: {
      legalName:
        ComparisonState;
      alias: ComparisonState;
      birthDate:
        ComparisonState;
      motherName:
        ComparisonState;
      cpf: ComparisonState;
      identityDocument:
        ComparisonState;
    };
  };
};

type ReviewSummary = {
  recordId: string;
  reviewId: string;
  status:
    "open" | "completed";
};

type Props = {
  review: ReviewSummary;
  onClose: () => void;
};

const fieldLabels = {
  legalName: "Nome completo",
  alias: "Vulgo principal",
  birthDate:
    "Data de nascimento",
  motherName: "Filiação materna",
  maskedCpf: "CPF mascarado",
  maskedIdentityDocument:
    "RG mascarado",
} as const;

const stateLabels: Record<
  ComparisonState,
  string
> = {
  match: "Coincide",
  different: "Diverge",
  missing: "Ausente",
};

function badgeClasses(
  state: ComparisonState,
): string {
  if (state === "match") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (
    state === "different"
  ) {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }

  return "border-amber-400/25 bg-amber-400/10 text-amber-200";
}

function comparisonStateForField(
  comparison:
    NonNullable<
      ComparisonPayload[
        "comparison"
      ]
    >["comparison"],
  field:
    keyof typeof fieldLabels,
): ComparisonState {
  if (
    field === "maskedCpf"
  ) {
    return comparison.cpf;
  }

  if (
    field ===
    "maskedIdentityDocument"
  ) {
    return comparison
      .identityDocument;
  }

  return comparison[field];
}

function displayValue(
  value: string | null,
): string {
  return value || "Não informado";
}

export function ReviewComparisonPanel({
  review,
  onClose,
}: Props) {
  const [payload, setPayload] =
    useState<
      ComparisonPayload[
        "comparison"
      ] | null
    >(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [
    auditPersisted,
    setAuditPersisted,
  ] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `/api/canonical-individuals/review-queue/${review.recordId}/comparison`,
            {
              cache:
                "no-store",
            },
          );

        const result =
          (await response.json()) as
            ComparisonPayload;

        if (
          !response.ok ||
          !result.success ||
          !result.comparison
        ) {
          throw new Error(
            result.message ??
              "Não foi possível abrir a comparação.",
          );
        }

        if (!cancelled) {
          setPayload(
            result.comparison,
          );
          setAuditPersisted(
            result.auditPersisted ??
              false,
          );
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof
            Error
              ? caught.message
              : "Falha desconhecida.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    review.recordId,
  ]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0a1020]">
      <div className="flex flex-col gap-4 border-b border-slate-800 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
            Comparação protegida
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Registros vinculados à revisão
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Visualização temporária e auditada. Documentos permanecem mascarados e nenhuma alteração será executada.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {auditPersisted && (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
              Acesso auditado
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center p-6 text-sm text-slate-500">
          Carregando comparação protegida...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="m-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          {error}
        </div>
      ) : payload ? (
        <div className="p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="font-mono text-slate-300">
              {payload.reviewId}
            </span>
            <span>•</span>
            <span>
              {payload.status}
            </span>
            <span>•</span>
            <span>
              Decisão:{" "}
              {payload.decision}
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {payload.records.map(
              (
                record,
                index,
              ) => (
                <article
                  key={
                    record.sourceRecordId
                  }
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/45"
                >
                  <div className="border-b border-slate-800 px-5 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-600">
                      Registro{" "}
                      {index + 1}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      {
                        record.sourceRecordId
                      }
                    </p>
                  </div>

                  <dl className="divide-y divide-slate-800">
                    {(
                      Object.keys(
                        fieldLabels,
                      ) as Array<
                        keyof typeof fieldLabels
                      >
                    ).map(
                      (field) => {
                        const state =
                          comparisonStateForField(
                            payload.comparison,
                            field,
                          );

                        return (
                          <div
                            key={
                              field
                            }
                            className="grid gap-2 px-5 py-4 sm:grid-cols-[150px_1fr_auto] sm:items-center"
                          >
                            <dt className="text-xs text-slate-600">
                              {
                                fieldLabels[
                                  field
                                ]
                              }
                            </dt>
                            <dd className="text-sm text-slate-200">
                              {displayValue(
                                record[
                                  field
                                ],
                              )}
                            </dd>
                            <span
                              className={[
                                "w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                                badgeClasses(
                                  state,
                                ),
                              ].join(
                                " ",
                              )}
                            >
                              {
                                stateLabels[
                                  state
                                ]
                              }
                            </span>
                          </div>
                        );
                      },
                    )}
                  </dl>
                </article>
              ),
            )}
          </div>

          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-100/80">
            Coincidência indica equivalência entre os valores consultados, não confirmação definitiva de identidade. A conclusão continua sendo responsabilidade do revisor humano.
          </div>
        </div>
      ) : null}
    </section>
  );
}
