import "server-only";

import {
  FixedClock,
  RegisterCanonicalIndividual,
  type CanonicalIndividual,
  type CanonicalIndividualRepository,
} from "@atlas/kernel";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type AirtableIndividualFields = {
  "Nome Completo"?: string;
  "Vulgo Principal"?: string;
  "Data de Nascimento"?: string;
  CPF?: string;
  "Registro Geral"?: string;
  Mãe?: string;
  "Base de Origem"?: string;
  "ID na Base de Origem"?: string;
};

class PreviewIndividualRepository
  implements CanonicalIndividualRepository
{
  private readonly individuals:
    CanonicalIndividual[] = [];

  async findBySourceKey(
    sourceKey: string,
  ): Promise<CanonicalIndividual | null> {
    return (
      this.individuals.find(
        (individual) =>
          individual.sources.some(
            (source) =>
              source.key ===
              sourceKey,
          ),
      ) ?? null
    );
  }

  async save(
    individual: CanonicalIndividual,
  ): Promise<void> {
    this.individuals.push(
      individual,
    );
  }
}

export type CanonicalIndividualPreview = {
  readonly id: string;
  readonly sourceRecordId: string;
  readonly sourceKey: string;
  readonly legalName: string;
  readonly normalizedName: string;
  readonly aliases: readonly string[];
  readonly normalizedAliases: readonly string[];
  readonly birthDate: string | null;
  readonly cpf: string | null;
  readonly cpfStructurallyValid: boolean;
  readonly identityDocument: string | null;
  readonly motherName: string | null;
  readonly normalizedMotherName: string | null;
  readonly matchKey: {
    readonly strategy: "cpf" | "biographic";
    readonly value: string;
  } | null;
  readonly created: boolean;
};

export async function previewCanonicalIndividualsFromAirtable(
  limit = 5,
): Promise<CanonicalIndividualPreview[]> {
  const configuration =
    getAirtableConfiguration();

  const records =
    await listAllAirtableRecords<AirtableIndividualFields>(
      configuration.individualsTableId,
      {
        baseId:
          configuration
            .individualsPreviewBaseId,
        fields: [
          "Nome Completo",
          "Vulgo Principal",
          "Data de Nascimento",
          "CPF",
          "Registro Geral",
          "Mãe",
        ],
        maxRecords: Math.min(
          Math.max(limit, 1),
          5,
        ),
      },
    );

  const repository =
    new PreviewIndividualRepository();

  const previews:
    CanonicalIndividualPreview[] = [];

  for (const record of records) {
    const legalName =
      record.fields[
        "Nome Completo"
      ]?.trim();

    if (!legalName) {
      continue;
    }

    const timestamp = new Date(
      record.createdTime,
    );

    const service =
      new RegisterCanonicalIndividual(
        repository,
        new FixedClock(timestamp),
      );

    const alias =
      record.fields[
        "Vulgo Principal"
      ]?.trim();

    const result =
      await service.execute({
        legalName,
        aliases: alias
          ? [alias]
          : [],
        birthDate:
          record.fields[
            "Data de Nascimento"
          ],
        cpf: record.fields.CPF,
        identityDocument:
          record.fields[
            "Registro Geral"
          ],
        motherName:
          record.fields.Mãe,
        source: {
          system: "airtable",
          baseId:
            configuration
              .individualsPreviewBaseId,
          tableId:
            configuration
              .individualsTableId,
          recordId: record.id,
        },
      });

    previews.push({
      id:
        result.individual.id.value,
      sourceRecordId:
        record.id,
      sourceKey:
        result.individual
          .sources[0]?.key ?? "",
      legalName:
        result.individual
          .legalName,
      normalizedName:
        result.individual
          .normalizedName,
      aliases:
        result.individual.aliases,
      normalizedAliases:
        result.individual
          .normalizedAliases,
      birthDate:
        result.individual
          .birthDate
          ?.toISOString()
          .slice(0, 10) ?? null,
      cpf:
        result.individual.cpf ?? null,
      cpfStructurallyValid:
        result.individual
          .cpfStructurallyValid,
      identityDocument:
        result.individual
          .identityDocument ?? null,
      motherName:
        result.individual
          .motherName ?? null,
      normalizedMotherName:
        result.individual
          .normalizedMotherName ?? null,
      matchKey:
        result.individual.matchKey,
      created: result.created,
    });
  }

  return previews;
}
