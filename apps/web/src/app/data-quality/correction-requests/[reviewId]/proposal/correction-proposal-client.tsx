"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProposalKey = "legalName" | "birthDate" | "motherName" | "cpf" | "identityDocument";
type Values = Partial<Record<ProposalKey, string>>;

type Context = {
  reviewId: string;
  allowedFields: ProposalKey[];
  issues: string[];
  proposalStatus: string | null;
  current: Values;
  proposed: Values | null;
  proposedAt: string | null;
  proposerId: string | null;
  approverId: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
  executionStatus: string | null;
  executorId: string | null;
  executedAt: string | null;
};

const labels: Record<ProposalKey, string> = {
  legalName: "Nome completo",
  birthDate: "Data de nascimento",
  motherName: "Filiação materna",
  cpf: "CPF",
  identityDocument: "RG",
};

const placeholders: Record<ProposalKey, string> = {
  legalName: "Informe o nome completo conferido",
  birthDate: "AAAA-MM-DD",
  motherName: "Informe a filiação materna conferida",
  cpf: "Somente números ou formato usual",
  identityDocument: "Informe o documento conferido",
};

export function CorrectionProposalClient({ reviewId }: { reviewId: string }) {
  const [context, setContext] = useState<Context | null>(null);
  const [values, setValues] = useState<Values>({});
  const [actorRole, setActorRole] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [executionNote, setExecutionNote] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [executing, setExecuting] = useState(false);
  const [auditPersisted, setAuditPersisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [proposalResponse, sessionResponse] = await Promise.all([
        fetch(`/api/data-quality/correction-requests/${reviewId}/proposal`, { cache: "no-store" }),
        fetch("/api/auth/session", { cache: "no-store" }),
      ]);
      const payload = await proposalResponse.json() as {
        success?: boolean;
        auditPersisted?: boolean;
        proposal?: Context;
        message?: string;
      };
      if (!proposalResponse.ok || !payload.success || !payload.proposal) {
        throw new Error(payload.message ?? "Não foi possível carregar a proposta.");
      }
      if (sessionResponse.ok) {
        const session = await sessionResponse.json() as {
          actor?: { id?: string; role?: string };
        };
        setActorId(session.actor?.id ?? null);
        setActorRole(session.actor?.role ?? null);
      }
      setContext(payload.proposal);
      setAuditPersisted(payload.auditPersisted ?? false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/data-quality/correction-requests/${reviewId}/proposal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values }),
        },
      );
      const payload = await response.json() as {
        success?: boolean;
        proposal?: Context;
        message?: string;
      };
      if (!response.ok || !payload.success || !payload.proposal) {
        throw new Error(payload.message ?? "Não foi possível salvar a proposta.");
      }
      setContext(payload.proposal);
      setMessage("Proposta registrada e encaminhada para aprovação humana. Nenhum cadastro de origem foi alterado.");
      setValues({});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setSaving(false);
    }
  }

  async function decide(decision: "approve" | "reject") {
    if (decisionReason.trim().length < 10) {
      setError("A justificativa da decisão deve possuir pelo menos 10 caracteres.");
      return;
    }

    setDeciding(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/data-quality/correction-requests/${reviewId}/proposal/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, reason: decisionReason.trim() }),
        },
      );
      const payload = await response.json() as {
        success?: boolean;
        proposal?: Context;
        message?: string;
      };
      if (!response.ok || !payload.success || !payload.proposal) {
        throw new Error(payload.message ?? "Não foi possível registrar a decisão.");
      }
      setContext(payload.proposal);
      setDecisionReason("");
      setMessage(
        decision === "approve"
          ? "Proposta aprovada por identidade segregada. Nenhum cadastro de origem foi alterado."
          : "Proposta rejeitada por identidade segregada. Nenhum cadastro de origem foi alterado.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setDeciding(false);
    }
  }

  async function executeCorrection() {
    if (executionNote.trim().length < 10) {
      setError("A nota da execução deve possuir pelo menos 10 caracteres.");
      return;
    }
    if (confirmation.trim() !== "APLICAR CORREÇÃO") {
      setError("Digite exatamente APLICAR CORREÇÃO para confirmar.");
      return;
    }

    setExecuting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/data-quality/correction-requests/${reviewId}/proposal/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmation: confirmation.trim(),
            note: executionNote.trim(),
          }),
        },
      );
      const payload = await response.json() as {
        success?: boolean;
        sourceWritesPerformed?: number;
        message?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Não foi possível executar a correção.");
      }
      setExecutionNote("");
      setConfirmation("");
      setMessage(
        `Correção aplicada e auditada. Escritas controladas na origem: ${payload.sourceWritesPerformed ?? 0}.`,
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setExecuting(false);
    }
  }

  useEffect(() => {
    void load();
  }, [reviewId]);

  const canWrite = actorRole === "reviewer" || actorRole === "administrator";
  const hasProposal = Boolean(context?.proposalStatus);

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8 md:py-8">
      <section className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.13),transparent_32%),linear-gradient(135deg,#0b1326,#080d1b)] p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Dupla barreira de segurança</p>
        <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Antes × valor proposto</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          A proposta fica separada do cadastro e vinculada à versão consultada. Salvar não aplica nenhuma alteração.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-200">
            {auditPersisted ? "Consulta auditada" : "Auditoria pendente"}
          </span>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-amber-200">0 escritas na origem</span>
          {context?.proposalStatus && <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-200">{context.proposalStatus}</span>}
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error} <Link href="/review-queue" className="underline">Autenticar</Link>
        </div>
      )}
      {message && <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">{message}</div>}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0a1020] p-10 text-center text-slate-500">Carregando contexto protegido...</div>
      ) : context && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1020]">
          <div className="border-b border-slate-800 p-5">
            <h3 className="font-semibold text-white">Campos autorizados pela pendência</h3>
            <p className="mt-1 font-mono text-xs text-slate-600">{context.reviewId}</p>
          </div>

          <div className="space-y-4 p-5">
            {context.allowedFields.map((field) => (
              <div key={field} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-5 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{labels[field]} atual</p>
                  <p className="mt-3 text-sm text-slate-300">{context.current[field] ?? "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-500">Valor proposto</p>
                  {hasProposal ? (
                    <p className="mt-3 text-sm text-cyan-100">{context.proposed?.[field] ?? "Sem alteração proposta"}</p>
                  ) : (
                    <input
                      type={field === "birthDate" ? "date" : "text"}
                      value={values[field] ?? ""}
                      onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
                      placeholder={placeholders[field]}
                      autoComplete="off"
                      className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {!hasProposal && canWrite && (
            <div className="flex justify-end border-t border-slate-800 p-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {saving ? "Registrando proposta..." : "Enviar para aprovação"}
              </button>
            </div>
          )}

          {hasProposal && context.proposalStatus === "Pendente de aprovação" && (
            <div className="border-t border-slate-800 p-5">
              {actorId === context.proposerId ? (
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
                  Segregação de funções ativa: a identidade que elaborou esta proposta não pode decidi-la. Autentique uma segunda identidade revisora.
                </div>
              ) : canWrite ? (
                <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/45 p-5">
                  <label htmlFor="decision-reason" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Justificativa obrigatória da decisão
                  </label>
                  <textarea
                    id="decision-reason"
                    rows={3}
                    maxLength={1000}
                    value={decisionReason}
                    onChange={(event) => setDecisionReason(event.target.value)}
                    placeholder="Fundamente a aprovação ou rejeição sem inserir dados pessoais desnecessários."
                    className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      disabled={deciding}
                      onClick={() => void decide("reject")}
                      className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-200 disabled:opacity-60"
                    >
                      Rejeitar proposta
                    </button>
                    <button
                      type="button"
                      disabled={deciding}
                      onClick={() => void decide("approve")}
                      className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                    >
                      Aprovar proposta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-950/45 p-4 text-sm text-slate-400">
                  Perfil somente leitura: a decisão exige uma identidade revisora diferente da proponente.
                </div>
              )}
            </div>
          )}

          {hasProposal && context.proposalStatus !== "Pendente de aprovação" && (
            <div className="border-t border-slate-800 p-5">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                <p className="font-semibold">Decisão: {context.proposalStatus}</p>
                <p className="mt-2 text-xs text-emerald-100/70">Decisor: {context.approverId ?? "Não identificado"}</p>
                <p className="mt-2 text-sm">{context.decisionReason ?? "Sem justificativa registrada."}</p>
                {context.proposalStatus === "Aprovada" && (
                  <p className="mt-2 text-xs text-amber-200/80">A aprovação ainda não aplicou nenhuma alteração ao cadastro.</p>
                )}
              </div>
            </div>
          )}

          {context.proposalStatus === "Aprovada" && !context.executionStatus && (
            <div className="border-t border-slate-800 p-5">
              {actorId === context.proposerId || actorId === context.approverId ? (
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
                  Terceira identidade obrigatória: proponente e aprovador não podem executar a escrita controlada.
                </div>
              ) : canWrite ? (
                <div className="rounded-2xl border border-rose-400/20 bg-slate-950/45 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-300">Execução controlada na origem</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    O hash da versão será conferido novamente. Somente os campos aprovados serão atualizados e o estado anterior será preservado.
                  </p>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={executionNote}
                    onChange={(event) => setExecutionNote(event.target.value)}
                    placeholder="Registre a justificativa operacional da execução."
                    className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-rose-400"
                  />
                  <label htmlFor="execution-confirmation" className="mt-4 block text-xs text-slate-500">
                    Para confirmar, digite: <strong className="text-rose-200">APLICAR CORREÇÃO</strong>
                  </label>
                  <input
                    id="execution-confirmation"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-rose-400"
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={executing}
                      onClick={() => void executeCorrection()}
                      className="rounded-xl bg-rose-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                    >
                      {executing ? "Verificando e aplicando..." : "Executar correção aprovada"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-950/45 p-4 text-sm text-slate-400">
                  A execução exige uma terceira identidade com perfil Revisor.
                </div>
              )}
            </div>
          )}

          {(context.executionStatus === "Aplicada" || context.proposalStatus === "Aplicada") && (
            <div className="border-t border-slate-800 p-5">
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                <p className="font-semibold">Correção aplicada com controle de versão</p>
                <p className="mt-2 text-xs">Executor: {context.executorId ?? "Não identificado"}</p>
                <p className="mt-2 text-xs">Execução: {context.executedAt ?? "Data não informada"}</p>
                <p className="mt-2 text-xs text-emerald-100/70">Snapshot anterior e hashes preservados para auditoria e recuperação.</p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
