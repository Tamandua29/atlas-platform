export type FilterableVehicle = {
  maskedPlate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  status: string | null;
};

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toLocaleUpperCase("pt-BR");
}

export function maskVehiclePlate(value: unknown): string {
  const plate = typeof value === "string" ? normalized(value) : "";
  if (!plate) return "Placa não informada";
  if (plate.length <= 3) return "•".repeat(plate.length);
  return `${plate.slice(0, 3)}${"•".repeat(Math.max(1, plate.length - 4))}${plate.slice(-1)}`;
}

export function filterVehicleDirectory<T extends FilterableVehicle>(
  vehicles: T[],
  query: string,
): T[] {
  const search = normalized(query);
  if (!search) return vehicles;

  return vehicles.filter((vehicle) =>
    [
      vehicle.maskedPlate,
      vehicle.brand || "",
      vehicle.model || "",
      vehicle.color || "",
      vehicle.status || "",
    ].some((value) => normalized(value).includes(search)),
  );
}
