// Real astronomical data (km, days, hours, degrees, AU). Used to drive physically
// proportionate motion; on-screen distances/sizes are then remapped by the scale
// functions below so the whole system is visible and explorable at once.

export type SurfaceType =
  | 'sun'
  | 'cratered' // mercury, moon, etc
  | 'venus'
  | 'earth'
  | 'mars'
  | 'gasgiant'
  | 'saturn'
  | 'icegiant'
  | 'pluto'
  | 'moon-generic'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'titan';

export interface RingData {
  innerKm: number;
  outerKm: number;
  color: string;
  opacity: number;
}

export interface MoonDatum {
  name: string;
  radiusKm: number;
  orbitKm: number; // from planet center
  orbitPeriodDays: number;
  tiltDeg: number;
  surface: SurfaceType;
  color: string;
  retrograde?: boolean;
  sceneOrbitOverride?: number; // manual scene-unit orbit radius for visual clarity
}

export interface PlanetDatum {
  key: string;
  name: string;
  type: string; // "Terrestrial Planet", "Gas Giant", etc
  radiusKm: number;
  semiMajorAU: number;
  eccentricity: number;
  orbitPeriodDays: number;
  inclinationDeg: number;
  longPeriapsisDeg: number; // orientation of the ellipse within its plane
  meanLongitudeDeg: number; // starting position along the orbit
  rotationHours: number; // negative = retrograde
  tiltDeg: number;
  color: string;
  surface: SurfaceType;
  rings?: RingData;
  moons?: MoonDatum[];
  facts: [string, string][];
  description: string;
}

export const SUN = {
  name: 'Sun',
  radiusKm: 696000,
  rotationHours: 587, // ~24.5 days equatorial
  color: '#fff2d0',
  facts: [
    ['Type', 'G-type Main Sequence'],
    ['Surface Temp', '5,505 °C'],
    ['Mass', '333,000 × Earth'],
    ['Age', '4.6 billion years'],
  ],
  description:
    'A G-type main-sequence star containing 99.8% of the Solar System’s mass. Its core fuses roughly 600 million tons of hydrogen into helium every second, radiating the light and heat that makes every other body in this simulation visible.',
};

