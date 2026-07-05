import * as THREE from 'three';

export interface CanvasCtx {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

export function makeCanvas(w: number, h: number): CanvasCtx {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
  return { canvas, ctx, w, h };
}

/** Equirectangular (u,v) in [0,1] -> unit direction vector on sphere. Seamless at u=0/1. */
export function dirFromUV(u: number, v: number, out: [number, number, number] = [0, 0, 0]) {
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI;
  const sinPhi = Math.sin(phi);
  out[0] = sinPhi * Math.cos(theta);
  out[1] = Math.cos(phi);
  out[2] = sinPhi * Math.sin(theta);
  return out;
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Builds a tangent-space normal map from a heightfield sampled on the sphere (wraps in U,
 * clamps in V) so lighting reveals craters/terrain relief without needing real geometry detail.
 */
export function heightsToNormalMap(heights: Float32Array, w: number, h: number, strength = 2.5): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const at = (x: number, y: number) => {
    const xx = (x + w) % w;
    const yy = clamp(y, 0, h - 1);
    return heights[yy * w + xx];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hl = at(x - 1, y);
      const hr = at(x + 1, y);
      const hd = at(x, y - 1);
      const hu = at(x, y + 1);
      const dx = (hl - hr) * strength;
      const dy = (hd - hu) * strength;
      const dz = 1.0;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = dx / len;
      const ny = dy / len;
      const nz = dz / len;
      const i = (y * w + x) * 4;
      data[i] = ((nx * 0.5 + 0.5) * 255) | 0;
      data[i + 1] = ((ny * 0.5 + 0.5) * 255) | 0;
      data[i + 2] = ((nz * 0.5 + 0.5) * 255) | 0;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function toTexture(canvas: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
