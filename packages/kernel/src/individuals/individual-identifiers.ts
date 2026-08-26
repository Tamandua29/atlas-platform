import {
  normalizeDigits,
  normalizeSearchText,
} from "../normalization/text-normalization";

export type IndividualMatchKey = {
  readonly strategy: "cpf" | "biographic";
  readonly value: string;
};

export function isStructurallyValidCpf(value: string): boolean {
  const cpf = normalizeDigits(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (length: number): number => {
    let sum = 0;

    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }

    const remainder = (sum * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(9) === Number(cpf[9]) &&
    calculateDigit(10) === Number(cpf[10])
  );
}

export function normalizeCpf(value?: string): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const digits = normalizeDigits(value);

  return digits || undefined;
}

export function normalizeIdentityDocument(value?: string): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLocaleUpperCase("pt-BR");

  return normalized || undefined;
}

export function buildIndividualMatchKey(input: {
  readonly cpf?: string;
  readonly normalizedName: string;
  readonly birthDate?: Date;
  readonly normalizedMotherName?: string;
}): IndividualMatchKey | null {
  if (input.cpf && isStructurallyValidCpf(input.cpf)) {
    return {
      strategy: "cpf",
      value: `CPF:${input.cpf}`,
    };
  }

  if (!input.birthDate || !input.normalizedMotherName) {
    return null;
  }

  const birthDate = input.birthDate.toISOString().slice(0, 10);

  return {
    strategy: "biographic",
    value: [
      "BIO",
      normalizeSearchText(input.normalizedName),
      birthDate,
      normalizeSearchText(input.normalizedMotherName),
    ].join(":"),
  };
}
