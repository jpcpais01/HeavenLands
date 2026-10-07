// Heaven Lands' own companions, the homely ones: Mochi the ginger kitten,
// Biscuit the corgi pup, Puddle the duckling, Woolly the cloud lamb and
// Maple the red panda. Drawn like the others (see pets.ts): 24x24, four
// looping frames, facing right, feet at (PET_OX, PET_OY). Three-quarter
// faces with both eyes showing, since these are meant to be looked at.

import { PixelCanvas, hex, sphere, type Material, type RGB } from './pixel';

const ramp = (...c: string[]): RGB[] => c.map(hex);

const W = 24;
const H = 24;

const EYE: Material = { ramp: ramp('#07060c', '#141220'), outline: hex('#030306'), noAO: true };
const SHINE: Material = { ramp: ramp('#d8dcef', '#ffffff'), outline: hex('#2a2a3a'), noAO: true, noOutline: true };
const BLUSH: Material = { ramp: ramp('#e07a8e', '#ffa4b6'), outline: hex('#401420'), noAO: true, noOutline: true };
const NOSE: Material = { ramp: ramp('#1a0e10', '#3a2226'), outline: hex('#080406'), noAO: true, noOutline: true };
const PINK: Material = { ramp: ramp('#c86a7e', '#f4a0b2'), outline: hex('#3a1820'), noAO: true, noOutline: true };

/** A rounded thing lit like a ball, a little flattened and turned to the light. */
const ball = (flat = 0.9, up = 0.2) => (_x: number, _y: number, dx: number, dy: number) => sphere(dx * flat, dy * flat - up, 1);

/** Shiny eyes (a dark pupil with a glint), closing on frame `blinkAt`. */
function eyes(c: PixelCanvas, pts: [number, number][], f: number, blinkAt = 2): void {
  c.part();
  for (const [x, y] of pts) {
    if (f === blinkAt) {
      c.px(x, y + 1, EYE, { x: 0, y: -0.2, z: 1 });
      continue;
    }
    c.px(x, y, EYE, { x: 0, y: 0, z: 1 });
    c.px(x, y + 1, EYE, { x: 0, y: 0, z: 1 });
    c.px(x, y, SHINE, { x: 0, y: 0.3, z: 1 });
  }
}

// ---------------------------------------------------------------- Mochi, the ginger kitten

const GINGER: Material = { ramp: ramp('#5a2810', '#8c4418', '#c86e2a', '#f0a052', '#ffd8a0'), outline: hex('#2a1006'), outlineLit: hex('#3e1a0a') };
const CREAM: Material = { ramp: ramp('#b8987a', '#e8d4b8', '#fff6e8'), outline: hex('#4a3020'), outlineLit: hex('#5a3e2a') };

