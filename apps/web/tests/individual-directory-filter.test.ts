import { describe, expect, it } from "vitest";

import {
  classifyDirectoryPriority,
  filterIndividualDirectory,
  type FilterableIndividual,
} from "@/features/intelligence/individual-directory-filter";

const individuals: FilterableIndividual[] = [
  {
    legalName: "João Ávila",
    alias: "Alfa",
    cpfPresent: true,
    identityDocumentPresent: true,
    judicialAttention: "active",
    operationalPriority: "high",
  },
  {
    legalName: "Maria Souza",
    alias: null,
    cpfPresent: false,
    identityDocumentPresent: true,
    judicialAttention: "none",
    operationalPriority: "normal",
  },
];

describe("filtros do diretório de indivíduos", () => {
  it("busca nome sem depender de acentuação", () => {
    expect(filterIndividualDirectory(individuals, "joao", "all")).toHaveLength(1);
  });

  it("separa atenção judicial de ausência documental", () => {
    expect(filterIndividualDirectory(individuals, "", "judicial-attention")).toEqual([individuals[0]]);
    expect(filterIndividualDirectory(individuals, "", "documents-missing")).toEqual([individuals[1]]);
  });

  it("não transforma ausência de vínculo em risco", () => {
    expect(classifyDirectoryPriority("none")).toBe("normal");
    expect(classifyDirectoryPriority("verify")).toBe("attention");
  });
});
