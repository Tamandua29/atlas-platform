import { describe, expect, it } from "vitest";

import {
  DEFAULT_OPERATIONAL_MAP_URL_STATE,
  buildOperationalMapSearchParams,
  parseOperationalMapUrlState,
} from "@/features/operational-map/operational-map.url-state";

describe("estado seguro do mapa operacional na URL", () => {
  it("usa o estado padrão quando a URL está vazia", () => {
    expect(parseOperationalMapUrlState(new URLSearchParams())).toEqual(
      DEFAULT_OPERATIONAL_MAP_URL_STATE,
    );
  });

  it("preserva apenas filtros, camadas e identificadores opacos", () => {
    const state = {
      ...DEFAULT_OPERATIONAL_MAP_URL_STATE,
      filters: {
        entityType: "person" as const,
        priority: "high" as const,
        status: "Em andamento",
        period: "7d" as const,
      },
      layers: {
        ...DEFAULT_OPERATIONAL_MAP_URL_STATE.layers,
        address: false,
        alert: false,
      },
      heatmapEnabled: true,
      zonesEnabled: true,
      connectionsEnabled: false,
      focusRecordId: "rec_ABC-123",
    };

    const params = buildOperationalMapSearchParams(state);
    expect(parseOperationalMapUrlState(params)).toEqual(state);
    expect(params.toString()).not.toContain("search");
  });

  it("descarta pesquisa e possíveis dados pessoais da URL", () => {
    const params = new URLSearchParams({
      q: "João da Silva",
      search: "69000-000",
      name: "Pessoa Teste",
      location: "Rua sensível",
      focusRecordId: "inválido!",
      status: "<script>",
    });

    const state = parseOperationalMapUrlState(params);
    const safeParams = buildOperationalMapSearchParams(state);

    expect(state.focusRecordId).toBeNull();
    expect(state.filters.status).toBe("all");
    expect([...safeParams.keys()]).toEqual([]);
  });

  it("ignora valores fora das listas permitidas", () => {
    const state = parseOperationalMapUrlState(
      new URLSearchParams(
        "type=secret&priority=critical&period=forever&hidden=person,secret",
      ),
    );

    expect(state.filters.entityType).toBe("all");
    expect(state.filters.priority).toBe("all");
    expect(state.filters.period).toBe("all");
    expect(state.layers.person).toBe(false);
    expect(state.layers.occurrence).toBe(true);
  });
});
