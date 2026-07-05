# Aphelion — Solar System Simulator

An interactive 3D solar system built with Three.js and TypeScript. Explore the Sun, all eight planets, their major moons, Saturn's rings, and the asteroid belt — with procedurally generated textures, physically-based orbits, and a real-time control panel.

**Live demo:** https://devinfoley321.github.io/My-Universe-Simulator/

## Features

- **Real astronomical data** — orbital periods, eccentricities, inclinations, axial tilts, and rotation rates are drawn from real values (km, days, degrees, AU), then remapped to on-screen scale so the whole system is visible and explorable at once
- **Elliptical Kepler orbits** for every planet and moon, not just circles
- **Procedurally generated surfaces** for each body (cratered worlds, gas giants, ice giants, Earth, Mars, etc.) built at runtime from noise functions — no texture files to download
- **Saturn's rings** and other ringed bodies, plus a full asteroid belt
- **Major moons** modeled per-planet (e.g. Io, Europa, Ganymede, Titan) with their own orbits and surfaces
- **Sun shader** with animated surface turbulence and a glowing atmosphere/corona effect
- **Starfield background** for a sense of scale and depth
- **Click-to-explore info panel** — click any body for its name, type, and key facts
- **Free camera + orbit camera rig** with smooth transitions between bodies
- **Ambient audio** track (toggleable)
- **Playback controls** — play/pause, adjustable simulation speed (days per second), and toggles for labels and orbit paths

## Controls

| Action | Effect |
|---|---|
| Click a world | Focus the camera and open its info panel |
| Drag | Orbit the camera |
| Scroll | Zoom in/out |
| Play/Pause button | Start or stop time |
| Speed slider | Adjust simulation speed (days per second) |
| Labels toggle | Show/hide body name labels |
| Orbits toggle | Show/hide orbit paths |
| Free Cam | Reset to a free-roaming camera |
| Sound toggle | Enable/disable ambient audio |

## Tech Stack

- [Three.js](https://threejs.org/) for 3D rendering
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for dev server and bundling
- [simplex-noise](https://www.npmjs.com/package/simplex-noise) for procedural texture generation

## Development

```bash
npm install
npm run dev       # start local dev server
npm run build     # type-check and build to dist/
npm run preview   # preview the production build
```

## Deployment

Pushes to `main` automatically build and deploy to GitHub Pages via the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Project Structure

```
src/
├── main.ts              # entry point
├── scene/                # scene setup and starfield
├── objects/               # celestial body, ring, and asteroid belt meshes
├── systems/               # orbital mechanics
├── shaders/               # sun and atmosphere GLSL
├── textures/              # procedural surface/noise generation
├── camera/                # camera rig
├── ui/                    # labels and info panel
├── audio/                 # ambient sound
└── data/                  # planet and moon astronomical data
```
