import { FBM } from './noise';
import { dirFromUV, clamp, smoothstep, lerpColor, hexToRgb } from './canvasUtils';

export interface RasterResult {
  color: Uint8ClampedArray; // w*h*3
  height: Float32Array; // w*h
  emissive?: Uint8ClampedArray; // w*h*3
}

interface Crater {
  dir: [number, number, number];
  cosR: number;
  radius: number;
  depth: number;
}

function generateCraters(fbm: FBM, count: number, minR: number, maxR: number): Crater[] {
  const craters: Crater[] = [];
  for (let i = 0; i < count; i++) {
    // uniform random point on sphere
    const z = fbm.rand() * 2 - 1;
    const t = fbm.rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    const dir: [number, number, number] = [r * Math.cos(t), z, r * Math.sin(t)];
    const radius = minR + Math.pow(fbm.rand(), 2.2) * (maxR - minR);
    craters.push({ dir, cosR: Math.cos(radius), radius, depth: 0.35 + fbm.rand() * 0.65 });
  }
  return craters;
}

function craterHeight(x: number, y: number, z: number, craters: Crater[]): number {
  let h = 0;
  for (let i = 0; i < craters.length; i++) {
    const c = craters[i];
    const dot = x * c.dir[0] + y * c.dir[1] + z * c.dir[2];
    if (dot > c.cosR) {
      const ang = Math.acos(clamp(dot, -1, 1));
      const t = ang / c.radius; // 0 center -> 1 rim
      const bowl = -(1 - t * t) * c.depth;
      const rim = smoothstep(0.75, 0.95, t) * smoothstep(1.05, 0.95, t) * c.depth * 0.55;
      h += bowl + rim;
    }
  }
  return h;
}

function setPx(color: Uint8ClampedArray, i: number, rgb: [number, number, number]) {
  color[i * 3] = rgb[0];
  color[i * 3 + 1] = rgb[1];
  color[i * 3 + 2] = rgb[2];
}

export function rasterize(
  w: number,
  h: number,
  fn: (u: number, v: number, x: number, y: number, z: number) => { height: number; color: [number, number, number]; emissive?: [number, number, number] },
  withEmissive = false
): RasterResult {
  const color = new Uint8ClampedArray(w * h * 3);
  const height = new Float32Array(w * h);
  const emissive = withEmissive ? new Uint8ClampedArray(w * h * 3) : undefined;
  const dir: [number, number, number] = [0, 0, 0];
  for (let yy = 0; yy < h; yy++) {
    const v = (yy + 0.5) / h;
    for (let xx = 0; xx < w; xx++) {
      const u = (xx + 0.5) / w;
      dirFromUV(u, v, dir);
      const res = fn(u, v, dir[0], dir[1], dir[2]);
      const i = yy * w + xx;
      height[i] = res.height;
      setPx(color, i, res.color);
      if (emissive && res.emissive) setPx(emissive, i, res.emissive);
    }
  }
  return { color, height, emissive };
}

// ---------------------------------------------------------------------------
// Cratered rocky bodies (Mercury, Moon, Callisto, Phobos, Deimos, ...)
// ---------------------------------------------------------------------------
export function crateredSurface(
  seed: number,
  w: number,
  h: number,
  opts: { base: [number, number, number]; light: [number, number, number]; dark: [number, number, number]; craterCount: number }
): RasterResult {
  const fbm = new FBM(seed);
  const craters = generateCraters(fbm, opts.craterCount, 0.025, 0.16);
  return rasterize(w, h, (u, v, x, y, z) => {
    const regional = fbm.fbm3(x * 1.6, y * 1.6, z * 1.6, 4);
    const fine = fbm.fbm3(x * 9, y * 9, z * 9, 3) * 0.15;
    let hgt = regional * 0.4 + fine + craterHeight(x, y, z, craters) * 1.4;
    const tint = clamp(regional * 0.5 + 0.5, 0, 1);
    let c = lerpColor(opts.dark, opts.light, tint);
    const shade = clamp(0.55 + hgt * 0.9, 0, 1.4);
    c = [c[0] * shade, c[1] * shade, c[2] * shade];
    return { height: hgt, color: [clamp(c[0], 0, 255), clamp(c[1], 0, 255), clamp(c[2], 0, 255)] };
  });
}

