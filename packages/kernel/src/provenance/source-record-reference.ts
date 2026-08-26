import { ValidationError } from "../errors/application-error";

export type SourceSystem = "airtable";

export type SourceRecordReferenceInput = {
  readonly system: SourceSystem;
  readonly baseId: string;
  readonly tableId: string;
  readonly recordId: string;
  readonly importedAt: Date;
};

function required(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new ValidationError(`A referência de origem exige ${field}.`, {
      field,
    });
  }

  return normalized;
}

export class SourceRecordReference {
  readonly system: SourceSystem;
  readonly baseId: string;
  readonly tableId: string;
  readonly recordId: string;
  readonly importedAt: Date;

  private constructor(input: SourceRecordReferenceInput) {
    this.system = input.system;
    this.baseId = input.baseId;
    this.tableId = input.tableId;
    this.recordId = input.recordId;
    this.importedAt = new Date(input.importedAt.getTime());
  }

  static create(input: SourceRecordReferenceInput): SourceRecordReference {
    if (Number.isNaN(input.importedAt.getTime())) {
      throw new ValidationError("A data de importação da origem é inválida.");
    }

    return new SourceRecordReference({
      ...input,
      baseId: required(input.baseId, "baseId"),
      tableId: required(input.tableId, "tableId"),
      recordId: required(input.recordId, "recordId"),
    });
  }

  get key(): string {
    return [this.system, this.baseId, this.tableId, this.recordId].join(":");
  }
}
