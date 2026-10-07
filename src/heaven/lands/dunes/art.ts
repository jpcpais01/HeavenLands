// Sunsong Dunes' props, drawn with the shared pixel engine (art/pixel.ts):
// date palms whose fronds stir, papyrus and reeds by the water, silvery
// saltbush and golden dry grass, banded sandstone boulders, hoodoos and a
// great arch, the columns of an old colonnade, a caravan tent of striped wool
// glowing from inside with its rug and tea set, brass lanterns with coloured
// glass, clay jars, camels and fennec foxes. Lit from the warm top-left like
// everything else. Pure: the node script paints them too.

import { FLAT, PixelCanvas, cyl, sphere, type Material, type Vec3 } from '../../../art/pixel';
import { rng, valueNoise } from '../../../art/env';
import type { SheetDef } from '../types';
import {
  BRASS, CAMEL, CAMEL_DARK, CLAY, CUSHION, DATES, DESERT_VARNISH, DRYGRASS, EAR_PINK, EYE, FENNEC, FLAME, FLOWER, FROND, FROND_DRY, GLASS_AMBER, GLASS_ROSE, GLAZE, HOOF, INDIGO, LIMESTONE, MADDER, NOSE, PALM_SCALE, PALM_TRUNK, PAPYRUS, POLE, REED, ROPE, RUG_BLUE, RUG_CREAM, RUG_GOLD, RUG_RED, SAND, SANDSTONE, SHRUB, STRATA, TASSEL, TENT_GLOW, TWIG, WOOL,
} from './palette';

/** Normals: facing up to the sky, and facing the viewer. */
const UP: Vec3 = { x: 0, y: 0.6, z: 0.8 };
const FRONT: Vec3 = { x: 0, y: -0.35, z: 0.94 };
const DOWN: Vec3 = { x: 0, y: -0.85, z: 0.5 };

const norm = (x: number, y: number, z: number): Vec3 => {
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
};

/** A filled box of one material, one normal. */
function box(c: PixelCanvas, x0: number, y0: number, x1: number, y1: number, m: Material, n: Vec3 = FLAT, bias = 0): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c.px(x, y, m, n, { bias });
}

/** An upright post, round across its width. */
function post(c: PixelCanvas, x: number, y0: number, y1: number, hw: number, m: Material, bias = 0): void {
  for (let y = y0; y <= y1; y++) for (let px = Math.floor(x - hw); px < x + hw; px++) c.px(px, y, m, cyl((px + 0.5 - x) / hw, 0.1), { bias });
}

/** Sand drifted against something's foot: a low mound from x0 to x1, highest at its middle. */
function drift(c: PixelCanvas, x0: number, x1: number, fy: number, h: number, seed: number): void {
  const R = rng(seed);
  c.part();
  const mid = (x0 + x1) / 2;
  const hw = (x1 - x0) / 2;
  for (let x = Math.floor(x0); x <= x1; x++) {
    const u = (x + 0.5 - mid) / hw;
    const top = Math.round(fy - h * Math.max(0, 1 - u * u) - R() * 0.8);
    for (let y = top; y <= fy; y++) c.px(x, y, SAND, norm(u * 0.5, 0.6, 0.7), { bias: y === top ? 1 : 0 });
  }
}

/** Banded sandstone: every few rows a paler course of stone, a darker seam under it. */
function band(y: number, base: number): { m: Material; bias: number } {
  const k = ((y - base) % 9 + 9) % 9;
  if (k === 0) return { m: SANDSTONE, bias: -1 };
  if (k <= 2) return { m: STRATA, bias: 0 };
  return { m: SANDSTONE, bias: 0 };
}

// ---------------------------------------------------------------- date palms

export const PALM_W = 70;
export const PALM_H = 92;
export const PALM_FOOT_Y = 88;
const PALMS = [
  { lean: 7, height: 56, fronds: 13, seed: 5 },
  { lean: -5, height: 66, fronds: 12, seed: 17 },
  { lean: 10, height: 46, fronds: 14, seed: 29 },
];
/** Sway frames: how far (px) the wind pushes a frond's tip. */
const SWAY = [-1.4, 0, 1.4];

function palmFrame(v: number, f: number): PixelCanvas {
  const L = PALMS[v];
  const c = new PixelCanvas(PALM_W, PALM_H);
  const R = rng(700 + L.seed);
  const bx = PALM_W / 2 - Math.round(L.lean * 0.4);
  const by = PALM_FOOT_Y;
  const trunkX = (t: number) => bx + L.lean * Math.pow(t, 1.6);
  // The trunk: thick and straight, armoured in the stubs of old fronds, a diamond pattern of them.
  for (let s = 0; s <= L.height; s++) {
    const t = s / L.height;
    const x = trunkX(t);
    const y = by - s;
    const hw = 3.1 - t * 0.5 + (s < 3 ? (3 - s) * 0.5 : 0);
    for (let px = Math.floor(x - hw); px <= Math.ceil(x + hw) - 1; px++) {
      const u = (px + 0.5 - x) / hw;
      if (Math.abs(u) > 1) continue;
      const row = Math.floor(s / 3);
      const notch = (px - Math.floor(x) + row * 2 + 40) % 4 === 0 && s % 3 !== 0;
      c.px(px, y, notch ? PALM_SCALE : PALM_TRUNK, cyl(u, 0.2), { bias: s % 3 === 0 ? 1 : 0 });
    }
  }
  const cx = trunkX(1);
  const cy = by - L.height;
  // A skirt of old dry fronds hanging round the top of the trunk.
  c.part();
  for (let k = -3; k <= 3; k++) {
    const len = 9 + ((k * 7 + 13) % 5);
    for (let s = 0; s < len; s++) {
      const x = cx + k * 0.9 + k * s * 0.12;
      c.px(x, cy + 3 + s, FROND_DRY, cyl(k / 3, 0), { bias: s < 4 ? 1 : k > 0 ? -1 : 0 });
    }
  }
  // Dates hanging in amber clusters under the crown.
  for (const [ox, len] of [[-4, 7], [3, 8], [-1, 6]]) {
    c.part();
    c.line(cx + ox * 0.4, cy + 1, cx + ox, cy + 3, FROND_DRY);
    for (let k = 0; k < 9; k++) {
      const yy = cy + 3 + R() * len;
      const xx = cx + ox + (R() - 0.5) * (2 + (yy - cy) * 0.35);
      c.ellipse(xx, yy, 1.05, 1.15, DATES, { flatten: 0.9, bias: R() < 0.4 ? 1 : 0 });
    }
  }
  // Fronds: stiff and arching, grey-green, their leaflets set forward like a feather's.
  const fronds: { a: number; len: number; rise: number }[] = [];
  for (let k = 0; k < L.fronds; k++) {
    const a = (k / L.fronds) * Math.PI * 2 + (R() - 0.5) * 0.4;
    fronds.push({ a, len: 20 + R() * 8, rise: 4 + R() * 6 });
  }
  // A few young fronds standing up in the middle.
  for (let k = 0; k < 3; k++) fronds.push({ a: -Math.PI / 2 + (k - 1) * 0.5, len: 14 + R() * 4, rise: 12 + R() * 4 });
  fronds.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
  for (const fr of fronds) {
    c.part();
    const dx = Math.cos(fr.a);
    const dy = Math.sin(fr.a) * 0.45;
    const far = Math.sin(fr.a) < -0.25;
    const steps = Math.round(fr.len);
    let px = cx;
    let py = cy;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = cx + dx * fr.len * t + SWAY[f] * t * t;
      const y = cy + dy * fr.len * t - fr.rise * Math.sin(t * Math.PI * 0.62) + fr.len * t * t * 0.42;
      const tx = x - px;
      const ty = y - py;
      px = x;
      py = y;
      const tl = Math.hypot(tx, ty) || 1;
      const ux = tx / tl;
      const uy = ty / tl;
      // Leaflets out to either side, angled toward the tip, shorter at the base and the tip.
      const len = Math.sin(Math.min(1, t * 1.25) * Math.PI) * 3.6 + 0.8;
      if (s > 2) {
        for (const side of [-1, 1]) {
          const lx = -uy * side * 0.8 + ux * 0.6;
          const ly = ux * side * 0.8 + uy * 0.6 + 0.25;
          const ll = Math.hypot(lx, ly);
          const upper = ly < 0;
          for (let q = 1; q <= len; q++) {
            const bias = (upper ? 1 : -1) + (t > 0.5 ? 1 : 0) - (far ? 2 : 0) + (q > len - 1 ? -1 : 0);
            c.px(x + (lx / ll) * q, y + (ly / ll) * q, FROND, upper ? UP : sphere(lx * 0.3, 0.2, 0.8), { bias });
          }
        }
      }
      c.px(x, y, FROND, UP, { bias: (far ? -1 : 1) + (t > 0.5 ? 1 : 0) });
    }
  }
  return c;
}

