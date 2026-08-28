import type { AtlasRole } from "./atlas-session";

export type AtlasCapability =
  "consult" | "propose" | "decide" | "execute" | "transition" | "reconcile";

const CAPABILITY_ROLES: Record<AtlasCapability, readonly AtlasRole[]> = {
  consult: ["reviewer", "auditor"],
  propose: ["reviewer"],
  decide: ["reviewer"],
  execute: ["reviewer"],
  transition: ["reviewer"],
  reconcile: ["auditor"],
};

export function rolesForAtlasCapability(
  capability: AtlasCapability,
): AtlasRole[] {
  return [...CAPABILITY_ROLES[capability]];
}

export function roleHasAtlasCapability(
  role: AtlasRole,
  capability: AtlasCapability,
): boolean {
  return (
    role === "administrator" || CAPABILITY_ROLES[capability].includes(role)
  );
}
