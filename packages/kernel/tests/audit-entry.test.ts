import { describe, expect, it } from "vitest";
import { AuditEntry } from "../src/audit/audit-entry";
import { ValidationError } from "../src/errors/application-error";

describe("AuditEntry", () => {
  it("registra somente metadados operacionais", () => {
    const audit = AuditEntry.create({
      action: "individuals.preview",
      outcome: "success",
      occurredAt: new Date(),
      processedCount: 5,
      successCount: 5,
      metadata: { mode: "read-only" },
    });
    expect(audit.processedCount).toBe(5);
  });

  it("rejeita metadado sensível", () => {
    expect(() => AuditEntry.create({
      action: "individuals.preview",
      outcome: "success",
      occurredAt: new Date(),
      metadata: { cpf: "000" },
    })).toThrow(ValidationError);
  });

  it("rejeita contagem negativa", () => {
    expect(() => AuditEntry.create({
      action: "individuals.preview",
      outcome: "failure",
      occurredAt: new Date(),
      failureCount: -1,
    })).toThrow(ValidationError);
  });
});
