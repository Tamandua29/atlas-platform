import { describe, expect, it } from "vitest";

import { extractLinkedRecordIds } from "../src/features/intelligence/vehicle-individual-links-policy";

describe("vehicle individual links policy", () => {
  it("extrai somente IDs válidos de campos vinculados", () => {
    expect(
      extractLinkedRecordIds({
        Pessoas: ["recPessoa01", "recPessoa02"],
        Texto: "recIgnorado01",
        Outros: ["inválido", 123, null],
      }),
    ).toEqual(["recPessoa01", "recPessoa02"]);
  });

  it("remove IDs repetidos sem expor os demais valores", () => {
    expect(
      extractLinkedRecordIds({
        Proprietário: ["recPessoa01"],
        Condutor: ["recPessoa01"],
        RENAVAM: "123456789",
      }),
    ).toEqual(["recPessoa01"]);
  });
});
