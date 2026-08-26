import "server-only";

import type { AuditEntry } from "@atlas/kernel";

export const AUDIT_TABLE_ID = "tbl3t3nPByXoWzkLd";

export type AirtableAuditFields = {
  "ID Auditoria": string;
  "Data e Hora": string;
  "Tipo de Ação": string;
  "Origem da Ação": string;
  "Tabela ou Módulo Afetado": string;
  "ID do Registro Afetado"?: string;
  "Campo Afetado"?: string;
  "Valor Anterior"?: string;
  "Valor Novo"?: string;
  "Identificador da Sessão ou Requisição": string;
  "Identificador Técnico do Responsável"?: string;
  "Resumo da Alteração": string;
  Resultado: string;
  "Nível de Impacto": string;
  "Requer Revisão": boolean;
  "Classificação da Informação": string;
  "Registro Ativo": boolean;
};

function metadataString(entry: AuditEntry, key: string): string | undefined {
  const value = entry.metadata?.[key];

  return typeof value === "string" ? value : undefined;
}

export function mapAuditEntryToAirtable(
  entry: AuditEntry,
): AirtableAuditFields {
  const isDecision = entry.action === "individuals.duplicate-review.decide";

  return {
    "ID Auditoria": entry.id.value,
    "Data e Hora": entry.occurredAt.toISOString(),
    "Tipo de Ação": isDecision ? "Decisão analítica" : "Acesso relevante",
    "Origem da Ação": "Atlas",
    "Tabela ou Módulo Afetado": entry.action,
    ...(isDecision
      ? {
          "ID do Registro Afetado": metadataString(entry, "reviewRecordId"),
          "Campo Afetado": "Decisão Humana",
          "Valor Anterior": metadataString(entry, "previousValue"),
          "Valor Novo": metadataString(entry, "decision"),
          "Identificador Técnico do Responsável": metadataString(
            entry,
            "actorId",
          ),
        }
      : {}),
    "Identificador da Sessão ou Requisição": entry.correlationId,
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
    "Requer Revisão": entry.action === "individuals.duplicate-review.enqueue",
    "Classificação da Informação": "Uso interno",
    "Registro Ativo": true,
  };
}