function kitten(f: number): PixelCanvas {
  const c = new PixelCanvas(W, H);
  const bob = [0, 0, 0.5, 0.5][f];
  // The tail stands up behind it and curls, swaying from frame to frame.
  const sw = [0, 0.8, 1.4, 0.8][f];
  c.part();
  c.capsule(8, 16, 5, 12.5, 1.3, 1.1, GINGER, { bias: -1 });
  c.capsule(5, 12.5, 5.2 - sw * 0.6, 8.5, 1.1, 1, GINGER, { bias: -1 });
  c.capsule(5.2 - sw * 0.6, 8.5, 7 - sw, 6.6, 1, 0.9, GINGER, { bias: -1 });
  c.shade(5, 11, -1);
  c.shade(5, 9, -1);
  c.part();
  c.capsule(9, 18, 9, 21.3, 1, 0.9, GINGER, { bias: -1 });
  c.capsule(14, 18, 14.3, 21.3, 1, 0.9, GINGER, { bias: -1 });
  c.part();
  c.capsule(9, 16.3 + bob * 0.4, 13.5, 16 + bob * 0.4, 3.3, 3, GINGER);
  // Tabby stripes over its back.
  for (const x of [8, 10, 12]) {
    c.shade(x, 13 + Math.round(bob * 0.4), -1);
    c.shade(x, 14 + Math.round(bob * 0.4), -1);
  }
  c.part();
  c.ellipse(14.8, 17.2, 1.8, 2.3, CREAM, { normal: ball(0.8, 0) });
  c.part();
  c.capsule(10.5, 18.5, 10.3, 21.4, 1.1, 1, GINGER);
  c.capsule(15, 18.5, 15.4, 21.4, 1.1, 1, GINGER);
  c.px(10, 21, CREAM, { x: 0, y: 0.3, z: 0.9 });
  c.px(15, 21, CREAM, { x: 0, y: 0.3, z: 0.9 });
  // Its head, ears pricked, the near one twitching now and then.
  const twitch = f === 3 ? 0.6 : 0;
  c.part();
  c.capsule(14.2, 9.2 + bob, 13.4, 6.2 + bob, 1.4, 0.4, GINGER, { bias: -1 });
  c.capsule(18.6, 9 + bob, 19.6 + twitch, 6 + bob + twitch * 0.3, 1.5, 0.4, GINGER);
  c.part();
  c.ellipse(16.6, 11.4 + bob, 4.1, 3.4, GINGER, { normal: ball() });
  c.part();
  c.px(19, 7.8 + bob, PINK, { x: 0.2, y: 0.2, z: 0.9 });
  c.px(13.8, 8 + bob, PINK, { x: -0.2, y: 0.2, z: 0.9 }, { bias: -1 });
  // The M on its brow.
  c.shade(16, 8.6 + bob, -1);
  c.shade(17, 8.6 + bob, -1);
  c.shade(16.5, 9.4 + bob, -1);
  c.part();
  c.ellipse(17.4, 12.9 + bob, 1.9, 1.2, CREAM, { normal: ball(0.7, 0.1) });
  c.part();
  c.px(17.4, 12.2 + bob, PINK, { x: 0, y: 0.3, z: 0.9 });
  c.px(20, 12.4 + bob, BLUSH);
  c.px(14.4, 12.4 + bob, BLUSH);
  eyes(c, [[15.4, 10.4 + bob], [18.8, 10.4 + bob]], f, 2);
  return c;
}

// ---------------------------------------------------------------- Biscuit, the corgi pup

const TAN: Material = { ramp: ramp('#5a2a0e', '#94501c', '#d0802e', '#f2ac5a', '#ffdc9e'), outline: hex('#2a1206'), outlineLit: hex('#3c1c0a') };
const SNOW: Material = { ramp: ramp('#a8a0a0', '#dcd6d0', '#fffaf2'), outline: hex('#4a3a34'), outlineLit: hex('#5a4a42') };
const BANDANA: Material = { ramp: ramp('#7a1a2a', '#c43a4e', '#f2687a'), outline: hex('#2e0610') };
const TONGUE: Material = { ramp: ramp('#c0485e', '#ff8a9e'), outline: hex('#3a0c16'), noAO: true };

