// The upstairs pieces (see world/upstairs.ts and world/secretDoor.ts): the
// staircase that climbs to a house's upper floor and the railed well it
// comes up through up there, and the two secret doors, as the Home sheet
// holds them (see homeArt.ts).
//
// The staircase climbs north, a step at a time, to a storey's height: oak
// treads with a red runner held by brass rods down the middle, handrails on
// both sides and newel posts at its foot. Upstairs its well is a hole in
// the floor railed on three sides, the runner going down into the dark.
//
// A hidden door looks just like the wall it stands in (the world draws it
// with the wall's own frame, sinking it into the floor to open). A secret
// bookcase is a tall case of books standing against a house wall's face,
// one red volume pulled half out: the one that works it.

import { PixelCanvas } from './pixel';
import { hash2, rng } from './env';
import { BOOKS, BRASS, DARKW, FACE, GLASS, OAKW, QUILT_R, SOOT, TOP, WAX, art, box, grain, n3, type PropArt } from './homeProps';
import { wallFrame } from './homeWalls';
import { CELL, DOOR_HW } from '../world/homeLayout';
import { WALLS } from '../world/homeParts';

// ---------------------------------------------------------------- Tuning

/** The staircase: this many steps, each this deep (px) and this high, to a storey's height. */
const STEPS = 8;
const TREAD = 4;
const RISE = WALLS[0].height / STEPS;
/** The runner's margin from each side, px; and the handrail's height over the treads. */
const RUNNER_IN = 4;
const RAIL_Z = 9;
/** The well's railing: how tall, and its balusters' spacing along the north side. */
const WELL_RAIL = 9;
const BALUSTER = 3;
/** How many of the well's treads catch any light before the dark. */
const WELL_LIT = 5;

/** The secret bookcase: its frame's name on the sheet (with `:0`, or `:m0` mirrored), how tall it stands and how far it stands out from the wall's face. */
export const SECRET_SHELF = 'secretcase';
const CASE_H = 26;
const CASE_D = 3;
/** The house walls' face foot in a wall frame running east-west, and the frame's size (see homeWalls.ts). */
const WALL_H = WALLS[0].height;
const FACE_FOOT = WALL_H + 11;
const FRAME_H = WALL_H + CELL;
/** East and west: a wall running across the cell (see HomeLayout.wallMask). */
const ACROSS = 10;

/** The runner's red, a shade deeper than the quilt it shares. */
const RUNNER = { ...QUILT_R, bias: -1 };

// ---------------------------------------------------------------- The staircase

/** Is column `x` under the runner? */
const onRunner = (x: number, x0: number, x1: number): boolean => x >= x0 + RUNNER_IN && x < x1 - RUNNER_IN;

const stairs = art('stairs', 2, WALL_H + 8, (c, g) => {
  const x0 = g.x0;
  const x1 = g.x1;
  // From the top step down, so each lower one stands in front of the riser above it.
  for (let k = STEPS - 1; k >= 0; k--) {
    const front = g.y1 - k * TREAD;
    const z = Math.round((k + 1) * RISE);
    const below = Math.round(k * RISE);
    box(c, x0 + 1, x1 - 1, front - TREAD, front, 0, z, OAKW, { topBias: 2, bias: -2 });
    grain(c, x0 + 1, x1 - 1, front - TREAD - z, front - z, 401 + k);
    // The nosing catches the light; the riser under it sits in its shadow.
    for (let x = x0 + 1; x < x1 - 1; x++) {
      c.shade(x, front - z - 1, 1);
      c.shade(x, front - z, -1);
    }
    // The runner over the tread and down its riser, a brass rod in the crook at its back.
    for (let x = x0 + 1; x < x1 - 1; x++) {
      if (!onRunner(x, x0, x1)) continue;
      const edge = x === x0 + RUNNER_IN || x === x1 - RUNNER_IN - 1 ? -1 : 0;
      for (let y = front - TREAD - z; y < front - z; y++) c.px(x, y, RUNNER, TOP, { bias: edge + 1 + (y === front - z - 1 ? 1 : 0) });
      for (let y = front - z; y < front - below; y++) c.px(x, y, RUNNER, FACE, { bias: edge - 2 - (y === front - z ? 1 : 0) });
      c.px(x, front - TREAD - z, BRASS, TOP, { bias: 1 });
    }
    // Rod ends catching the light.
    c.px(x0 + RUNNER_IN - 1, front - TREAD - z, BRASS, TOP, { bias: 2 });
    c.px(x1 - RUNNER_IN, front - TREAD - z, BRASS, TOP, { bias: 0 });
  }
  // The handrails, one each side, rising with the steps; balusters at each step.
  for (const x of [x0, x1 - 1]) {
    c.part();
    const lit = x === x0 ? 1 : -1;
    for (let k = 0; k < STEPS; k++) {
      const mid = g.y1 - k * TREAD - TREAD / 2;
      const z = Math.round((k + 1) * RISE);
      for (let y = mid - z - RAIL_Z + 2; y < mid - z + 1; y++) c.px(x, y, DARKW, FACE, { bias: lit });
    }
    c.part();
    const top = g.y1 - STEPS * TREAD - Math.round(STEPS * RISE) + 2;
    const foot = g.y1 - RAIL_Z - 4;
    for (let y = top; y <= foot; y++) c.px(x, y, OAKW, n3(lit * 0.4, 0.2, 0.9), { bias: 1 + lit });
  }
  // Brass knobs where the rails meet the floor above.
  c.part();
  const head = g.y1 - STEPS * TREAD - Math.round(STEPS * RISE) + 1;
  for (const x of [x0, x1 - 1]) c.px(x, head, BRASS, TOP, { bias: x === x0 ? 2 : 0 });
  // Newel posts at the foot, square and capped in brass.
  for (const x of [x0, x1 - 2]) {
    box(c, x, x + 2, g.y1 - 3, g.y1, 0, RAIL_Z + 4, DARKW, { top: OAKW, topBias: 1 });
    c.part();
    c.px(x, g.y1 - 3 - RAIL_Z - 5, BRASS, TOP, { bias: 2 });
    c.px(x + 1, g.y1 - 3 - RAIL_Z - 5, BRASS, TOP, { bias: 0 });
  }
});

