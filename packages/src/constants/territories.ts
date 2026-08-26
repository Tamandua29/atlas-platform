export type ManausZone =
  "Norte" | "Sul" | "Leste" | "Oeste" | "Centro-Sul" | "Centro-Oeste" | "Rural";

export interface NeighborhoodMapping {
  name: string;
  zone: ManausZone;
  canonicalName: string;
}

export const MANAUS_NEIGHBORHOODS: Record<string, NeighborhoodMapping> = {
  // Correção: Japiim pertence à Zona Sul
  japiim: {
    name: "Japiim",
    zone: "Sul",
    canonicalName: "JAPIIM",
  },
  japiim_1: {
    name: "Japiim I",
    zone: "Sul",
    canonicalName: "JAPIIM",
  },
  japiim_2: {
    name: "Japiim II",
    zone: "Sul",
    canonicalName: "JAPIIM",
  },
};

export function getCanonicalZone(
  neighborhood: string,
): ManausZone | "Não Identificado" {
  const normalized = neighborhood
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return MANAUS_NEIGHBORHOODS[normalized]?.zone ?? "Não Identificado";
}