// ---------------------------------------------------------------- papyrus and reeds

export const REED_W = 24;
export const REED_H = 34;
export const REED_FOOT_Y = 32;

function reedFrame(v: number): PixelCanvas {
  const c = new PixelCanvas(REED_W, REED_H);
  const R = rng(1500 + v * 23);
  const cx = REED_W / 2;
  const fy = REED_FOOT_Y;
  const n = [7, 9, 6][v];
  const tops: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    c.part();
    const u = (k / (n - 1)) * 2 - 1;
    const len = Math.round(18 + (1 - Math.abs(u)) * 9 + R() * 4);
    const lean = u * (3 + R() * 3);
    let x = cx;
    let y = fy;
    for (let s = 0; s < len; s++) {
      const t = s / len;
      x = cx + u * 2 + lean * t * t;
      y = fy - s;
      c.px(x, y, v === 1 ? REED : PAPYRUS, cyl(u * 0.6, 0.2), { bias: Math.round(t * 2 - u) - 1 });
    }
    tops.push([x, y]);
  }
  if (v === 1) {
    // Reeds: blades round the foot and brown cattail heads.
    for (let k = 0; k < 6; k++) {
      c.part();
      const side = k % 2 ? 1 : -1;
      const len = 7 + R() * 5;
      for (let s = 0; s < len; s++) {
        const t = s / len;
        c.px(cx + side * (1 + t * t * 6 + k * 0.4), fy - s * 0.9, REED, UP, { bias: side < 0 ? 1 : -1 });
      }
    }
    for (const [x, y] of tops.filter((_, k) => k % 3 === 1)) {
      c.part();
      c.capsule(x, y + 1, x, y + 4, 1.1, 1.1, FROND_DRY);
    }
    return c;
  }
  // Papyrus: each stem crowned with a burst of fine threads.
  for (const [x, y] of tops) {
    c.part();
    for (let a = 0; a < 9; a++) {
      const ang = -Math.PI / 2 + (a / 8 - 0.5) * 2.6;
      const r = 3 + R() * 1.6;
      for (let q = 1; q <= r; q++) {
        const t = q / r;
        c.px(x + Math.cos(ang) * q, y + Math.sin(ang) * q * 0.75 + t * t * 1.4, PAPYRUS, UP, { bias: Math.sin(ang) < -0.6 ? 2 : 1 });
      }
    }
  }
  return c;
}

// ---------------------------------------------------------------- saltbush

export const SHRUB_W = 28;
export const SHRUB_H = 22;
export const SHRUB_FOOT_Y = 19;

function shrubFrame(v: number): PixelCanvas {
  const c = new PixelCanvas(SHRUB_W, SHRUB_H);
  const R = rng(2100 + v * 41);
  const cx = SHRUB_W / 2;
  const rx = v ? 9 : 10;
  const ry = v ? 6 : 7;
  const cy = SHRUB_FOOT_Y - ry;
  for (let k = -2; k <= 2; k++) c.capsule(cx + k * 1.5, SHRUB_FOOT_Y, cx + k * 3, SHRUB_FOOT_Y - 4, 0.7, 0.5, TWIG);
  const bits: { x: number; y: number; r: number }[] = [];
  for (let k = 0; k < 70; k++) {
    const a = R() * Math.PI * 2;
    const d = Math.sqrt(R());
    bits.push({ x: cx + Math.cos(a) * d * rx, y: cy + Math.sin(a) * d * ry, r: 1 + R() * 0.8 });
  }
  bits.sort((a, b) => a.y - b.y);
  for (const b of bits) {
    c.part();
    const u = (b.x - cx) / rx;
    const w = (b.y - cy) / ry;
    c.ellipse(b.x, b.y, b.r, b.r * 0.85, SHRUB, { flatten: 0.6, bias: Math.round(-w * 1.8 - u * 0.8) });
  }
  if (v === 1) {
    // Desert marigolds over the top.
    for (let k = 0; k < 9; k++) {
      const a = R() * Math.PI * 2;
      const d = Math.sqrt(R()) * 0.8;
      const x = cx + Math.cos(a) * d * rx;
      const y = cy + Math.sin(a) * d * ry - 1.5;
      c.px(x, y, FLOWER, UP, { bias: 2 });
      c.px(x + 1, y, FLOWER, UP, { bias: 0 });
    }
  }
  return c;
}

// ---------------------------------------------------------------- dry grass

export const GRASS_W = 20;
export const GRASS_H = 18;
export const GRASS_FOOT_Y = 16;

