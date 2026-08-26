import { describe, expect, it } from "vitest";

import {
  collapseWhitespace,
  normalizeDigits,
  normalizeSearchText,
} from "../src/normalization/text-normalization";

describe("normalização", () => {
  it("deve colapsar espaços sem alterar o texto exibido", () => {
    expect(collapseWhitespace("  José   da Silva ")).toBe("José da Silva");
  });

  it("deve remover acentos e padronizar texto para pesquisa", () => {
    expect(normalizeSearchText(" José Antônio ")).toBe("JOSE ANTONIO");
  });

  it("deve manter somente dígitos em documentos e telefones", () => {
    expect(normalizeDigits("(92) 99999-0000")).toBe("92999990000");
  });
});