/** Upstairs, where the stairs come up: a hole in the floor railed on three sides, open to the south, the steps going down into the dark. */
const stairwell = art('stairwell', 2, WELL_RAIL + 3, (c, g) => {
  const x0 = g.x0;
  const x1 = g.x1;
  // The dark of the well, and its far wall going down from the north lip.
  c.part();
  for (let y = g.y0; y < g.y1; y++) for (let x = x0; x < x1; x++) c.px(x, y, SOOT, FACE, { bias: -1 });
  c.part();
  for (let y = g.y0; y < g.y0 + 4; y++) for (let x = x0 + 1; x < x1 - 1; x++) c.px(x, y, DARKW, FACE, { bias: -2 + (y === g.y0 ? 1 : 0) + (hash2(x, 3, 431) > 0.8 ? -1 : 0) });
  // The treads, from the south lip down: each lower one darker, the runner with them.
  for (let k = 0; k < WELL_LIT; k++) {
    const yb = g.y1 - k * (TREAD + 2);
    const dim = -k - 1;
    c.part();
    for (let y = yb - TREAD; y < yb; y++) {
      for (let x = x0 + 1; x < x1 - 1; x++) {
        const runner = onRunner(x, x0, x1);
        c.px(x, y, runner ? RUNNER : OAKW, TOP, { bias: dim + (y === yb - TREAD ? 1 : 0) - (runner ? 1 : 0) });
      }
    }
    c.part();
    // The riser below it, in shadow.
    for (let y = yb - TREAD - 2; y < yb - TREAD; y++) for (let x = x0 + 1; x < x1 - 1; x++) c.px(x, y, DARKW, FACE, { bias: dim - 2 });
  }
  // The rails: down the west and east sides, and across the north with its balusters.
  for (const x of [x0, x1 - 1]) {
    c.part();
    const lit = x === x0 ? 1 : -1;
    for (let y = g.y0 - WELL_RAIL; y < g.y1 - WELL_RAIL + 2; y++) c.px(x, y, OAKW, n3(lit * 0.4, 0.2, 0.9), { bias: 1 + lit });
    for (let y = g.y1 - WELL_RAIL + 2; y < g.y1; y++) c.px(x, y, DARKW, FACE, { bias: lit });
  }
  c.part();
  for (let x = x0 + 1; x < x1 - 1; x += BALUSTER) for (let y = g.y0 - WELL_RAIL + 2; y < g.y0 + 1; y++) c.px(x, y, DARKW, FACE, { bias: y === g.y0 - WELL_RAIL + 2 ? 1 : 0 });
  c.part();
  for (let x = x0; x < x1; x++) {
    c.px(x, g.y0 - WELL_RAIL, OAKW, TOP, { bias: 2 });
    c.px(x, g.y0 - WELL_RAIL + 1, OAKW, FACE, { bias: 0 });
  }
  // Newel posts at the four corners, capped in brass.
  for (const [x, y] of [[x0, g.y0 + 1], [x1 - 2, g.y0 + 1], [x0, g.y1], [x1 - 2, g.y1]]) {
    box(c, x, x + 2, y - 2, y, 0, WELL_RAIL + 3, DARKW, { top: OAKW, topBias: 1 });
    c.part();
    c.px(x, y - 2 - WELL_RAIL - 4, BRASS, TOP, { bias: 2 });
    c.px(x + 1, y - 2 - WELL_RAIL - 4, BRASS, TOP, { bias: 0 });
  }
});

