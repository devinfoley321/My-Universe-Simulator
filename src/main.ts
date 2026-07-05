import './style.css';
import * as THREE from 'three';
import { setupScene } from './scene/setup';
import { createStarfield } from './scene/starfield';
import { SunObject } from './objects/SunObject';
import { Planet, MoonBody, type Resolution } from './objects/CelestialBody';
import { createAsteroidBelt, updateAsteroidBelt } from './objects/AsteroidBelt';
import { CameraRig, type FocusTarget } from './camera/CameraRig';
import { LabelManager } from './ui/labels';
import { UIPanel, type BodyInfo } from './ui/panel';
import { PLANETS, SUN } from './data/bodies';
import { nextFrame } from './textures/canvasUtils';
import { createAmbientAudio } from './audio/ambient';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const loadingEl = document.getElementById('loading')!;
const loadingFill = document.getElementById('loading-fill')!;
const loadingStatus = document.getElementById('loading-status')!;
const uiEl = document.getElementById('ui')!;
const labelsLayer = document.getElementById('labels-layer')!;
const hintEl = document.getElementById('hint')!;

const PLANET_RES: Record<string, Resolution> = {
  mercury: { w: 1024, h: 512 },
  venus: { w: 1024, h: 512 },
  earth: { w: 2048, h: 1024 },
  mars: { w: 1280, h: 640 },
  jupiter: { w: 1536, h: 768 },
  saturn: { w: 1536, h: 768 },
  uranus: { w: 768, h: 384 },
  neptune: { w: 1024, h: 512 },
  pluto: { w: 768, h: 384 },
};
const DEFAULT_PLANET_RES: Resolution = { w: 1024, h: 512 };
const HERO_MOON_RES: Resolution = { w: 768, h: 384 };
const SMALL_MOON_RES: Resolution = { w: 320, h: 160 };
const HERO_MOONS = new Set(['moon', 'io', 'europa', 'ganymede', 'callisto', 'titan', 'triton']);

function setLoading(pct: number, status: string) {
  loadingFill.style.width = `${pct}%`;
  loadingStatus.textContent = status;
}

