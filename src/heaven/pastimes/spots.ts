// Where the pastimes happen among the things built (the Home's plot, the
// Everwood's builds): every seat's places to sit (a bench or a sofa seats
// two, side by side), beds to lie in and sleep in, the piano and the harp
// to play, the telescope, the beehives, the television. Worked out from the grid's things whenever they
// change, in world positions: where the hero sits or stands, which way they
// face, how high a seat lifts them and how they sort against the thing.

import type { BuildLand } from '../../world/buildLand';
import { footOn } from '../../world/buildLand';
import { CELL, type Thing } from '../../world/homeLayout';
import { extent, partById } from '../../world/homeParts';
import type { Dir } from '../Wanderer';

export type SpotKind = 'seat' | 'bed' | 'piano' | 'harp' | 'telescope' | 'hive' | 'tv';

export interface Spot {
  kind: SpotKind;
  /** Which thing (its cell) and which place on it, unique on the grid. */
  key: string;
  /** The thing's footprint in the world, which the hero must come within reach of. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Where the hero's feet go, which way they face, how high they're drawn and how far in front of their feet. */
  x: number;
  y: number;
  dir: Dir;
  lift: number;
  depth: number;
  /** The thing itself (a hive's, for its honey). */
  thing: Thing;
  /** A bed the wanderer can be seen lying in (head on the pillow, facing us), awake or asleep. */
  rest?: boolean;
}

/**
 * Seats: how high the seat is off the ground (px), how far its middle sits
 * down from the footprint's (px), and how far apart two sitters are on a
 * two-cell seat (a cell, unless the seat is narrower).
 */
const SEATS: Record<string, { z: number; dy?: number; apart?: number }> = {
  bench: { z: 8 },
  chair: { z: 8, dy: 1 },
  sofa: { z: 8, dy: 1 },
  armchair: { z: 8, dy: 1 },
  rocker: { z: 8 },
  pouf: { z: 7 },
  stool: { z: 8 },
  deckchair: { z: 6, dy: 1 },
  swing: { z: 11, dy: 2, apart: 8 },
  haybale: { z: 10 },
  stump: { z: 6 },
  hammock: { z: 9, dy: 1, apart: 10 },
};

/** How far a seated wanderer's hips are above their feet (the rig's 'seat' pose), so the hips rest on the seat. */
const SIT_HIP = 5;

/**
 * Beds to lie in: how far down from the footprint's top the lying wanderer's
 * feet point is drawn (so the head lands on the pillow and the covers' edge
 * on the turned-down quilt), and where each sleeper lies across it (px from
 * its left edge; the double bed takes two). The bunk bed's is its top bunk.
 */
const BEDS: Record<string, { off: number; at: number[] }> = {
  bed: { off: 19, at: [8] },
  bigbed: { off: 19, at: [8.5, 23.5] },
  bunkbed: { off: 3, at: [8] },
};

/** Every spot among `land`'s things. */
export function findSpots(land: BuildLand): Spot[] {
  const out: Spot[] = [];
  for (const t of land.things) {
    const part = partById(t.id);
    if (!part) continue;
    const e = extent(part, t.turn);
    const x0 = land.ox + t.x * CELL;
    const y0 = land.oy + t.y * CELL;
    const x1 = x0 + e.w * CELL;
    const y1 = y0 + e.h * CELL;
    const foot = footOn(land, t);
    const base = { x0, y0, x1, y1, thing: t };
    const cx = (x0 + x1) / 2;
    const seat = SEATS[t.id];
    if (seat) {
      const turn = part.turns ? t.turn % 4 : 0;
      if (turn === 0 || turn === 2) {
        // Facing us, or turned away: sitters side by side across it.
        const n = e.w;
        const apart = seat.apart ?? CELL;
        const sy = (y0 + y1) / 2 + (seat.dy ?? 0);
        for (let k = 0; k < n; k++) {
          const x = cx + (k - (n - 1) / 2) * apart;
          const y = turn === 0 ? y1 - 1 : y0 + 3;
          out.push({ ...base, kind: 'seat', key: `${t.x},${t.y}:${k}`, x, y, dir: turn === 0 ? 'down' : 'up', lift: y - SIT_HIP - (sy - seat.z), depth: turn === 0 ? foot.y + 0.5 - y : foot.y - 0.5 - y });
        }
      } else {
        // Side on: sitters one behind the other along it, drawn over it.
        for (let k = 0; k < e.h; k++) {
          const sy = y0 + (k + 0.5) * CELL + (seat.dy ?? 0) * 0.5;
          const y = sy + 3;
          out.push({ ...base, kind: 'seat', key: `${t.x},${t.y}:${k}`, x: cx + (turn === 1 ? -1 : 1), y, dir: turn === 1 ? 'right' : 'left', lift: y - SIT_HIP - (sy - seat.z), depth: foot.y + 0.5 + k - y });
        }
      }
      continue;
    }
    const bed = BEDS[t.id];
    if (bed) {
      // Feet just below the foot of the bed; drawn lifted up onto the pillow, sorted in front of the bed.
      const y = y1 + 4;
      const turn = part.turns ? t.turn % 4 : 0;
      if (turn !== 0) {
        // Turned on its side or head to us, there's no lying in it to see: tucked away out of sight to sleep.
        out.push({ ...base, kind: 'bed', key: `${t.x},${t.y}`, x: cx, y, dir: 'down', lift: 0, depth: 0 });
        continue;
      }
      bed.at.forEach((bx, k) =>
        out.push({ ...base, kind: 'bed', key: `${t.x},${t.y}:${k}`, x: x0 + bx, y, dir: 'down', lift: y - (y0 + bed.off), depth: foot.y + 0.5 - y, rest: true }),
      );
      continue;
    }
    const at = (kind: SpotKind, x: number, y: number, dir: Dir) => out.push({ ...base, kind, key: `${t.x},${t.y}`, x, y, dir, lift: 0, depth: 0 });
    // At the piano's keys on its bench, from behind; beside the harp, facing its strings; at the telescope's eyepiece.
    if (t.id === 'piano') at('piano', cx, y1 + 4, 'up');
    else if (t.id === 'harp') at('harp', t.flip ? x0 - 3 : x1 + 3, y1 - 3, t.flip ? 'right' : 'left');
    else if (t.id === 'telescope') at('telescope', cx + (t.flip ? -2 : 2), y1 + 3, 'up');
    else if (t.id === 'beehive') at('hive', cx, y1 + 4, 'up');
    else if (t.id === 'tv') at('tv', cx, y1 + 4, 'up');
  }
  return out;
}

/** How far the hero's feet are from a spot's thing. */
export function reachOf(s: Spot, x: number, y: number): number {
  const dx = Math.max(s.x0 - x, 0, x - s.x1);
  const dy = Math.max(s.y0 - y, 0, y - s.y1);
  return Math.hypot(dx, dy);
}