export const STAIRS_ART: Record<string, PropArt> = { stairs, stairwell };

// ---------------------------------------------------------------- Secret doors

/** A tall case of books standing at the foot of a wall's face, on a wall frame's canvas (or a clear one the same size). */
function bookcase(c: PixelCanvas): void {
  const x0 = 1;
  const x1 = CELL - 1;
  const gy = FACE_FOOT + CASE_D;
  box(c, x0, x1, gy - CASE_D, gy, 0, CASE_H, OAKW, { topBias: 1 });
  grain(c, x0, x1, gy - CASE_H, gy, 461, false);
  // Three shelves of books in the case's shadow.
  const R = rng(463);
  const shelves = [[3, 9], [10, 16], [17, 23]];
  let lever = false;
  for (const [z0, z1] of shelves) {
    c.part();
    for (let z = z0; z < z1; z++) for (let x = x0 + 1; x < x1 - 1; x++) c.px(x, gy - 1 - z, DARKW, FACE, { bias: -2 });
    c.part();
    let x = x0 + 1;
    while (x < x1 - 1) {
      // The middle shelf's red book stands proud of the others: pull it, and the case moves.
      if (!lever && z0 === 10 && x >= 7) {
        lever = true;
        for (let z = z0; z < z0 + 5; z++) c.px(x, gy - z, BOOKS[0], FACE, { bias: 2 + (z === z0 + 3 ? 1 : 0) });
        c.px(x, gy - z0 - 5, BOOKS[0], TOP, { bias: 3 });
        x += 1;
        continue;
      }
      if (R() < 0.1) {
        // A candle stub or a little bottle in a gap.
        for (let z = z0; z < z0 + 3; z++) c.px(x, gy - 1 - z, R() < 0.5 ? GLASS : WAX, FACE, { bias: 2 });
        x += 2;
        continue;
      }
      const hgt = Math.min(z1 - z0, 3 + Math.floor(R() * 4));
      const m = BOOKS[1 + Math.floor(R() * (BOOKS.length - 1))];
      for (let z = z0; z < z0 + hgt; z++) c.px(x, gy - 1 - z, m, FACE, { bias: z === z0 + hgt - 2 || z === z0 + 1 ? 2 : 0 });
      x += 1;
    }
    for (let x2 = x0 + 1; x2 < x1 - 1; x2++) c.px(x2, gy - z0, OAKW, FACE, { bias: 2 });
  }
  // A carved crown along its top.
  box(c, x0 - 1, x1 + 1, gy - CASE_D - 1, gy, CASE_H, CASE_H + 2, DARKW, { top: OAKW, topBias: 1 });
}

/** The bookcase alone, as it stands and slides in the world. */
export function secretCase(): PixelCanvas {
  const c = new PixelCanvas(CELL, FRAME_H);
  bookcase(c);
  return c;
}

/** The bookcase against a fieldstone wall: its picture in the tray. */
export function secretCaseIcon(): PixelCanvas {
  const c = wallFrame(0, ACROSS, 'wall', 0);
  bookcase(c);
  return c;
}

/** A hidden door's picture in the tray: a stretch of fieldstone wall, the faintest seam of an arch in it and a glint at its keystone. */
export function secretWallIcon(): PixelCanvas {
  const c = wallFrame(0, ACROSS, 'wall', 0);
  const archTop = WALL_H - 7;
  const foot = FACE_FOOT - 1;
  for (let z = 0; z < archTop + 2; z++) {
    for (let x = 8 - DOOR_HW - 1; x <= 8 + DOOR_HW; x++) {
      const dx = Math.abs(x + 0.5 - 8);
      const r = z < archTop - 3 ? dx : Math.hypot(dx, z - (archTop - 3));
      if (Math.abs(r - DOOR_HW) < 0.6) c.shade(x, foot - z, -3);
    }
  }
  c.spark(8, foot - archTop - 2, [255, 236, 170], 0.9);
  c.spark(7, foot - archTop - 2, [255, 236, 170], 0.35);
  c.spark(8, foot - archTop - 3, [255, 236, 170], 0.35);
  return c;
}
