export type OrganizationDirectoryFilter = "all" | "linked" | "unlinked";

export type FilterableOrganization = {
  name: string;
  acronym: string | null;
  organizationType: string | null;
  organizationStatus: string | null;
  explicitLinkCount: number;
};

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("pt-BR");
}

export function filterOrganizationDirectory<T extends FilterableOrganization>(
  organizations: T[],
  query: string,
  filter: OrganizationDirectoryFilter,
): T[] {
  const search = normalized(query);

  return organizations.filter((organization) => {
    const matchesSearch = !search || [
      organization.name,
      organization.acronym || "",
      organization.organizationType || "",
      organization.organizationStatus || "",
    ].some((value) => normalized(value).includes(search));

    if (!matchesSearch) return false;
    if (filter === "linked") return organization.explicitLinkCount > 0;
    if (filter === "unlinked") return organization.explicitLinkCount === 0;
    return true;
  });
}