function grassFrame(v: number): PixelCanvas {
  const c = new PixelCanvas(GRASS_W, GRASS_H);
  const R = rng(2900 + v * 17);
  const n = 7 + v * 2;
  const cx = GRASS_W / 2;
  for (let k = 0; k < n; k++) {
    c.part();
    const u = (k / (n - 1)) * 2 - 1;
    const len = Math.round(7 + (1 - Math.abs(u)) * 6 + R() * 3);
    // Bent east by the wind that never stops.
    const lean = u * (2 + R() * 3) + 1.6;
    for (let s = 0; s < len; s++) {
      const t = s / len;
      c.px(cx + u * 1.5 + lean * t * t, GRASS_FOOT_Y - s, DRYGRASS, sphere(Math.sign(lean) * 0.5, -0.2, 0.8), { bias: Math.round(-u * 1.2 + t * 3) - 1 });
    }
  }
  return c;
}

// ---------------------------------------------------------------- sandstone boulders

export const ROCK_W = 36;
export const ROCK_H = 28;
export const ROCK_FOOT_Y = 24;

function rockFrame(v: number): PixelCanvas {
  const c = new PixelCanvas(ROCK_W, ROCK_H);
  const R = rng(3300 + v * 13);
  const cx = ROCK_W / 2;
  const b = ROCK_FOOT_Y;
  const parts: [number, number, number, number][] = [
    [[-1, 2.4, 4, 2.6], [4, 1.4, 2.4, 1.6]],
    [[0, 5, 8, 5.2], [7, 1.6, 3, 2]],
    [[-1, 8, 12, 8.4], [9, 3, 4.4, 3.2], [-10, 2, 3, 2]],
  ][v] as [number, number, number, number][];
  for (const [ox, oy, rx, ry] of parts) {
    c.part();
    // Wind-worn: flattened tops, the strata showing along the face.
    for (let y = Math.floor(b - oy - ry); y <= b - oy + ry; y++) {
      for (let x = Math.floor(cx + ox - rx); x <= cx + ox + rx; x++) {
        const dx = (x + 0.5 - cx - ox) / rx;
        const dy = (y + 0.5 - b + oy) / ry;
        if (dx * dx + Math.pow(Math.abs(dy), 2.6) > 1) continue;
        const s = band(y, b);
        c.px(x, y, s.m, sphere(dx, dy * 0.8, 0.85), { bias: s.bias });
      }
    }
  }
  // Pits worn by the wind, and dark varnish where the rain once ran.
  for (let k = 0; k < 10 + v * 10; k++) {
    const x = cx - 12 + Math.floor(R() * 24);
    const y = b - 16 + Math.floor(R() * 16);
    if (c.materialAt(x, y) && c.materialAt(x, y - 1)) c.shade(x, y, -2);
  }
  if (v > 0) drift(c, cx - [0, 10, 15][v], cx + [0, 11, 16][v], b, [0, 1.5, 2.5][v], 3400 + v);
  return c;
}

// ---------------------------------------------------------------- hoodoos

export const SPIRE_W = 44;
export const SPIRE_H = 80;
export const SPIRE_FOOT_Y = 76;

/** One hoodoo: a broad base, a waisted column, a pale cap stone. */
function hoodoo(c: PixelCanvas, cx: number, fy: number, h: number, base: number, R: () => number): void {
  const top = fy - h;
  c.part();
  for (let y = top + 5; y <= fy; y++) {
    const t = (y - top) / h;
    // Waisted just under the cap, flaring to the base, with a ragged edge.
    const hw = base * (0.42 + 0.3 * Math.pow(t, 2.2) + 0.28 * Math.pow(t, 6)) + Math.sin(y * 0.9) * 0.4 + (valueNoise(0, y, 4, 9) - 0.5) * 1.2;
    for (let x = Math.floor(cx - hw); x < cx + hw; x++) {
      const u = (x + 0.5 - cx) / hw;
      const s = band(y, fy);
      c.px(x, y, s.m, cyl(u, 0.1), { bias: s.bias + (y < top + 8 ? -1 : 0) });
    }
  }
  // The cap stone: harder, paler, wider than the neck below it.
  c.part();
  const cw = base * 0.62;
  for (let y = top; y <= top + 5; y++) {
    const t = (y - top) / 5;
    const hw = cw * (0.75 + 0.25 * Math.sin(t * Math.PI));
    for (let x = Math.floor(cx - hw); x < cx + hw; x++) {
      const u = (x + 0.5 - cx) / hw;
      c.px(x, y, STRATA, y < top + 2 ? UP : cyl(u, -0.1), { bias: y === top ? 1 : y === top + 5 ? -2 : 0 });
    }
  }
  // Varnish streaking down from under the cap.
  for (let k = 0; k < 4; k++) {
    const x = Math.round(cx - base * 0.3 + R() * base * 0.6);
    const len = 4 + Math.floor(R() * 10);
    for (let y = top + 6; y < top + 6 + len; y++) if (c.materialAt(x, y)) c.px(x, y, DESERT_VARNISH, FRONT, { bias: y - top - 6 > len - 3 ? -1 : 0 });
  }
}

function spireFrame(v: number): PixelCanvas {
  const c = new PixelCanvas(SPIRE_W, SPIRE_H);
  const R = rng(3900 + v * 19);
  const cx = SPIRE_W / 2;
  const fy = SPIRE_FOOT_Y;
  if (v === 0) hoodoo(c, cx, fy, 64, 13, R);
  else {
    hoodoo(c, cx + 8, fy - 2, 36, 10, R);
    hoodoo(c, cx - 5, fy, 50, 12, R);
  }
  drift(c, cx - 15, cx + 16, fy, 3, 3950 + v);
  return c;
}

// ---------------------------------------------------------------- the great arch

export const ARCH_W = 144;
export const ARCH_H = 104;
export const ARCH_FOOT_Y = 98;
/** The arch's opening (px from the foot's middle): its half width and height. */
const HOLE_RX = 23;
const HOLE_RY = 60;
/** The span's thickness seen from below, inside the opening. */
const UNDER = 6;

