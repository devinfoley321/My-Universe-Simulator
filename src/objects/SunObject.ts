import * as THREE from 'three';
import { createSunMaterial, createCoronaMaterial } from '../shaders/sun';
import { SCALE } from '../data/bodies';

export class SunObject {
  readonly group = new THREE.Group();
  readonly light: THREE.PointLight;
  private readonly sunMat: THREE.ShaderMaterial;
  private readonly coronaMat: THREE.ShaderMaterial;
  readonly mesh: THREE.Mesh;

  constructor() {
    const radius = SCALE.SUN_SCENE_RADIUS;
    this.sunMat = createSunMaterial();
    const geo = new THREE.SphereGeometry(radius, 96, 96);
    this.mesh = new THREE.Mesh(geo, this.sunMat);
    this.group.add(this.mesh);

    this.coronaMat = createCoronaMaterial();
    const coronaGeo = new THREE.SphereGeometry(radius * 1.35, 64, 64);
    const coronaMesh = new THREE.Mesh(coronaGeo, this.coronaMat);
    this.group.add(coronaMesh);

    const coronaGeo2 = new THREE.SphereGeometry(radius * 1.9, 48, 48);
    const coronaMat2 = createCoronaMaterial();
    coronaMat2.uniforms.uColor.value = new THREE.Color(0xff7a2a);
    (coronaMat2 as any).transparent = true;
    coronaMat2.opacity = 1;
    const coronaMesh2 = new THREE.Mesh(coronaGeo2, coronaMat2);
    this.group.add(coronaMesh2);

    this.light = new THREE.PointLight(0xfff4e0, 26, 0, 0.55);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048);
    this.light.shadow.camera.near = 1;
    this.light.shadow.camera.far = 200;
    this.light.shadow.bias = -0.0004;
    this.group.add(this.light);
  }

  update(elapsed: number) {
    this.sunMat.uniforms.uTime.value = elapsed;
  }
}