// ---------------------------------------------------------------------------
// Venus — dense cloud deck, swirling, no visible terrain
// ---------------------------------------------------------------------------
export function venusSurface(seed: number, w: number, h: number): RasterResult {
  const fbm = new FBM(seed);
  const base = hexToRgb('#c2a876');
  const light = hexToRgb('#dbc79a');
  const dark = hexToRgb('#96703f');
  return rasterize(w, h, (u, v, x, y, z) => {
    const swirl = fbm.warpedFbm3(x * 1.8, y * 1.8, z * 1.8, 1.1, 6);
    const bands = Math.sin((v + swirl * 0.25) * Math.PI * 5) * 0.15;
    const t = clamp(swirl * 0.5 + 0.5 + bands, 0, 1);
    const c = t < 0.5 ? lerpColor(dark, base, t * 2) : lerpColor(base, light, (t - 0.5) * 2);
    return { height: swirl * 0.08, color: c };
  });
}

// ---------------------------------------------------------------------------
// Earth — oceans, continents, ice caps, clouds + night-side city lights
// ---------------------------------------------------------------------------
const OCEAN_DEEP: [number, number, number] = [4, 20, 48];
const OCEAN_SHALLOW: [number, number, number] = [16, 66, 108];
const SAND: [number, number, number] = [173, 158, 106];
const GRASS: [number, number, number] = [64, 96, 42];
const FOREST: [number, number, number] = [38, 66, 32];
const MOUNTAIN: [number, number, number] = [96, 82, 62];
const SNOW: [number, number, number] = [235, 240, 245];
const ICE: [number, number, number] = [200, 220, 232];

export function earthSurface(seed: number, w: number, h: number): RasterResult {
  const fbm = new FBM(seed);
  const cityFbm = new FBM(seed + 917);
  const seaLevel = 0.0;
  return rasterize(
    w,
    h,
    (u, v, x, y, z) => {
      const continent = fbm.fbm3(x * 1.4, y * 1.4, z * 1.4, 6, 2.05, 0.52) + fbm.fbm3(x * 0.6, y * 0.6, z * 0.6, 2) * 0.4;
      const detail = fbm.fbm3(x * 7, y * 7, z * 7, 4) * 0.12;
      const hgt = continent + detail;
      const lat = Math.abs(v - 0.5) * 2; // 0 equator -> 1 pole
      const poleMask = smoothstep(0.78, 0.97, lat);

      const depth = clamp((seaLevel - hgt) / 0.5, 0, 1);
      const oceanColor = lerpColor(OCEAN_SHALLOW, OCEAN_DEEP, depth);

      const elev = clamp(hgt / 0.55, 0, 1);
      let landColor: [number, number, number];
      if (elev < 0.08) landColor = lerpColor(SAND, GRASS, elev / 0.08);
      else if (elev < 0.35) landColor = lerpColor(GRASS, FOREST, (elev - 0.08) / 0.27);
      else if (elev < 0.7) landColor = lerpColor(FOREST, MOUNTAIN, (elev - 0.35) / 0.35);
      else landColor = lerpColor(MOUNTAIN, SNOW, (elev - 0.7) / 0.3);

      const coastT = smoothstep(seaLevel - 0.018, seaLevel + 0.018, hgt);
      let c = lerpColor(oceanColor, landColor, coastT);
      const land = coastT > 0.5;
      c = lerpColor(c, coastT > 0.5 ? SNOW : ICE, poleMask);

      let emissive: [number, number, number] = [0, 0, 0];
      if (land && poleMask < 0.6) {
        const density = clamp(fbm.fbm3(x * 3.2, y * 3.2, z * 3.2, 3) * 0.5 + 0.5, 0, 1);
        const speckle = cityFbm.fbm3(x * 60, y * 60, z * 60, 2);
        if (density > 0.52 && speckle > 0.55) {
          const bright = (speckle - 0.55) * 3.2;
          emissive = [bright * 255, bright * 200, bright * 120];
        }
      }
      return { height: hgt, color: c, emissive };
    },
    true
  );
}