function archFrame(): PixelCanvas {
  const c = new PixelCanvas(ARCH_W, ARCH_H);
  const R = rng(4500);
  const cx = ARCH_W / 2;
  const fy = ARCH_FOOT_Y;
  const top = fy - 90;
  c.part();
  for (let y = top; y <= fy; y++) {
    for (let x = 4; x < ARCH_W - 4; x++) {
      const lx = x + 0.5 - cx;
      const ax = Math.abs(lx);
      // The outline: a broad rounded mass, legs flaring at the foot, its top a gentle hump.
      const outer = 54 + Math.pow((y - top) / (fy - top), 3) * 12 + (valueNoise(x, y, 6, 45) - 0.5) * 2.4;
      const ceil = top + Math.pow(ax / 60, 2) * 26 + (valueNoise(x, 0, 9, 46) - 0.5) * 2;
      if (ax > outer || y < ceil) continue;
      const hx = lx / HOLE_RX;
      const hy = (y - fy) / HOLE_RY;
      const hole = hx * hx + hy * hy;
      if (hole < 1) {
        // Inside the opening: the span's underside, seen from below, only up at its top.
        const holeTop = fy - HOLE_RY * Math.sqrt(Math.max(0, 1 - hx * hx));
        if (y < holeTop + UNDER * Math.sqrt(Math.max(0, 1 - hx * hx))) c.px(x, y, SANDSTONE, DOWN, { bias: -2 + (y < holeTop + 2 ? 0 : 1) });
        continue;
      }
      const s = band(y, fy);
      let n: Vec3;
      if (y < ceil + 3) n = UP;
      else {
        // Each leg rounds away to its sides; round the opening the stone turns inward.
        const legU = ax < HOLE_RX + 4 ? 0 : Math.max(-1, Math.min(1, (ax - (HOLE_RX + outer) / 2) / ((outer - HOLE_RX) / 2)));
        const inward = hole < 1.35 ? (1.35 - hole) * 1.6 : 0;
        n = norm(Math.sign(lx) * (legU * 0.75 - inward * 0.6), 0.12, 0.85);
      }
      c.px(x, y, s.m, n, { bias: s.bias + (hole < 1.12 ? -1 : 0) });
    }
  }
  // Varnish running down the face from the top, and wind-pits.
  for (let k = 0; k < 14; k++) {
    const x = Math.round(cx - 50 + R() * 100);
    let y = top + Math.round(Math.pow(Math.abs(x - cx) / 60, 2) * 26) + 3;
    const len = 6 + Math.floor(R() * 20);
    for (let q = 0; q < len; q++, y++) if (c.materialAt(x, y) && c.materialAt(x, y) !== null) c.px(x, y, DESERT_VARNISH, FRONT, { bias: q > len - 4 ? -1 : 0 });
  }
  for (let k = 0; k < 90; k++) {
    const x = 8 + Math.floor(R() * (ARCH_W - 16));
    const y = top + Math.floor(R() * (fy - top));
    if (c.materialAt(x, y) === SANDSTONE && c.materialAt(x, y - 1)) c.shade(x, y, -1);
  }
  drift(c, cx - 64, cx - 22, fy, 4, 4510);
  drift(c, cx + 22, cx + 66, fy, 5, 4511);
  return c;
}

// ---------------------------------------------------------------- the colonnade

export const PILLAR_W = 30;
export const PILLAR_H = 62;
export const PILLAR_FOOT_Y = 58;

/** A column's fluted shaft from y0 down to y1. */
function shaft(c: PixelCanvas, cx: number, y0: number, y1: number, hw: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = Math.floor(cx - hw); x < cx + hw; x++) {
      const u = (x + 0.5 - cx) / hw;
      const flute = Math.floor(x - cx + 40) % 3 === 0;
      c.px(x, y, LIMESTONE, cyl(u, 0.1), { bias: flute ? -1 : 0 });
    }
  }
}

function pillarFrame(v: number): PixelCanvas {
  const c = new PixelCanvas(PILLAR_W, PILLAR_H);
  const R = rng(5100 + v * 7);
  const cx = PILLAR_W / 2;
  const fy = PILLAR_FOOT_Y;
  if (v === 3) {
    // A drum fallen and lying on its side: its flutes run along it, its end face toward us.
    c.part();
    for (let y = fy - 9; y <= fy; y++) {
      for (let x = cx - 11; x <= cx + 7; x++) {
        const w = (y + 0.5 - (fy - 4.5)) / 5;
        const flute = Math.floor(y + 40) % 3 === 0;
        c.px(x, y, LIMESTONE, norm(0, -w * 0.9, Math.sqrt(Math.max(0.05, 1 - w * w))), { bias: flute ? -1 : 0 });
      }
    }
    c.part();
    c.ellipse(cx + 8, fy - 4.5, 3.2, 5.2, LIMESTONE, { normal: () => norm(0.9, 0.1, 0.4) });
    for (const [ox, oy] of [[0, -3], [0, 3], [-1, 0], [1, -1.5], [1, 1.5]]) c.shade(cx + 8 + ox, fy - 4.5 + oy, -1);
    drift(c, cx - 14, cx + 2, fy, 2, 5190);
    return c;
  }
  const hw = 5;
  const plinth = fy - 4;
  // The plinth: two steps.
  c.part();
  box(c, cx - 8, plinth, cx + 7, plinth, LIMESTONE, UP, 1);
  box(c, cx - 8, plinth + 1, cx + 7, fy, LIMESTONE, FRONT, -1);
  c.part();
  box(c, cx - 7, plinth - 2, cx + 6, plinth - 2, LIMESTONE, UP, 1);
  box(c, cx - 7, plinth - 1, cx + 6, plinth - 1, LIMESTONE, FRONT, 0);
  const h = [44, 26, 8][v];
  const top = plinth - 2 - h;
  c.part();
  shaft(c, cx - 0.5, top, plinth - 3, hw);
  if (v === 0) {
    // The capital: a collar, a cushion, a square abacus on top.
    c.part();
    box(c, cx - 6, top - 1, cx + 5, top - 1, LIMESTONE, FRONT, 1);
    c.part();
    c.ellipse(cx - 0.5, top - 3.5, 7.5, 2.4, LIMESTONE, { flatten: 0.7 });
    c.part();
    box(c, cx - 9, top - 8, cx + 8, top - 7, LIMESTONE, UP, 1);
    box(c, cx - 9, top - 6, cx + 8, top - 5, LIMESTONE, FRONT, -1);
    // A chip knocked off its corner long ago.
    c.erase(cx + 8, top - 8);
    c.erase(cx + 7, top - 8);
    c.erase(cx + 8, top - 7);
  } else {
    // A broken top: a jagged break, its face to the sky.
    c.part();
    for (let x = Math.floor(cx - hw - 0.5); x < cx + hw - 0.5; x++) {
      const jag = Math.round(Math.sin(x * 1.7 + v) * 1.2 + R() * 1.4);
      for (let y = top - 2 - jag; y <= top; y++) c.px(x, y, LIMESTONE, UP, { bias: y === top - 2 - jag ? 1 : 0 });
    }
  }
  // Sand drifted against the plinth.
  drift(c, cx - 13, cx + 12, fy, 3 + v, 5150 + v);
  return c;
}

