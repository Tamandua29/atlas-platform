import {
  describe,
  expect,
  it,
} from "vitest";

import { ValidationError } from "../src/errors/application-error";
import { UniqueEntityId } from "../src/identifiers/unique-entity-id";

describe("UniqueEntityId", () => {
  it("deve gerar um UUID automaticamente", () => {
    const id = UniqueEntityId.create();

    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("deve aceitar um UUID válido", () => {
    const value =
      "550e8400-e29b-41d4-a716-446655440000";

    const id =
      UniqueEntityId.create(value);

    expect(id.value).toBe(value);
  });

  it("deve converter o UUID para letras minúsculas", () => {
    const value =
      "550E8400-E29B-41D4-A716-446655440000";

    const id =
      UniqueEntityId.create(value);

    expect(id.value).toBe(
      value.toLowerCase(),
    );
  });

  it("deve comparar identificadores iguais", () => {
    const value =
      "550e8400-e29b-41d4-a716-446655440000";

    const first =
      UniqueEntityId.create(value);

    const second =
      UniqueEntityId.create(value);

    expect(first.equals(second)).toBe(
      true,
    );
  });

  it("deve identificar UUIDs diferentes", () => {
    const first = UniqueEntityId.create(
      "550e8400-e29b-41d4-a716-446655440000",
    );

    const second = UniqueEntityId.create(
      "550e8400-e29b-41d4-a716-446655440001",
    );

    expect(first.equals(second)).toBe(
      false,
    );
  });

  it("deve retornar false para valor inexistente", () => {
    const id = UniqueEntityId.create();

    expect(id.equals(null)).toBe(false);
    expect(id.equals(undefined)).toBe(
      false,
    );
  });

  it("deve rejeitar um identificador inválido", () => {
    expect(() =>
      UniqueEntityId.create(
        "identificador-invalido",
      ),
    ).toThrow(ValidationError);
  });

  it("deve retornar o UUID ao converter para texto", () => {
    const value =
      "550e8400-e29b-41d4-a716-446655440000";

    const id =
      UniqueEntityId.create(value);

    expect(id.toString()).toBe(value);
    expect(id.toJSON()).toBe(value);
  });
});