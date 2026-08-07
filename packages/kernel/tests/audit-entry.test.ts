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

  it("aceita contagem operacional cujo nome contém as letras rg", () => {
    const audit = AuditEntry.create({
      action: "intelligence.individuals.profile",
      outcome: "success",
      occurredAt: new Date(),
      metadata: { organizationCount: 1 },
    });

    expect(audit.metadata?.organizationCount).toBe(1);
  });

  it.each([
    "cpf",
    "maskedCpf",
    "rg",
    "documento",
    "identityDocument",
    "password",
    "accessToken",
    "sessionSecret",
  ])("rejeita metadado sensível: %s", (key) => {
    expect(() => AuditEntry.create({
      action: "individuals.preview",
      outcome: "success",
      occurredAt: new Date(),
      metadata: { [key]: "valor-protegido" },
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
