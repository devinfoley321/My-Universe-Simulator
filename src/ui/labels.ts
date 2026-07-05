import * as THREE from 'three';

export interface LabelTarget {
  name: string;
  getWorldPosition(): THREE.Vector3;
  onClick: () => void;
  minor?: boolean;
}

interface Entry {
  target: LabelTarget;
  el: HTMLElement;
  dot: HTMLElement;
}

export class LabelManager {
  private entries: Entry[] = [];
  private container: HTMLElement;
  visible = true;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  add(target: LabelTarget) {
    const el = document.createElement('div');
    el.className = 'body-label' + (target.minor ? ' dimmed' : '');
    const dot = document.createElement('div');
    dot.className = 'dot';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = target.name;
    el.appendChild(dot);
    el.appendChild(name);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      target.onClick();
    });
    this.container.appendChild(el);
    this.entries.push({ target, el, dot });
  }

  setVisible(v: boolean) {
    this.visible = v;
  }

  update(camera: THREE.PerspectiveCamera, width: number, height: number) {
    const v = new THREE.Vector3();
    for (const entry of this.entries) {
      if (!this.visible) {
        entry.el.style.display = 'none';
        continue;
      }
      v.copy(entry.target.getWorldPosition());
      const distToCam = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1 || v.z < -1) {
        entry.el.style.display = 'none';
        continue;
      }
      entry.el.style.display = '';
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-v.y * 0.5 + 0.5) * height;
      entry.el.style.left = `${x}px`;
      entry.el.style.top = `${y}px`;
      entry.el.classList.toggle('dimmed', !!entry.target.minor && distToCam > 40);
    }
  }
}