// ---------------------------------------------------------------- the caravan tent

export const TENT_W = 100;
export const TENT_H = 64;
export const TENT_FOOT_Y = 58;

function tentFrame(): PixelCanvas {
  const c = new PixelCanvas(TENT_W, TENT_H);
  const cx = TENT_W / 2;
  const fy = TENT_FOOT_Y;
  const eave = fy - 27;
  const peak = fy - 48;
  const poles = [-17, 17];
  const stripe = (x: number): Material => {
    const k = Math.floor((x - cx + 60) / 5) % 4;
    return k === 0 ? MADDER : k === 1 ? WOOL : k === 2 ? INDIGO : WOOL;
  };
  // Guy ropes behind, out to their pegs.
  c.part();
  for (const side of [-1, 1]) {
    c.line(cx + side * 40, eave - 4, cx + side * 48, fy - 1, ROPE);
    c.line(cx + side * 22, peak + 4, cx + side * 46, fy - 3, ROPE);
    box(c, cx + side * 48 - 1, fy - 2, cx + side * 48, fy, POLE, FRONT);
  }
  // Inside: lamplight on the back cloth, cushions heaped along it, a lantern hung from the ridge.
  c.part();
  for (let y = eave - 2; y <= fy - 1; y++) {
    for (let x = cx - 28; x <= cx + 28; x++) c.px(x, y, TENT_GLOW, FLAT, { bias: Math.round(1.6 - (y - eave) / 9 - Math.abs(x - cx) / 22) });
  }
  c.part();
  for (const [ox, rx, m] of [[-20, 6, CUSHION], [-9, 5, RUG_BLUE], [8, 6, CUSHION], [20, 5, RUG_GOLD]] as [number, number, Material][]) {
    c.ellipse(cx + ox, fy - 4, rx, 3.4, m, { flatten: 0.7 });
  }
  c.part();
  c.line(cx, eave - 2, cx, eave + 4, ROPE);
  c.ellipse(cx + 0.5, eave + 7, 2.2, 2.8, GLASS_AMBER, { flatten: 0.6 });
  c.px(cx, eave + 4, BRASS, UP, { bias: 1 });
  c.px(cx, eave + 7, FLAME, FLAT);
  // The side walls, closed, striped like the roof.
  c.part();
  for (const side of [-1, 1]) {
    for (let x = side < 0 ? cx - 42 : cx + 29; x <= (side < 0 ? cx - 29 : cx + 42); x++) {
      const out = Math.abs(x - cx) - 29;
      for (let y = eave + Math.round(out * 0.15); y <= fy; y++) c.px(x, y, stripe(x), norm(side * 0.5, -0.1, 0.85), { bias: -1 - (y > fy - 2 ? 1 : 0) });
    }
  }
  // The roof: two peaks on their poles, sagging a little between them and sloping down to the eaves.
  c.part();
  for (let x = cx - 44; x <= cx + 44; x++) {
    const lx = x - cx;
    const near = poles.reduce((a, p) => (Math.abs(lx - p) < Math.abs(lx - a) ? p : a), poles[0]);
    const d = Math.abs(lx - near);
    const between = Math.abs(lx) < 17;
    const roofTop = Math.round(peak + (between ? d * 0.35 : d * 0.62));
    for (let y = roofTop; y <= eave; y++) {
      const slope = between ? 0 : Math.sign(lx) * 0.7;
      const t = (y - roofTop) / Math.max(1, eave - roofTop);
      c.px(x, y, stripe(x), norm(slope - (between ? (lx - near) * 0.03 : 0), 0.55 - t * 0.5, 0.75), { bias: (y === roofTop ? 1 : 0) + (Math.floor((x - cx + 60) / 5) % 4 === 0 && (x - cx + 60) % 5 === 0 ? -1 : 0) });
    }
  }
  // The front valance, scalloped, with tassels.
  c.part();
  for (let x = cx - 44; x <= cx + 44; x++) {
    const scallop = Math.round(1.5 + Math.sin(((x - cx + 44) / 8) * Math.PI) * 1.5);
    for (let y = eave + 1; y <= eave + 2 + scallop; y++) c.px(x, y, MADDER, FRONT, { bias: y === eave + 1 ? 1 : 0 });
    if ((x - cx + 44) % 8 === 4) {
      c.px(x, eave + 4 + scallop, TASSEL, FLAT, { bias: 1 });
      c.px(x, eave + 5 + scallop, TASSEL, FLAT);
    }
  }
  c.part();
  for (let x = cx - 44; x <= cx + 44; x++) c.px(x, eave + 1, RUG_GOLD, FRONT, { bias: 1 });
  // The front poles holding the awning up.
  c.part();
  for (const px of [-29, 29]) post(c, cx + px, eave + 2, fy, 1.1, POLE);
  // Peak finials.
  for (const p of poles) {
    c.part();
    c.ellipse(cx + p, peak - 2, 1.3, 1.3, BRASS, { flatten: 0.8 });
    c.px(cx + p, peak - 4, BRASS, UP, { bias: 1 });
  }
  return c;
}

// ---------------------------------------------------------------- the rug and its tea

export const RUG_W = 60;
export const RUG_H = 24;
export const RUG_FOOT_Y = 18;

function rugFrame(): PixelCanvas {
  const c = new PixelCanvas(RUG_W, RUG_H);
  const cx = RUG_W / 2;
  const y0 = 8;
  const y1 = 19;
  const x0 = cx - 22;
  const x1 = cx + 22;
  // The rug, seen from above: a border, a field, a medallion of diamonds, fringes at the ends.
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const bx = Math.min(x - x0, x1 - x);
      const by = Math.min(y - y0, y1 - y);
      const edge = Math.min(bx, by * 2);
      let m: Material = RUG_RED;
      let bias = 0;
      if (edge < 2) m = RUG_BLUE;
      else if (edge < 4) {
        m = RUG_GOLD;
        bias = (x + y) % 3 === 0 ? -1 : 0;
      } else {
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - (y0 + y1) / 2) * 2;
        const dm = dx + dy;
        if (dm < 4) m = RUG_CREAM;
        else if (dm < 7) m = RUG_BLUE;
        else if (dm < 8) m = RUG_GOLD;
        // Little diamonds round the field.
        else if ((dx % 7 === 3 && dy % 4 === 1) || (dx % 7 === 4 && dy % 4 === 2)) m = RUG_GOLD;
      }
      c.px(x, y, m, UP, { bias });
    }
  }
  for (const ex of [x0 - 1, x1 + 1]) for (let y = y0 + 1; y <= y1; y += 2) c.px(ex, y, RUG_CREAM, UP, { bias: 1 });
  // A brass tray with a teapot and two little glasses, a cushion at the side.
  c.part();
  c.ellipse(cx + 6, 12, 5, 2, BRASS, { flatten: 0.4 });
  c.part();
  c.ellipse(cx + 5, 10, 2.2, 2, BRASS, { flatten: 0.8 });
  c.px(cx + 5, 7, BRASS, UP, { bias: 2 });
  c.px(cx + 4, 8, BRASS, UP, { bias: 1 });
  c.line(cx + 7, 10, cx + 9, 8, BRASS);
  c.part();
  for (const gx of [cx + 9, cx + 2]) {
    c.px(gx, 12, GLASS_AMBER, FLAT, { bias: 1 });
    c.px(gx, 13, GLASS_AMBER, FLAT);
  }
  c.part();
  c.ellipse(cx - 13, 13, 4.5, 3, CUSHION, { flatten: 0.6 });
  c.px(cx - 17, 15, TASSEL, FLAT);
  c.px(cx - 9, 15, TASSEL, FLAT);
  return c;
}

