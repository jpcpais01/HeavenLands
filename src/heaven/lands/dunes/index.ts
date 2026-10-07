// Sunsong Dunes: an endless sea of golden dunes under a wide sky, oases of
// turquoise water and date palms, caravan camps, sandstone arches and old
// ruins half under the sand; silver-blue by night, the singing sand glinting
// (see gen.ts for how it grows, art.ts for what stands in it, life.ts for the
// sand blowing off the crests and the light on the pools).

import { smooth } from '../paint';
import type { LandDef } from '../types';
import { landGen, landSheets } from '../gens';
import type { DuneGen } from './gen';
import { DuneWind } from './life';

/** An oasis is heard this far from its water (px), at most this loud. */
const POOL_REACH = 220;
const POOL_LOUD = 0.5;

const gen = () => landGen('dunes') as DuneGen;

export const DUNES: LandDef = {
  id: 'dunes',
  name: 'Sunsong Dunes',
  blurb: 'Where the sand sings',
  accent: 0xf0b860,
  gen,
  sheets: () => landSheets('dunes'),
  dayNight: true,
  drift: { tints: [0xffe8c0, 0xf6d49a, 0xfff4dc], frequency: 1500 },
  walkers: [
    {
      id: 'camel',
      sheet: 'dune_camel',
      walk: 'walk',
      idle: 'idle',
      speed: 6,
      run: 16,
      range: 22,
      fear: 22,
      where: (x, y) => gen().open(x, y),
    },
    {
      id: 'fennec',
      sheet: 'dune_fennec',
      walk: 'walk',
      idle: 'idle',
      speed: 16,
      run: 70,
      range: 60,
      fear: 58,
      where: (x, y) => gen().open(x, y),
    },
  ],
  extra: (world, g) => new DuneWind(world, g as DuneGen),
  sound: (g, x, y) => {
    // The nearest oasis: its water lapping and, by night, its frogs, from its side.
    const p = (g as DuneGen).nearestPool(x, y, POOL_REACH);
    if (!p) return { stream: 0, streamPan: 0, pond: 0, pondPan: 0 };
    return { stream: 0, streamPan: 0, pond: (1 - smooth(10, POOL_REACH, p.d)) * POOL_LOUD, pondPan: Math.max(-1, Math.min(1, (p.x - x) / 160)) };
  },
};
