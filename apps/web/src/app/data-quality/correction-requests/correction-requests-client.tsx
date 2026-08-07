"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = "all" | "open" | "in_progress" | "completed" | "cancelled";
type ItemStatus = Exclude<Status, "all">;

type CorrectionItem = {
  reviewId: string;
  status: ItemStatus;
  openedOn: string | null;
  issues: string[];
  justification: string | null;
  requesterId: string | null;
  assigneeId: string | null;
  treatmentNote: string | null;
  updatedAt: string | null;
  proposalStatus: string | null;
  proposedAt: string | null;
};

const filters: Array<{ value: Status; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abertas" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluídas" },
];

function statusLabel(status: ItemStatus) {
  if (status === "in_progress") return "Em andamento";
  if (status === "completed") return "Concluída";
  if (status === "cancelled") return "Cancelada";
  return "Aberta";
}

function statusClasses(status: ItemStatus) {
  if (status === "completed") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (status === "in_progress") return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
  if (status === "cancelled") return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  return "border-amber-400/25 bg-amber-400/10 text-amber-200";
}

export function CorrectionRequestsClient() {
  const [status, setStatus] = useState<Status>("all");
  const [items, setItems] = useState<CorrectionItem[]>([]);
  const [actorRole, setActorRole] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [auditPersisted, setAuditPersisted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(nextStatus: Status) {
    setLoading(true);
    setError("");
    try {
      const [queueResponse, sessionResponse] = await Promise.all([
        fetch(`/api/data-quality/correction-requests?status=${nextStatus}`, { cache: "no-store" }),
        fetch("/api/auth/session", { cache: "no-store" }),
      ]);
      const payload = await queueResponse.json() as {
        success?: boolean;
        auditPersisted?: boolean;
        items?: CorrectionItem[];
        message?: string;
      };
      if (!queueResponse.ok || !payload.success) {
        throw new Error(payload.message ?? "Não foi possível consultar as solicitações.");
      }
      if (sessionResponse.ok) {
        const session = await sessionResponse.json() as {
          actor?: { id?: string; role?: string };
        };
        setActorId(session.actor?.id ?? null);
        setActorRole(session.actor?.role ?? null);
      }
      setItems(payload.items ?? []);
      setAuditPersisted(payload.auditPersisted ?? false);
      setStatus(nextStatus);
    } catch (caught) {
      setItems([]);
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setLoading(false);
    }
  }

  async function transition(item: CorrectionItem, action: "claim" | "complete") {
    const note = notes[item.reviewId]?.trim() ?? "";
    if (action === "complete" && note.length < 10) {
      setError("Informe uma nota de conclusão com pelo menos 10 caracteres.");
      return;
    }

    setWorkingId(item.reviewId);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/data-quality/correction-requests/${item.reviewId}/transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, note: action === "complete" ? note : undefined }),
        },
      );
      const payload = await response.json() as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Não foi possível atualizar a solicitação.");
      }
      setMessage(
        action === "claim"
          ? "Solicitação assumida pelo revisor. Nenhum cadastro de origem foi alterado."
          : "Tratamento concluído e auditado. Nenhum cadastro de origem foi alterado.",
      );
      setNotes((current) => ({ ...current, [item.reviewId]: "" }));
      await load(status);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha desconhecida.");
    } finally {
      setWorkingId("");
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

  const canWrite = actorRole === "reviewer" || actorRole === "administrator";

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8 md:py-8">
      <section className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.13),transparent_32%),linear-gradient(135deg,#0b1326,#080d1b)] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Fluxo humano controlado</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Solicitações de correção cadastral</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Assuma e conclua análises de saneamento com rastreabilidade. Esta etapa altera somente o fluxo da solicitação, nunca o cadastro da pessoa.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/45 px-5 py-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Sessão e auditoria</p>
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              {auditPersisted ? "Consulta auditada" : "Aguardando consulta"}
            </p>
            <p className="mt-1 text-xs text-slate-500">{actorId ?? "Sessão não identificada"} · 0 escritas na origem</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error} <Link href="/review-queue" className="underline">Autenticar</Link>
        </div>
      )}
      {message && (
        <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">{message}</div>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1020]">
        <div className="flex flex-col gap-4 border-b border-slate-800 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-white">Fila de tratamento</h3>
            <p className="mt-1 text-xs text-slate-600">{loading ? "Carregando..." : `${items.length} solicitação(ões)`}</p>
          </div>
          <div className="flex flex-wrap rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                disabled={loading}
                onClick={() => void load(filter.value)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  status === filter.value ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {!loading && items.length === 0 && !error ? (
          <div className="flex min-h-64 items-center justify-center p-6 text-center text-sm text-slate-500">
            Nenhuma solicitação nesta categoria.
          </div>
        ) : (
          <div className="grid gap-4 p-5 xl:grid-cols-2">
            {items.map((item) => (
              <article key={item.reviewId} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-600">Solicitação protegida</p>
                    <h4 className="mt-2 font-mono text-sm text-white">{item.reviewId}</h4>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${statusClasses(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-slate-600">Abertura</dt><dd className="mt-1 text-slate-300">{item.openedOn ?? "Não informada"}</dd></div>
                  <div><dt className="text-xs text-slate-600">Responsável</dt><dd className="mt-1 text-slate-300">{item.assigneeId ?? "Não atribuída"}</dd></div>
                </dl>

                <div className="mt-5 border-t border-slate-800 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Campos para saneamento</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {item.issues.map((issue) => (
                      <li key={issue} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">{issue}</li>
                    ))}
                  </ul>
                  {item.justification && <p className="mt-4 text-sm leading-6 text-slate-400">{item.justification}</p>}
                </div>

                {item.status === "in_progress" && canWrite && (
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={notes[item.reviewId] ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [item.reviewId]: event.target.value }))}
                    placeholder="Registre a conclusão humana sem inserir dados pessoais desnecessários."
                    className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                  />
                )}

                {item.proposalStatus && (
                  <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-cyan-200">
                    Proposta: {item.proposalStatus}
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-3 border-t border-slate-800 pt-4">
                  {item.status === "completed" && (
                    <Link
                      href={`/data-quality/correction-requests/${item.reviewId}/proposal`}
                      className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200"
                    >
                      {item.proposalStatus ? "Visualizar proposta" : "Elaborar proposta"}
                    </Link>
                  )}
                  {item.status === "open" && canWrite && (
                    <button
                      type="button"
                      disabled={workingId === item.reviewId}
                      onClick={() => void transition(item, "claim")}
                      className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
                    >
                      Assumir atendimento
                    </button>
                  )}
                  {item.status === "in_progress" && canWrite && (
                    <button
                      type="button"
                      disabled={workingId === item.reviewId}
                      onClick={() => void transition(item, "complete")}
                      className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
                    >
                      Concluir tratamento
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
