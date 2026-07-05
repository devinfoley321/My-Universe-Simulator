import * as THREE from 'three';
import type { MoonDatum, PlanetDatum } from '../data/bodies';
import { sceneRadius, moonSceneOrbit } from '../data/bodies';
import { buildBodyTextures, buildCloudTexture } from '../textures/factory';
import { createRingMesh } from './ring';
import { createAtmosphereMaterial } from '../shaders/atmosphere';
import { planetPosition, planetOrbitPath, moonPosition, moonOrbitPath } from '../systems/orbits';
import { hashSeed, mulberry32 } from '../textures/noise';

const DEG2RAD = Math.PI / 180;

export interface Resolution {
  w: number;
  h: number;
}

const ATMOSPHERE_COLORS: Record<string, string> = {
  earth: '#6db3ff',
  venus: '#e8c98a',
  mars: '#d99a72',
  titan: '#e0a860',
};

export class MoonBody {
  readonly data: MoonDatum;
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  readonly sceneOrbitRadius: number;
  readonly sceneBodyRadius: number;
  readonly orbitLine: THREE.Line;
  private readonly phase: number;

  constructor(moon: MoonDatum, planetSceneRadius: number, resolution: Resolution) {
    this.data = moon;
    this.sceneOrbitRadius = moonSceneOrbit(planetSceneRadius, moon);
    // A floor (not a blanket multiplier) keeps tiny moons like Phobos/Deimos visible and
    // clickable without inflating large moons past believable size relative to their planet.
    this.sceneBodyRadius = Math.max(sceneRadius(moon.radiusKm), 0.14);
    this.phase = mulberry32(hashSeed(moon.name))() * Math.PI * 2;

    const tex = buildBodyTextures(moon.surface, moon.name.toLowerCase(), resolution.w, resolution.h);
    const geo = new THREE.SphereGeometry(this.sceneBodyRadius, 48, 48);
    const mat = new THREE.MeshStandardMaterial({ map: tex.albedo, normalMap: tex.normal, roughness: 0.95, metalness: 0.02 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    const pathPoints = moonOrbitPath(moon, this.sceneOrbitRadius);
    const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMat = new THREE.LineBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.35 });
    this.orbitLine = new THREE.Line(pathGeo, pathMat);
  }

  update(simDays: number, parentPos: THREE.Vector3) {
    const pos = moonPosition(this.data, this.sceneOrbitRadius, simDays, this.phase, parentPos);
    this.group.position.copy(pos);
    this.mesh.rotation.y = simDays * 0.6;
    this.orbitLine.position.copy(parentPos);
  }

  getWorldPosition(): THREE.Vector3 {
    return this.group.position;
  }

  get sceneRadius(): number {
    return this.sceneBodyRadius;
  }
}

export class Planet {
  readonly data: PlanetDatum;
  readonly orbitGroup = new THREE.Group(); // positioned along the orbit each frame
  readonly tiltGroup = new THREE.Group(); // fixed axial tilt
  readonly mesh: THREE.Mesh;
  readonly sceneRadiusValue: number;
  readonly orbitLine: THREE.Line;
  readonly moons: MoonBody[] = [];
  private cloudMesh?: THREE.Mesh;
  private ringMesh?: THREE.Mesh;

  constructor(data: PlanetDatum, resolution: Resolution, moonResolution: (moonName: string) => Resolution) {
    this.data = data;
    this.sceneRadiusValue = sceneRadius(data.radiusKm);

    const tex = buildBodyTextures(data.surface, data.key, resolution.w, resolution.h);
    const geo = new THREE.SphereGeometry(this.sceneRadiusValue, 64, 64);
    const matOpts: THREE.MeshStandardMaterialParameters = {
      map: tex.albedo,
      normalMap: tex.normal,
      roughness: data.surface === 'gasgiant' || data.surface === 'saturn' || data.surface === 'icegiant' ? 1.0 : 0.88,
      metalness: 0.02,
    };
    if (tex.emissive) {
      matOpts.emissiveMap = tex.emissive;
      matOpts.emissive = new THREE.Color(0xffffff);
      matOpts.emissiveIntensity = 1.4;
    }
    const mat = new THREE.MeshStandardMaterial(matOpts);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.tiltGroup.rotation.z = data.tiltDeg * DEG2RAD;
    this.tiltGroup.add(this.mesh);

    if (data.key === 'earth') {
      const cloudTex = buildCloudTexture(data.key, 1536, 768);
      const cloudGeo = new THREE.SphereGeometry(this.sceneRadiusValue * 1.012, 64, 64);
      const cloudMat = new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false, roughness: 1.0 });
      this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
      this.tiltGroup.add(this.cloudMesh);
    }

    const atmoColor = ATMOSPHERE_COLORS[data.key];
    if (atmoColor) {
      const atmoGeo = new THREE.SphereGeometry(this.sceneRadiusValue * 1.06, 64, 64);
      const atmoMat = createAtmosphereMaterial(atmoColor, 2.6, data.key === 'venus' || data.key === 'titan' ? 0.55 : 0.85);
      const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
      this.tiltGroup.add(atmoMesh);
    }

    if (data.rings) {
      this.ringMesh = createRingMesh(data.rings, data.key);
      this.tiltGroup.add(this.ringMesh);
    }

    this.orbitGroup.add(this.tiltGroup);

    const pathPoints = planetOrbitPath(data);
    const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMat = new THREE.LineBasicMaterial({ color: 0x6f88a8, transparent: true, opacity: 0.45 });
    this.orbitLine = new THREE.Line(pathGeo, pathMat);

    if (data.moons) {
      for (const m of data.moons) {
        this.moons.push(new MoonBody(m, this.sceneRadiusValue, moonResolution(m.name)));
      }
    }
  }

  update(simDays: number) {
    const pos = planetPosition(this.data, simDays);
    this.orbitGroup.position.copy(pos);
    const spinAngle = ((simDays * 24) / this.data.rotationHours) * Math.PI * 2;
    this.mesh.rotation.y = spinAngle;
    if (this.cloudMesh) this.cloudMesh.rotation.y = spinAngle * 0.55;
    for (const moon of this.moons) moon.update(simDays, pos);
  }

  getWorldPosition(): THREE.Vector3 {
    return this.orbitGroup.position;
  }

  get sceneRadius(): number {
    return this.sceneRadiusValue;
  }
}
