import { describe, expect, it } from "vitest";

import {
  filterVehicleDirectory,
  maskVehiclePlate,
} from "../src/features/intelligence/vehicle-directory-policy";

describe("vehicle directory policy", () => {
  it("mascara a placa antes de expor o valor", () => {
    expect(maskVehiclePlate("ABC1D23")).toBe("ABC•••3");
    expect(maskVehiclePlate(undefined)).toBe("Placa não informada");
  });

  it("filtra apenas pelos atributos seguros", () => {
    const vehicles = [
      {
        maskedPlate: "ABC•••3",
        brand: "Toyota",
        model: "Corolla",
        color: "Prata",
        status: "Ativo",
      },
      {
        maskedPlate: "XYZ•••9",
        brand: "Honda",
        model: "Civic",
        color: "Preto",
        status: "Apreendido",
      },
    ];

    expect(filterVehicleDirectory(vehicles, "civic")).toEqual([vehicles[1]]);
    expect(filterVehicleDirectory(vehicles, "xyz9")).toEqual([vehicles[1]]);
  });
});
