import * as THREE from 'three';
import type { RingData } from '../data/bodies';
import { sceneRadius } from '../data/bodies';
import { buildRingTexture } from '../textures/factory';

function setRadialUV(geo: THREE.RingGeometry, inner: number, outer: number) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const r = v3.length();
    const t = (r - inner) / (outer - inner);
    uv.setXY(i, 0.5, THREE.MathUtils.clamp(t, 0, 1));
  }
  uv.needsUpdate = true;
}

export function createRingMesh(ring: RingData, key: string): THREE.Mesh {
  const inner = sceneRadius(ring.innerKm);
  const outer = sceneRadius(ring.outerKm);
  const geo = new THREE.RingGeometry(inner, outer, 256, 1);
  setRadialUV(geo, inner, outer);
  const tex = buildRingTexture(ring, key);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0,
    alphaTest: 0.02,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}