async function boot() {
  const rig = setupScene(canvas);
  const { scene, camera, renderer, composer } = rig;

  scene.add(new THREE.AmbientLight(0x404a66, 0.32));

  setLoading(4, 'Painting the Milky Way…');
  await nextFrame();
  const starfield = createStarfield();
  scene.add(starfield.group);

  setLoading(10, 'Igniting the Sun…');
  await nextFrame();
  const sun = new SunObject();
  scene.add(sun.group);

  const orbitsGroup = new THREE.Group();
  const planetsGroup = new THREE.Group();
  scene.add(orbitsGroup, planetsGroup);

  const cameraRig = new CameraRig(camera, renderer.domElement);
  const labelManager = new LabelManager(labelsLayer);
  const uiPanel = new UIPanel();

  const pickables: { mesh: THREE.Object3D; focus: FocusTarget; info: BodyInfo }[] = [];
  const planets: Planet[] = [];

  const sunInfo: BodyInfo = { key: 'sun', name: SUN.name, type: 'Star', color: '#ffd27a', facts: SUN.facts as [string, string][], description: SUN.description };
  const sunFocus: FocusTarget = { getWorldPosition: () => sun.group.position, sceneRadius: 3.0 };

  function focusOn(key: string, focus: FocusTarget, info: BodyInfo) {
    cameraRig.focus(focus);
    uiPanel.showInfo(info);
    uiPanel.setActive(key);
    hintEl.classList.add('faded');
  }

  uiPanel.addNavButton(sunInfo, () => focusOn('sun', sunFocus, sunInfo));
  labelManager.add({ name: SUN.name, getWorldPosition: () => sun.group.position, onClick: () => focusOn('sun', sunFocus, sunInfo) });
  pickables.push({ mesh: sun.mesh, focus: sunFocus, info: sunInfo });

  const total = PLANETS.length;
  for (let i = 0; i < total; i++) {
    const data = PLANETS[i];
    setLoading(12 + (i / total) * 78, `Sculpting ${data.name}…`);
    await nextFrame();

    const res = PLANET_RES[data.key] ?? DEFAULT_PLANET_RES;
    const moonRes = (moonName: string) => (HERO_MOONS.has(moonName.toLowerCase()) ? HERO_MOON_RES : SMALL_MOON_RES);
    const planet = new Planet(data, res, moonRes);
    planets.push(planet);
    planetsGroup.add(planet.orbitGroup);
    orbitsGroup.add(planet.orbitLine);

    const info: BodyInfo = { key: data.key, name: data.name, type: data.type, color: data.color, facts: data.facts, description: data.description };
    uiPanel.addNavButton(info, () => focusOn(data.key, planet, info));
    labelManager.add({ name: data.name, getWorldPosition: () => planet.getWorldPosition(), onClick: () => focusOn(data.key, planet, info) });
    pickables.push({ mesh: planet.mesh, focus: planet, info });

    for (const moon of planet.moons) {
      const moonKey = moon.data.name.toLowerCase();
      planetsGroup.add(moon.group);
      orbitsGroup.add(moon.orbitLine);
      const moonInfo: BodyInfo = {
        key: moonKey,
        name: moon.data.name,
        type: 'Moon of ' + data.name,
        color: moon.data.color,
        facts: [
          ['Radius', `${moon.data.radiusKm.toLocaleString()} km`],
          ['Orbit Period', `${moon.data.orbitPeriodDays.toFixed(2)} days`],
        ],
        description: `A natural satellite of ${data.name}.`,
      };
      uiPanel_registerMoon(moon, moonInfo);
    }

    function uiPanel_registerMoon(moon: MoonBody, moonInfo: BodyInfo) {
      labelManager.add({ name: moonInfo.name, getWorldPosition: () => moon.getWorldPosition(), onClick: () => focusOn(moonInfo.key, moon, moonInfo), minor: true });
      pickables.push({ mesh: moon.mesh, focus: moon, info: moonInfo });
    }
  }

  setLoading(92, 'Scattering the asteroid belt…');
  await nextFrame();
  const asteroidBelt = createAsteroidBelt();
  scene.add(asteroidBelt);

  setLoading(97, 'Tuning the void…');
  await nextFrame();
  const ambientAudio = createAmbientAudio();

  setLoading(100, 'Ready.');
  await nextFrame();

  loadingEl.classList.add('hidden');
  uiEl.classList.remove('hidden');
  cameraRig.resetToOverview();

  // ---------------- Interaction ----------------
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let pointerDownPos: [number, number] | null = null;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDownPos = [e.clientX, e.clientY];
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!pointerDownPos) return;
    const dx = e.clientX - pointerDownPos[0];
    const dy = e.clientY - pointerDownPos[1];
    pointerDownPos = null;
    if (Math.hypot(dx, dy) > 6) return; // treat as drag, not click

    pointerNdc.x = (e.clientX / innerWidth) * 2 - 1;
    pointerNdc.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(pickables.map((p) => p.mesh), false);
    if (hits.length > 0) {
      const hitMesh = hits[0].object;
      const found = pickables.find((p) => p.mesh === hitMesh);
      if (found) focusOn(found.info.key, found.focus, found.info);
    }
  });

  document.getElementById('btn-freecam')!.addEventListener('click', () => {
    cameraRig.resetToOverview();
    uiPanel.hideInfo();
  });

  // Play / pause
  let playing = true;
  const btnPlay = document.getElementById('btn-play')!;
  btnPlay.addEventListener('click', () => {
    playing = !playing;
    btnPlay.textContent = playing ? '⏸' : '▶';
  });

  // Speed slider: logarithmic mapping, 0.1 to 100 days/sec
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedLabel = document.getElementById('speed-label')!;
  let daysPerSecond = 1;
  function updateSpeedFromSlider() {
    const v = parseFloat(speedSlider.value);
    daysPerSecond = Math.pow(10, v / 2 - 1);
    let label: string;
    if (daysPerSecond < 1) label = `${(daysPerSecond * 24).toFixed(1)} hr/sec`;
    else if (daysPerSecond < 365) label = `${daysPerSecond.toFixed(daysPerSecond < 10 ? 1 : 0)} day/sec`;
    else label = `${(daysPerSecond / 365).toFixed(1)} yr/sec`;
    speedLabel.textContent = label;
  }
  speedSlider.addEventListener('input', updateSpeedFromSlider);
  updateSpeedFromSlider();

  // Labels / orbits toggles
  const btnLabels = document.getElementById('btn-labels')!;
  btnLabels.addEventListener('click', () => {
    labelManager.setVisible(!labelManager.visible);
    btnLabels.classList.toggle('active', labelManager.visible);
  });
  let orbitsVisible = true;
  const btnOrbits = document.getElementById('btn-orbits')!;
  btnOrbits.addEventListener('click', () => {
    orbitsVisible = !orbitsVisible;
    orbitsGroup.visible = orbitsVisible;
    btnOrbits.classList.toggle('active', orbitsVisible);
  });

  const btnSound = document.getElementById('btn-sound')!;
  btnSound.addEventListener('click', () => {
    const on = ambientAudio.toggle();
    btnSound.textContent = on ? '🔊' : '🔈';
    btnSound.classList.toggle('active', on);
  });

  // ---------------- Animation loop ----------------
  let simDays = 0;
  const timer = new THREE.Timer();
  timer.connect(document);

  function animate() {
    requestAnimationFrame(animate);
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    const elapsed = timer.getElapsed();

    if (playing) simDays += dt * daysPerSecond;

    starfield.update(elapsed);
    sun.update(elapsed);
    for (const p of planets) p.update(simDays);
    updateAsteroidBelt(asteroidBelt, simDays);
    cameraRig.update(dt);
    labelManager.update(camera, innerWidth, innerHeight);

    composer.render();
  }
  animate();

  (window as any).__aphelionReady = true;
}

boot();