// ---------------------------------------------------------------- lanterns

export const LAMP_W = 20;
export const LAMP_H = 50;
export const LAMP_FOOT_Y = 47;

/** A brass lantern centred on (x, y): a domed cap with a finial, pierced sides with coloured glass. */
function brassLantern(c: PixelCanvas, x: number, y: number, glass: Material): void {
  c.part();
  for (let q = -4; q <= 4; q++) {
    const hw = 2.8 - Math.abs(q) * 0.12;
    for (let px = Math.floor(x - hw); px < x + hw; px++) {
      const u = (px + 0.5 - x) / hw;
      const frame = Math.abs(q) === 4 || Math.abs(Math.floor(px - x + 10) % 2) === 0 && (q + 10) % 3 === 0;
      c.px(px, y + q, frame ? BRASS : glass, cyl(u, 0), { bias: q < -2 ? 1 : 0 });
    }
  }
  c.part();
  c.ellipse(x, y - 5.5, 3.2, 1.8, BRASS, { flatten: 0.8 });
  c.px(x - 0.5, y - 8, BRASS, UP, { bias: 2 });
  c.px(x - 0.5, y - 9, BRASS, UP, { bias: 1 });
  c.part();
  for (let px = Math.floor(x - 2.4); px < x + 2.4; px++) c.px(px, y + 5, BRASS, FRONT, { bias: -1 });
  c.px(x - 0.5, y, FLAME, FLAT);
  c.px(x - 0.5, y - 1, FLAME, FLAT, { bias: 1 });
}

function lampFrame(v: number): PixelCanvas {
  const c = new PixelCanvas(LAMP_W, LAMP_H);
  const x = 6;
  if (v === 0) {
    // A carved post with the lantern set on its top.
    post(c, x, 20, LAMP_FOOT_Y, 1.6, POLE);
    c.part();
    box(c, x - 3, 18, x + 2, 19, POLE, UP, 1);
    for (const ry of [26, 38]) for (let px = x - 2; px < x + 2; px++) c.px(px, ry, BRASS, cyl((px + 0.5 - x) / 2, 0.1));
    brassLantern(c, x, 12, GLASS_AMBER);
    drift(c, x - 4, x + 4, LAMP_FOOT_Y, 1.5, 6000);
    return c;
  }
  // A tall shepherd's crook with the lantern swinging from it.
  post(c, x, 6, LAMP_FOOT_Y, 1.3, POLE);
  c.part();
  c.capsule(x, 6, x + 4, 3, 1, 0.9, POLE);
  c.capsule(x + 4, 3, x + 8, 5, 0.9, 0.8, POLE);
  c.part();
  c.line(x + 8, 6, x + 8, 9, ROPE);
  brassLantern(c, x + 8.5, 15, GLASS_ROSE);
  c.part();
  for (let px = x - 2; px < x + 2; px++) c.px(px, 30, TASSEL, cyl((px + 0.5 - x) / 2, 0.1));
  c.px(x + 2, 31, TASSEL, FLAT, { bias: -1 });
  c.px(x + 2, 32, TASSEL, FLAT, { bias: -2 });
  drift(c, x - 4, x + 4, LAMP_FOOT_Y, 1.5, 6001);
  return c;
}

// ---------------------------------------------------------------- clay jars

export const JAR_W = 30;
export const JAR_H = 26;
export const JAR_FOOT_Y = 23;

/** A jar standing at (x, fy): its belly, shoulder, neck and lip. */
function jar(c: PixelCanvas, x: number, fy: number, h: number, w: number, m: Material): void {
  c.part();
  const top = fy - h;
  for (let y = top + 3; y <= fy; y++) {
    const t = (y - top - 3) / (h - 3);
    const hw = w * Math.sin(Math.min(1, 0.25 + t * 1.05) * Math.PI * 0.92) * (t > 0.85 ? 1 - (t - 0.85) * 1.6 : 1);
    for (let px = Math.floor(x - hw); px < x + hw; px++) {
      const u = (px + 0.5 - x) / Math.max(1, hw);
      c.px(px, y, m, sphere(u, (t - 0.45) * 1.2, 0.9), { bias: y === top + 3 ? 1 : 0 });
    }
  }
  c.part();
  for (let y = top; y <= top + 2; y++) for (let px = Math.floor(x - 1.8); px < x + 1.8; px++) c.px(px, y, m, cyl((px + 0.5 - x) / 1.8, 0.1), { bias: y === top ? 1 : 0 });
  c.part();
  for (let px = Math.floor(x - 2.6); px < x + 2.6; px++) c.px(px, top, m, UP, { bias: 1 });
}

function jarFrame(v: number): PixelCanvas {
  const c = new PixelCanvas(JAR_W, JAR_H);
  const cx = JAR_W / 2;
  const fy = JAR_FOOT_Y;
  if (v === 0) {
    jar(c, cx - 3, fy - 1, 18, 6, CLAY);
    // A band painted round its shoulder.
    for (let px = cx - 9; px <= cx + 3; px++) if (c.materialAt(px, fy - 13) === CLAY) c.px(px, fy - 13, RUG_CREAM, FRONT, { bias: 0 });
    jar(c, cx + 6, fy, 10, 4, GLAZE);
  } else {
    jar(c, cx, fy, 14, 5, CLAY);
    jar(c, cx - 7, fy + 1, 8, 3.4, CLAY);
  }
  drift(c, cx - 11, cx + 11, fy + 1, 1.5, 6100 + v);
  return c;
}

// ---------------------------------------------------------------- camels

export const CAMEL_W = 46;
export const CAMEL_H = 42;
export const CAMEL_FOOT_Y = 39;

type CamelPose = 'w0' | 'w1' | 'w2' | 'w3' | 'stand' | 'chew' | 'graze';

