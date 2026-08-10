"use client";

import dynamic from "next/dynamic";

export const OperationalMap = dynamic(
  () => import("./operational-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] w-full items-center justify-center bg-[#020617] text-sm text-slate-400">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
          Sincronizando mapa operacional...
        </div>
      </div>
    ),
  }
);