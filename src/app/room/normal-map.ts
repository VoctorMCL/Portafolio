/**
 * Sobel de luminancia a normal map, puro (sin DOM): se puede ejecutar en un
 * worker. Entrada: píxeles RGBA; salida: píxeles RGBA normalizados.
 */
export function heightToNormalPixels(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  strength = 2,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(w * h * 4);

  const lum = (x: number, y: number): number => {
    const xx = (x + w) % w;
    const yy = (y + h) % h;
    const i = (yy * w + xx) * 4;
    return (src[i] * 299 + src[i + 1] * 587 + src[i + 2] * 114) / 255000;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (lum(x + 1, y) - lum(x - 1, y)) * strength;
      const dy = (lum(x, y + 1) - lum(x, y - 1)) * strength;
      let nx = -dx;
      let ny = dy;
      let nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      nz *= inv;
      const i = (y * w + x) * 4;
      out[i] = (nx * 0.5 + 0.5) * 255;
      out[i + 1] = (ny * 0.5 + 0.5) * 255;
      out[i + 2] = (nz * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}
