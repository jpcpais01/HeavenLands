// Starwatch's shape: a small meadow isle adrift in the night sky, seen from
// a little above, so its rocky underside hangs below its front edge. On its
// crown a round terrace of moonstone with the sky's map laid in its floor;
// a pale flagstone path winds up to it from the south; a still pond to the
// west holds the stars; two blankets are spread on the grass for lying back
// and watching them fall. Pure functions of arena coordinates, shared by the
// art (art.ts) and the game (Starwatch.ts).

import { rng } from '../../art/env';

export const SW_W = 960;
export const SW_H = 780;
/** The isle's centre and its top surface's radii (before the edge's wobble). */
export const SW_CX = 480;
export const SW_CY = 340;
export const SW_RX = 250;
export const SW_RY = 176;
/** How far the rock under the isle hangs below its front edge, at most. */
export const SW_UNDER = 150;

/** The terrace: its centre and radii, and how tall its south face stands (px). */
export const TERRACE = { x: 480, y: 292, rx: 98, ry: 70 };
export const TERRACE_STEP = 3;

/** The pond. */
export const POND = { x: 340, y: 414, rx: 50, ry: 28 };

/** Blankets spread on the grass: their top-left corner, size and pattern. */
export const BLANKETS: { x: number; y: number; w: number; h: number; kind: 'plaid' | 'quilt' }[] = [
  { x: 600, y: 396, w: 30, h: 18, kind: 'plaid' },
  { x: 326, y: 246, w: 28, h: 18, kind: 'quilt' },
];

/** The path's line, from the south edge up to the terrace, and a spur east to the plaid blanket. */
export const PATHS: [number, number][][] = [
  [
    [506, 508],
    [498, 474],
    [474, 446],
    [470, 414],
    [480, 380],
    [480, 360],
  ],
  [
    [472, 430],
    [520, 424],
    [566, 414],
    [598, 408],
  ],
];
export const PATH_HALF = 7;

/** Where wanderers arrive: on the path, near the south edge. */
export const SW_SPAWN = { x: 500, y: 490 };

/** How far the isle's edge reaches at angle `a` (radians, in radii), a gentle wobble. */
export function edgeK(a: number): number {
  return 1 + Math.sin(a * 3 + 1.9) * 0.05 + Math.sin(a * 5 + 0.4) * 0.03 + Math.sin(a * 11 + 2.6) * 0.012;
}

/** Distance from the centre in edge radii: 1 on the isle's top edge. */
export function isleR(x: number, y: number): number {
  const u = (x - SW_CX) / SW_RX;
  const v = (y - SW_CY) / SW_RY;
  return Math.hypot(u, v) / edgeK(Math.atan2(v, u));
}

/** The last row of the top surface in column `x` (its front edge), or -1 past the isle. */
export function frontEdgeY(x: number): number {
  let last = -1;
  for (let y = SW_CY; y < SW_CY + SW_RY * 1.2; y++) {
    if (isleR(x + 0.5, y + 0.5) <= 1) last = y;
    else if (last >= 0) break;
  }
  return last;
}

export function terraceR(x: number, y: number): number {
  return Math.hypot((x - TERRACE.x) / TERRACE.rx, (y - TERRACE.y) / TERRACE.ry);
}

/** Distance from the pond's middle in its radii, with a soft wobble to its shore. */
export function pondR(x: number, y: number): number {
  const u = (x - POND.x) / POND.rx;
  const v = (y - POND.y) / POND.ry;
  const a = Math.atan2(v, u);
  return Math.hypot(u, v) / (1 + Math.sin(a * 3 + 0.8) * 0.07 + Math.sin(a * 5 + 2.2) * 0.04);
}

/** Distance (px) from (x, y) to the nearest path's middle line. */
export function pathDist(x: number, y: number): number {
  let best = Infinity;
  for (const line of PATHS) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i];
      const [bx, by] = line[i + 1];
      const vx = bx - ax;
      const vy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
      best = Math.min(best, Math.hypot(x - ax - vx * t, y - ay - vy * t));
    }
  }
  return best;
}

