export type GeographicCoordinates = {
  latitude: number;
  longitude: number;
};

type GeographicBounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

const MANAUS_NEIGHBORHOOD_BOUNDS: Readonly<Record<string, GeographicBounds>> = {
  // Limite conservador. Substituir pelo polígono oficial quando
  // a camada geográfica institucional estiver disponível.
  japiim: {
    minLatitude: -3.17,
    maxLatitude: -3.08,
    minLongitude: -60.04,
    maxLongitude: -59.93,
  },
};

export function normalizeGeographicName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isCoordinateConsistentWithNeighborhood({
  neighborhood,
  latitude,
  longitude,
}: GeographicCoordinates & {
  neighborhood: unknown;
}): boolean {
  const normalizedNeighborhood = normalizeGeographicName(neighborhood);

  const bounds = MANAUS_NEIGHBORHOOD_BOUNDS[normalizedNeighborhood];

  // Não inferimos limites inexistentes. A ausência de uma regra
  // específica não é tratada como inconsistência geográfica.
  if (!bounds) {
    return true;
  }

  return (
    latitude >= bounds.minLatitude &&
    latitude <= bounds.maxLatitude &&
    longitude >= bounds.minLongitude &&
    longitude <= bounds.maxLongitude
  );
}
