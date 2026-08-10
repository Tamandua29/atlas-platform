export type OperationalEntityType =
  | "occurrence"
  | "person"
  | "vehicle"
  | "alert";

export type OperationalPriority = "normal" | "medium" | "high";

export type OperationalCoordinates = [
  longitude: number,
  latitude: number,
];

export type OperationalEntity = {
  id: string;
  type: OperationalEntityType;
  title: string;
  description: string;
  coordinates: OperationalCoordinates;
  createdAt: string;
  priority?: OperationalPriority;
  status: string;
  reference: string;
  locationLabel: string;
};

export type OperationalLayerVisibility = Record<
  OperationalEntityType,
  boolean
>;

export type OperationalEntityConfiguration = {
  label: string;
  singularLabel: string;
  color: string;
};

export type OperationalPriorityConfiguration = {
  label: string;
  color: string;
  backgroundColor: string;
};

export type OperationalZoneType =
  | "responsibility-area"
  | "patrol-sector"
  | "sensitive-area"
  | "monitoring-area";

export type OperationalZoneStatus =
  | "active"
  | "attention"
  | "inactive";

export type OperationalZone = {
  id: string;
  name: string;
  description: string;
  type: OperationalZoneType;
  status: OperationalZoneStatus;
  priority: OperationalPriority;
  reference: string;
  responsibleUnit: string;
  coordinates: OperationalCoordinates[][];
  createdAt: string;
  updatedAt: string;
};

export type OperationalZoneConfiguration = {
  label: string;
  color: string;
  fillOpacity: number;
};