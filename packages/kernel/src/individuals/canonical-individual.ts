import { ValidationError } from "../errors/application-error";
import { UniqueEntityId } from "../identifiers/unique-entity-id";
import {
  collapseWhitespace,
  normalizeSearchText,
} from "../normalization/text-normalization";
import { SourceRecordReference } from "../provenance/source-record-reference";

export type CanonicalIndividualInput = {
  readonly id?: UniqueEntityId;
  readonly legalName: string;
  readonly aliases?: readonly string[];
  readonly birthDate?: Date;
  readonly source: SourceRecordReference;
  readonly createdAt?: Date;
};

export class CanonicalIndividual {
  readonly id: UniqueEntityId;
  readonly legalName: string;
  readonly normalizedName: string;
  readonly aliases: readonly string[];
  readonly normalizedAliases: readonly string[];
  readonly birthDate?: Date;
  readonly sources: readonly SourceRecordReference[];
  readonly createdAt: Date;

  private constructor(
    input: CanonicalIndividualInput,
  ) {
    this.id =
      input.id ??
      UniqueEntityId.create();

    this.legalName =
      collapseWhitespace(
        input.legalName,
      );

    this.normalizedName =
      normalizeSearchText(
        this.legalName,
      );

    this.aliases = Object.freeze(
      [
        ...new Set(
          (input.aliases ?? [])
            .map(collapseWhitespace)
            .filter(Boolean),
        ),
      ],
    );

    this.normalizedAliases =
      Object.freeze(
        [
          ...new Set(
            this.aliases.map(
              normalizeSearchText,
            ),
          ),
        ].filter(
          (alias) =>
            alias !==
            this.normalizedName,
        ),
      );

    this.birthDate =
      input.birthDate
        ? new Date(
            input.birthDate.getTime(),
          )
        : undefined;

    this.sources = Object.freeze([
      input.source,
    ]);

    this.createdAt = new Date(
      (
        input.createdAt ??
        new Date()
      ).getTime(),
    );
  }

  static create(
    input: CanonicalIndividualInput,
  ): CanonicalIndividual {
    if (
      !collapseWhitespace(
        input.legalName,
      )
    ) {
      throw new ValidationError(
        "O nome civil do indivíduo é obrigatório.",
        {
          field: "legalName",
        },
      );
    }

    if (
      input.birthDate &&
      Number.isNaN(
        input.birthDate.getTime(),
      )
    ) {
      throw new ValidationError(
        "A data de nascimento é inválida.",
        {
          field: "birthDate",
        },
      );
    }

    return new CanonicalIndividual(
      input,
    );
  }
}
