// Starwatch as the world's arena (see world/arenas.ts ArenaDef): a painted
// ground (the night sky and the isle, built by the arena worker behind its
// loading screen), its feet from the layout, no monsters, always night. Its
// living parts are Starwatch.ts, built through cozy.land.

import type Phaser from 'phaser';
import type { ArenaDef } from '../../world/arenas';
import { warmArenaTextures } from '../../art/arenaLoader';
import { ISLE_X, ISLE_Y } from './art';
import { SW_H, SW_SPAWN, SW_W, TERRACE, starwatchWalkable } from './layout';

export const STARWATCH_ID = 'starwatch';

/** Build Starwatch's textures, at most `budget` ms at a time; true once they're all in. */
export const warmStarwatch = (scene: Phaser.Scene, budget = Infinity): boolean => warmArenaTextures(scene, 'starwatch', budget);

export const STARWATCH_ARENA: ArenaDef = {
  id: STARWATCH_ID,
  name: 'Starwatch',
  blurb: 'A terrace among the stars',
  accent: 0xb8c8ff,
  ground: {
    painted: true,
    w: SW_W,
    h: SW_H,
    warm: warmStarwatch,
    layers: [
      { key: 'sw_sky', x: 0, y: 0 },
      { key: 'sw_isle', x: ISLE_X, y: ISLE_Y },
      { key: 'sw_isle_e', x: ISLE_X, y: ISLE_Y, glow: true },
    ],
  },
  spawn: SW_SPAWN,
  monsters: [],
  scenery: () => ({ trees: [], props: [], rays: [], colliders: [] }),
  walkable: starwatchWalkable,
  // Now and then a pale petal off the starblossoms.
  drift: { tints: [0xd8c8f0, 0xb8a8e0, 0xeee4f8], frequency: 900, where: () => true },
  // Always night: the hour for stars.
  daylight: 0,
  preview: { x: TERRACE.x, y: TERRACE.y, sprites: () => [] },
};
