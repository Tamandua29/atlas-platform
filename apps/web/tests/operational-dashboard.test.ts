import { describe, expect, it } from "vitest";

import { buildOperationalDashboard } from "../src/features/operational-dashboard/operational-dashboard";
import type { OperationalEntity } from "../src/features/operational-map/operational-map.types";

const entity = (overrides: Partial<OperationalEntity>): OperationalEntity => ({
  id: "record-sensitive",
  type: "person",
  title: "Nome protegido",
  description: "Descrição protegida",
  coordinates: [-60, -3],
  createdAt: "2026-08-13T12:00:00.000Z",
  priority: "normal",
  status: "Ativo",
  reference: "referência-protegida",
  locationLabel: "endereço-protegido",
  ...overrides,
});

describe("buildOperationalDashboard", () => {
  it("calcula métricas agregadas e normaliza estados", () => {
    const summary = buildOperationalDashboard([
      entity({ type: "occurrence", priority: "high", status: "Em andamento" }),
      entity({ id: "person-2", relationshipKeys: ["link-1"] }),
      entity({ id: "vehicle-3", type: "vehicle", status: "Concluído" }),
    ]);

    expect(summary.metrics).toEqual({
      totalRecords: 3,
      highPriority: 1,
      activeOccurrences: 1,
      linkedEntities: 1,
      attentionRecords: 1,
      georeferencedRecords: 3,
      geographicCoverage: 100,
      readinessScore: 77,
    });
    expect(summary.byType).toMatchObject({
      occurrence: 1,
      person: 1,
      vehicle: 1,
    });
    expect(summary.byStatus).toEqual({
      active: 2,
      completed: 1,
      attention: 0,
      other: 0,
    });
    expect(summary.byPriority).toEqual({ normal: 2, medium: 0, high: 1 });
    expect(summary.commandInsights).toContain(
      "1 registro exige priorização operacional.",
    );
  });

  it("gera recomendações agregadas sem expor conteúdo sensível", () => {
    const summary = buildOperationalDashboard([
      entity({ coordinates: [Number.NaN, Number.NaN], priority: "high" }),
    ]);

    expect(summary.metrics.geographicCoverage).toBe(0);
    expect(summary.commandInsights.join(" ")).toContain(
      "revisar registros sem coordenadas",
    );
    expect(JSON.stringify(summary.commandInsights)).not.toContain("protegido");
  });

  it("não envia identificadores, textos, localização ou coordenadas na atividade", () => {
    const activity = buildOperationalDashboard([entity({})]).recentActivity[0];

    expect(activity).toEqual({
      type: "person",
      status: "active",
      priority: "normal",
      createdAt: "2026-08-13T12:00:00.000Z",
    });
    expect(JSON.stringify(activity)).not.toContain("protegido");
    expect(JSON.stringify(activity)).not.toContain("-60");
  });
});
