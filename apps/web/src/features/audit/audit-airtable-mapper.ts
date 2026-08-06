import "server-only";

import type { AuditEntry } from "@atlas/kernel";

export const AUDIT_TABLE_ID =
  "tbl3t3nPByXoWzkLd";

export type AirtableAuditFields = {
  "ID Auditoria": string;
  "Data e Hora": string;
  "Tipo de Ação": string;
  "Origem da Ação": string;
  "Tabela ou Módulo Afetado": string;
  "Identificador da Sessão ou Requisição": string;
  "Resumo da Alteração": string;
  Resultado: string;
  "Nível de Impacto": string;
  "Requer Revisão": boolean;
  "Classificação da Informação": string;
  "Registro Ativo": boolean;
};

export function mapAuditEntryToAirtable(
  entry: AuditEntry,
): AirtableAuditFields {
  return {
    "ID Auditoria":
      entry.id.value,
    "Data e Hora":
      entry.occurredAt.toISOString(),
    "Tipo de Ação": "Acesso relevante",
    "Origem da Ação": "Atlas",
    "Tabela ou Módulo Afetado":
      entry.action,
    "Identificador da Sessão ou Requisição":
      entry.correlationId,
    "Resumo da Alteração": [
      `Processados: ${entry.processedCount}`,
      `Sucessos: ${entry.successCount}`,
      `Falhas: ${entry.failureCount}`,
    ].join("; "),
    Resultado:
      entry.outcome === "success"
        ? "Concluída com sucesso"
        : entry.outcome === "partial"
          ? "Concluída com ressalvas"
          : "Falhou",
    "Nível de Impacto": "Baixo",
    "Requer Revisão":
      entry.action ===
      "individuals.duplicate-review.enqueue",
    "Classificação da Informação":
      "Uso interno",
    "Registro Ativo": true,
  };
}
