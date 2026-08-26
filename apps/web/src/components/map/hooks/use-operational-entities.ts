"use client";

import { useContext } from "react";

import {
  OperationalEntitiesContext,
  type OperationalEntitiesContextValue,
} from "../providers/operational-entities-provider";

export function useOperationalEntities(): OperationalEntitiesContextValue {
  const context = useContext(OperationalEntitiesContext);

  if (!context) {
    throw new Error(
      "useOperationalEntities deve ser utilizado dentro de OperationalEntitiesProvider.",
    );
  }

  return context;
}
