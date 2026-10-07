// Heaven Lands' light: what makes its places feel heavenly rather than merely
// sunny. Two parts, both nearly free on a phone:
//   - a colour grade inside the lighting shader everything lit already runs
//     through (LitPipeline's `grade`): the middle tones rise, highlights roll off
//     softly and bloom a touch toward the light's colour, and the deepest shade
//     lifts to a pale tint, so nothing is ink-black;
//   - the sky pass that already draws the cloud shadows (SkyPipeline) trades the
//     dark vignette for a luminous veil, brightest along the top, and lays slow
//     shafts of light across the land.
// Each phase of the day has its own: rose and gold mornings, cream noon, peach
// sunsets, and silver-blue nights that stay soft and readable.

import { grade } from '../game/LitPipeline';
import { skyState } from '../game/SkyPipeline';
import { weather } from './weather';

type V3 = [number, number, number];
type V4 = [number, number, number, number];

interface Glow {
  exposure: number;
  shoulder: number;
  sat: number;
  lift: V3;
  glow: V3;
  /** Veil colour and strength. */
  veil: V4;
  /** Shaft colour and strength. */
  shafts: V4;
}

/** How much of the world's cloud shadow is kept. */
const CLOUD_SHADOW = 0.45;

/** Under a shower: how much the light dims and greys, the grey-blue the veil turns, and the cloud shadow it brings. */
const RAIN_DIM = 0.15;
const RAIN_GREY = 0.35;
const RAIN_VEIL: V4 = [0.8, 0.85, 0.94, 0.26];
const RAIN_CLOUDS = 0.6;

/** In daynight's phase order: morning, day, sunset, night. */
const PHASE_GLOW: Glow[] = [
  // Morning: rose in the shade, gold light, the strongest shafts of the day.
  { exposure: 1.08, shoulder: 0.3, sat: 1.12, lift: [0.1, 0.07, 0.12], glow: [0.1, 0.07, 0.03], veil: [1, 0.9, 0.78, 0.2], shafts: [1, 0.88, 0.62, 0.2] },
  // Day: clean cream light, airy pale-lilac shade.
  { exposure: 1.06, shoulder: 0.28, sat: 1.1, lift: [0.08, 0.08, 0.12], glow: [0.08, 0.07, 0.04], veil: [1, 0.96, 0.86, 0.16], shafts: [1, 0.95, 0.8, 0.16] },
  // Sunset: honey light, rose shade, warm gold shafts.
  { exposure: 1.08, shoulder: 0.3, sat: 1.08, lift: [0.12, 0.06, 0.12], glow: [0.12, 0.07, 0.03], veil: [1, 0.8, 0.62, 0.2], shafts: [1, 0.8, 0.5, 0.2] },
  // Night: lifted silver-blue, faint moonbeams; still night, never murky.
  { exposure: 1.3, shoulder: 0.4, sat: 0.96, lift: [0.07, 0.08, 0.14], glow: [0.05, 0.07, 0.12], veil: [0.62, 0.7, 0.95, 0.24], shafts: [0.7, 0.8, 1, 0.07] },
];

/** Blend the phases' light by their weights and hand it to the shaders. */
export function heavenLight(weights: readonly number[], time: number): void {
  let exposure = 0;
  let shoulder = 0;
  let sat = 0;
  const lift: V3 = [0, 0, 0];
  const glow: V3 = [0, 0, 0];
  const veil: V4 = [0, 0, 0, 0];
  const shafts: V4 = [0, 0, 0, 0];
  PHASE_GLOW.forEach((g, i) => {
    const w = weights[i] ?? 0;
    exposure += g.exposure * w;
    shoulder += g.shoulder * w;
    sat += g.sat * w;
    for (let c = 0; c < 3; c++) {
      lift[c] += g.lift[c] * w;
      glow[c] += g.glow[c] * w;
    }
    for (let c = 0; c < 4; c++) {
      veil[c] += g.veil[c] * w;
      shafts[c] += g.shafts[c] * w;
    }
  });
  // A shower greys the light and takes the shafts of sun away.
  const r = weather.rain;
  if (r > 0) {
    exposure *= 1 - RAIN_DIM * r;
    sat *= 1 - RAIN_GREY * r;
    for (let c = 0; c < 4; c++) veil[c] += (RAIN_VEIL[c] - veil[c]) * r * 0.8;
    shafts[3] *= 1 - r;
  }
  grade.on = true;
  grade.exposure = exposure;
  grade.shoulder = shoulder;
  grade.sat = sat;
  grade.lift = lift;
  grade.glow = glow;
  // Cloud shadows drift lighter here: the sky is mostly light.
  skyState.clouds *= CLOUD_SHADOW;
  skyState.clouds += (RAIN_CLOUDS - skyState.clouds) * r;
  const h = skyState.heaven;
  h.on = true;
  h.veil = veil;
  h.shafts = shafts;
  h.time = time / 1000;
}
