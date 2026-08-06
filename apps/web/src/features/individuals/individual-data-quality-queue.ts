import "server-only";

import {
  isStructurallyValidCpf,
  normalizeCpf,
} from "@atlas/kernel";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type QualityQueueFields = {
  "Nome Completo"?: string;
  "Data de Nascimento"?: string;
  CPF?: string;
  "Registro Geral"?: string;
  Mãe?: string;
};

export type QualityPriority = "critical" | "high" | "medium";

export type SafeQualityQueueItem = {
  queueId: string;
  maskedName: string;
  priority: QualityPriority;
  issues: string[];
  fieldsPresent: number;
  fieldsExpected: number;
};

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function maskName(value: string | undefined): string {
  const initials = value
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .join(".");

  return initials ? `Pessoa ${initials}.` : "Pessoa sem nome informado";
}

export async function listSafeIndividualQualityQueue(): Promise<SafeQualityQueueItem[]> {
  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<QualityQueueFields>(
    configuration.individualsTableId,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields: [
        "Nome Completo",
        "Data de Nascimento",
        "CPF",
        "Registro Geral",
        "Mãe",
      ],
    },
  );

  const priorityOrder: Record<QualityPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
  };

  return records
    .map((record, index): SafeQualityQueueItem | null => {
      const fields = record.fields;
      const hasName = present(fields["Nome Completo"]);
      const hasBirthDate = present(fields["Data de Nascimento"]);
      const hasMotherName = present(fields.Mãe);
      const hasCpf = present(fields.CPF);
      const hasIdentityDocument = present(fields["Registro Geral"]);
      const normalizedCpf = normalizeCpf(fields.CPF);
      const cpfValid = normalizedCpf
        ? isStructurallyValidCpf(normalizedCpf)
        : false;
      const issues: string[] = [];

      if (!hasName) issues.push("Nome completo ausente");
      if (!hasBirthDate) issues.push("Data de nascimento ausente");
      if (!hasMotherName) issues.push("Filiação materna ausente");
      if (!hasCpf) issues.push("CPF ausente");
      if (hasCpf && !cpfValid) issues.push("CPF estruturalmente inválido");
      if (!hasIdentityDocument) issues.push("RG ausente");

      if (issues.length === 0) return null;

      const priority: QualityPriority =
        !hasName || (hasCpf && !cpfValid)
          ? "critical"
          : !hasBirthDate || !hasMotherName
            ? "high"
            : "medium";

      return {
        queueId: `quality-${index + 1}`,
        maskedName: maskName(fields["Nome Completo"]),
        priority,
        issues,
        fieldsPresent: [hasName, hasBirthDate, hasMotherName, hasCpf, hasIdentityDocument]
          .filter(Boolean).length,
        fieldsExpected: 5,
      };
    })
    .filter((item): item is SafeQualityQueueItem => item !== null)
    .sort((left, right) => {
      const priorityDifference =
        priorityOrder[left.priority] - priorityOrder[right.priority];

      return priorityDifference !== 0
        ? priorityDifference
        : left.maskedName.localeCompare(right.maskedName, "pt-BR");
    });
}
