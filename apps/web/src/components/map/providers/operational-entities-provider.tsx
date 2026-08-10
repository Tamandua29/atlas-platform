"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  fetchOperationalEntities,
  type OperationalEntitiesResult,
} from "@/features/operational-map/operational-entities.client";

import type { OperationalEntity } from "@/features/operational-map/operational-map.types";

export type OperationalEntitiesStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

export type OperationalEntitiesContextValue = {
  entities: OperationalEntity[];
  status: OperationalEntitiesStatus;
  errorMessage: string;
  generatedAt: string | null;
  isLoading: boolean;
  isEmpty: boolean;
  reload: () => Promise<void>;
};

export const OperationalEntitiesContext =
  createContext<OperationalEntitiesContextValue | null>(
    null,
  );

type OperationalEntitiesProviderProps = {
  children: ReactNode;
};

type OperationalEntitiesState = {
  entities: OperationalEntity[];
  status: OperationalEntitiesStatus;
  errorMessage: string;
  generatedAt: string | null;
};

const INITIAL_STATE: OperationalEntitiesState = {
  entities: [],
  status: "idle",
  errorMessage: "",
  generatedAt: null,
};

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erro desconhecido ao carregar os dados operacionais.";
}

function isAbortError(
  error: unknown,
): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

export function OperationalEntitiesProvider({
  children,
}: OperationalEntitiesProviderProps) {
  const [state, setState] =
    useState<OperationalEntitiesState>(
      INITIAL_STATE,
    );

  const applySuccessfulResult =
    useCallback(
      (
        result: OperationalEntitiesResult,
      ) => {
        setState({
          entities: result.entities,
          status: "success",
          errorMessage: "",
          generatedAt:
            result.generatedAt,
        });
      },
      [],
    );

  const applyError = useCallback(
    (error: unknown) => {
      console.error(
        "Falha ao carregar entidades operacionais:",
        error,
      );

      setState({
        entities: [],
        status: "error",
        errorMessage:
          getErrorMessage(error),
        generatedAt: null,
      });
    },
    [],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    fetchOperationalEntities(
      controller.signal,
    )
      .then((result) => {
        if (
          controller.signal.aborted
        ) {
          return;
        }

        applySuccessfulResult(
          result,
        );
      })
      .catch((error: unknown) => {
        if (
          controller.signal.aborted ||
          isAbortError(error)
        ) {
          return;
        }

        applyError(error);
      });

    return () => {
      controller.abort();
    };
  }, [
    applyError,
    applySuccessfulResult,
  ]);

  const reload =
    useCallback(async () => {
      setState((current) => ({
        ...current,
        status: "loading",
        errorMessage: "",
      }));

      try {
        const result =
          await fetchOperationalEntities();

        applySuccessfulResult(
          result,
        );
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        applyError(error);
      }
    }, [
      applyError,
      applySuccessfulResult,
    ]);

  const contextValue =
    useMemo<OperationalEntitiesContextValue>(
      () => ({
        entities: state.entities,
        status: state.status,
        errorMessage:
          state.errorMessage,
        generatedAt:
          state.generatedAt,

        isLoading:
          state.status === "idle" ||
          state.status === "loading",

        isEmpty:
          state.status === "success" &&
          state.entities.length === 0,

        reload,
      }),
      [
        reload,
        state.entities,
        state.errorMessage,
        state.generatedAt,
        state.status,
      ],
    );

  return (
    <OperationalEntitiesContext.Provider
      value={contextValue}
    >
      {children}
    </OperationalEntitiesContext.Provider>
  );
}