export function earthClouds(seed: number, w: number, h: number): { alpha: Float32Array; w: number; h: number } {
  const fbm = new FBM(seed + 4242);
  const alpha = new Float32Array(w * h);
  const dir: [number, number, number] = [0, 0, 0];
  for (let yy = 0; yy < h; yy++) {
    const v = (yy + 0.5) / h;
    for (let xx = 0; xx < w; xx++) {
      const u = (xx + 0.5) / w;
      dirFromUV(u, v, dir);
      const [x, y, z] = dir;
      const n = fbm.warpedFbm3(x * 2.2, y * 2.2, z * 2.2, 0.8, 6);
      alpha[yy * w + xx] = clamp(smoothstep(-0.1, 0.62, n), 0, 1);
    }
  }
  return { alpha, w, h };
}

// ---------------------------------------------------------------------------
// Mars — rusty regolith, maria, polar caps, light cratering
// ---------------------------------------------------------------------------
export function marsSurface(seed: number, w: number, h: number): RasterResult {
  const fbm = new FBM(seed);
  const craters = generateCraters(fbm, 18, 0.03, 0.13);
  const RUST_LIGHT: [number, number, number] = [224, 133, 79];
  const RUST_DARK: [number, number, number] = [150, 80, 50];
  const MARIA: [number, number, number] = [107, 68, 52];
  return rasterize(w, h, (u, v, x, y, z) => {
    const base = fbm.fbm3(x * 1.7, y * 1.7, z * 1.7, 5);
    const maria = smoothstep(0.15, 0.5, fbm.fbm3(x * 0.9 + 3, y * 0.9 + 3, z * 0.9 + 3, 3));
    const fine = fbm.fbm3(x * 10, y * 10, z * 10, 3) * 0.08;
    const crH = craterHeight(x, y, z, craters);
    const hgt = base * 0.35 + fine + crH;
    let c = lerpColor(RUST_DARK, RUST_LIGHT, clamp(base * 0.6 + 0.62, 0, 1));
    c = lerpColor(c, MARIA, maria * 0.55);
    const lat = Math.abs(v - 0.5) * 2;
    const poleMask = smoothstep(0.86, 0.98, lat);
    c = lerpColor(c, [235, 232, 228], poleMask);
    const shade = clamp(0.82 + hgt * 0.7, 0, 1.3);
    return { height: hgt, color: [clamp(c[0] * shade, 0, 255), clamp(c[1] * shade, 0, 255), clamp(c[2] * shade, 0, 255)] };
  });
}

// ---------------------------------------------------------------------------
// Banded giants — Jupiter, Saturn, Uranus, Neptune
// ---------------------------------------------------------------------------
export interface BandedOptions {
  palette: string[]; // low->high color stops across one band cycle
  bandCount: number;
  turbulence: number;
  contrast: number;
  spot?: { u: number; v: number; ru: number; rv: number; color: string; dark?: boolean };
}

