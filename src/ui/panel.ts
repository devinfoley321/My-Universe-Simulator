export interface BodyInfo {
  key: string;
  name: string;
  type: string;
  color: string;
  facts: [string, string][];
  description: string;
}

export class UIPanel {
  private navEl: HTMLElement;
  private infoEl: HTMLElement;
  private navButtons = new Map<string, HTMLButtonElement>();

  constructor() {
    this.navEl = document.getElementById('body-nav')!;
    this.infoEl = document.getElementById('info-panel')!;
    document.getElementById('info-close')!.addEventListener('click', () => this.hideInfo());
  }

  addNavButton(info: BodyInfo, onClick: () => void) {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.innerHTML = `<span class="nav-dot" style="background:${info.color}; box-shadow: 0 0 6px ${info.color}"></span>${info.name}`;
    btn.addEventListener('click', onClick);
    this.navEl.appendChild(btn);
    this.navButtons.set(info.key, btn);
  }

  setActive(key: string | null) {
    for (const [k, btn] of this.navButtons) {
      btn.classList.toggle('active', k === key);
    }
  }

  showInfo(info: BodyInfo) {
    this.infoEl.classList.remove('hidden');
    document.getElementById('info-name')!.textContent = info.name;
    document.getElementById('info-type')!.textContent = info.type;
    const statsEl = document.getElementById('info-stats')!;
    statsEl.innerHTML = info.facts
      .map(([label, value]) => `<div><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`)
      .join('');
    document.getElementById('info-desc')!.textContent = info.description;
  }

  hideInfo() {
    this.infoEl.classList.add('hidden');
    this.setActive(null);
  }
}
