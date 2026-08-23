import {
  describe,
  expect,
  it,
} from "vitest";

import { CanonicalIndividual } from "../src/individuals/canonical-individual";
import { findDuplicateCandidates } from "../src/individuals/find-duplicate-candidates";
import { SourceRecordReference } from "../src/provenance/source-record-reference";

function individual(
  recordId: string,
  overrides: Partial<{
    legalName: string;
    cpf: string;
    birthDate: Date;
    motherName: string;
  }> = {},
) {
  return CanonicalIndividual.create({
    legalName:
      overrides.legalName ??
      "José da Silva",
    cpf: overrides.cpf,
    birthDate:
      overrides.birthDate,
    motherName:
      overrides.motherName,
    source:
      SourceRecordReference.create({
        system: "airtable",
        baseId: "app",
        tableId: "tbl",
        recordId,
        importedAt:
          new Date(),
      }),
  });
}

describe(
  "findDuplicateCandidates",
  () => {
    it("deve sugerir revisão para o mesmo CPF válido", () => {
      const candidates =
        findDuplicateCandidates([
          individual("rec1", {
            cpf: "52998224725",
          }),
          individual("rec2", {
            cpf: "529.982.247-25",
          }),
        ]);

      expect(candidates).toHaveLength(
        1,
      );

      expect(candidates[0]).toMatchObject({
        strategy: "cpf",
        confidence: "high",
        status:
          "pending-human-review",
      });
    });

    it("deve sugerir revisão por dados biográficos completos", () => {
      const birthDate =
        new Date(
          "1980-01-01T00:00:00.000Z",
        );

      const candidates =
        findDuplicateCandidates([
          individual("rec1", {
            birthDate,
            motherName:
              "Maria da Silva",
          }),
          individual("rec2", {
            legalName:
              "JOSE DA SILVA",
            birthDate,
            motherName:
              "MARIA DA SILVA",
          }),
        ]);

      expect(candidates[0]).toMatchObject({
        strategy: "biographic",
        confidence: "medium",
      });
    });

    it("não deve sugerir duplicidade com dados insuficientes", () => {
      expect(
        findDuplicateCandidates([
          individual("rec1"),
          individual("rec2"),
        ]),
      ).toEqual([]);
    });

    it("não deve considerar um registro isolado como duplicidade", () => {
      expect(
        findDuplicateCandidates([
          individual("rec1", {
            cpf: "52998224725",
          }),
        ]),
      ).toEqual([]);
    });

    it("deve preservar todas as origens para revisão", () => {
      const candidates =
        findDuplicateCandidates([
          individual("rec1", {
            cpf: "52998224725",
          }),
          individual("rec2", {
            cpf: "52998224725",
          }),
        ]);

      expect(
        candidates[0]?.sourceKeys,
      ).toHaveLength(2);
    });
  },
);
