import { describe, expect, it } from "vitest";

import {
  assertDistinctActors,
  assertTreatmentTransition,
  correctionExecutionDisposition,
  reversalExecutionDisposition,
} from "../src/features/individuals/correction-workflow-policy";

describe("correction workflow policy", () => {
  it("bloqueia identidades repetidas na segregação", () => {
    expect(() => assertDistinctActors([
      { id: "ator-1", label: "proponente" },
      { id: "ator-1", label: "aprovador" },
    ])).toThrow(/Segregação de funções violada/);
  });

  it("aceita identidades segregadas", () => {
    expect(() => assertDistinctActors([
      { id: "ator-1", label: "proponente" },
      { id: "ator-2", label: "aprovador" },
      { id: "ator-3", label: "executor" },
    ])).not.toThrow();
  });

  it("torna execução concluída idempotente", () => {
    expect(correctionExecutionDisposition({
      proposalStatus: "Aplicada",
      executionStatus: "Aplicada",
      currentHash: "depois",
      sourceHash: "antes",
      afterHash: "depois",
    })).toBe("already-completed");
  });

  it("reconcilia escrita concluída após interrupção", () => {
    expect(correctionExecutionDisposition({
      proposalStatus: "Aprovada",
      executionStatus: "Aplicando",
      currentHash: "depois",
      sourceHash: "antes",
      afterHash: "depois",
    })).toBe("reconcile");
  });

  it("bloqueia repetição de execução interrompida sem confirmação", () => {
    expect(correctionExecutionDisposition({
      proposalStatus: "Aprovada",
      executionStatus: "Falhou",
      currentHash: "estado-incerto",
      sourceHash: "antes",
      afterHash: "depois",
    })).toBe("blocked-interrupted");
  });

  it("bloqueia conflito de versão antes da escrita", () => {
    expect(correctionExecutionDisposition({
      proposalStatus: "Aprovada",
      executionStatus: undefined,
      currentHash: "alterado",
      sourceHash: "antes",
      afterHash: undefined,
    })).toBe("blocked-version");
  });

  it("autoriza execução apenas no estado e versão corretos", () => {
    expect(correctionExecutionDisposition({
      proposalStatus: "Aprovada",
      executionStatus: undefined,
      currentHash: "antes",
      sourceHash: "antes",
      afterHash: undefined,
    })).toBe("execute");
  });

  it("reconcilia reversão já escrita após interrupção", () => {
    expect(reversalExecutionDisposition({
      reversalStatus: "Revertendo",
      currentHash: "original",
      appliedHash: "corrigido",
      revertedHash: "original",
    })).toBe("reconcile");
  });

  it("bloqueia reversão quando houve alteração posterior", () => {
    expect(reversalExecutionDisposition({
      reversalStatus: "Aprovada",
      currentHash: "alterado",
      appliedHash: "corrigido",
      revertedHash: "original",
    })).toBe("blocked-version");
  });

  it("protege transições da fila de saneamento", () => {
    expect(() => assertTreatmentTransition("open", "claim")).not.toThrow();
    expect(() => assertTreatmentTransition("in_progress", "complete")).not.toThrow();
    expect(() => assertTreatmentTransition("completed", "claim")).toThrow();
    expect(() => assertTreatmentTransition("open", "complete")).toThrow();
  });
});
