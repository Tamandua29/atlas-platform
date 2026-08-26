import { describe, expect, it } from "vitest";

import {
  ConflictError,
  ValidationError,
} from "../src/errors/application-error";
import { DuplicateReviewItem } from "../src/individuals/duplicate-review-item";

function review() {
  return DuplicateReviewItem.create({
    sourceRecordIds: ["recB", "recA"],
    strategy: "cpf",
    confidence: "high",
    reason: "Mesmo CPF estruturalmente válido.",
    correlationId: "correlation-1",
    openedAt: new Date("2026-08-06T14:00:00.000Z"),
  });
}

describe("DuplicateReviewItem", () => {
  it("deve abrir revisão pendente sem decisão automática", () => {
    const item = review();

    expect(item.status).toBe("open");
    expect(item.decision).toBe("pending");
    expect(item.sourceRecordIds).toEqual(["recA", "recB"]);
  });

  it("deve gerar chave idempotente independente da ordem", () => {
    const first = review();

    const second = DuplicateReviewItem.create({
      sourceRecordIds: ["recA", "recB"],
      strategy: "cpf",
      confidence: "high",
      reason: "Mesmo CPF estruturalmente válido.",
      correlationId: "two",
      openedAt: new Date(),
    });

    expect(first.idempotencyKey).toBe(second.idempotencyKey);
  });

  it("deve rejeitar grupo com menos de dois registros distintos", () => {
    expect(() =>
      DuplicateReviewItem.create({
        sourceRecordIds: ["recA", "recA"],
        strategy: "cpf",
        confidence: "high",
        reason: "Mesmo CPF.",
        correlationId: "correlation-1",
        openedAt: new Date(),
      }),
    ).toThrow(ValidationError);
  });

  it("não deve armazenar dados pessoais no item de fila", () => {
    const item = review();

    expect(item).not.toHaveProperty("cpf");
    expect(item).not.toHaveProperty("legalName");
    expect(item).not.toHaveProperty("identityDocument");
  });

  it("deve concluir por decisão humana justificada", () => {
    const item = review();

    item.decide({
      decision: "different-people",
      justification: "Fontes documentais indicam pessoas distintas.",
      reviewerId: "reviewer-test",
      decidedAt: new Date("2026-08-06T15:00:00.000Z"),
    });

    expect(item.status).toBe("completed");
    expect(item.decision).toBe("different-people");
    expect(item.reviewerId).toBe("reviewer-test");
  });

  it("deve exigir justificativa suficiente", () => {
    const item = review();

    expect(() =>
      item.decide({
        decision: "inconclusive",
        justification: "Pouca.",
        reviewerId: "reviewer-test",
        decidedAt: new Date(),
      }),
    ).toThrow(ValidationError);
  });

  it("não deve permitir substituir uma decisão final", () => {
    const item = review();

    item.decide({
      decision: "same-person",
      justification: "As fontes foram conferidas pelo revisor.",
      reviewerId: "reviewer-test",
      decidedAt: new Date(),
    });

    expect(() =>
      item.decide({
        decision: "different-people",
        justification: "Tentativa posterior de alteração.",
        reviewerId: "reviewer-test",
        decidedAt: new Date(),
      }),
    ).toThrow(ConflictError);
  });
});
