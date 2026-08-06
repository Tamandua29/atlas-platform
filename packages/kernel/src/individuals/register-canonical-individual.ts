import type { Clock } from "../clock/clock";
import { ValidationError } from "../errors/application-error";
import { SourceRecordReference } from "../provenance/source-record-reference";
import { CanonicalIndividual } from "./canonical-individual";
import type { CanonicalIndividualRepository } from "./canonical-individual-repository";

export type RegisterCanonicalIndividualInput = {
  readonly legalName: string;
  readonly aliases?: readonly string[];
  readonly birthDate?: string;
  readonly source: {
    readonly system: "airtable";
    readonly baseId: string;
    readonly tableId: string;
    readonly recordId: string;
  };
};

export type RegisterCanonicalIndividualOutput = {
  readonly individual: CanonicalIndividual;
  readonly created: boolean;
};

function parseBirthDate(
  value?: string,
): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new ValidationError(
      "A data de nascimento deve usar o formato AAAA-MM-DD.",
      {
        field: "birthDate",
        value,
      },
    );
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (
    Number.isNaN(date.getTime()) ||
    date
      .toISOString()
      .slice(0, 10) !== value
  ) {
    throw new ValidationError(
      "A data de nascimento é inválida.",
      {
        field: "birthDate",
        value,
      },
    );
  }

  return date;
}

export class RegisterCanonicalIndividual {
  constructor(
    private readonly repository:
      CanonicalIndividualRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: RegisterCanonicalIndividualInput,
  ): Promise<RegisterCanonicalIndividualOutput> {
    const timestamp =
      this.clock.now();

    const source =
      SourceRecordReference.create({
        ...input.source,
        importedAt: timestamp,
      });

    const existing =
      await this.repository
        .findBySourceKey(
          source.key,
        );

    if (existing) {
      return {
        individual: existing,
        created: false,
      };
    }

    const individual =
      CanonicalIndividual.create({
        legalName: input.legalName,
        aliases: input.aliases,
        birthDate: parseBirthDate(
          input.birthDate,
        ),
        source,
        createdAt: timestamp,
      });

    await this.repository.save(
      individual,
    );

    return {
      individual,
      created: true,
    };
  }
}