function pup(f: number): PixelCanvas {
  const c = new PixelCanvas(W, H);
  const bob = [0, -0.5, 0, 0.5][f];
  // A stub of a tail, wagging like mad.
  const wag = [0, 1.4, 0, -1.2][f];
  c.part();
  c.ellipse(5.4, 13.4 + wag * 0.6, 1.8, 1.5, TAN, { normal: ball(), bias: -1 });
  c.part();
  c.capsule(8.5, 17, 8.5, 21.3, 1.1, 1, TAN, { bias: -1 });
  c.capsule(13.5, 17, 13.6, 21.3, 1.1, 1, TAN, { bias: -1 });
  c.part();
  c.capsule(7.8, 15.4, 13.8, 15.2, 3.4, 3.2, TAN);
  c.part();
  c.ellipse(11.5, 17.9, 4, 1.4, SNOW, { normal: ball(0.6, -0.3) });
  c.part();
  c.capsule(9.8, 18, 9.8, 21.4, 1.1, 1, TAN);
  c.capsule(14.6, 18, 14.8, 21.4, 1.1, 1, TAN);
  c.px(9.5, 21, SNOW, { x: 0, y: 0.3, z: 0.9 });
  c.px(14.5, 21, SNOW, { x: 0, y: 0.3, z: 0.9 });
  // Big upright ears.
  c.part();
  c.capsule(14.4, 8.4 + bob, 13.2, 4.2 + bob, 1.7, 0.5, TAN, { bias: -1 });
  c.capsule(18.4, 8.2 + bob, 19.6, 4 + bob, 1.8, 0.5, TAN);
  c.part();
  c.capsule(18.6, 7.6 + bob, 19.3, 5.2 + bob, 0.6, 0.3, PINK);
  c.part();
  c.ellipse(16.5, 10.6 + bob, 3.9, 3.3, TAN, { normal: ball() });
  // A white snout and cheeks, the way corgis have them.
  c.part();
  c.ellipse(17.8, 12.3 + bob, 2.8, 1.7, SNOW, { normal: ball(0.7, 0.1) });
  c.part();
  c.px(19.4, 11.4 + bob, NOSE, { x: 0, y: 0.3, z: 0.9 });
  c.px(20.4, 11.6 + bob, NOSE, { x: 0, y: 0.3, z: 0.9 });
  if (f === 1 || f === 2) c.px(18.4, 13.6 + bob, TONGUE, { x: 0, y: 0, z: 1 });
  c.px(15.2, 12 + bob, BLUSH);
  eyes(c, [[15.6, 9.4 + bob], [18.6, 9.4 + bob]], f, 3);
  // A red bandana knotted round its neck.
  c.part();
  c.capsule(13.6, 13.6 + bob * 0.5, 17.2, 14.2 + bob * 0.5, 0.9, 0.9, BANDANA);
  c.capsule(15.4, 14.4 + bob * 0.5, 16.2, 16 + bob * 0.5, 0.9, 0.3, BANDANA);
  return c;
}

// ---------------------------------------------------------------- Puddle, the duckling

const DOWN: Material = { ramp: ramp('#8a6410', '#c8961c', '#f0c63a', '#ffe46e', '#fff8c8'), outline: hex('#3a2604'), outlineLit: hex('#4e3408') };
const BILL: Material = { ramp: ramp('#a04608', '#e47e1a', '#ffb24c'), outline: hex('#3a1404'), shine: true };

function duckling(f: number): PixelCanvas {
  const c = new PixelCanvas(W, H);
  const flap = [0, 0.6, 1.1, 0.5][f];
  const bob = [0, 0, 0.5, 0.5][f];
  c.part();
  c.capsule(9.5, 20.4, 11.6, 21.5, 0.7, 0.7, BILL, { bias: -1 });
  c.capsule(12.4, 20.4, 14.4, 21.5, 0.7, 0.7, BILL);
  c.part();
  // A round fuzzball, its tail-tuft cocked.
  c.ellipse(11, 16.4 + bob * 0.5, 5.4, 4.4, DOWN, { normal: ball(0.9, 0.25) });
  c.px(5.2, 14 + bob, DOWN, { x: -0.5, y: 0.5, z: 0.7 });
  c.px(5.6, 13 + bob, DOWN, { x: -0.5, y: 0.6, z: 0.6 }, { bias: 1 });
  c.part();
  c.ellipse(9.4, 16.2 + bob * 0.5 - flap, 2.8, 1.8, DOWN, { normal: (_x, _y, dx, dy) => sphere(dx * 0.6 - 0.2, dy * 0.6 - 0.4, 1) });
  c.part();
  c.ellipse(14.6, 10.6 + bob, 3.5, 3.3, DOWN, { normal: ball() });
  // A tuft of down sticking up off its crown.
  c.part();
  c.px(14, 6.8 + bob, DOWN, { x: -0.3, y: 0.7, z: 0.6 }, { bias: 1 });
  c.px(15, 6.2 + bob, DOWN, { x: 0.3, y: 0.7, z: 0.6 }, { bias: 1 });
  c.part();
  c.capsule(17.2, 11.6 + bob, 19.8, 11.9 + bob, 1.1, 0.8, BILL);
  c.px(16.4, 12.6 + bob, BLUSH);
  eyes(c, [[15.4, 9.6 + bob], [17.4, 9.8 + bob]], f, 3);
  return c;
}

