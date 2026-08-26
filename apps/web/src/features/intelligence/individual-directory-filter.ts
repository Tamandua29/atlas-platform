export type JudicialAttention = "active" | "expiring" | "verify" | "none";
export type DirectoryPriority = "high" | "attention" | "normal";
export type DirectoryFilter =
  "all" | "judicial-attention" | "documents-missing" | "complete";

export type FilterableIndividual = {
  legalName: string;
  alias: string | null;
  cpfPresent: boolean;
  identityDocumentPresent: boolean;
  judicialAttention: JudicialAttention;
  operationalPriority: DirectoryPriority;
};

export function classifyDirectoryPriority(
  judicialAttention: JudicialAttention,
): DirectoryPriority {
  if (judicialAttention === "active" || judicialAttention === "expiring")
    return "high";
  if (judicialAttention === "verify") return "attention";
  return "normal";
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("pt-BR");
}

export function filterIndividualDirectory<T extends FilterableIndividual>(
  individuals: T[],
  query: string,
  filter: DirectoryFilter,
): T[] {
  const search = normalized(query);

  return individuals.filter((individual) => {
    const matchesSearch =
      !search ||
      [individual.legalName, individual.alias || ""].some((value) =>
        normalized(value).includes(search),
      );
    if (!matchesSearch) return false;

    if (filter === "judicial-attention")
      return individual.operationalPriority !== "normal";
    if (filter === "documents-missing") {
      return !individual.cpfPresent || !individual.identityDocumentPresent;
    }
    if (filter === "complete") {
      return individual.cpfPresent && individual.identityDocumentPresent;
    }
    return true;
  });
}
