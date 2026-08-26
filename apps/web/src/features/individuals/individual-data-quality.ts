import "server-only";

import { isStructurallyValidCpf, normalizeCpf } from "@atlas/kernel";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type IndividualQualityFields = {
  "Nome Completo"?: string;
  "Data de Nascimento"?: string;
  CPF?: string;
  "Registro Geral"?: string;
  Mãe?: string;
};

export type IndividualDataQualityMetrics = {
  totalRecords: number;
  qualityScore: number;
  completeCoreIdentity: number;
  missingLegalName: number;
  missingBirthDate: number;
  missingMotherName: number;
  missingCpf: number;
  invalidCpf: number;
  missingIdentityDocument: number;
  criticalPriority: number;
  highPriority: number;
  mediumPriority: number;
  generatedAt: string;
};

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export async function getIndividualDataQualityMetrics(): Promise<IndividualDataQualityMetrics> {
  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<IndividualQualityFields>(
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

  let completeCoreIdentity = 0;
  let missingLegalName = 0;
  let missingBirthDate = 0;
  let missingMotherName = 0;
  let missingCpf = 0;
  let invalidCpf = 0;
  let missingIdentityDocument = 0;
  let criticalPriority = 0;
  let highPriority = 0;
  let mediumPriority = 0;
  let completedFields = 0;

  for (const record of records) {
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

    completedFields += [
      hasName,
      hasBirthDate,
      hasMotherName,
      hasCpf,
      hasIdentityDocument,
    ].filter(Boolean).length;

    if (!hasName) missingLegalName += 1;
    if (!hasBirthDate) missingBirthDate += 1;
    if (!hasMotherName) missingMotherName += 1;
    if (!hasCpf) missingCpf += 1;
    if (hasCpf && !cpfValid) invalidCpf += 1;
    if (!hasIdentityDocument) missingIdentityDocument += 1;

    if (
      hasName &&
      hasBirthDate &&
      hasMotherName &&
      (cpfValid || hasIdentityDocument)
    ) {
      completeCoreIdentity += 1;
    }

    if (!hasName || (hasCpf && !cpfValid)) {
      criticalPriority += 1;
    } else if (!hasBirthDate || !hasMotherName) {
      highPriority += 1;
    } else if (!hasCpf || !hasIdentityDocument) {
      mediumPriority += 1;
    }
  }

  const possibleFields = records.length * 5;

  return {
    totalRecords: records.length,
    qualityScore:
      possibleFields === 0
        ? 0
        : Math.round((completedFields / possibleFields) * 1000) / 10,
    completeCoreIdentity,
    missingLegalName,
    missingBirthDate,
    missingMotherName,
    missingCpf,
    invalidCpf,
    missingIdentityDocument,
    criticalPriority,
    highPriority,
    mediumPriority,
    generatedAt: new Date().toISOString(),
  };
}