/** Which blanket (x, y) lies on, or -1. */
export function blanketAt(x: number, y: number): number {
  return BLANKETS.findIndex((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
}

// ---------------------------------------------------------------- What stands on it

export type PropKind = 'lantern' | 'bench' | 'telescope' | 'stone' | 'tree' | 'bloom';

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  /** Which drawing of its kind. */
  v: number;
  flip?: boolean;
}

/** Feet that stop a wanderer, per kind: half width and half depth of the blocked oval (0: walk through). */
export const BLOCK: Record<PropKind, [number, number]> = {
  lantern: [3, 2],
  bench: [11, 3],
  telescope: [6, 3],
  stone: [7, 3],
  tree: [6, 3],
  bloom: [0, 0],
};

/** A spot on the terrace's ellipse, `k` of its radius out, at angle `deg` (0 east, clockwise). */
const onTerrace = (deg: number, k: number): { x: number; y: number } => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.round(TERRACE.x + Math.cos(a) * TERRACE.rx * k), y: Math.round(TERRACE.y + Math.sin(a) * TERRACE.ry * k) };
};

/** Is (x, y) clear ground for a flower: meadow, off the path, the terrace, the pond and the blankets. */
export function openMeadow(x: number, y: number, pad = 0): boolean {
  return isleR(x, y) < 0.9 && terraceR(x, y) > 1.12 + pad / 80 && pondR(x, y) > 1.3 && pathDist(x, y) > PATH_HALF + 5 + pad && blanketAt(x, y) < 0 && blanketAt(x, y - 6) < 0;
}

/** Everything that stands on the isle, fixed for everyone (a room sees the same isle with nothing sent). */
export function starwatchProps(): Prop[] {
  const out: Prop[] = [];
  // Lanterns round the terrace's rim and along the path.
  for (const deg of [35, 145, 215, 325]) out.push({ kind: 'lantern', ...onTerrace(deg, 1.04), v: 0 });
  for (const [x, y] of [
    [520, 486],
    [454, 440],
    [496, 400],
    [584, 426],
  ]) out.push({ kind: 'lantern', x, y, v: 1 });
  // Stone benches on the terrace's south side, either side of the path, facing out over the sky.
  out.push({ kind: 'bench', ...onTerrace(148, 0.6), v: 0 });
  out.push({ kind: 'bench', ...onTerrace(32, 0.6), v: 0, flip: true });
  // The telescope on the terrace's north side, looking up.
  out.push({ kind: 'telescope', ...onTerrace(270, 0.52), v: 0 });
  // Standing stones with a constellation cut in each, near the rim.
  for (const [x, y, v] of [
    [276, 322, 0],
    [700, 300, 1],
    [632, 474, 2],
  ]) out.push({ kind: 'stone', x, y, v });
  // Starblossom trees: pale lilac crowns that glitter.
  for (const [x, y, v, f] of [
    [318, 210, 0, 0],
    [660, 220, 1, 1],
    [384, 494, 1, 0],
    [714, 404, 0, 1],
  ]) out.push({ kind: 'tree', x, y, v, flip: !!f });
  // Moonflowers in drifts on the meadow.
  const R = rng(9091);
  const blooms: Prop[] = [];
  for (let tries = 0; blooms.length < 34 && tries < 2000; tries++) {
    const a = R() * Math.PI * 2;
    const d = Math.sqrt(R()) * 0.88;
    const x = Math.round(SW_CX + Math.cos(a) * SW_RX * d);
    const y = Math.round(SW_CY + Math.sin(a) * SW_RY * d);
    if (!openMeadow(x, y, 2)) continue;
    if ([...out, ...blooms].some((p) => Math.hypot(p.x - x, (p.y - y) * 1.4) < (p.kind === 'tree' ? 26 : 14))) continue;
    blooms.push({ kind: 'bloom', x, y, v: Math.floor(R() * 3), flip: R() < 0.5 });
  }
  return [...out, ...blooms];
}

/** The props, worked out once. */
let props: Prop[] | null = null;
export const PROPS = (): Prop[] => (props ??= starwatchProps());

/** Can feet stand here? On the isle inside its rim, out of the pond, and not in anything that stands. */
export function starwatchWalkable(x: number, y: number): boolean {
  if (isleR(x, y) > 0.965) return false;
  if (pondR(x, y) < 0.92) return false;
  for (const p of PROPS()) {
    const [bx, by] = BLOCK[p.kind];
    if (!bx) continue;
    const dx = (x - p.x) / bx;
    const dy = (y - p.y) / by;
    if (dx * dx + dy * dy < 1) return false;
  }
  return true;
}