// ---------------------------------------------------------------- Woolly, the cloud lamb

const WOOL: Material = { ramp: ramp('#8e88a2', '#bcb8cc', '#e4e2ee', '#ffffff'), outline: hex('#4e4660'), outlineLit: hex('#605874') };
const FACE: Material = { ramp: ramp('#3e2a28', '#5e423c', '#80605a', '#a6857a'), outline: hex('#2a1814'), outlineLit: hex('#3a221c') };
const HOOF: Material = { ramp: ramp('#2e2632', '#4e4454', '#6e6476'), outline: hex('#120e14') };
const BELL: Material = { ramp: ramp('#8a5a14', '#d8a03a', '#ffe08a'), outline: hex('#3a2406'), shine: true };
const RIBBON: Material = { ramp: ramp('#7a3a8a', '#b46ac4', '#e0a8ee'), outline: hex('#2e1036') };

/** Puffs of wool making up the lamb's fleece: their centres and size. */
const FLEECE: [number, number, number][] = [
  [7.4, 15.4, 2.5],
  [9.8, 13.6, 2.6],
  [12.8, 13.4, 2.6],
  [15, 15.2, 2.3],
  [8.4, 17.8, 2.4],
  [11.4, 18.2, 2.5],
  [14, 17.6, 2.3],
  [11, 15.6, 2.8],
];

function lamb(f: number): PixelCanvas {
  const c = new PixelCanvas(W, H);
  const breathe = [0, 0.15, 0.3, 0.15][f];
  const bob = [0, 0, 0.5, 0.5][f];
  c.part();
  c.capsule(8.6, 18, 8.6, 21.3, 0.9, 0.8, HOOF, { bias: -1 });
  c.capsule(13.4, 18, 13.6, 21.3, 0.9, 0.8, HOOF, { bias: -1 });
  // The fleece: one cloud of round puffs, each lit on its own, so it's bumpy like a cumulus.
  c.part();
  for (const [x, y, r] of FLEECE) c.ellipse(x, y, r + breathe, r + breathe, WOOL, { normal: ball(0.85, 0.25) });
  c.part();
  c.capsule(10, 19, 10, 21.4, 0.9, 0.8, HOOF);
  c.capsule(14.8, 19, 15, 21.4, 0.9, 0.8, HOOF);
  // A cap of wool on its head, then its face, floppy ears either side.
  const flop = [0, 0.3, 0.6, 0.3][f];
  c.part();
  c.ellipse(16.4, 8.6 + bob, 2, 1.8, WOOL, { normal: ball() });
  c.ellipse(18.8, 8.4 + bob, 1.9, 1.7, WOOL, { normal: ball() });
  c.part();
  c.capsule(15.4, 10.6 + bob, 13.2, 12 + bob + flop, 1.1, 0.7, FACE, { bias: -1 });
  c.part();
  c.ellipse(17.8, 11.8 + bob, 3, 3.2, FACE, { normal: ball(0.85, 0.15) });
  c.part();
  c.capsule(20.4, 10.4 + bob, 22, 11.8 + bob + flop, 1.1, 0.7, FACE);
  c.part();
  c.ellipse(17.8, 8.9 + bob, 1.4, 0.9, WOOL, { normal: ball() });
  c.part();
  c.px(17.8, 13.8 + bob, PINK, { x: 0, y: 0.3, z: 0.9 });
  c.px(15.6, 13 + bob, BLUSH);
  c.px(20, 13 + bob, BLUSH);
  eyes(c, [[16.4, 11.2 + bob], [19.2, 11.2 + bob]], f, 2);
  // A ribbon and a little gold bell at its throat.
  c.part();
  c.capsule(15.2, 15.2, 18.2, 15.4, 0.6, 0.6, RIBBON);
  c.part();
  c.ellipse(16.8, 16.4, 1, 1, BELL, { normal: ball(1, 0.2) });
  return c;
}

