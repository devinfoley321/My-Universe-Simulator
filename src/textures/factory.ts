import * as THREE from 'three';
import type { SurfaceType, RingData } from '../data/bodies';
import { hashSeed, FBM } from './noise';
import { heightsToNormalMap, toTexture, makeCanvas, clamp, hexToRgb } from './canvasUtils';
import {
  crateredSurface,
  venusSurface,
  earthSurface,
  earthClouds,
  marsSurface,
  bandedSurface,
  plutoSurface,
  ioSurface,
  europaSurface,
  ganymedeSurface,
  titanSurface,
  type RasterResult,
} from './surfaces';

export interface BodyTextures {
  albedo: THREE.Texture;
  normal: THREE.Texture;
  emissive?: THREE.Texture;
}

function toCanvasFromRGB(data: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = data[i * 3];
    img.data[i * 4 + 1] = data[i * 3 + 1];
    img.data[i * 4 + 2] = data[i * 3 + 2];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function finalize(raster: RasterResult, w: number, h: number, normalStrength = 2.2): BodyTextures {
  const albedoCanvas = toCanvasFromRGB(raster.color, w, h);
  const normalCanvas = heightsToNormalMap(raster.height, w, h, normalStrength);
  const result: BodyTextures = {
    albedo: toTexture(albedoCanvas, true),
    normal: toTexture(normalCanvas, false),
  };
  if (raster.emissive) {
    const emCanvas = toCanvasFromRGB(raster.emissive, w, h);
    result.emissive = toTexture(emCanvas, true);
  }
  return result;
}

const GAS_GIANT_PRESETS: Record<string, { palette: string[]; bandCount: number; turbulence: number; contrast: number; spot?: any }> = {
  jupiter: {
    palette: ['#8a5a3a', '#c9a279', '#e8d5b0', '#c9a279', '#f2e6cc', '#a9764f', '#8a5a3a'],
    bandCount: 9,
    turbulence: 0.22,
    contrast: 1.3,
    spot: { u: 0.62, v: 0.58, ru: 0.09, rv: 0.05, color: '#b5533a', dark: false },
  },
  saturn: {
    palette: ['#c9ad78', '#e8d9ae', '#f2ecd6', '#e0cf9e', '#d9c088'],
    bandCount: 7,
    turbulence: 0.12,
    contrast: 0.7,
  },
  uranus: {
    palette: ['#9fd0d4', '#b8e0e2', '#a9d8dd', '#9fd0d4'],
    bandCount: 3,
    turbulence: 0.04,
    contrast: 0.25,
  },
  neptune: {
    palette: ['#1c3fa8', '#3a5fd9', '#5a7de8', '#2e4dc0'],
    bandCount: 5,
    turbulence: 0.15,
    contrast: 0.9,
    spot: { u: 0.3, v: 0.4, ru: 0.07, rv: 0.045, color: '#16266e', dark: true },
  },
};

export function buildBodyTextures(surface: SurfaceType, key: string, w: number, h: number): BodyTextures {
  const seed = hashSeed(key);
  switch (surface) {
    case 'cratered':
      return finalize(crateredSurface(seed, w, h, { base: hexToRgb('#a89e92'), light: hexToRgb('#cfc6b8'), dark: hexToRgb('#5c5348'), craterCount: 45 }), w, h, 3.2);
    case 'moon-generic':
      return finalize(crateredSurface(seed, w, h, { base: hexToRgb('#8a8580'), light: hexToRgb('#b0aaa0'), dark: hexToRgb('#403c38'), craterCount: 34 }), w, h, 3.2);
    case 'venus':
      return finalize(venusSurface(seed, w, h), w, h, 0.6);
    case 'earth':
      return finalize(earthSurface(seed, w, h), w, h, 3.5);
    case 'mars':
      return finalize(marsSurface(seed, w, h), w, h, 3.0);
    case 'gasgiant':
      return finalize(bandedSurface(seed, w, h, GAS_GIANT_PRESETS.jupiter), w, h, 0.8);
    case 'saturn':
      return finalize(bandedSurface(seed, w, h, GAS_GIANT_PRESETS.saturn), w, h, 0.8);
    case 'icegiant':
      return finalize(bandedSurface(seed, w, h, key === 'neptune' ? GAS_GIANT_PRESETS.neptune : GAS_GIANT_PRESETS.uranus), w, h, 0.8);
    case 'pluto':
      return finalize(plutoSurface(seed, w, h), w, h, 2.6);
    case 'io':
      return finalize(ioSurface(seed, w, h), w, h, 1.2);
    case 'europa':
      return finalize(europaSurface(seed, w, h), w, h, 1.6);
    case 'ganymede':
      return finalize(ganymedeSurface(seed, w, h), w, h, 2.4);
    case 'titan':
      return finalize(titanSurface(seed, w, h), w, h, 0.7);
    default:
      return finalize(crateredSurface(seed, w, h, { base: hexToRgb('#999'), light: hexToRgb('#ccc'), dark: hexToRgb('#444'), craterCount: 30 }), w, h, 2.5);
  }
}

export function buildCloudTexture(key: string, w: number, h: number): THREE.Texture {
  const seed = hashSeed(key);
  const { alpha } = earthClouds(seed, w, h);
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const a = clamp(alpha[i], 0, 1);
    img.data[i * 4] = 255;
    img.data[i * 4 + 1] = 255;
    img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = Math.round(a * 235);
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas, true);
}

/** Radial ring texture: color/alpha vary only along V (mapped to radius); U (angle) is constant. */
export function buildRingTexture(ring: RingData, key: string): THREE.Texture {
  const w = 8;
  const h = 512;
  const seed = hashSeed(key + '-ring');
  const fbm = new FBM(seed);
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const baseColor = hexToRgb(ring.color);
  for (let yy = 0; yy < h; yy++) {
    const t = yy / (h - 1); // 0 inner -> 1 outer
    const n1 = fbm.fbm3(t * 40, 0.1, 0.1, 3);
    const n2 = fbm.fbm3(t * 140, 5.5, 5.5, 2);
    const gapA = Math.pow(Math.sin(t * 47.0), 8);
    const gapB = Math.pow(Math.sin(t * 113.0 + 1.7), 10);
    let density = 0.55 + n1 * 0.35 + n2 * 0.15;
    density -= gapA * 0.5 + gapB * 0.35;
    density *= 1 - Math.pow(1 - Math.min(t * 6, 1), 2) * 0.6; // fade near inner edge
    density *= 1 - Math.pow(Math.max((t - 0.92) / 0.08, 0), 2) * 0.7; // fade near outer edge
    density = clamp(density, 0, 1);
    const shade = 0.7 + n1 * 0.3;
    const r = clamp(baseColor[0] * shade, 0, 255);
    const g = clamp(baseColor[1] * shade, 0, 255);
    const b = clamp(baseColor[2] * shade, 0, 255);
    for (let xx = 0; xx < w; xx++) {
      const i = (yy * w + xx) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(density * ring.opacity * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = toTexture(canvas, true);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
