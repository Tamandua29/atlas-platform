import {
  describe,
  expect,
  it,
} from "vitest";

import { ValidationError } from "../src/errors/application-error";
import { DuplicateReviewItem } from "../src/individuals/duplicate-review-item";

describe(
  "DuplicateReviewItem",
  () => {
    it("deve abrir revisão pendente sem decisão automática", () => {
      const item =
        DuplicateReviewItem.create({
          sourceRecordIds: [
            "recB",
            "recA",
          ],
          strategy: "cpf",
          confidence: "high",
          reason:
            "Mesmo CPF estruturalmente válido.",
          correlationId:
            "correlation-1",
          openedAt: new Date(
            "2026-08-06T14:00:00.000Z",
          ),
        });

      expect(item.status).toBe(
        "open",
      );
      expect(item.decision).toBe(
        "pending",
      );
      expect(
        item.sourceRecordIds,
      ).toEqual([
        "recA",
        "recB",
      ]);
    });

    it("deve gerar chave idempotente independente da ordem", () => {
      const first =
        DuplicateReviewItem.create({
          sourceRecordIds: [
            "recA",
            "recB",
          ],
          strategy:
            "biographic",
          confidence: "medium",
          reason:
            "Correspondência biográfica.",
          correlationId: "one",
          openedAt: new Date(),
        });

      const second =
        DuplicateReviewItem.create({
          sourceRecordIds: [
            "recB",
            "recA",
          ],
          strategy:
            "biographic",
          confidence: "medium",
          reason:
            "Correspondência biográfica.",
          correlationId: "two",
          openedAt: new Date(),
        });

      expect(
        first.idempotencyKey,
      ).toBe(
        second.idempotencyKey,
      );
    });

    it("deve rejeitar grupo com menos de dois registros distintos", () => {
      expect(() =>
        DuplicateReviewItem.create({
          sourceRecordIds: [
            "recA",
            "recA",
          ],
          strategy: "cpf",
          confidence: "high",
          reason:
            "Mesmo CPF.",
          correlationId:
            "correlation-1",
          openedAt: new Date(),
        }),
      ).toThrow(ValidationError);
    });

    it("não deve armazenar dados pessoais no item de fila", () => {
      const item =
        DuplicateReviewItem.create({
          sourceRecordIds: [
            "recA",
            "recB",
          ],
          strategy: "cpf",
          confidence: "high",
          reason:
            "Mesmo CPF estruturalmente válido.",
          correlationId:
            "correlation-1",
          openedAt: new Date(),
        });

      expect(item).not.toHaveProperty(
        "cpf",
      );
      expect(item).not.toHaveProperty(
        "legalName",
      );
      expect(item).not.toHaveProperty(
        "identityDocument",
      );
    });
  },
);