// ---------------------------------------------------------------- Maple, the red panda

const RUST: Material = { ramp: ramp('#4a1a0a', '#7c2e12', '#b84e1e', '#e47a38', '#ffb070'), outline: hex('#220a04'), outlineLit: hex('#341208') };
const RING: Material = { ramp: ramp('#32120a', '#5a2010', '#8a3816'), outline: hex('#1a0804') };
const SOOT: Material = { ramp: ramp('#140a08', '#2c1810', '#4c2c1e'), outline: hex('#060302') };

function panda(f: number): PixelCanvas {
  const c = new PixelCanvas(W, H);
  const bob = [0, 0, 0.5, 0.5][f];
  const sw = [0, 0.6, 1.1, 0.6][f];
  // A great ringed tail curling up behind, in bands.
  const tail: [number, number][] = [
    [8.5, 15.5],
    [6, 14.6],
    [4.2, 12.6],
    [3.6 - sw * 0.3, 10.2],
    [4.2 - sw * 0.6, 7.8],
    [5.6 - sw, 6.2],
  ];
  c.part();
  for (let i = 0; i < tail.length - 1; i++) {
    const [x0, y0] = tail[i];
    const [x1, y1] = tail[i + 1];
    c.capsule(x0, y0, x1, y1, 2.4 - i * 0.15, 2.3 - i * 0.18, i % 2 ? RING : RUST, { bias: -1 });
  }
  c.part();
  c.capsule(9, 17.5, 9, 21.3, 1.1, 1, SOOT, { bias: -1 });
  c.capsule(14, 17.5, 14.2, 21.3, 1.1, 1, SOOT, { bias: -1 });
  c.part();
  c.capsule(9, 15.6, 14, 15.4, 3.2, 3, RUST);
  c.part();
  c.ellipse(12, 18, 3.4, 1.3, SOOT, { normal: ball(0.6, -0.3) });
  c.part();
  c.capsule(10.4, 18, 10.3, 21.4, 1.1, 1, SOOT);
  c.capsule(15, 18, 15.3, 21.4, 1.1, 1, SOOT);
  c.part();
  c.capsule(14, 8.6 + bob, 13.2, 6.4 + bob, 1.6, 0.8, RUST, { bias: -1 });
  c.capsule(19.2, 8.4 + bob, 20, 6.2 + bob, 1.6, 0.8, RUST);
  c.part();
  c.px(13.4, 6.8 + bob, SNOW, { x: -0.2, y: 0.4, z: 0.8 }, { bias: -1 });
  c.px(19.8, 6.6 + bob, SNOW, { x: 0.2, y: 0.4, z: 0.8 });
  c.part();
  c.ellipse(16.6, 10.8 + bob, 4, 3.3, RUST, { normal: ball() });
  // Its white mask: brows, cheeks and muzzle, with russet tear-marks between.
  c.part();
  c.ellipse(14.4, 12.2 + bob, 1.4, 1.1, SNOW, { normal: ball(0.7, 0) });
  c.ellipse(19.6, 12 + bob, 1.4, 1.1, SNOW, { normal: ball(0.7, 0) });
  c.ellipse(17.2, 12.7 + bob, 1.5, 1.1, SNOW, { normal: ball(0.7, 0.1) });
  c.px(15.4, 8.8 + bob, SNOW, { x: 0, y: 0.4, z: 0.9 });
  c.px(18.6, 8.8 + bob, SNOW, { x: 0, y: 0.4, z: 0.9 });
  c.part();
  c.px(17.2, 12 + bob, NOSE, { x: 0, y: 0.3, z: 0.9 });
  eyes(c, [[15.6, 10.2 + bob], [18.6, 10.2 + bob]], f, 2);
  return c;
}

export const HEAVEN_PET_ART: Record<string, (f: number) => PixelCanvas> = {
  kitten,
  pup,
  duckling,
  lamb,
  redpanda: panda,
};
