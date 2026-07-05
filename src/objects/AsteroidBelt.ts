import * as THREE from 'three';
import { sceneDistance } from '../data/bodies';
import { mulberry32, hashSeed } from '../textures/noise';

function jitteredRock(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const rand = mulberry32(seed);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 0.72 + rand() * 0.5;
    v.multiplyScalar(n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createAsteroidBelt(count = 3500): THREE.InstancedMesh {
  const geo = jitteredRock(hashSeed('asteroid-shape'));
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a7d6e, roughness: 1.0, metalness: 0.05 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const rand = mulberry32(hashSeed('asteroid-belt'));
  const inner = sceneDistance(2.15);
  const outer = sceneDistance(3.3);
  const dummy = new THREE.Object3D();
  const colorArray = new Float32Array(count * 3);
  const baseColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const r = inner + Math.pow(rand(), 0.6) * (outer - inner);
    const theta = rand() * Math.PI * 2;
    const height = (rand() - 0.5) * 1.6 * (r / outer);
    dummy.position.set(Math.cos(theta) * r, height, Math.sin(theta) * r);
    const scale = 0.02 + Math.pow(rand(), 3) * 0.16;
    dummy.scale.setScalar(scale);
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    const shade = 0.6 + rand() * 0.5;
    baseColor.setRGB(0.55 * shade, 0.48 * shade, 0.4 * shade);
    baseColor.toArray(colorArray, i * 3);
  }
  mesh.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3));
  mat.vertexColors = true;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  return mesh;
}

export function updateAsteroidBelt(mesh: THREE.InstancedMesh, simDays: number) {
  mesh.rotation.y = simDays * 0.0009;
}