/** Leg swing by walking frame: the near and far pairs, back and front (camels pace: a side's legs move together). */
const CAMEL_STRIDE: Record<string, [number, number]> = { w0: [2, -2], w1: [0, 0], w2: [-2, 2], w3: [0, 0] };

function camelFrame(pose: CamelPose): PixelCanvas {
  const c = new PixelCanvas(CAMEL_W, CAMEL_H);
  const fy = CAMEL_FOOT_Y;
  const bob = pose === 'w1' || pose === 'w3' ? -1 : 0;
  const [near, far] = CAMEL_STRIDE[pose] ?? [0, 0];
  const hipY = 23 + bob;
  const leg = (x: number, swing: number, back: boolean, farSide: boolean) => {
    c.part();
    const kx = x + swing * 0.5 + (back ? -1 : 0.5);
    const ky = hipY + 8;
    const fx = x + swing;
    c.capsule(x, hipY, kx, ky, back ? 2 : 1.6, 1, CAMEL, { bias: farSide ? -2 : 0 });
    c.capsule(kx, ky, fx, fy - 1, 1, 0.8, CAMEL, { bias: farSide ? -2 : 0 });
    c.px(kx, ky, CAMEL_DARK, FLAT, { bias: farSide ? -1 : 1 });
    c.px(fx - 1, fy, HOOF, FLAT);
    c.px(fx, fy, HOOF, FLAT);
    c.px(fx + 1, fy, HOOF, FLAT, { bias: -1 });
  };
  // Far legs first, in shade.
  leg(14, far, true, true);
  leg(30, far, false, true);
  // The body and its hump, the shaggy darker hair along the top.
  c.part();
  c.ellipse(22, 20 + bob, 12, 6.5, CAMEL, { flatten: 0.85 });
  c.part();
  c.ellipse(21, 12.5 + bob, 6.5, 5.4, CAMEL, { flatten: 0.85 });
  for (let x = 16; x <= 26; x++) {
    const y = Math.round(12.5 + bob - 5.4 * Math.sqrt(Math.max(0, 1 - ((x - 21) / 6.5) ** 2)));
    c.px(x, y, CAMEL_DARK, UP, { bias: 1 });
  }
  // A woven saddle cloth over the hump, its tassels hanging.
  c.part();
  for (let y = 13 + bob; y <= 22 + bob; y++) {
    for (let x = 15; x <= 27; x++) {
      if (!c.filled(x, y)) continue;
      const k = Math.floor((y - bob) / 2) % 3;
      c.px(x, y, k === 0 ? MADDER : k === 1 ? RUG_GOLD : INDIGO, sphere((x - 21) / 8, (y - 17 - bob) / 7, 0.85), { bias: 0 });
    }
  }
  for (const tx of [15, 18, 21, 24, 27]) {
    c.px(tx, 23 + bob, TASSEL, FLAT, { bias: 1 });
    c.px(tx, 24 + bob, TASSEL, FLAT);
  }
  // The tail, hanging with its tuft.
  c.part();
  c.line(10, 19 + bob, 9, 26 + bob, CAMEL, () => cyl(-0.3));
  c.px(9, 27 + bob, CAMEL_DARK, FLAT);
  c.px(8, 27 + bob, CAMEL_DARK, FLAT);
  // Near legs.
  leg(16, near, true, false);
  leg(32, near, false, false);
  // The neck: forward and down from the chest, then curving up to the head (or down to the ground, grazing).
  const neck: [number, number][] = pose === 'graze' ? [[31, 17], [36, 22], [39, 29], [40, 34]] : [[31, 17], [36, 20], [39, 15], [39, 9]];
  c.part();
  for (let k = 0; k < neck.length - 1; k++) {
    const [ax, ay] = neck[k];
    const [bx, by] = neck[k + 1];
    c.capsule(ax, ay + bob, bx, by + bob, k === 0 ? 3 : 2.2, k === 0 ? 2.2 : 1.8, CAMEL);
  }
  const [hx, hy0] = neck[neck.length - 1];
  const hy = hy0 + bob;
  c.part();
  if (pose === 'graze') {
    c.ellipse(hx + 1, hy + 1, 2.6, 2.2, CAMEL, { flatten: 0.8 });
    c.capsule(hx + 1, hy + 2, hx + 3, hy + 4, 1.6, 1.3, CAMEL);
    c.px(hx + 1, hy - 1, CAMEL_DARK, UP);
    c.px(hx + 2, hy, EYE, FLAT);
    return c;
  }
  c.ellipse(hx + 1, hy - 1, 3, 2.4, CAMEL, { flatten: 0.8, bias: 1 });
  // The long muzzle, its soft lip, chewing.
  const jaw = pose === 'chew' ? 1 : 0;
  c.capsule(hx + 2, hy, hx + 6, hy + 0.5 + jaw * 0.5, 1.8, 1.4, CAMEL);
  c.px(hx + 6, hy + 1 + jaw, CAMEL_DARK, FLAT);
  c.px(hx + 5, hy + 2 + jaw, CAMEL, FLAT, { bias: -1 });
  c.part();
  c.px(hx - 1, hy - 4, CAMEL, UP, { bias: 1 });
  c.px(hx - 1, hy - 3, CAMEL_DARK, FLAT);
  c.px(hx + 1, hy - 2, EYE, FLAT);
  c.px(hx + 2, hy - 3, CAMEL_DARK, UP);
  // A tassel halter.
  c.px(hx + 3, hy - 1, TASSEL, FLAT, { bias: 1 });
  c.px(hx + 3, hy + 1, TASSEL, FLAT);
  return c;
}

// ---------------------------------------------------------------- fennec foxes

export const FENNEC_W = 22;
export const FENNEC_H = 18;
export const FENNEC_FOOT_Y = 16;

type FennecPose = 'w0' | 'w1' | 'w2' | 'w3' | 'sit' | 'twitch' | 'look';

