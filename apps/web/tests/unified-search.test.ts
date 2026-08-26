import { describe, expect, it } from "vitest";

import {
  normalizeUnifiedSearchText,
  searchUnifiedIntelligence,
  validateUnifiedSearchQuery,
} from "../src/features/intelligence/unified-search";

const sources = {
  individuals: [
    { recordId: "ind1", legalName: "Érico da Silva", alias: "Falcão" },
  ],
  organizations: [
    {
      recordId: "org1",
      name: "Organização Alfa",
      acronym: "OA",
      organizationType: "Grupo",
      organizationStatus: "Ativa",
    },
  ],
  vehicles: [
    {
      recordId: "veh1",
      maskedPlate: "•••1A23",
      brand: "Toyota",
      model: "Hilux",
      color: "Prata",
      status: "Ativo",
    },
  ],
  warrants: [
    {
      recordId: "war1",
      maskedWarrantNumber: "•••7788",
      maskedCaseNumber: "•••9900",
      issuingAuthority: "TJAM",
      court: "1ª Vara",
      type: "Prisão",
      status: "Vigente",
    },
  ],
};

describe("searchUnifiedIntelligence", () => {
  it("normaliza acentos e caixa", () =>
    expect(normalizeUnifiedSearchText(" ÉRICO ")).toBe("erico"));
  it("exige ao menos dois caracteres", () =>
    expect(validateUnifiedSearchQuery("a").valid).toBe(false));
  it("localiza pessoa pelo vulgo sem expor documentos", () =>
    expect(searchUnifiedIntelligence(sources, "falcao")).toEqual([
      expect.objectContaining({ category: "individual", id: "ind1" }),
    ]));
  it("localiza categorias protegidas por seus campos autorizados", () => {
    expect(
      searchUnifiedIntelligence(sources, "hilux", "vehicle")[0],
    ).toMatchObject({ id: "veh1", subtitle: "•••1A23" });
    expect(
      searchUnifiedIntelligence(sources, "tjam", "warrant")[0],
    ).toMatchObject({ id: "war1", category: "warrant" });
    expect(
      searchUnifiedIntelligence(sources, "OA", "organization")[0],
    ).toMatchObject({ id: "org1", category: "organization" });
  });
  it("respeita o limite de resultados", () => {
    const multipleSources = {
      ...sources,
      individuals: [
        { recordId: "ind1", legalName: "Maria Alfa", alias: null },
        { recordId: "ind2", legalName: "Maria Beta", alias: null },
      ],
    };

    expect(
      searchUnifiedIntelligence(multipleSources, "maria", "all", 1),
    ).toHaveLength(1);
  });
});
