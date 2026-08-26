import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

const REVIEW_TABLE_ID = "tblgtBw4wOvG4utaS";

type ReviewFields = {
  "ID Revisão"?: string;
  "Situação da Execução"?: string;
  "Executor Técnico"?: string;
  "Executada em"?: string;
  "Erro da Execução"?: string;
  "Situação da Reversão"?: string;
  "Executor da Reversão"?: string;
  "Revertida em"?: string;
  "Erro da Reversão"?: string;
};

export type ReconciliationItem = {
  reviewId: string;
  workflow: "execution" | "reversal";
  status: string;
  actorId: string | null;
  lastTransitionAt: string | null;
  severity: "attention" | "failure";
  errorPresent: boolean;
  recommendedAction: string;
};

export type OperationalReconciliation = {
  totalManaged: number;
  healthyCompleted: number;
  attentionRequired: number;
  failed: number;
  applying: number;
  reverting: number;
  items: ReconciliationItem[];
  generatedAt: string;
};

function item(input: {
  fields: ReviewFields;
  workflow: "execution" | "reversal";
  status: string;
}): ReconciliationItem {
  const execution = input.workflow === "execution";
  const failed = input.status === "Falhou";

  return {
    reviewId: input.fields["ID Revisão"] ?? "",
    workflow: input.workflow,
    status: input.status,
    actorId:
      (execution
        ? input.fields["Executor Técnico"]
        : input.fields["Executor da Reversão"]
      )?.trim() || null,
    lastTransitionAt: execution
      ? (input.fields["Executada em"] ?? null)
      : (input.fields["Revertida em"] ?? null),
    severity: failed ? "failure" : "attention",
    errorPresent: Boolean(
      (execution
        ? input.fields["Erro da Execução"]
        : input.fields["Erro da Reversão"]
      )?.trim(),
    ),
    recommendedAction: failed
      ? "Inspecionar o registro protegido e executar a reconciliação controlada."
      : "Verificar se a escrita foi concluída antes de permitir nova tentativa.",
  };
}

export async function getOperationalReconciliation(): Promise<OperationalReconciliation> {
  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<ReviewFields>(REVIEW_TABLE_ID, {
    baseId: configuration.individualsPreviewBaseId,
    fields: [
      "ID Revisão",
      "Situação da Execução",
      "Executor Técnico",
      "Executada em",
      "Erro da Execução",
      "Situação da Reversão",
      "Executor da Reversão",
      "Revertida em",
      "Erro da Reversão",
    ],
  });

  const items: ReconciliationItem[] = [];
  let totalManaged = 0;
  let healthyCompleted = 0;
  let applying = 0;
  let reverting = 0;
  let failed = 0;

  for (const record of records) {
    const fields = record.fields;
    const executionStatus = fields["Situação da Execução"]?.trim();
    const reversalStatus = fields["Situação da Reversão"]?.trim();

    if (executionStatus) {
      totalManaged += 1;
      if (executionStatus === "Aplicada") healthyCompleted += 1;
      if (executionStatus === "Aplicando") {
        applying += 1;
        items.push(
          item({ fields, workflow: "execution", status: executionStatus }),
        );
      }
      if (executionStatus === "Falhou") {
        failed += 1;
        items.push(
          item({ fields, workflow: "execution", status: executionStatus }),
        );
      }
    }

    if (reversalStatus) {
      totalManaged += 1;
      if (reversalStatus === "Revertida") healthyCompleted += 1;
      if (reversalStatus === "Revertendo") {
        reverting += 1;
        items.push(
          item({ fields, workflow: "reversal", status: reversalStatus }),
        );
      }
      if (reversalStatus === "Falhou") {
        failed += 1;
        items.push(
          item({ fields, workflow: "reversal", status: reversalStatus }),
        );
      }
    }
  }

  return {
    totalManaged,
    healthyCompleted,
    attentionRequired: items.length,
    failed,
    applying,
    reverting,
    items,
    generatedAt: new Date().toISOString(),
  };
}
