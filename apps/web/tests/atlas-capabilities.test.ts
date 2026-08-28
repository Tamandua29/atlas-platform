import { describe, expect, it } from "vitest";

import {
  roleHasAtlasCapability,
  rolesForAtlasCapability,
  type AtlasCapability,
} from "../src/features/auth/atlas-capabilities";

const MUTATIONS: AtlasCapability[] = [
  "propose",
  "decide",
  "execute",
  "transition",
];

describe("matriz de capacidades do Atlas", () => {
  it("limita o auditor a consulta e reconciliação sem escrita operacional", () => {
    expect(roleHasAtlasCapability("auditor", "consult")).toBe(true);
    expect(roleHasAtlasCapability("auditor", "reconcile")).toBe(true);
    for (const capability of MUTATIONS) {
      expect(roleHasAtlasCapability("auditor", capability)).toBe(false);
    }
  });

  it("permite ao revisor tratar o fluxo sem acessar a reconciliação", () => {
    expect(roleHasAtlasCapability("reviewer", "consult")).toBe(true);
    for (const capability of MUTATIONS) {
      expect(roleHasAtlasCapability("reviewer", capability)).toBe(true);
    }
    expect(roleHasAtlasCapability("reviewer", "reconcile")).toBe(false);
  });

  it("mantém o administrador autorizado explicitamente em todas as capacidades", () => {
    const capabilities: AtlasCapability[] = [
      "consult",
      ...MUTATIONS,
      "reconcile",
    ];
    for (const capability of capabilities) {
      expect(roleHasAtlasCapability("administrator", capability)).toBe(true);
    }
  });

  it("expõe somente os papéis mínimos de cada capacidade", () => {
    expect(rolesForAtlasCapability("consult")).toEqual(["reviewer", "auditor"]);
    expect(rolesForAtlasCapability("propose")).toEqual(["reviewer"]);
    expect(rolesForAtlasCapability("decide")).toEqual(["reviewer"]);
    expect(rolesForAtlasCapability("execute")).toEqual(["reviewer"]);
    expect(rolesForAtlasCapability("transition")).toEqual(["reviewer"]);
    expect(rolesForAtlasCapability("reconcile")).toEqual(["auditor"]);
  });
});