export const PLANETS: PlanetDatum[] = [
  {
    key: 'mercury',
    name: 'Mercury',
    type: 'Terrestrial Planet',
    radiusKm: 2439.7,
    semiMajorAU: 0.387,
    eccentricity: 0.206,
    orbitPeriodDays: 87.97,
    inclinationDeg: 7.0,
    longPeriapsisDeg: 77.5,
    meanLongitudeDeg: 252.25,
    rotationHours: 1407.6,
    tiltDeg: 0.03,
    color: '#9c9187',
    surface: 'cratered',
    facts: [
      ['Orbit', '88 days'],
      ['Day Length', '58.6 Earth days'],
      ['Gravity', '0.38 g'],
      ['Moons', '0'],
    ],
    description:
      'The smallest and innermost planet. Mercury has almost no atmosphere to retain heat, so its surface swings from 430°C in sunlight to -180°C in shadow. Its surface closely resembles our Moon, saturated with impact craters.',
  },
  {
    key: 'venus',
    name: 'Venus',
    type: 'Terrestrial Planet',
    radiusKm: 6051.8,
    semiMajorAU: 0.723,
    eccentricity: 0.007,
    orbitPeriodDays: 224.7,
    inclinationDeg: 3.39,
    longPeriapsisDeg: 131.5,
    meanLongitudeDeg: 181.98,
    rotationHours: -5832.5,
    tiltDeg: 177.4,
    color: '#e8cf9f',
    surface: 'venus',
    facts: [
      ['Orbit', '224.7 days'],
      ['Day Length', '243 Earth days'],
      ['Gravity', '0.90 g'],
      ['Moons', '0'],
    ],
    description:
      'The hottest planet, thanks to a crushing carbon-dioxide atmosphere and runaway greenhouse effect that keeps its surface near 465°C. Venus rotates backwards and so slowly that its day is longer than its year.',
  },
  {
    key: 'earth',
    name: 'Earth',
    type: 'Terrestrial Planet',
    radiusKm: 6371,
    semiMajorAU: 1.0,
    eccentricity: 0.0167,
    orbitPeriodDays: 365.25,
    inclinationDeg: 0.0,
    longPeriapsisDeg: 102.9,
    meanLongitudeDeg: 100.47,
    rotationHours: 23.934,
    tiltDeg: 23.44,
    color: '#2b5c8a',
    surface: 'earth',
    facts: [
      ['Orbit', '365.25 days'],
      ['Day Length', '24 hours'],
      ['Gravity', '1.00 g'],
      ['Moons', '1'],
    ],
    description:
      'Our home. The only known world with liquid water oceans covering most of its surface, a nitrogen-oxygen atmosphere, and a magnetic field strong enough to shield life from solar wind.',
    moons: [
      {
        name: 'Moon',
        radiusKm: 1737.4,
        orbitKm: 384400,
        orbitPeriodDays: 27.32,
        tiltDeg: 6.68,
        surface: 'moon-generic',
        color: '#b9b3a8',
      },
    ],
  },
  {
    key: 'mars',
    name: 'Mars',
    type: 'Terrestrial Planet',
    radiusKm: 3389.5,
    semiMajorAU: 1.524,
    eccentricity: 0.093,
    orbitPeriodDays: 686.98,
    inclinationDeg: 1.85,
    longPeriapsisDeg: 336.0,
    meanLongitudeDeg: 355.43,
    rotationHours: 24.62,
    tiltDeg: 25.19,
    color: '#b3543a',
    surface: 'mars',
    facts: [
      ['Orbit', '687 days'],
      ['Day Length', '24.6 hours'],
      ['Gravity', '0.38 g'],
      ['Moons', '2'],
    ],
    description:
      'The Red Planet, colored by iron oxide dust. Home to Olympus Mons, the largest volcano in the Solar System, and Valles Marineris, a canyon system stretching a quarter of the way around the planet.',
    moons: [
      {
        name: 'Phobos',
        radiusKm: 11.1,
        orbitKm: 9376,
        orbitPeriodDays: 0.319,
        tiltDeg: 1.1,
        surface: 'moon-generic',
        color: '#8a7a6a',
        sceneOrbitOverride: 1.35,
      },
      {
        name: 'Deimos',
        radiusKm: 6.2,
        orbitKm: 23463,
        orbitPeriodDays: 1.263,
        tiltDeg: 0.9,
        surface: 'moon-generic',
        color: '#8a7a6a',
        sceneOrbitOverride: 1.85,
      },
    ],
  },
  {
    key: 'jupiter',
    name: 'Jupiter',
    type: 'Gas Giant',
    radiusKm: 69911,
    semiMajorAU: 5.203,
    eccentricity: 0.048,
    orbitPeriodDays: 4332.6,
    inclinationDeg: 1.3,
    longPeriapsisDeg: 14.7,
    meanLongitudeDeg: 34.35,
    rotationHours: 9.925,
    tiltDeg: 3.13,
    color: '#c9a279',
    surface: 'gasgiant',
    facts: [
      ['Orbit', '11.9 years'],
      ['Day Length', '9.9 hours'],
      ['Gravity', '2.53 g'],
      ['Moons', '95'],
    ],
    description:
      'The largest planet — a gas giant so massive that 1,300 Earths would fit inside it. The Great Red Spot is a storm wider than Earth that has raged for centuries. Its four largest moons were first seen by Galileo in 1610.',
    moons: [
      { name: 'Io', radiusKm: 1821.6, orbitKm: 421700, orbitPeriodDays: 1.77, tiltDeg: 0.04, surface: 'io', color: '#e8d27a', sceneOrbitOverride: 2.4 },
      { name: 'Europa', radiusKm: 1560.8, orbitKm: 671100, orbitPeriodDays: 3.55, tiltDeg: 0.47, surface: 'europa', color: '#d8c9a8', sceneOrbitOverride: 3.05 },
      { name: 'Ganymede', radiusKm: 2634.1, orbitKm: 1070400, orbitPeriodDays: 7.15, tiltDeg: 0.2, surface: 'ganymede', color: '#a89a8a', sceneOrbitOverride: 3.85 },
      { name: 'Callisto', radiusKm: 2410.3, orbitKm: 1882700, orbitPeriodDays: 16.69, tiltDeg: 0.19, surface: 'moon-generic', color: '#6f6558', sceneOrbitOverride: 4.7 },
    ],
  },
  {
    key: 'saturn',
    name: 'Saturn',
    type: 'Gas Giant',
    radiusKm: 58232,
    semiMajorAU: 9.537,
    eccentricity: 0.054,
    orbitPeriodDays: 10759,
    inclinationDeg: 2.49,
    longPeriapsisDeg: 92.6,
    meanLongitudeDeg: 50.08,
    rotationHours: 10.66,
    tiltDeg: 26.73,
    color: '#d9c088',
    surface: 'saturn',
    rings: { innerKm: 74500, outerKm: 140220, color: '#cbb98f', opacity: 0.9 },
    facts: [
      ['Orbit', '29.5 years'],
      ['Day Length', '10.7 hours'],
      ['Gravity', '1.07 g'],
      ['Moons', '146'],
    ],
    description:
      'Famous for its dazzling ring system — billions of ice and rock particles ranging from dust grains to boulders. Saturn is the least dense planet; it would float in a bathtub large enough to hold it.',
    moons: [
      { name: 'Titan', radiusKm: 2574.7, orbitKm: 1221900, orbitPeriodDays: 15.95, tiltDeg: 0.3, surface: 'titan', color: '#d8a85c', sceneOrbitOverride: 5.6 },
    ],
  },
  {
    key: 'uranus',
    name: 'Uranus',
    type: 'Ice Giant',
    radiusKm: 25362,
    semiMajorAU: 19.191,
    eccentricity: 0.047,
    orbitPeriodDays: 30688.5,
    inclinationDeg: 0.77,
    longPeriapsisDeg: 170.0,
    meanLongitudeDeg: 314.06,
    rotationHours: -17.24,
    tiltDeg: 97.77,
    color: '#a9d8dd',
    surface: 'icegiant',
    rings: { innerKm: 41900, outerKm: 51100, color: '#9fbfc4', opacity: 0.45 },
    facts: [
      ['Orbit', '84 years'],
      ['Day Length', '17.2 hours'],
      ['Gravity', '0.89 g'],
      ['Moons', '28'],
    ],
    description:
      'An ice giant tipped almost completely on its side, likely from an ancient collision — it essentially rolls along its orbit. Its pale cyan color comes from methane absorbing red light in its atmosphere.',
  },
  {
    key: 'neptune',
    name: 'Neptune',
    type: 'Ice Giant',
    radiusKm: 24622,
    semiMajorAU: 30.07,
    eccentricity: 0.009,
    orbitPeriodDays: 60195,
    inclinationDeg: 1.77,
    longPeriapsisDeg: 44.0,
    meanLongitudeDeg: 304.35,
    rotationHours: 16.11,
    tiltDeg: 28.32,
    color: '#3a5fd9',
    surface: 'icegiant',
    facts: [
      ['Orbit', '165 years'],
      ['Day Length', '16.1 hours'],
      ['Gravity', '1.14 g'],
      ['Moons', '16'],
    ],
    description:
      'The windiest world, with supersonic storms reaching 2,100 km/h. Neptune was the first planet located by mathematical prediction rather than direct observation, discovered in 1846 from irregularities in Uranus’s orbit.',
    moons: [
      {
        name: 'Triton',
        radiusKm: 1353.4,
        orbitKm: 354759,
        orbitPeriodDays: 5.88,
        tiltDeg: 157,
        surface: 'moon-generic',
        color: '#cdd3d8',
        retrograde: true,
        sceneOrbitOverride: 2.6,
      },
    ],
  },
  {
    key: 'pluto',
    name: 'Pluto',
    type: 'Dwarf Planet',
    radiusKm: 1188.3,
    semiMajorAU: 39.48,
    eccentricity: 0.2488,
    orbitPeriodDays: 90560,
    inclinationDeg: 17.16,
    longPeriapsisDeg: 224.0,
    meanLongitudeDeg: 238.93,
    rotationHours: -153.3,
    tiltDeg: 122.5,
    color: '#cbb198',
    surface: 'pluto',
    facts: [
      ['Orbit', '248 years'],
      ['Day Length', '6.4 days'],
      ['Gravity', '0.06 g'],
      ['Moons', '5'],
    ],
    description:
      'Reclassified as a dwarf planet in 2006, Pluto has a heart-shaped nitrogen-ice plain named Tombaugh Regio and a moon, Charon, so large the two bodies orbit a point in the space between them.',
  },
];

export const SCALE = {
  DIST_K: 16,
  DIST_EXP: 0.5,
  RADIUS_EXP: 0.62,
  SUN_SCENE_RADIUS: 1.3,
  MOON_GAP_BASE: 0.55,
  MOON_GAP_SCALE: 0.62,
};

const EARTH_RADIUS_KM = 6371;
const RADIUS_K = 1 / Math.pow(EARTH_RADIUS_KM, SCALE.RADIUS_EXP);

export function sceneRadius(radiusKm: number): number {
  return RADIUS_K * Math.pow(radiusKm, SCALE.RADIUS_EXP);
}

export function sceneDistance(au: number): number {
  return SCALE.DIST_K * Math.pow(au, SCALE.DIST_EXP);
}

export function moonSceneOrbit(planetSceneRadius: number, moon: MoonDatum): number {
  if (moon.sceneOrbitOverride != null) return planetSceneRadius + moon.sceneOrbitOverride;
  const distFactor = Math.sqrt(moon.orbitKm / 100000);
  return planetSceneRadius + SCALE.MOON_GAP_BASE + distFactor * SCALE.MOON_GAP_SCALE;
}
