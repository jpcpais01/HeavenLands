// What the ground underfoot is, for the footsteps (audio/sfx.ts Sfx.step):
// asked once a step, so it can afford to work a pixel out the same way its
// ground is painted. Each kind of painted ground answers as what it looks
// like: moss and petals are grass, litter and fallen leaves crackle, planks
// knock, flagstones click.

import { K, STRIP_H, type Cell, type GroundSpec } from '../art/ground';
import type { Footing } from '../audio';
import { Deck } from './bridge';
import { forestTile } from './forestGround';
import { CHUNK, type ForestGen } from './forestGen';
import type { ForestEdits } from './forestEdits';
import { FLOORS } from './homeParts';
import { CELL } from './homeLayout';

/** The streamed and forest grounds' kinds (art/ground.ts K), as feet hear them. */
const BY_KIND: Record<number, Footing> = {
  [K.Grass]: 'grass',
  [K.Flower]: 'grass',
  [K.Moss]: 'grass',
  [K.Petal]: 'grass',
  [K.Shroom]: 'grass',
  [K.Litter]: 'leaves',
  [K.Fallen]: 'leaves',
  [K.Twig]: 'leaves',
  [K.Dirt]: 'earth',
  [K.Path]: 'earth',
  [K.Pebble]: 'gravel',
  [K.Stone]: 'stone',
  [K.Grout]: 'stone',
  [K.Tile]: 'stone',
  [K.Roof]: 'stone',
  [K.Rock]: 'stone',
  [K.Plank]: 'wood',
  [K.Water]: 'puddle',
  [K.Pad]: 'puddle',
  [K.Lotus]: 'puddle',
};

/** The Home's floors (homeParts.ts FLOORS), by id. A pond underfoot means a bridge over it. */
const BY_FLOOR: Record<string, Footing> = {
  lawn: 'grass',
  meadow: 'grass',
  soil: 'earth',
  path: 'earth',
  gravel: 'gravel',
  sand: 'sand',
  pond: 'wood',
  cobble: 'stone',
  flags: 'stone',
  bricks: 'stone',
  oak: 'wood',
  walnut: 'wood',
  marble: 'stone',
  terracotta: 'stone',
  ashlar: 'stone',
};

/** Painted places, whose ground is a picture rather than kinds: what most of it is. */
const PAINTED: Record<string, Footing> = {
  island: 'grass',
  deep: 'stone',
  cosmos: 'stone',
  spirit: 'stone',
  temple: 'stone',
  rift: 'stone',
  frost: 'snow',
};

const cell: Cell = { kind: 0, sub: 0, height: 0, tone: 0 };

/** A ground spec's own kind at (x, y). */
export function specFooting(spec: GroundSpec, x: number, y: number): Footing {
  cell.kind = K.Grass;
  cell.sub = 0;
  cell.height = 0;
  cell.tone = 0;
  spec.floor(x, y, spec.roofDepth(x, y), cell);
  return BY_KIND[cell.kind] ?? 'grass';
}

/** A Home floor (its index from 1, 0 for none) as feet hear it, or null for bare ground. */
export function floorFooting(floor: number): Footing | null {
  return floor > 0 ? (BY_FLOOR[FLOORS[floor - 1]?.id] ?? null) : null;
}

export function paintedFooting(arena: string): Footing {
  return PAINTED[arena] ?? 'grass';
}

/** The Everwood underfoot: what the player laid there first, else the forest floor. */
export class ForestFooting {
  private spec: GroundSpec | null = null;
  private key = '';

  constructor(private gen: ForestGen) {}

  at(x: number, y: number, edits: ForestEdits | null): Footing {
    if (edits) {
      if (edits.bridges.at(x, y) === Deck.Walk) return 'wood';
      const laid = floorFooting(edits.floorAt(Math.floor(x / CELL), Math.floor(y / CELL)));
      if (laid) return laid;
    }
    // The tile's spec gathers its places and trees, so it's kept while the hero walks the same tile.
    const col = Math.floor(x / CHUNK);
    const row = Math.floor(y / STRIP_H);
    const key = `${col},${row},${edits?.version ?? 0}`;
    if (key !== this.key || !this.spec) {
      this.spec = forestTile(this.gen, col, row);
      this.key = key;
    }
    return specFooting(this.spec, x, y);
  }
}