export function bandedSurface(seed: number, w: number, h: number, opts: BandedOptions): RasterResult {
  const fbm = new FBM(seed);
  const palette = opts.palette.map(hexToRgb);
  const n = palette.length;
  const spotColor = opts.spot ? hexToRgb(opts.spot.color) : null;
  return rasterize(w, h, (u, v, x, y, z) => {
    // Large-scale warp bends band boundaries into wavy zonal-jet shapes (in band-space units,
    // so it stays a fraction of one band's width instead of scrambling the whole latitude range);
    // fine noise adds turbulent texture within bands.
    const warp = fbm.fbm3(x * 1.3, y * 1.3, z * 1.3, 4) * opts.turbulence;
    const fine = fbm.fbm3(x * 6, y * 6, z * 6, 4);
    const fine2 = fbm.fbm3(x * 14, y * 14, z * 14, 3);

    const bandPos = v * opts.bandCount + warp;
    const bandIdx = Math.floor(bandPos);
    const frac = bandPos - bandIdx;
    const wrap = (i: number) => ((i % n) + n) % n;
    const colorA = palette[wrap(bandIdx)];
    const colorB = palette[wrap(bandIdx + 1)];
    const t = smoothstep(0.32, 0.68, frac + fine2 * 0.12);
    let c = lerpColor(colorA, colorB, t);

    const shimmer = 1 + fine * 0.09 * opts.contrast + fine2 * 0.04 * opts.contrast;
    c = [c[0] * shimmer, c[1] * shimmer, c[2] * shimmer];

    if (opts.spot && spotColor) {
      const du = Math.min(Math.abs(u - opts.spot.u), 1 - Math.abs(u - opts.spot.u)) / opts.spot.ru;
      const dv = (v - opts.spot.v) / opts.spot.rv;
      const swirl = fbm.fbm3(x * 6, y * 6, z * 6, 3) * 0.15;
      const d = Math.sqrt(du * du + dv * dv) + swirl;
      const mask = 1 - smoothstep(0.7, 1.05, d);
      if (mask > 0) {
        c = lerpColor(c, spotColor, mask * (opts.spot.dark ? 0.85 : 0.9));
      }
    }
    return {
      height: fine * 0.1,
      color: [clamp(c[0], 0, 255), clamp(c[1], 0, 255), clamp(c[2], 0, 255)],
    };
  });
}

// ---------------------------------------------------------------------------
// Pluto — icy reddish-tan, bright nitrogen "heart" plain (Tombaugh Regio)
// ---------------------------------------------------------------------------
export function plutoSurface(seed: number, w: number, h: number): RasterResult {
  const fbm = new FBM(seed);
  const craters = generateCraters(fbm, 14, 0.03, 0.12);
  const DARK: [number, number, number] = [104, 66, 52];
  const LIGHT: [number, number, number] = [206, 168, 140];
  const HEART: [number, number, number] = [244, 232, 214];
  return rasterize(w, h, (u, v, x, y, z) => {
    const base = fbm.fbm3(x * 1.5, y * 1.5, z * 1.5, 5);
    const crH = craterHeight(x, y, z, craters);
    let hgt = base * 0.3 + crH;
    let c = lerpColor(DARK, LIGHT, clamp(base * 0.5 + 0.5, 0, 1));

    const lobeU = 0.52, lobeV = 0.52;
    let du = Math.abs(u - lobeU);
    du = Math.min(du, 1 - du);
    const dv = v - lobeV;
    const edgeNoise = fbm.fbm3(x * 5, y * 5, z * 5, 3) * 0.05;
    const d1 = Math.hypot(du * 1.15, dv * 1.7) + edgeNoise;
    const heart = 1 - smoothstep(0.24, 0.42, d1);
    if (heart > 0) {
      c = lerpColor(c, HEART, heart);
      hgt -= heart * 0.15;
    }

    const shade = clamp(0.72 + hgt * 0.7, 0, 1.3);
    return { height: hgt, color: [clamp(c[0] * shade, 0, 255), clamp(c[1] * shade, 0, 255), clamp(c[2] * shade, 0, 255)] };
  });
}

// ---------------------------------------------------------------------------
// Io — sulfurous volcanic mottling, no craters
// ---------------------------------------------------------------------------
export function ioSurface(seed: number, w: number, h: number): RasterResult {
  const fbm = new FBM(seed);
  const YELLOW: [number, number, number] = [220, 196, 90];
  const ORANGE: [number, number, number] = [186, 104, 42];
  const WHITE: [number, number, number] = [232, 224, 202];
  const DARKSPOT: [number, number, number] = [58, 30, 22];
  return rasterize(w, h, (u, v, x, y, z) => {
    const base = fbm.fbm3(x * 2.2, y * 2.2, z * 2.2, 5);
    const frost = fbm.fbm3(x * 3.5 + 9, y * 3.5 + 9, z * 3.5 + 9, 3);
    const spots = fbm.ridged3(x * 6, y * 6, z * 6, 3);
    let c = lerpColor(ORANGE, YELLOW, clamp(base * 0.5 + 0.5, 0, 1));
    if (frost > 0.45) c = lerpColor(c, WHITE, smoothstep(0.45, 0.7, frost));
    if (spots > 0.82) c = lerpColor(c, DARKSPOT, smoothstep(0.82, 0.94, spots));
    return { height: base * 0.15, color: c };
  });
}

