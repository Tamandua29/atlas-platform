import "server-only";

import { isStructurallyValidCpf, normalizeCpf } from "@atlas/kernel";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type QualityQueueFields = {
  "Nome Completo"?: string;
  "Data de Nascimento"?: string;
  CPF?: string;
  "Registro Geral"?: string;
  Mãe?: string;
};

type QualityRecord = {
  id: string;
  fields: QualityQueueFields;
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

export type ProtectedQualityDetail = {
  queueId: string;
  priority: QualityPriority;
  issues: string[];
  legalName: string | null;
  birthDate: string | null;
  motherName: string | null;
  maskedCpf: string | null;
  cpfStructurallyValid: boolean;
  maskedIdentityDocument: string | null;
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

function maskDigits(value: string | undefined): string | null {
  const digits = value?.replace(/\D/g, "");
  return digits ? `••••••${digits.slice(-2)}` : null;
}

function secret(): string {
  const value =
    process.env.ATLAS_SESSION_SECRET?.trim() ||
    process.env.ATLAS_INTERNAL_API_KEY?.trim();

  if (!value)
    throw new Error("O segredo de referência protegida não foi configurado.");
  return value;
}

async function queueIdFor(recordId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`quality:${recordId}`),
  );
  const bytes = new Uint8Array(signature);
  const token = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `quality-${token.slice(0, 24)}`;
}

async function loadRecords(): Promise<QualityRecord[]> {
  const configuration = getAirtableConfiguration();
  return listAllAirtableRecords<QualityQueueFields>(
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
}

function analyze(fields: QualityQueueFields): {
  priority: QualityPriority;
  issues: string[];
  fieldsPresent: number;
  cpfValid: boolean;
} | null {
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

  return {
    priority:
      !hasName || (hasCpf && !cpfValid)
        ? "critical"
        : !hasBirthDate || !hasMotherName
          ? "high"
          : "medium",
    issues,
    fieldsPresent: [
      hasName,
      hasBirthDate,
      hasMotherName,
      hasCpf,
      hasIdentityDocument,
    ].filter(Boolean).length,
    cpfValid,
  };
}

export async function listSafeIndividualQualityQueue(): Promise<
  SafeQualityQueueItem[]
> {
  const records = await loadRecords();
  const items: SafeQualityQueueItem[] = [];
  const priorityOrder: Record<QualityPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
  };

  for (const record of records) {
    const analysis = analyze(record.fields);
    if (!analysis) continue;

    items.push({
      queueId: await queueIdFor(record.id),
      maskedName: maskName(record.fields["Nome Completo"]),
      priority: analysis.priority,
      issues: analysis.issues,
      fieldsPresent: analysis.fieldsPresent,
      fieldsExpected: 5,
    });
  }

  return items.sort((left, right) => {
    const difference =
      priorityOrder[left.priority] - priorityOrder[right.priority];
    return difference !== 0
      ? difference
      : left.maskedName.localeCompare(right.maskedName, "pt-BR");
  });
}

export async function resolveIndividualQualityCorrectionTarget(
  queueId: string,
): Promise<{ sourceRecordId: string; issues: string[] } | null> {
  const records = await loadRecords();

  for (const record of records) {
    if ((await queueIdFor(record.id)) !== queueId) continue;
    const analysis = analyze(record.fields);

    return analysis
      ? { sourceRecordId: record.id, issues: analysis.issues }
      : null;
  }

  return null;
}

export async function getProtectedIndividualQualityDetail(
  queueId: string,
): Promise<ProtectedQualityDetail | null> {
  const records = await loadRecords();

  for (const record of records) {
    if ((await queueIdFor(record.id)) !== queueId) continue;
    const analysis = analyze(record.fields);
    if (!analysis) return null;

    return {
      queueId,
      priority: analysis.priority,
      issues: analysis.issues,
      legalName: record.fields["Nome Completo"]?.trim() || null,
      birthDate: record.fields["Data de Nascimento"]?.trim() || null,
      motherName: record.fields.Mãe?.trim() || null,
      maskedCpf: maskDigits(record.fields.CPF),
      cpfStructurallyValid: analysis.cpfValid,
      maskedIdentityDocument: maskDigits(record.fields["Registro Geral"]),
    };
  }

  return null;
}
