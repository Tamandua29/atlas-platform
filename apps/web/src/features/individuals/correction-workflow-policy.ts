export type ExecutionDisposition =
  | "already-completed"
  | "execute"
  | "reconcile"
  | "blocked-state"
  | "blocked-version"
  | "blocked-interrupted";

export function assertDistinctActors(
  actors: Array<{ id: string | null | undefined; label: string }>,
): void {
  const present = actors.filter(
    (actor): actor is { id: string; label: string } =>
      Boolean(actor.id?.trim()),
  );
  const seen = new Map<string, string>();

  for (const actor of present) {
    const id = actor.id.trim();
    const previous = seen.get(id);
    if (previous) {
      throw new Error(
        `Segregação de funções violada: ${actor.label} deve ser diferente de ${previous}.`,
      );
    }
    seen.set(id, actor.label);
  }
}

export function correctionExecutionDisposition(input: {
  proposalStatus: string | undefined;
  executionStatus: string | undefined;
  currentHash: string;
  sourceHash: string | undefined;
  afterHash: string | undefined;
}): ExecutionDisposition {
  if (input.executionStatus === "Aplicada") return "already-completed";

  if (
    input.executionStatus === "Aplicando" ||
    input.executionStatus === "Falhou"
  ) {
    return input.afterHash && input.currentHash === input.afterHash
      ? "reconcile"
      : "blocked-interrupted";
  }

  if (input.proposalStatus !== "Aprovada") return "blocked-state";
  if (!input.sourceHash || input.currentHash !== input.sourceHash) {
    return "blocked-version";
  }
  return "execute";
}

export function reversalExecutionDisposition(input: {
  reversalStatus: string | undefined;
  currentHash: string;
  appliedHash: string | undefined;
  revertedHash: string;
}): ExecutionDisposition {
  if (input.reversalStatus === "Revertida") return "already-completed";

  if (
    input.reversalStatus !== "Aprovada" &&
    input.reversalStatus !== "Revertendo" &&
    input.reversalStatus !== "Falhou"
  )
    return "blocked-state";

  if (
    (input.reversalStatus === "Revertendo" ||
      input.reversalStatus === "Falhou") &&
    input.currentHash === input.revertedHash
  )
    return "reconcile";

  if (!input.appliedHash || input.currentHash !== input.appliedHash) {
    return "blocked-version";
  }
  return "execute";
}

export function assertTreatmentTransition(
  current: "open" | "in_progress" | "completed" | "cancelled",
  action: "claim" | "complete",
): void {
  if (action === "claim" && current !== "open") {
    throw new Error("Somente solicitações abertas podem ser assumidas.");
  }
  if (action === "complete" && current !== "in_progress") {
    throw new Error("Somente solicitações em andamento podem ser concluídas.");
  }
}
