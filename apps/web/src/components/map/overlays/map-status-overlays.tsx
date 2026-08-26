type MapStatus = "loading" | "ready" | "error";

type MapStatusOverlaysProps = {
  status: MapStatus;
  errorMessage: string;
  hasSelectedEntity: boolean;
  isEmpty: boolean;
  onReload: () => void | Promise<void>;
};

export function MapStatusOverlays({
  status,
  errorMessage,
  hasSelectedEntity,
  isEmpty,
  onReload,
}: MapStatusOverlaysProps) {
  return (
    <>
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

            <p className="mt-3 text-sm text-slate-300">
              Sincronizando mapa operacional...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Carregando dados do SIO
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-6">
          <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-xl text-red-300">
              !
            </div>

            <p className="mt-4 font-semibold text-red-300">
              Não foi possível carregar os dados operacionais
            </p>

            <p className="mt-2 break-words text-sm leading-6 text-slate-300">
              {errorMessage}
            </p>

            <button
              type="button"
              className="mt-5 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => {
                void onReload();
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {status === "ready" && isEmpty && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-2xl border border-slate-700 bg-slate-950/90 p-6 text-center shadow-2xl backdrop-blur">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-lg text-cyan-300">
              0
            </div>

            <p className="mt-4 font-semibold text-white">
              Nenhum registro georreferenciado
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              O SIO não retornou registros com latitude e longitude válidas para
              exibição no mapa.
            </p>
          </div>
        </div>
      )}

      {status === "ready" && !isEmpty && !hasSelectedEntity && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-lg border border-slate-700 bg-slate-950/85 px-3 py-2 text-xs text-slate-300 shadow-lg backdrop-blur">
          Clique em um marcador para consultar os detalhes
        </div>
      )}
    </>
  );
}
