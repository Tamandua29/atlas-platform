import { describe, expect, it } from "vitest";

import { getOperationalEntityProfileHref } from "../src/features/operational-map/operational-entity-profile-link";

describe("operational entity profile link", () => {
  it("routes a person record to the protected individual profile", () => {
    expect(
      getOperationalEntityProfileHref({
        type: "person",
        reference: "recIhy4wID4pXIQGX",
      }),
    ).toBe("/intelligence/individuals/recIhy4wID4pXIQGX");
  });

  it("routes a vehicle record to the protected vehicle profile", () => {
    expect(
      getOperationalEntityProfileHref({
        type: "vehicle",
        reference: "recVehicle1234567",
      }),
    ).toBe("/intelligence/vehicles/recVehicle1234567");
  });

  it.each([
    { type: "occurrence" as const, reference: "recOccurrence1234" },
    { type: "alert" as const, reference: "recAlert123456789" },
    { type: "person" as const, reference: "PER-DEMO-001" },
    { type: "vehicle" as const, reference: "VEI-DEMO-001" },
  ])("does not expose a profile link for $type/$reference", (entity) => {
    expect(getOperationalEntityProfileHref(entity)).toBeNull();
  });
});
