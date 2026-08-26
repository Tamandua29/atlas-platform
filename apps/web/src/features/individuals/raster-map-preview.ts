const TILE_SIZE = 256;

export type RasterMapTile = {
  key: string;
  url: string;
  left: string;
  top: string;
};

export function buildRasterMapTiles(
  latitude: number,
  longitude: number,
  zoom = 15,
): RasterMapTile[] {
  const scale = 2 ** zoom;
  const normalizedLongitude = ((longitude + 180) / 360) * scale;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const normalizedLatitude =
    ((1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2) * scale;
  const centerX = Math.floor(normalizedLongitude);
  const centerY = Math.floor(normalizedLatitude);
  const offsetX = (normalizedLongitude - centerX) * TILE_SIZE;
  const offsetY = (normalizedLatitude - centerY) * TILE_SIZE;
  const tiles: RasterMapTile[] = [];

  for (let row = -1; row <= 1; row += 1) {
    for (let column = -2; column <= 2; column += 1) {
      const tileX = (centerX + column + scale) % scale;
      const tileY = Math.min(scale - 1, Math.max(0, centerY + row));

      tiles.push({
        key: `${zoom}/${tileX}/${tileY}`,
        url: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
        left: `calc(50% + ${column * TILE_SIZE - offsetX}px)`,
        top: `calc(50% + ${row * TILE_SIZE - offsetY}px)`,
      });
    }
  }

  return tiles;
}
