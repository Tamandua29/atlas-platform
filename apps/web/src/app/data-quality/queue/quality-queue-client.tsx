"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Priority = "critical" | "high" | "medium" | "all";

type QualityItem = {
  queueId: string;
  maskedName: string;
  priority: Exclude<Priority, "all">;
  issues: string[];
  fieldsPresent: number;
  fieldsExpected: number;
};

type ProtectedDetail = {
  queueId: string;
  priority: Exclude<Priority, "all">;
  issues: string[];
  legalName: string | null;
  birthDate: string | null;
  motherName: string | null;
  maskedCpf: string | null;
  cpfStructurallyValid: boolean;
  maskedIdentityDocument: string | null;
};

type Payload = {
  success?: boolean;
  auditPersisted?: boolean;
  items?: QualityItem[];
  message?: string;
};

const options: Array<{ value: Priority; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
];

function priorityLabel(priority: QualityItem["priority"]): string {
  if (priority === "critical") return "Crítica";
  if (priority === "high") return "Alta";
  return "Média";
}

function priorityClasses(priority: QualityItem["priority"]): string {
  if (priority === "critical") return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  if (priority === "high") return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
}

export function QualityQueueClient() {
  const [priority, setPriority] = useState<Priority>("all");
  const [items, setItems] = useState<QualityItem[]>([]);
  const [auditPersisted, setAuditPersisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ProtectedDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actorRole, setActorRole] = useState<"reviewer" | "auditor" | "administrator" | null>(null);
  const [justification, setJustification] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestResult, setRequestResult] = useState("");

  async function load(nextPriority: Priority) {
    setLoading(true);
    setError("");

    try {
      const [response, sessionResponse] = await Promise.all([
        fetch(
          `/api/data-quality/individuals/queue?priority=${nextPriority}`,
          { cache: "no-store" },
        ),
        fetch("/api/auth/session", { cache: "no-store" }),
      ]);
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Não foi possível consultar a fila.");
      }
      if (sessionResponse.ok) {
        const session = (await sessionResponse.json()) as {
          actor?: { role?: "reviewer" | "auditor" | "administrator" };
        };
        setActorRole(session.actor?.role ?? null);
      }
      setItems(payload.items ?? []);
      setAuditPersisted(payload.auditPersisted ?? false);
      setPriority(nextPriority);
    } catch (caught) {
      setItems([]);
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(item: QualityItem) {
    setDetailLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/data-quality/individuals/queue/${item.queueId}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        success?: boolean;
        detail?: ProtectedDetail;
        message?: string;
      };

      if (!response.ok || !payload.success || !payload.detail) {
        throw new Error(payload.message ?? "Não foi possível abrir a conferência.");
      }

      setDetail(payload.detail);
      setJustification("");
      setRequestResult("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function requestCorrection() {
    if (!detail) return;

    if (justification.trim().length < 10) {
      setError("A justificativa deve possuir ao menos 10 caracteres.");
      return;
    }

    setRequesting(true);
    setError("");
    setRequestResult("");

    try {
      const response = await fetch(
        `/api/data-quality/individuals/queue/${detail.queueId}/request-correction`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ justification: justification.trim() }),
        },
      );
      const payload = (await response.json()) as {
        success?: boolean;
        requestCreated?: boolean;
        reviewId?: string;
        message?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Não foi possível registrar a solicitação.");
      }

      setRequestResult(
        payload.requestCreated
          ? `Solicitação ${payload.reviewId} registrada com sucesso.`
          : `A solicitação ${payload.reviewId} já estava aberta; nenhuma duplicata foi criada.`,
      );
      setJustification("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setRequesting(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load("all");
    }, 0);

    return () => window.clearTimeout(timer);
    // The initial queue query intentionally runs only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8 md:py-8">
      <section className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.13),transparent_32%),linear-gradient(135deg,#0b1326,#080d1b)] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Conferência humana</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Pendências priorizadas sem exposição indevida</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Nomes reduzidos a iniciais; documentos e valores biográficos não são exibidos. Esta tela não altera registros.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/45 px-5 py-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Segurança</p>
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              {auditPersisted ? "Consulta auditada" : "Aguardando consulta"}
            </p>
            <p className="mt-1 text-xs text-slate-600">0 escritas realizadas</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error} <Link href="/review-queue" className="underline">Autenticar</Link>
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1020]">
        <div className="flex flex-col gap-4 border-b border-slate-800 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-white">Registros para conferência</h3>
            <p className="mt-1 text-xs text-slate-600">{loading ? "Carregando..." : `${items.length} item(ns) nesta prioridade`}</p>
          </div>
          <div className="flex flex-wrap rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={loading}
                onClick={() => void load(option.value)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  priority === option.value
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {!loading && items.length === 0 && !error ? (
          <div className="flex min-h-64 items-center justify-center p-6 text-center text-sm text-slate-500">
            Nenhuma pendência nesta prioridade.
          </div>
        ) : (
          <div className="grid gap-4 p-5 xl:grid-cols-2">
            {items.map((item) => {
              const completeness = Math.round((item.fieldsPresent / item.fieldsExpected) * 100);
              return (
                <article key={item.queueId} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-600">Identidade protegida</p>
                      <h4 className="mt-2 font-semibold text-white">{item.maskedName}</h4>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${priorityClasses(item.priority)}`}>
                      {priorityLabel(item.priority)}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Completude dos campos avaliados</span>
                      <span>{completeness}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${completeness}%` }} />
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-800 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Necessita conferência</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {item.issues.map((issue) => (
                        <li key={issue} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 flex justify-end border-t border-slate-800 pt-4">
                    <button
                      type="button"
                      disabled={detailLoading}
                      onClick={() => void openDetail(item)}
                      className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-60"
                    >
                      Abrir conferência
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {detail && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0a1020]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                Conferência protegida
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                Valores atuais do cadastro
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Acesso temporário e auditado. Documentos permanecem mascarados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["Nome completo", detail.legalName],
              ["Data de nascimento", detail.birthDate],
              ["Filiação materna", detail.motherName],
              ["CPF mascarado", detail.maskedCpf],
              ["RG mascarado", detail.maskedIdentityDocument],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                <p className="text-xs text-slate-600">{label}</p>
                <p className={`mt-2 text-sm ${value ? "text-white" : "text-amber-300"}`}>
                  {value || "Não informado"}
                </p>
              </div>
            ))}
          </div>

          <div className="mx-5 mb-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100/75">
            Esta visualização serve somente à conferência humana. Nenhum valor do cadastro pode ser alterado nesta tela.
          </div>

          {actorRole === "auditor" ? (
            <div className="mx-5 mb-5 rounded-xl border border-slate-700 bg-slate-950/45 p-4 text-sm text-slate-400">
              Perfil Auditor: consulta permitida, abertura de solicitação bloqueada.
            </div>
          ) : (
            <div className="mx-5 mb-5 rounded-xl border border-cyan-400/20 bg-slate-950/45 p-5">
              <label htmlFor="correction-justification" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Justificativa da solicitação
              </label>
              <textarea
                id="correction-justification"
                rows={3}
                maxLength={500}
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                placeholder="Descreva a necessidade de conferência sem inserir dados pessoais desnecessários."
                className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={requesting}
                  onClick={() => void requestCorrection()}
                  className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                >
                  {requesting ? "Registrando..." : "Solicitar correção"}
                </button>
              </div>
            </div>
          )}

          {requestResult && (
            <div className="mx-5 mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              {requestResult} Nenhum campo do cadastro de origem foi alterado.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
