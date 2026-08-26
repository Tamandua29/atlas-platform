export type UnifiedSearchCategory =
  "all" | "individual" | "organization" | "vehicle" | "warrant";

export type UnifiedSearchResult = {
  id: string;
  category: Exclude<UnifiedSearchCategory, "all">;
  title: string;
  subtitle: string | null;
  href: string;
  badges: string[];
};

export type UnifiedSearchSources = {
  individuals: Array<{
    recordId: string;
    legalName: string;
    alias: string | null;
  }>;
  organizations: Array<{
    recordId: string;
    name: string;
    acronym: string | null;
    organizationType: string | null;
    organizationStatus: string | null;
  }>;
  vehicles: Array<{
    recordId: string;
    maskedPlate: string;
    brand: string | null;
    model: string | null;
    color: string | null;
    status: string | null;
  }>;
  warrants: Array<{
    recordId: string;
    maskedWarrantNumber: string;
    maskedCaseNumber: string;
    issuingAuthority: string | null;
    court: string | null;
    type: string | null;
    status: string | null;
  }>;
};

const categories = new Set<UnifiedSearchCategory>([
  "all",
  "individual",
  "organization",
  "vehicle",
  "warrant",
]);

export function normalizeUnifiedSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function validateUnifiedSearchQuery(
  value: string,
): { valid: true; query: string } | { valid: false; message: string } {
  const query = value.trim().slice(0, 80);
  if (query.length < 2)
    return { valid: false, message: "Informe pelo menos 2 caracteres." };
  return { valid: true, query };
}

export function isUnifiedSearchCategory(
  value: string,
): value is UnifiedSearchCategory {
  return categories.has(value as UnifiedSearchCategory);
}

function matches(
  query: string,
  values: Array<string | null | undefined>,
): boolean {
  return values.some(
    (value) => value && normalizeUnifiedSearchText(value).includes(query),
  );
}

function compact(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}

export function searchUnifiedIntelligence(
  sources: UnifiedSearchSources,
  rawQuery: string,
  category: UnifiedSearchCategory = "all",
  limit = 40,
): UnifiedSearchResult[] {
  const validation = validateUnifiedSearchQuery(rawQuery);
  if (!validation.valid) return [];
  const query = normalizeUnifiedSearchText(validation.query);
  const results: UnifiedSearchResult[] = [];

  if (category === "all" || category === "individual") {
    for (const item of sources.individuals)
      if (matches(query, [item.legalName, item.alias]))
        results.push({
          id: item.recordId,
          category: "individual",
          title: item.legalName,
          subtitle: item.alias,
          href: `/intelligence/individuals/${item.recordId}`,
          badges: item.alias ? ["Vulgo informado"] : [],
        });
  }
  if (category === "all" || category === "organization") {
    for (const item of sources.organizations)
      if (matches(query, [item.name, item.acronym, item.organizationType]))
        results.push({
          id: item.recordId,
          category: "organization",
          title: item.name,
          subtitle: item.acronym,
          href: `/intelligence/organizations/${item.recordId}`,
          badges: compact([item.organizationType, item.organizationStatus]),
        });
  }
  if (category === "all" || category === "vehicle") {
    for (const item of sources.vehicles)
      if (
        matches(query, [
          item.maskedPlate,
          item.brand,
          item.model,
          item.color,
          item.status,
        ])
      )
        results.push({
          id: item.recordId,
          category: "vehicle",
          title:
            compact([item.brand, item.model]).join(" ") || "Veículo protegido",
          subtitle: item.maskedPlate,
          href: `/intelligence/vehicles/${item.recordId}`,
          badges: compact([item.color, item.status]),
        });
  }
  if (category === "all" || category === "warrant") {
    for (const item of sources.warrants)
      if (
        matches(query, [
          item.maskedWarrantNumber,
          item.maskedCaseNumber,
          item.issuingAuthority,
          item.court,
          item.type,
          item.status,
        ])
      )
        results.push({
          id: item.recordId,
          category: "warrant",
          title: item.type || "Mandado protegido",
          subtitle: item.maskedWarrantNumber,
          href: `/intelligence/warrants/${item.recordId}`,
          badges: compact([item.status, item.issuingAuthority]),
        });
  }

  return results
    .sort((left, right) => left.title.localeCompare(right.title, "pt-BR"))
    .slice(0, Math.min(Math.max(limit, 1), 100));
}
