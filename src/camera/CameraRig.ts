import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface FocusTarget {
  getWorldPosition(): THREE.Vector3;
  sceneRadius: number;
}

const FLIGHT_DURATION = 1.35;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  private target: FocusTarget | null = null;
  private lastTargetPos = new THREE.Vector3();
  private flightT = 1; // 1 = not flying
  private flightFrom = new THREE.Vector3();
  private flightFromTarget = new THREE.Vector3();
  private flightToOffset = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.02;
    this.controls.maxDistance = 3500;
    this.controls.zoomSpeed = 0.9;
    this.controls.rotateSpeed = 0.6;
  }

  focus(target: FocusTarget, viewOffsetDir?: THREE.Vector3) {
    const targetPos = target.getWorldPosition().clone();
    const distance = Math.max(target.sceneRadius * 4.2, target.sceneRadius + 0.6);
    const dir = viewOffsetDir ?? this.defaultViewDir(targetPos);

    this.flightFrom.copy(this.camera.position);
    this.flightFromTarget.copy(this.controls.target);
    this.flightToOffset.copy(dir).multiplyScalar(distance);

    this.target = target;
    this.lastTargetPos.copy(targetPos);
    this.flightT = 0;
  }

  clearFocus() {
    this.target = null;
  }

  /**
   * Frames the target from a 3/4 angle relative to the Sun-target line (assuming the Sun
   * sits at the origin) so the lit hemisphere faces the camera instead of either staring
   * straight into the Sun or straight at the target's night side.
   */
  private defaultViewDir(targetPos: THREE.Vector3): THREE.Vector3 {
    const up = new THREE.Vector3(0, 1, 0);
    if (targetPos.lengthSq() < 1e-4) return new THREE.Vector3(0.55, 0.32, 0.77).normalize();
    const radial = targetPos.clone().normalize();
    const tangent = new THREE.Vector3().crossVectors(up, radial).normalize();
    // Negative radial component biases the camera toward the sunward side so the lit
    // hemisphere faces the viewer, instead of framing the target's night side. A fairly
    // steep elevation keeps ringed planets framed from above rather than edge-on, so the
    // rings don't visually eat into the lit crescent.
    return tangent.multiplyScalar(0.6).add(radial.multiplyScalar(-1.0)).add(up.multiplyScalar(0.35)).normalize();
  }

  resetToOverview() {
    this.target = null;
    const targetPos = new THREE.Vector3(0, 0, 0);
    this.flightFrom.copy(this.camera.position);
    this.flightFromTarget.copy(this.controls.target);
    this.flightToOffset.set(60, 45, 95);
    this.lastTargetPos.copy(targetPos);
    this.flightT = 0;
    this._overviewFlight = true;
  }

  private _overviewFlight = false;

  update(dt: number) {
    if (this.flightT < 1) {
      this.flightT = Math.min(1, this.flightT + dt / FLIGHT_DURATION);
      const e = easeInOutCubic(this.flightT);
      const destTargetPos = this._overviewFlight ? this.lastTargetPos : (this.target ? this.target.getWorldPosition() : this.lastTargetPos);
      const destCamPos = destTargetPos.clone().add(this.flightToOffset);

      this.camera.position.lerpVectors(this.flightFrom, destCamPos, e);
      this.controls.target.lerpVectors(this.flightFromTarget, destTargetPos, e);
      if (this.flightT >= 1) this._overviewFlight = false;
    } else if (this.target) {
      const newPos = this.target.getWorldPosition();
      const delta = new THREE.Vector3().subVectors(newPos, this.lastTargetPos);
      if (delta.lengthSq() > 0) {
        this.camera.position.add(delta);
        this.controls.target.add(delta);
      }
      this.lastTargetPos.copy(newPos);
    }
    this.controls.update();
  }
}
