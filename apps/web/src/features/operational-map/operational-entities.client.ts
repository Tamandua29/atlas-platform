import type { OperationalEntity } from "./operational-map.types";

type OperationalEntitiesApiSuccessResponse = {
  success: true;
  count: number;
  entities: OperationalEntity[];
  generatedAt: string;
};

type OperationalEntitiesApiErrorResponse = {
  success: false;
  count: number;
  entities: [];
  message: string;
};

type OperationalEntitiesApiResponse =
  OperationalEntitiesApiSuccessResponse | OperationalEntitiesApiErrorResponse;

export type OperationalEntitiesResult = {
  entities: OperationalEntity[];
  count: number;
  generatedAt: string;
};

export class OperationalEntitiesRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = "OperationalEntitiesRequestError";
    this.status = status;
  }
}

export async function fetchOperationalEntities(
  signal?: AbortSignal,
): Promise<OperationalEntitiesResult> {
  const response = await fetch("/api/operational-entities", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  let body: OperationalEntitiesApiResponse;

  try {
    body = (await response.json()) as OperationalEntitiesApiResponse;
  } catch {
    throw new OperationalEntitiesRequestError(
      "A API retornou uma resposta inválida.",
      response.status,
    );
  }

  if (!response.ok || !body.success) {
    const message = !body.success
      ? body.message
      : "Não foi possível carregar os dados operacionais.";

    throw new OperationalEntitiesRequestError(message, response.status);
  }

  return {
    entities: body.entities,
    count: body.count,
    generatedAt: body.generatedAt,
  };
}
