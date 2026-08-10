export type EntityType = "occurrence" | "person" | "vehicle" | "alert";

export interface OperationalEntity {
  id: string;
  type: EntityType;
  title: string;
  description: string;
  address: string;
  neighborhood: string;
  zone: string;
  coordinates: [number, number]; // [longitude, latitude]
  updatedAt: string;
}