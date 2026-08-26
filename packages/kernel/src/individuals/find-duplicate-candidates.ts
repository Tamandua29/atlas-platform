import type { CanonicalIndividual } from "./canonical-individual";

export type DuplicateCandidate = {
  readonly strategy: "cpf" | "biographic";
  readonly confidence: "high" | "medium";
  readonly status: "pending-human-review";
  readonly individualIds: readonly string[];
  readonly sourceKeys: readonly string[];
  readonly reason: string;
};

export function findDuplicateCandidates(
  individuals: readonly CanonicalIndividual[],
): DuplicateCandidate[] {
  const groups = new Map<string, CanonicalIndividual[]>();

  for (const individual of individuals) {
    if (!individual.matchKey) {
      continue;
    }

    const group = groups.get(individual.matchKey.value) ?? [];

    group.push(individual);

    groups.set(individual.matchKey.value, group);
  }

  const candidates: DuplicateCandidate[] = [];

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }

    const strategy = group[0]?.matchKey?.strategy;

    if (!strategy) {
      continue;
    }

    candidates.push({
      strategy,
      confidence: strategy === "cpf" ? "high" : "medium",
      status: "pending-human-review",
      individualIds: group.map((individual) => individual.id.value),
      sourceKeys: group.flatMap((individual) =>
        individual.sources.map((source) => source.key),
      ),
      reason:
        strategy === "cpf"
          ? "Mesmo CPF estruturalmente válido."
          : "Mesmo nome normalizado, data de nascimento e filiação materna.",
    });
  }

  return candidates;
}
