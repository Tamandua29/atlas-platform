import { buildRasterMapTiles } from "@/features/individuals/raster-map-preview";

type RasterMapPreviewProps = {
  latitude: number;
  longitude: number;
  label: string;
};

export function RasterMapPreview({
  latitude,
  longitude,
  label,
}: RasterMapPreviewProps) {
  const tiles = buildRasterMapTiles(latitude, longitude);

  return (
    <div
      role="img"
      aria-label={`Mapa de ${label}`}
      className="relative h-64 w-full overflow-hidden bg-slate-200"
    >
      {tiles.map((tile) => (
        <span
          key={tile.key}
          aria-hidden="true"
          className="absolute h-64 w-64 bg-cover bg-center"
          style={{
            left: tile.left,
            top: tile.top,
            backgroundImage: `url(${JSON.stringify(tile.url)})`,
          }}
        />
      ))}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-cyan-500 shadow-[0_2px_8px_rgba(15,23,42,0.65)]"
      />
      <span className="absolute bottom-0 right-0 bg-white/90 px-2 py-1 text-[10px] text-slate-700">
        © OpenStreetMap contributors
      </span>
    </div>
  );
}
