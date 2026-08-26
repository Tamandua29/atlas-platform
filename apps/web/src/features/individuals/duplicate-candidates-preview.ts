import "server-only";

import {
  CanonicalIndividual,
  FixedClock,
  RegisterCanonicalIndividual,
  findDuplicateCandidates,
  type CanonicalIndividualRepository,
} from "@atlas/kernel";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type Fields = {
  "Nome Completo"?: string;
  "Vulgo Principal"?: string;
  "Data de Nascimento"?: string;
  CPF?: string;
  "Registro Geral"?: string;
  Mãe?: string;
};

class MemoryRepository implements CanonicalIndividualRepository {
  readonly individuals: CanonicalIndividual[] = [];

  async findBySourceKey(sourceKey: string) {
    return (
      this.individuals.find((individual) =>
        individual.sources.some((source) => source.key === sourceKey),
      ) ?? null
    );
  }

  async save(individual: CanonicalIndividual) {
    this.individuals.push(individual);
  }
}

export async function previewDuplicateCandidatesFromAirtable() {
  const configuration = getAirtableConfiguration();

  const records = await listAllAirtableRecords<Fields>(
    configuration.individualsTableId,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields: [
        "Nome Completo",
        "Vulgo Principal",
        "Data de Nascimento",
        "CPF",
        "Registro Geral",
        "Mãe",
      ],
      maxRecords: 25,
    },
  );

  const repository = new MemoryRepository();

  for (const record of records) {
    const legalName = record.fields["Nome Completo"]?.trim();

    if (!legalName) {
      continue;
    }

    const alias = record.fields["Vulgo Principal"]?.trim();

    await new RegisterCanonicalIndividual(
      repository,
      new FixedClock(new Date(record.createdTime)),
    ).execute({
      legalName,
      aliases: alias ? [alias] : [],
      birthDate: record.fields["Data de Nascimento"],
      cpf: record.fields.CPF,
      identityDocument: record.fields["Registro Geral"],
      motherName: record.fields.Mãe,
      source: {
        system: "airtable",
        baseId: configuration.individualsPreviewBaseId,
        tableId: configuration.individualsTableId,
        recordId: record.id,
      },
    });
  }

  return findDuplicateCandidates(repository.individuals).map(
    (candidate, index) => ({
      reviewId: `DUP-PREVIEW-${String(index + 1).padStart(3, "0")}`,
      strategy: candidate.strategy,
      confidence: candidate.confidence,
      status: candidate.status,
      recordCount: candidate.individualIds.length,
      sourceRecordIds: candidate.sourceKeys.map(
        (sourceKey) => sourceKey.split(":").at(-1) ?? "",
      ),
      reason: candidate.reason,
    }),
  );
}
