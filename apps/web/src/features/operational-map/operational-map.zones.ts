import type {
  OperationalZone,
  OperationalZoneConfiguration,
  OperationalZoneType,
} from "./operational-map.types";

export const OPERATIONAL_ZONE_CONFIG: Record<
  OperationalZoneType,
  OperationalZoneConfiguration
> = {
  "responsibility-area": {
    label: "Área de responsabilidade",
    color: "#22d3ee",
    fillOpacity: 0.18,
  },

  "patrol-sector": {
    label: "Setor de patrulhamento",
    color: "#a78bfa",
    fillOpacity: 0.2,
  },

  "sensitive-area": {
    label: "Área sensível",
    color: "#f97316",
    fillOpacity: 0.22,
  },

  "monitoring-area": {
    label: "Área de monitoramento",
    color: "#ef4444",
    fillOpacity: 0.18,
  },
};

/*
 * Polígonos exclusivamente demonstrativos.
 * Não correspondem a limites institucionais ou áreas criminais reais.
 */
export const DEMO_OPERATIONAL_ZONES: OperationalZone[] = [
  {
    id: "zone-demo-001",
    name: "Área operacional demonstrativa",
    description:
      "Polígono sintético criado para validar a visualização de áreas no mapa.",
    type: "responsibility-area",
    status: "active",
    priority: "normal",
    reference: "ZON-DEMO-001",
    responsibleUnit: "Unidade demonstrativa",
    coordinates: [
      [
        [-60.0605, -3.083],
        [-60.022, -3.075],
        [-60.0005, -3.102],
        [-60.017, -3.129],
        [-60.055, -3.118],
        [-60.0605, -3.083],
      ],
    ],
    createdAt: "2026-08-03T08:00:00-04:00",
    updatedAt: "2026-08-03T08:00:00-04:00",
  },

  {
    id: "zone-demo-002",
    name: "Setor de patrulhamento demonstrativo",
    description:
      "Setor fictício utilizado para validar sobreposição, seleção e filtros.",
    type: "patrol-sector",
    status: "active",
    priority: "medium",
    reference: "ZON-DEMO-002",
    responsibleUnit: "Equipe demonstrativa Alfa",
    coordinates: [
      [
        [-60.015, -3.107],
        [-59.9805, -3.101],
        [-59.9705, -3.132],
        [-60.0005, -3.147],
        [-60.021, -3.127],
        [-60.015, -3.107],
      ],
    ],
    createdAt: "2026-08-03T08:10:00-04:00",
    updatedAt: "2026-08-03T08:10:00-04:00",
  },

  {
    id: "zone-demo-003",
    name: "Área sensível demonstrativa",
    description:
      "Área fictícia de atenção operacional utilizada somente para testes.",
    type: "sensitive-area",
    status: "attention",
    priority: "high",
    reference: "ZON-DEMO-003",
    responsibleUnit: "Centro de comando demonstrativo",
    coordinates: [
      [
        [-59.996, -3.073],
        [-59.966, -3.073],
        [-59.958, -3.095],
        [-59.981, -3.109],
        [-60.004, -3.095],
        [-59.996, -3.073],
      ],
    ],
    createdAt: "2026-08-03T08:20:00-04:00",
    updatedAt: "2026-08-03T08:20:00-04:00",
  },
];