import {
  describe,
  expect,
  it,
} from "vitest";

import { Result } from "../src/result/result";

describe("Result", () => {
  it("deve criar um resultado de sucesso", () => {
    const result = Result.ok(42);

    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.value).toBe(42);
  });

  it("deve criar um resultado de falha", () => {
    const error = new Error(
      "Falha de teste.",
    );

    const result = Result.fail(error);

    expect(result.isFailure).toBe(true);
    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe(error);
  });

  it("deve transformar um resultado de sucesso", () => {
    const result = Result.ok(10).map(
      (value) => value * 2,
    );

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(20);
  });

  it("deve preservar uma falha durante map", () => {
    const error = new Error(
      "Falha original.",
    );

    const result = Result.fail<
      number,
      Error
    >(error).map(
      (value) => value * 2,
    );

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(error);
  });

  it("deve retornar um valor alternativo", () => {
    const result = Result.fail<
      string,
      Error
    >(
      new Error("Falha."),
    );

    expect(
      result.getOrElse("fallback"),
    ).toBe("fallback");
  });

  it("deve executar o handler de sucesso", () => {
    const result = Result.ok(10);

    const message = result.match({
      success: (value) =>
        `Valor: ${value}`,
      failure: () => "Falha",
    });

    expect(message).toBe("Valor: 10");
  });

  it("deve executar o handler de falha", () => {
    const result = Result.fail<
      number,
      Error
    >(
      new Error("Erro controlado"),
    );

    const message = result.match({
      success: (value) =>
        `Valor: ${value}`,
      failure: (error) =>
        error.message,
    });

    expect(message).toBe(
      "Erro controlado",
    );
  });
});