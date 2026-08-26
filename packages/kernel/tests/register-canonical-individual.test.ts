import { describe, expect, it } from "vitest";

import { FixedClock } from "../src/clock/clock";
import { ValidationError } from "../src/errors/application-error";
import type { CanonicalIndividual } from "../src/individuals/canonical-individual";
import type { CanonicalIndividualRepository } from "../src/individuals/canonical-individual-repository";
import { RegisterCanonicalIndividual } from "../src/individuals/register-canonical-individual";

class MemoryRepository implements CanonicalIndividualRepository {
  readonly individuals: CanonicalIndividual[] = [];

  async findBySourceKey(key: string): Promise<CanonicalIndividual | null> {
    return (
      this.individuals.find((individual) =>
        individual.sources.some((source) => source.key === key),
      ) ?? null
    );
  }

  async save(individual: CanonicalIndividual): Promise<void> {
    this.individuals.push(individual);
  }
}

const clock = new FixedClock(new Date("2026-08-06T12:00:00.000Z"));

const input = {
  legalName: " José  Antônio ",
  birthDate: "1985-03-12",
  source: {
    system: "airtable" as const,
    baseId: "app",
    tableId: "tbl",
    recordId: "rec1",
  },
};

describe("RegisterCanonicalIndividual", () => {
  it("deve registrar um indivíduo com rastreabilidade", async () => {
    const repository = new MemoryRepository();

    const result = await new RegisterCanonicalIndividual(
      repository,
      clock,
    ).execute(input);

    expect(result.created).toBe(true);

    expect(result.individual.legalName).toBe("José Antônio");

    expect(result.individual.sources[0]?.recordId).toBe("rec1");

    expect(repository.individuals).toHaveLength(1);
  });

  it("deve ser idempotente para o mesmo registro de origem", async () => {
    const repository = new MemoryRepository();

    const service = new RegisterCanonicalIndividual(repository, clock);

    const first = await service.execute(input);

    const second = await service.execute(input);

    expect(second.created).toBe(false);

    expect(second.individual.id.value).toBe(first.individual.id.value);

    expect(repository.individuals).toHaveLength(1);
  });

  it("deve converter a data sem deslocamento de fuso", async () => {
    const result = await new RegisterCanonicalIndividual(
      new MemoryRepository(),
      clock,
    ).execute(input);

    expect(result.individual.birthDate?.toISOString()).toBe(
      "1985-03-12T00:00:00.000Z",
    );
  });

  it("deve rejeitar data de nascimento inválida", async () => {
    await expect(
      new RegisterCanonicalIndividual(new MemoryRepository(), clock).execute({
        ...input,
        birthDate: "1985-02-31",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
