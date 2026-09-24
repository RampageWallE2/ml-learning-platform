export const MOBILE_WORLD_ZOOM = 0.65;

/** Convierte coordenadas de pantalla para objetos con scrollFactor(0). */
export function screenToFixedCameraPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  zoom: number,
): { x: number; y: number } {
  const centerX = width / 2;
  const centerY = height / 2;

  return {
    x: centerX + (x - centerX) / zoom,
    y: centerY + (y - centerY) / zoom,
  };
}
