import { describe, expect, it } from "vitest";

import { ValidationError } from "../src/errors/application-error";
import { CanonicalIndividual } from "../src/individuals/canonical-individual";
import { SourceRecordReference } from "../src/provenance/source-record-reference";

const source = SourceRecordReference.create({
  system: "airtable",
  baseId: "appBase",
  tableId: "tblIndividuals",
  recordId: "rec001",
  importedAt: new Date("2026-08-06T00:00:00.000Z"),
});

describe("CanonicalIndividual", () => {
  it("deve preservar o nome civil e criar a versão pesquisável", () => {
    const individual = CanonicalIndividual.create({
      legalName: "  José   Antônio da Silva ",
      source,
    });

    expect(individual.legalName).toBe("José Antônio da Silva");

    expect(individual.normalizedName).toBe("JOSE ANTONIO DA SILVA");
  });

  it("deve preservar referência obrigatória ao registro original", () => {
    const individual = CanonicalIndividual.create({
      legalName: "Maria Souza",
      source,
    });

    expect(individual.sources[0]?.key).toBe(
      "airtable:appBase:tblIndividuals:rec001",
    );
  });

  it("deve normalizar e eliminar aliases duplicados para pesquisa", () => {
    const individual = CanonicalIndividual.create({
      legalName: "José Antônio",
      aliases: ["Zezinho", " Zezinho ", "Jose Antonio"],
      source,
    });

    expect(individual.normalizedAliases).toEqual(["ZEZINHO"]);
  });

  it("deve rejeitar indivíduo sem nome civil", () => {
    expect(() =>
      CanonicalIndividual.create({
        legalName: "   ",
        source,
      }),
    ).toThrow(ValidationError);
  });

  it("deve rejeitar origem sem identificador do registro", () => {
    expect(() =>
      SourceRecordReference.create({
        system: "airtable",
        baseId: "appBase",
        tableId: "tblIndividuals",
        recordId: " ",
        importedAt: new Date(),
      }),
    ).toThrow(ValidationError);
  });
});
