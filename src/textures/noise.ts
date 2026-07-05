import { createNoise3D, type NoiseFunction3D } from 'simplex-noise';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

export class FBM {
  private noise3D: NoiseFunction3D;
  readonly rand: () => number;

  constructor(seed: number) {
    this.rand = mulberry32(seed);
    this.noise3D = createNoise3D(this.rand);
  }

  n3(x: number, y: number, z: number): number {
    return this.noise3D(x, y, z);
  }

  /** Fractal brownian motion sampled directly on a 3D direction — seamless on a sphere. */
  fbm3(x: number, y: number, z: number, octaves = 5, lacunarity = 2.0, gain = 0.5): number {
    let amp = 0.5;
    let freq = 1.0;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise3D(x * freq, y * freq, z * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  /** Ridged noise — good for canyons / grooves / storm swirls. */
  ridged3(x: number, y: number, z: number, octaves = 5, lacunarity = 2.0, gain = 0.5): number {
    let amp = 0.5;
    let freq = 1.0;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      const v = 1 - Math.abs(this.noise3D(x * freq, y * freq, z * freq));
      sum += amp * (v * v);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  /** Domain-warped fbm for swirling, organic patterns (clouds, storms). */
  warpedFbm3(x: number, y: number, z: number, warp = 0.6, octaves = 5): number {
    const qx = this.fbm3(x + 5.2, y + 1.3, z + 7.1, 4);
    const qy = this.fbm3(x + 0.7, y + 9.2, z + 2.8, 4);
    const qz = this.fbm3(x + 3.1, y + 4.4, z + 8.6, 4);
    return this.fbm3(x + warp * qx, y + warp * qy, z + warp * qz, octaves);
  }
}
