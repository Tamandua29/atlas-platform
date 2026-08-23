import type {
  OperationalEntity,
  OperationalEntityType,
  OperationalPriority,
} from "@/features/operational-map/operational-map.types";

export type OperationalDashboardStatus =
  "active" | "completed" | "attention" | "other";

export type OperationalDashboardActivity = {
  type: OperationalEntityType;
  status: OperationalDashboardStatus;
  priority: OperationalPriority;
  createdAt: string;
};

export type OperationalDashboardSummary = {
  metrics: {
    totalRecords: number;
    highPriority: number;
    activeOccurrences: number;
    linkedEntities: number;
    attentionRecords: number;
    georeferencedRecords: number;
    geographicCoverage: number;
    readinessScore: number;
  };
  byType: Record<OperationalEntityType, number>;
  byStatus: Record<OperationalDashboardStatus, number>;
  byPriority: Record<OperationalPriority, number>;
  commandInsights: string[];
  recentActivity: OperationalDashboardActivity[];
};

const entityTypes: OperationalEntityType[] = [
  "occurrence",
  "person",
  "vehicle",
  "address",
  "organization",
  "point-of-sale",
  "alert",
];

function normalizeStatus(status: string): OperationalDashboardStatus {
  const normalized = status.trim().toLocaleLowerCase("pt-BR");

  if (/conclu|finaliz|encerr|resolvid|cumprid/.test(normalized)) {
    return "completed";
  }
  if (/alert|aten|cr[ií]tic|urgente|pendente/.test(normalized)) {
    return "attention";
  }
  if (/ativ|abert|andamento|monitor|vigente/.test(normalized)) {
    return "active";
  }
  return "other";
}

export function buildOperationalDashboard(
  entities: OperationalEntity[],
): OperationalDashboardSummary {
  const byType = Object.fromEntries(
    entityTypes.map((type) => [type, 0]),
  ) as Record<OperationalEntityType, number>;
  const byStatus: Record<OperationalDashboardStatus, number> = {
    active: 0,
    completed: 0,
    attention: 0,
    other: 0,
  };
  const byPriority: Record<OperationalPriority, number> = {
    normal: 0,
    medium: 0,
    high: 0,
  };

  for (const entity of entities) {
    byType[entity.type] += 1;
    byStatus[normalizeStatus(entity.status)] += 1;
    byPriority[entity.priority ?? "normal"] += 1;
  }

  const linkedEntities = entities.filter(
    (entity) => (entity.relationshipKeys?.length ?? 0) > 0,
  ).length;
  const attentionRecords = entities.filter(
    (entity) =>
      entity.priority === "high" ||
      normalizeStatus(entity.status) === "attention",
  ).length;
  const georeferencedRecords = entities.filter(
    (entity) =>
      Number.isFinite(entity.coordinates[0]) &&
      Number.isFinite(entity.coordinates[1]),
  ).length;
  const geographicCoverage = entities.length
    ? Math.round((georeferencedRecords / entities.length) * 100)
    : 0;
  const relationshipCoverage = entities.length
    ? Math.round((linkedEntities / entities.length) * 100)
    : 0;
  const readinessScore = entities.length
    ? Math.round(geographicCoverage * 0.65 + relationshipCoverage * 0.35)
    : 0;

  const commandInsights: string[] = [];
  if (attentionRecords > 0) {
    commandInsights.push(
      `${attentionRecords} registro${attentionRecords === 1 ? "" : "s"} exige${attentionRecords === 1 ? "" : "m"} priorização operacional.`,
    );
  }
  if (geographicCoverage < 90) {
    commandInsights.push(
      `Cobertura geográfica em ${geographicCoverage}%; revisar registros sem coordenadas válidas.`,
    );
  }
  if (relationshipCoverage < 50 && entities.length > 0) {
    commandInsights.push(
      `Somente ${relationshipCoverage}% dos registros possuem vínculos explícitos; ampliar a correlação de entidades.`,
    );
  }
  if (commandInsights.length === 0) {
    commandInsights.push(
      "Base operacional dentro dos parâmetros atuais de prontidão.",
    );
  }

  const recentActivity = [...entities]
    .filter((entity) => !Number.isNaN(Date.parse(entity.createdAt)))
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )
    .slice(0, 5)
    .map((entity) => ({
      type: entity.type,
      status: normalizeStatus(entity.status),
      priority: entity.priority ?? "normal",
      createdAt: entity.createdAt,
    }));

  return {
    metrics: {
      totalRecords: entities.length,
      highPriority: entities.filter((entity) => entity.priority === "high")
        .length,
      activeOccurrences: entities.filter(
        (entity) =>
          entity.type === "occurrence" &&
          normalizeStatus(entity.status) !== "completed",
      ).length,
      linkedEntities,
      attentionRecords,
      georeferencedRecords,
      geographicCoverage,
      readinessScore,
    },
    byType,
    byStatus,
    byPriority,
    commandInsights,
    recentActivity,
  };
}