// ---------------------------------------------------------------------------
// Europa — icy shell with crack/lineae network, very few craters
// ---------------------------------------------------------------------------
export function europaSurface(seed: number, w: number, h: number): RasterResult {
  const fbm = new FBM(seed);
  const craters = generateCraters(fbm, 3, 0.03, 0.06);
  const ICE_BASE: [number, number, number] = [188, 178, 158];
  const ICE_BRIGHT: [number, number, number] = [248, 244, 232];
  const CRACK: [number, number, number] = [140, 92, 78];
  return rasterize(w, h, (u, v, x, y, z) => {
    const base = fbm.fbm3(x * 1.8, y * 1.8, z * 1.8, 4) * 0.5 + 0.5;
    const linesA = fbm.ridged3(x * 3.2, y * 3.2, z * 3.2, 2, 2.0, 0.5);
    const linesB = fbm.ridged3(x * 7.5 + 40, y * 7.5 + 40, z * 7.5 + 40, 2, 2.0, 0.5);
    let c = lerpColor(ICE_BASE, ICE_BRIGHT, base);
    const crackMaskA = smoothstep(0.9, 0.985, linesA);
    const crackMaskB = smoothstep(0.93, 0.99, linesB) * 0.6;
    const crackMask = clamp(crackMaskA + crackMaskB, 0, 1);
    c = lerpColor(c, CRACK, crackMask * 0.75);
    const crH = craterHeight(x, y, z, craters);
    return { height: base * 0.1 + crackMask * -0.15 + crH, color: c };
  });
}

// ---------------------------------------------------------------------------
// Ganymede — patches of dark cratered terrain + pale grooved terrain
// ---------------------------------------------------------------------------
export function ganymedeSurface(seed: number, w: number, h: number): RasterResult {
  const fbm = new FBM(seed);
  const craters = generateCraters(fbm, 22, 0.02, 0.1);
  const DARK: [number, number, number] = [92, 84, 76];
  const PALE: [number, number, number] = [168, 160, 148];
  return rasterize(w, h, (u, v, x, y, z) => {
    const region = fbm.fbm3(x * 0.9, y * 0.9, z * 0.9, 3);
    const isPale = smoothstep(-0.1, 0.15, region);
    const grooves = Math.sin((v + fbm.fbm3(x, y, z, 3) * 0.3) * 40) * 0.06 * isPale;
    const base = fbm.fbm3(x * 2, y * 2, z * 2, 4) * 0.15;
    const crH = craterHeight(x, y, z, craters) * (1 - isPale * 0.6);
    const hgt = base + grooves + crH;
    let c = lerpColor(DARK, PALE, isPale);
    const shade = clamp(0.65 + hgt * 1.2, 0, 1.3);
    return { height: hgt, color: [clamp(c[0] * shade, 0, 255), clamp(c[1] * shade, 0, 255), clamp(c[2] * shade, 0, 255)] };
  });
}

// ---------------------------------------------------------------------------
// Titan — thick hazy orange atmosphere hiding the surface
// ---------------------------------------------------------------------------
export function titanSurface(seed: number, w: number, h: number): RasterResult {
  const fbm = new FBM(seed);
  const BASE: [number, number, number] = [196, 146, 74];
  const LIGHT: [number, number, number] = [232, 196, 132];
  const DARK: [number, number, number] = [150, 100, 48];
  return rasterize(w, h, (u, v, x, y, z) => {
    const swirl = fbm.warpedFbm3(x * 1.5, y * 1.5, z * 1.5, 0.9, 6);
    const t = clamp(swirl * 0.5 + 0.5, 0, 1);
    const c = t < 0.5 ? lerpColor(DARK, BASE, t * 2) : lerpColor(BASE, LIGHT, (t - 0.5) * 2);
    return { height: swirl * 0.06, color: c };
  });
}
