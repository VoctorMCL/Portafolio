export type DeviceTier = 'low' | 'mid' | 'high';

export interface TierInfo {
  tier: DeviceTier;
  startLevel: number;
  ceiling: number;
}

/**
 * Estima la capacidad del dispositivo a partir de las APIs públicas del
 * navegador (nunca de "pedir más memoria": la web solo puede detectar y
 * adaptarse). Niveles de calidad: 0 = extremo ... 4 = completo.
 */
export function detectDeviceTier(coarsePointer: boolean): TierInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8;
  const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 8;

  let tier: DeviceTier = 'high';
  if (memory <= 2 || cores <= 2) {
    tier = 'low';
  } else if (memory <= 4 || cores <= 4) {
    tier = 'mid';
  }

  const startLevel = tier === 'low' ? 2 : tier === 'mid' ? 3 : 4;
  const ceiling = tier === 'low' ? 3 : 4;
  return {
    tier,
    startLevel: coarsePointer ? Math.min(startLevel, 3) : startLevel,
    ceiling,
  };
}
