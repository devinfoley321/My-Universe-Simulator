import * as THREE from 'three';
import { FBM, hashSeed } from '../textures/noise';
import { makeCanvas, dirFromUV, clamp, smoothstep, toTexture } from '../textures/canvasUtils';

const STAR_SHELL_RADIUS = 4200;
const MILKYWAY_RADIUS = 3600;

/** Distant pinpoint stars as camera-facing points with per-star color temperature + twinkle. */
function buildStarPoints(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const rand = new FBM(hashSeed('starfield-points')).rand;

  const tempColors: [number, number, number][] = [
    [0.65, 0.75, 1.0], // blue-white
    [0.8, 0.87, 1.0],
    [1.0, 1.0, 1.0], // white
    [1.0, 0.95, 0.8], // pale yellow
    [1.0, 0.85, 0.6], // orange
    [1.0, 0.7, 0.55], // red-orange
  ];

  for (let i = 0; i < count; i++) {
    const z = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    const radius = STAR_SHELL_RADIUS * (0.7 + rand() * 0.3);
    positions[i * 3] = r * Math.cos(t) * radius;
    positions[i * 3 + 1] = z * radius;
    positions[i * 3 + 2] = r * Math.sin(t) * radius;

    const tc = tempColors[(rand() * tempColors.length) | 0];
    const brightness = 0.5 + Math.pow(rand(), 3) * 0.5;
    colors[i * 3] = tc[0] * brightness;
    colors[i * 3 + 1] = tc[1] * brightness;
    colors[i * 3 + 2] = tc[2] * brightness;

    sizes[i] = Math.pow(rand(), 4) * 9 + 1.4;
    phases[i] = rand() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = color;
        float twinkle = 0.65 + 0.35 * sin(uTime * (0.6 + aPhase * 0.1) + aPhase * 6.2831);
        vTwinkle = twinkle;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * twinkle * uPixelRatio * (300.0 / -mvPosition.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float alpha = smoothstep(0.5, 0.0, d);
        alpha = pow(alpha, 1.6);
        gl_FragColor = vec4(vColor * vTwinkle, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return points;
}

/** Soft glowing Milky Way band + faint background star haze, baked into a backdrop sphere. */
function buildMilkyWaySphere(): THREE.Mesh {
  const w = 2048;
  const h = 1024;
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const fbm = new FBM(hashSeed('milkyway'));
  const fineFbm = new FBM(hashSeed('milkyway-fine'));

  // Band centerline defined by a tilted axis so it doesn't align with the ecliptic.
  const tilt = THREE.MathUtils.degToRad(62);
  const axis = new THREE.Vector3(Math.cos(tilt), Math.sin(tilt), 0.25).normalize();
  const dir: [number, number, number] = [0, 0, 0];
  const v3 = new THREE.Vector3();

  for (let yy = 0; yy < h; yy++) {
    const v = (yy + 0.5) / h;
    for (let xx = 0; xx < w; xx++) {
      const u = (xx + 0.5) / w;
      dirFromUV(u, v, dir);
      v3.set(dir[0], dir[1], dir[2]);
      const distToBand = Math.abs(v3.dot(axis)); // 0 on the great-circle band, 1 at poles of it

      const turb = fbm.fbm3(dir[0] * 1.8, dir[1] * 1.8, dir[2] * 1.8, 5) * 0.5 + 0.5;
      const bandWidth = 0.16 + turb * 0.1;
      let density = smoothstep(bandWidth, 0, distToBand);
      density = Math.pow(density, 1.3);

      const dust = fbm.fbm3(dir[0] * 4 + 40, dir[1] * 4 + 40, dir[2] * 4 + 40, 4);
      density *= clamp(0.55 + dust * 0.75, 0, 1.3);

      const fine = fineFbm.fbm3(dir[0] * 30, dir[1] * 30, dir[2] * 30, 2) * 0.5 + 0.5;
      const haze = clamp(density * 0.85 + fine * 0.06, 0, 1);

      // subtle core color: warm white center, cooler blue toward edges
      const core = clamp(1 - distToBand / bandWidth, 0, 1);
      const r = (0.75 + core * 0.2) * haze;
      const g = (0.78 + core * 0.15) * haze;
      const b = (0.95 - core * 0.1) * haze;

      const i = (yy * w + xx) * 4;
      img.data[i] = clamp(r * 255, 0, 255);
      img.data[i + 1] = clamp(g * 255, 0, 255);
      img.data[i + 2] = clamp(b * 255, 0, 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = toTexture(canvas, true);
  tex.wrapT = THREE.ClampToEdgeWrapping;

  const geo = new THREE.SphereGeometry(MILKYWAY_RADIUS, 64, 64);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

export interface StarfieldHandle {
  group: THREE.Group;
  update(elapsed: number): void;
}

export function createStarfield(): StarfieldHandle {
  const group = new THREE.Group();
  const milkyWay = buildMilkyWaySphere();
  const stars = buildStarPoints(9000);
  group.add(milkyWay);
  group.add(stars);
  const mat = stars.material as THREE.ShaderMaterial;
  return {
    group,
    update(elapsed: number) {
      mat.uniforms.uTime.value = elapsed;
    },
  };
}
