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

  async function load(nextPriority: Priority) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/data-quality/individuals/queue?priority=${nextPriority}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Não foi possível consultar a fila.");
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

  useEffect(() => {
    void load("all");
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
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
