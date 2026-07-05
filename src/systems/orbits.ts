import * as THREE from 'three';
import type { MoonDatum, PlanetDatum } from '../data/bodies';
import { sceneDistance } from '../data/bodies';

const DEG2RAD = Math.PI / 180;

/** Solve Kepler's equation M = E - e sin E for the eccentric anomaly via Newton-Raphson. */
function solveKepler(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 8; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

/** True-anomaly radius + angle (radians, measured from periapsis) for a Kepler ellipse. */
function trueAnomalyAndRadius(a: number, e: number, E: number): { r: number; nu: number } {
  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const r = Math.sqrt(xOrb * xOrb + yOrb * yOrb);
  const nu = Math.atan2(yOrb, xOrb);
  return { r, nu };
}

export function planetPosition(planet: PlanetDatum, simDays: number, out = new THREE.Vector3()): THREE.Vector3 {
  const n = (2 * Math.PI) / planet.orbitPeriodDays;
  const M0 = (planet.meanLongitudeDeg - planet.longPeriapsisDeg) * DEG2RAD;
  const M = normalizeAngle(M0 + n * simDays);
  const E = solveKepler(M, planet.eccentricity);
  const { r, nu } = trueAnomalyAndRadius(planet.semiMajorAU, planet.eccentricity, E);

  const angle = nu + planet.longPeriapsisDeg * DEG2RAD;
  const sceneR = sceneDistance(r);
  const xPlane = sceneR * Math.cos(angle);
  const zPlane = sceneR * Math.sin(angle);

  const inc = planet.inclinationDeg * DEG2RAD;
  out.set(xPlane, zPlane * Math.sin(inc), zPlane * Math.cos(inc));
  return out;
}

export function planetOrbitPath(planet: PlanetDatum, segments = 360): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const inc = planet.inclinationDeg * DEG2RAD;
  for (let i = 0; i <= segments; i++) {
    const E = (i / segments) * Math.PI * 2;
    const { r, nu } = trueAnomalyAndRadius(planet.semiMajorAU, planet.eccentricity, E);
    const angle = nu + planet.longPeriapsisDeg * DEG2RAD;
    const sceneR = sceneDistance(r);
    const xPlane = sceneR * Math.cos(angle);
    const zPlane = sceneR * Math.sin(angle);
    points.push(new THREE.Vector3(xPlane, zPlane * Math.sin(inc), zPlane * Math.cos(inc)));
  }
  return points;
}

export function moonPosition(
  moon: MoonDatum,
  sceneOrbitRadius: number,
  simDays: number,
  phaseOffset: number,
  parentPos: THREE.Vector3,
  out = new THREE.Vector3()
): THREE.Vector3 {
  const dir = moon.retrograde ? -1 : 1;
  const angle = dir * ((2 * Math.PI) / moon.orbitPeriodDays) * simDays + phaseOffset;
  const xPlane = sceneOrbitRadius * Math.cos(angle);
  const zPlane = sceneOrbitRadius * Math.sin(angle);
  const inc = moon.tiltDeg * DEG2RAD;
  out.set(parentPos.x + xPlane, parentPos.y + zPlane * Math.sin(inc), parentPos.z + zPlane * Math.cos(inc));
  return out;
}

export function moonOrbitPath(moon: MoonDatum, sceneOrbitRadius: number, segments = 128): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const inc = moon.tiltDeg * DEG2RAD;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const xPlane = sceneOrbitRadius * Math.cos(angle);
    const zPlane = sceneOrbitRadius * Math.sin(angle);
    points.push(new THREE.Vector3(xPlane, zPlane * Math.sin(inc), zPlane * Math.cos(inc)));
  }
  return points;
}

function normalizeAngle(a: number): number {
  const twoPi = Math.PI * 2;
  a = a % twoPi;
  if (a < 0) a += twoPi;
  return a;
}