function fennecFrame(pose: FennecPose): PixelCanvas {
  const c = new PixelCanvas(FENNEC_W, FENNEC_H);
  const fy = FENNEC_FOOT_Y;
  const walk = pose.startsWith('w');
  const k = walk ? Number(pose[1]) : 0;
  const bob = walk && k % 2 === 1 ? -1 : 0;
  const sit = !walk;
  const tail = sit ? [[6, 14], [3, 14], [1, 13]] : [[6, 10], [3, 10 + (k % 2)], [1, 9 + (k % 2)]];
  // The bushy tail, its tip black.
  c.part();
  for (let q = 0; q < tail.length - 1; q++) c.capsule(tail[q][0], tail[q][1] + bob, tail[q + 1][0], tail[q + 1][1] + bob, 1.8, 1.6, FENNEC);
  c.px(tail[2][0] - 1, tail[2][1] + bob, NOSE, FLAT);
  c.px(tail[2][0], tail[2][1] + bob, NOSE, FLAT, { bias: 1 });
  // Legs: little and quick.
  const legs = sit ? [[9, 0], [13, 0]] : [[7, [1, 0, -1, 0][k]], [9, [-1, 0, 1, 0][k]], [12, [-1, 0, 1, 0][k]], [14, [1, 0, -1, 0][k]]];
  c.part();
  for (const [lx, sw] of legs) c.line(lx, 11 + bob, lx + sw, fy, FENNEC, () => cyl(-0.2), { bias: -1 });
  // The body (upright when sitting), pale belly.
  c.part();
  if (sit) c.ellipse(10, 11, 3.6, 3.6, FENNEC, { flatten: 0.85 });
  else c.ellipse(10, 10 + bob, 4.8, 2.6, FENNEC, { flatten: 0.85 });
  // The head, the enormous ears.
  const hx = sit ? 12 : 15;
  const hy = (sit ? 6 : 7) + bob;
  const look = pose === 'look';
  c.part();
  c.ellipse(hx, hy, 2.4, 2.1, FENNEC, { flatten: 0.85, bias: 1 });
  c.capsule(hx + 1, hy + 0.5, hx + (look ? -2 : 4), hy + 1, 1.3, 0.8, FENNEC);
  c.px(hx + (look ? -3 : 4.5), hy + 1, NOSE, FLAT);
  c.px(hx + (look ? -1 : 1), hy - 0.5, EYE, FLAT);
  const twitch = pose === 'twitch' ? 1 : 0;
  for (const [ex, lean] of [[hx - 1.5, -1.2], [hx + 1, 0.6 + twitch * 0.8]]) {
    c.part();
    for (let q = 0; q < 5; q++) {
      const t = q / 4;
      const w = (1 - t) * 1.6 + 0.4;
      for (let px = Math.floor(ex - w + lean * t); px < ex + w + lean * t; px++) {
        const inner = Math.abs(px + 0.5 - (ex + lean * t)) < w - 0.8 && q > 0 && q < 4;
        c.px(px, hy - 2 - q, inner ? EAR_PINK : FENNEC, UP, { bias: q === 4 ? 1 : 0 });
      }
    }
  }
  return c;
}

// ---------------------------------------------------------------- the sheets

const one = (key: string, w: number, h: number, footY: number, names: string[], draw: (k: number) => PixelCanvas, extra: Partial<SheetDef> = {}): SheetDef => ({
  key,
  w,
  h,
  footX: Math.floor(w / 2),
  footY,
  frames: names.map((name, k) => ({ name, draw: () => draw(k) })),
  ...extra,
});

export function duneSheets(): SheetDef[] {
  const palmFrames: SheetDef['frames'] = [];
  for (let v = 0; v < PALMS.length; v++) for (let f = 0; f < SWAY.length; f++) palmFrames.push({ name: `p${v}_${f}`, draw: () => palmFrame(v, f) });
  const camelPoses: CamelPose[] = ['w0', 'w1', 'w2', 'w3', 'stand', 'chew', 'graze'];
  const fennecPoses: FennecPose[] = ['w0', 'w1', 'w2', 'w3', 'sit', 'twitch', 'look'];
  return [
    {
      key: 'dune_palm',
      w: PALM_W,
      h: PALM_H,
      footX: Math.floor(PALM_W / 2),
      footY: PALM_FOOT_Y,
      frames: palmFrames,
      anims: PALMS.map((_, v) => ({ name: `sway${v}`, frames: [`p${v}_1`, `p${v}_2`, `p${v}_1`, `p${v}_0`], fps: 1.1, loop: true })),
    },
    one('dune_reed', REED_W, REED_H, REED_FOOT_Y, ['r0', 'r1', 'r2'], reedFrame),
    one('dune_shrub', SHRUB_W, SHRUB_H, SHRUB_FOOT_Y, ['s0', 's1'], shrubFrame),
    one('dune_grass', GRASS_W, GRASS_H, GRASS_FOOT_Y, ['g0', 'g1', 'g2'], grassFrame),
    one('dune_rock', ROCK_W, ROCK_H, ROCK_FOOT_Y, ['r0', 'r1', 'r2'], rockFrame),
    one('dune_spire', SPIRE_W, SPIRE_H, SPIRE_FOOT_Y, ['h0', 'h1'], spireFrame),
    one('dune_arch', ARCH_W, ARCH_H, ARCH_FOOT_Y, ['arch', 'leg'], (k) => (k === 0 ? archFrame() : new PixelCanvas(ARCH_W, ARCH_H))),
    one('dune_pillar', PILLAR_W, PILLAR_H, PILLAR_FOOT_Y, ['p0', 'p1', 'p2', 'd0'], pillarFrame),
    one('dune_tent', TENT_W, TENT_H, TENT_FOOT_Y, ['tent'], tentFrame, { glows: true }),
    one('dune_rug', RUG_W, RUG_H, RUG_FOOT_Y, ['rug'], rugFrame),
    one('dune_lamp', LAMP_W, LAMP_H, LAMP_FOOT_Y, ['l0', 'l1'], lampFrame, { glows: true, footX: 6 }),
    one('dune_jar', JAR_W, JAR_H, JAR_FOOT_Y, ['j0', 'j1'], jarFrame),
    {
      key: 'dune_camel',
      w: CAMEL_W,
      h: CAMEL_H,
      footX: 22,
      footY: CAMEL_FOOT_Y,
      frames: camelPoses.map((p) => ({ name: p, draw: () => camelFrame(p) })),
      anims: [
        { name: 'walk', frames: ['w0', 'w1', 'w2', 'w3'], fps: 4, loop: true },
        { name: 'idle', frames: ['stand', 'stand', 'chew', 'stand', 'chew', 'stand', 'stand', 'stand', 'graze', 'graze', 'graze', 'graze', 'stand', 'chew', 'stand'], fps: 2, loop: true },
      ],
    },
    {
      key: 'dune_fennec',
      w: FENNEC_W,
      h: FENNEC_H,
      footX: 10,
      footY: FENNEC_FOOT_Y,
      frames: fennecPoses.map((p) => ({ name: p, draw: () => fennecFrame(p) })),
      anims: [
        { name: 'walk', frames: ['w0', 'w1', 'w2', 'w3'], fps: 10, loop: true },
        { name: 'idle', frames: ['sit', 'sit', 'sit', 'twitch', 'sit', 'sit', 'look', 'look', 'sit', 'twitch', 'twitch', 'sit'], fps: 3, loop: true },
      ],
    },
  ];
}
