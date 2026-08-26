import { describe, expect, it } from "vitest";

import {
  buildIndividualMatchKey,
  isStructurallyValidCpf,
  normalizeCpf,
  normalizeIdentityDocument,
} from "../src/individuals/individual-identifiers";

describe("qualidade cadastral do indivíduo", () => {
  it("deve aceitar CPF estruturalmente válido", () => {
    expect(isStructurallyValidCpf("529.982.247-25")).toBe(true);
  });

  it("deve rejeitar CPF com dígitos verificadores inválidos", () => {
    expect(isStructurallyValidCpf("529.982.247-24")).toBe(false);
  });

  it("deve rejeitar CPF com sequência repetida", () => {
    expect(isStructurallyValidCpf("111.111.111-11")).toBe(false);
  });

  it("deve normalizar CPF sem afirmar validade oficial", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
  });

  it("deve normalizar documento de identidade", () => {
    expect(normalizeIdentityDocument(" 12.345-6 AM ")).toBe("123456AM");
  });

  it("deve priorizar CPF válido na chave de comparação", () => {
    expect(
      buildIndividualMatchKey({
        cpf: "52998224725",
        normalizedName: "JOSE DA SILVA",
        birthDate: new Date("1980-01-01T00:00:00.000Z"),
        normalizedMotherName: "MARIA DA SILVA",
      }),
    ).toEqual({
      strategy: "cpf",
      value: "CPF:52998224725",
    });
  });

  it("deve usar dados biográficos quando o CPF não for válido", () => {
    expect(
      buildIndividualMatchKey({
        cpf: "123",
        normalizedName: "JOSÉ DA SILVA",
        birthDate: new Date("1980-01-01T00:00:00.000Z"),
        normalizedMotherName: "MARIA DA SILVA",
      }),
    ).toEqual({
      strategy: "biographic",
      value: "BIO:JOSE DA SILVA:1980-01-01:MARIA DA SILVA",
    });
  });

  it("não deve criar chave biográfica incompleta", () => {
    expect(
      buildIndividualMatchKey({
        normalizedName: "JOSE DA SILVA",
      }),
    ).toBeNull();
  });
});
