import type { IndividualDirectoryEntry } from "./individual-directory";
import type { OperationalWarrant } from "./individual-warrants";
import type { OrganizationDirectoryEntry } from "./organization-directory";
import type { VehicleDirectoryEntry } from "./vehicle-directory";
import { classifyWarrantAttention } from "./warrant-monitoring";

export type IntelligenceOverview = {
  totals: {
    individuals: number;
    organizations: number;
    vehicles: number;
    warrants: number;
    all: number;
  };
  identityCoverage: {
    complete: number;
    incomplete: number;
    percentage: number;
  };
  organizationLinks: {
    organizationsWithLinks: number;
    explicitLinks: number;
    linkedIndividuals: number;
  };
  warrantAttention: {
    active: number;
    expiring: number;
    expired: number;
    closed: number;
    unknown: number;
    requiringAttention: number;
  };
  vehicleStatus: { informed: number; notInformed: number };
  generatedAt: string;
};

type OverviewInput = {
  individuals: IndividualDirectoryEntry[];
  organizations: OrganizationDirectoryEntry[];
  vehicles: VehicleDirectoryEntry[];
  warrants: OperationalWarrant[];
};

export function buildIntelligenceOverview(
  input: OverviewInput,
  now = new Date(),
): IntelligenceOverview {
  const completeIdentities = input.individuals.filter(
    (individual) => individual.cpfPresent && individual.identityDocumentPresent,
  ).length;
  const warrantAttention = {
    active: 0,
    expiring: 0,
    expired: 0,
    closed: 0,
    unknown: 0,
  };

  for (const warrant of input.warrants) {
    warrantAttention[
      classifyWarrantAttention(warrant.status, warrant.expiresAt, now)
    ] += 1;
  }

  const totals = {
    individuals: input.individuals.length,
    organizations: input.organizations.length,
    vehicles: input.vehicles.length,
    warrants: input.warrants.length,
    all:
      input.individuals.length +
      input.organizations.length +
      input.vehicles.length +
      input.warrants.length,
  };

  return {
    totals,
    identityCoverage: {
      complete: completeIdentities,
      incomplete: totals.individuals - completeIdentities,
      percentage:
        totals.individuals === 0
          ? 0
          : Math.round((completeIdentities / totals.individuals) * 1000) / 10,
    },
    organizationLinks: {
      organizationsWithLinks: input.organizations.filter(
        (organization) =>
          organization.explicitLinkCount > 0 ||
          organization.linkedIndividualCount > 0,
      ).length,
      explicitLinks: input.organizations.reduce(
        (total, organization) => total + organization.explicitLinkCount,
        0,
      ),
      linkedIndividuals: input.organizations.reduce(
        (total, organization) => total + organization.linkedIndividualCount,
        0,
      ),
    },
    warrantAttention: {
      ...warrantAttention,
      requiringAttention:
        warrantAttention.active +
        warrantAttention.expiring +
        warrantAttention.expired,
    },
    vehicleStatus: {
      informed: input.vehicles.filter((vehicle) =>
        Boolean(vehicle.status?.trim()),
      ).length,
      notInformed: input.vehicles.filter((vehicle) => !vehicle.status?.trim())
        .length,
    },
    generatedAt: now.toISOString(),
  };
}
