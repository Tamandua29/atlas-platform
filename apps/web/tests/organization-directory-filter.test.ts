import { describe, expect, it } from "vitest";

import {
  filterOrganizationDirectory,
  type FilterableOrganization,
} from "@/features/intelligence/organization-directory-filter";

const organizations: FilterableOrganization[] = [
  {
    name: "Organização Águia",
    acronym: "OA",
    organizationType: "Associação",
    organizationStatus: "Ativa",
    explicitLinkCount: 2,
  },
  {
    name: "Grupo Horizonte",
    acronym: null,
    organizationType: null,
    organizationStatus: null,
    explicitLinkCount: 0,
  },
];

describe("filtros do diretório de organizações", () => {
  it("busca nome e sigla sem depender de acentuação", () => {
    expect(filterOrganizationDirectory(organizations, "aguia", "all")).toEqual([
      organizations[0],
    ]);
    expect(filterOrganizationDirectory(organizations, "oa", "all")).toEqual([
      organizations[0],
    ]);
  });

  it("separa organizações com vínculos explicitamente registrados", () => {
    expect(filterOrganizationDirectory(organizations, "", "linked")).toEqual([
      organizations[0],
    ]);
    expect(filterOrganizationDirectory(organizations, "", "unlinked")).toEqual([
      organizations[1],
    ]);
  });
});
