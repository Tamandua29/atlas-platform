import type { CanonicalIndividual } from "./canonical-individual";

export interface CanonicalIndividualRepository {
  findBySourceKey(
    sourceKey: string,
  ): Promise<CanonicalIndividual | null>;

  save(
    individual: CanonicalIndividual,
  ): Promise<void>;
}
