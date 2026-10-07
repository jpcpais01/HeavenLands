// The garden's later plants (see world/homeParts.ts): a hydrangea, bamboo, a
// clipped topiary, a potted lemon tree, foxgloves, daisies, poppies,
// toadstools, a raised herb bed, a flower urn, a lotus and a rose trellis,
// drawn the same way as homeProps.ts: the game's high three-quarter view, lit
// from the upper left, with a glow layer that alone animates.

import { PixelCanvas, cyl, sphere, type Material } from './pixel';
import { hash2, rng } from './env';
import {
  art, box, drum, grain, halo, tufts, rose, mat, n3,
  FACE, TOP, FLOOR,
  OAKW, DARKW, PALEW, LINEN, LEAF, LEAF_DARK, STEM, ROSE, TERRA, SOIL, PALE_STONE, MOSS, LILY,
  PETAL_Y, STALK,
  type PropArt,
} from './homeProps';

// ---------------------------------------------------------------- Materials

// Mophead blooms in the soft blues and pinks hydrangeas take from their soil.
const HYD_BLUE = mat('#141c3a', '#283a6e', '#3a5294', '#5070b4', '#6e8ecc', '#90acdc', '#b4c8ea', '#d8e4f6');
const HYD_PINK = mat('#2e0e22', '#5e2246', '#8a3a68', '#b45a8a', '#d27ea6', '#e8a2c0', '#f6c4d8', '#ffe2ec');
const HYD_LILAC = mat('#1e1438', '#3e2c6a', '#5a4490', '#7a62b0', '#9a84c8', '#b8a6dc', '#d6caee', '#f0e8fa');
/** Broad leaves with a wet shine: hydrangea and citrus. */
const GLOSSY: Material = { ...mat('#06140c', '#0e2616', '#163a20', '#1e4e2a', '#286436', '#347a42', '#4a9250', '#68ac62', '#90c87c'), shine: true };
const CANE = mat('#121a06', '#2c3a0e', '#465816', '#62761e', '#7e9228', '#9aac38', '#b6c452', '#d0da74');
const BAMBOO_LEAF = mat('#061408', '#0c2612', '#14381a', '#1c4c22', '#26602c', '#327436', '#428a42', '#58a050', '#74b862');
/** Dry bamboo leaves lying on the ground. */
const HAY_LEAF = mat('#2a2008', '#6a5a24', '#8e7c38', '#b0a050', '#ccc070');
const BOXWOOD = mat('#04100a', '#0a2214', '#10321c', '#184426', '#225830', '#2e6c3a', '#3e8246', '#549852', '#72b064');
const LEMON: Material = { ...mat('#2a1c02', '#6a4a04', '#a07a0a', '#cca214', '#ecc624', '#fae04a', '#fff07e', '#fffac0'), shine: true };
const COBALT: Material = { ...mat('#060c22', '#0e1c48', '#16306e', '#204692', '#2e5eb2', '#4878c8', '#6c96da', '#9ab8ea'), shine: true };
const FOX_PINK = mat('#2a0a1e', '#5a1a40', '#882c62', '#b44484', '#d466a2', '#ea8cbe', '#f8b4d6', '#ffd8ea');
const FOX_PURPLE = mat('#1c0a2a', '#3c1856', '#5a267a', '#7a3a9c', '#9a56b8', '#b678ce', '#d09ce0', '#e8c4f0');
const FOX_WHITE = mat('#2a2230', '#6a5a72', '#968aa0', '#bcb2c4', '#dcd4e2', '#f0ecf4', '#fcfaff');
const FOX_SPECK: Material = { ...mat('#1a0618', '#3a0c32', '#5a1648', '#782460'), noOutline: true };
/** Soft, a little grey: velvety leaves (foxglove, poppy, rosemary). */
const VELVET_LEAF = mat('#0a160c', '#18301c', '#244428', '#325a34', '#427040', '#56864e', '#6e9c62', '#8ab47a');
const DAISY = mat('#3a3448', '#8a86a0', '#b6b4c8', '#d6d6e2', '#ececf2', '#f8f8fc', '#ffffff');
const DAISY_TIP = mat('#3a1a2a', '#a06078', '#c8869c', '#e4aabc', '#f4ccd8');
const POPPY = mat('#2a0204', '#5a080c', '#8a1014', '#b81c1c', '#dc3226', '#f04e34', '#ff7650', '#ffa27c');
const POPPY_EYE = mat('#040204', '#0e0610', '#1a0e1c', '#2a1a2c', '#3c2a3c');
const POD = mat('#0e1a0e', '#203a20', '#345434', '#4a6e44', '#64885a', '#84a274', '#a6bc90');
const WIRY: Material = { ...mat('#1a2a16', '#3a5a34', '#5a7c4a', '#7a9a62', '#98b47a'), noOutline: true };
const TOAD_CAP: Material = { ...mat('#1a0204', '#460810', '#760e18', '#a41a22', '#cc2a2c', '#e84438', '#f86a54', '#ff9478'), shine: true };
/** The toadstools' warts: pale, with a faint glow of their own (set per frame). */
const TOAD_SPOT: Material = { ...mat('#6a5a4a', '#d8ccb8', '#f2eadc', '#fffaf0', '#ffffff'), noOutline: true };
const ROSEMARY = mat('#08140c', '#14281a', '#1e3a26', '#2a4e32', '#386440', '#4a7a4e', '#609262', '#7aaa78');
const ROSEMARY_FLOWER = mat('#101a3a', '#3a5a9a', '#6a8ac8', '#9cb6e6', '#cadcf6');
const BASIL: Material = { ...mat('#061608', '#0e2c10', '#164418', '#1e5c20', '#2a762a', '#3a9036', '#52aa46', '#74c25c', '#9cd878'), shine: true };
const CHIVE = mat('#08160a', '#143018', '#1e4624', '#2a5e2e', '#38763a', '#4a8e48', '#62a85a');
const CHIVE_FLOWER = mat('#1e0e2a', '#4a2862', '#6e3e8a', '#9058aa', '#ae78c4', '#c89ad8', '#e0c0ec');
const INK: Material = { ...mat('#100c0a', '#2a2420', '#3a3230'), noOutline: true };
const PETUNIA = mat('#2a0624', '#5a1048', '#86206c', '#ae3a8e', '#cc5aa8', '#e282c0', '#f2aad6', '#fcd2e8');
const IVY = mat('#06120a', '#0e2414', '#16361e', '#204a28', '#2c5e32', '#3a743e', '#4e8a4c');
const LOTUS = mat('#3a0e24', '#6a2048', '#9a3a68', '#c45a8a', '#e07ea6', '#f2a4c0', '#fac8da', '#fff0f4');
const LOTUS_POD: Material = { ...mat('#2a2004', '#6a5a10', '#a08e1c', '#ccb82e', '#ecd84a', '#fff07c'), noAO: true };
const BLUSH_ROSE: Material = { ...mat('#2a0814', '#5a1430', '#86244a', '#b03c66', '#d05c82', '#e884a2', '#f6aec2', '#ffd4e0'), shine: true };
const CANE_GREEN: Material = { ...mat('#081208', '#163018', '#204222', '#2c562c'), noOutline: true };

// ---------------------------------------------------------------- Helpers

/** A pointed leaf from (x0, y0) out to (x1, y1), its midrib a shade lighter. */
function leafBlade(c: PixelCanvas, x0: number, y0: number, x1: number, y1: number, w: number, m: Material, bias = 0): void {
  c.part();
  c.capsule(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2, w * 0.7, w, m, { bias });
  c.capsule((x0 + x1) / 2, (y0 + y1) / 2, x1, y1, w, 0.35, m, { bias });
  c.line(x0, y0, x1 - (x1 - x0) * 0.2, y1 - (y1 - y0) * 0.2, m, () => TOP, { bias: bias + 1 });
}

/**
 * Shade whatever of material `m` the last part drawn covers along its upper
 * and left edges, a step darker, so overlapping heads of one colour still part.
 */
function castOn(c: PixelCanvas, x0: number, x1: number, y0: number, y1: number, m: Material): void {
  let top = 0;
  for (let i = 0; i < c.layer.length; i++) if (c.mat[i] >= 0 && c.layer[i] > top) top = c.layer[i];
  const marks: [number, number][] = [];
  for (let y = Math.floor(y0); y <= y1; y++) {
    for (let x = Math.floor(x0); x <= x1; x++) {
      if (x < 1 || y < 1 || x >= c.w || y >= c.h || c.layer[y * c.w + x] !== top || c.mat[y * c.w + x] < 0) continue;
      for (const [dx, dy] of [[0, -1], [-1, 0]] as const) {
        const j = (y + dy) * c.w + x + dx;
        if (c.layer[j] < top && c.materialAt(x + dx, y + dy) === m) marks.push([x + dx, y + dy]);
      }
    }
  }
  for (const [x, y] of marks) c.shade(x, y, -2);
}

/**
 * A hydrangea mophead: a round head of tiny four-petalled florets, each a
 * lit bump with a shadowed gap below it, so the ball reads as clustered.
 */
function mophead(c: PixelCanvas, x: number, y: number, r: number, m: Material, seed: number): void {
  c.part();
  c.ellipse(x, y, r, r * 0.88, m, { flatten: 0.9 });
  // Florets on a staggered grid, a little jittered.
  for (let j = -3; j <= 3; j++) {
    for (let i = -3; i <= 3; i++) {
      const fx = x + i * 2 + (j & 1) + (hash2(i, j, seed) - 0.5) * 0.8;
      const fy = y + j * 1.8;
      const d = Math.hypot((fx - x) / r, (fy - y) / (r * 0.88));
      if (d > 0.92 || c.materialAt(fx, fy) !== m) continue;
      c.shade(fx, fy, 1);
      c.shade(fx - 1, fy, 1);
      if (c.materialAt(fx + 1, fy + 1) === m) c.shade(fx + 1, fy + 1, -1);
    }
  }
  // The brightest florets crown its lit shoulder; a soft scallop round the rim.
  c.shade(x - r * 0.4, y - r * 0.5, 1);
  c.shade(x - r * 0.4 + 1, y - r * 0.5, 1);
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI * (0.1 + (k / 8) * 0.8) + (k > 5 ? Math.PI * 1.1 : 0);
    c.px(x + Math.cos(a) * (r + 0.5), y + Math.sin(a) * (r * 0.88 + 0.5), m, sphere(Math.cos(a) * 0.8, Math.sin(a) * 0.8), { bias: k < 5 ? 1 : 0 });
  }
  for (const hm of [HYD_BLUE, HYD_PINK, HYD_LILAC, GLOSSY]) castOn(c, x - r - 1, x + r + 1, y - r - 1, y + r + 1, hm);
}

/** Fine, dense foliage: every pixel of `m` a little lighter or darker, so it reads as clipped little leaves. */
function speckle(c: PixelCanvas, x0: number, x1: number, y0: number, y1: number, m: Material, seed: number): void {
  for (let y = Math.floor(y0); y < y1; y++) {
    for (let x = Math.floor(x0); x < x1; x++) {
      if (c.materialAt(x, y) !== m) continue;
      const h = hash2(x, y, seed);
      if (h > 0.8) c.shade(x, y, 1);
      else if (h < 0.22) c.shade(x, y, -1);
    }
  }
}

/** A clipped ball of box, stray leaves round its rim so it isn't a perfect circle. */
function boxBall(c: PixelCanvas, x: number, y: number, r: number, seed: number): void {
  c.part();
  c.ellipse(x, y, r, r * 0.92, BOXWOOD, { flatten: 0.95 });
  speckle(c, x - r - 1, x + r + 1, y - r - 1, y + r + 1, BOXWOOD, seed);
  const R = rng(seed);
  for (let k = 0; k < 12; k++) {
    const a = R() * Math.PI * 2;
    if (R() < 0.5) continue;
    c.px(x + Math.cos(a) * (r + 0.6), y + Math.sin(a) * (r * 0.92 + 0.6), BOXWOOD, sphere(Math.cos(a) * 0.8, Math.sin(a) * 0.8), { bias: Math.sin(a) < 0 ? 1 : -1 });
  }
  // A sheen on the lit shoulder where the shears left it smooth.
  c.shade(x - r * 0.45, y - r * 0.5, 1);
  c.shade(x - r * 0.45 + 1, y - r * 0.55, 1);
}

/** A daisy seen from above and a little in front: a ring of white rays round a yellow eye. */
function daisy(c: PixelCanvas, x: number, y: number, s: number, tip: boolean): void {
  c.part();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    const ex = x + Math.cos(a) * 2.3 * s;
    const ey = y + Math.sin(a) * 1.6 * s;
    c.line(x + Math.cos(a) * 0.9, y + Math.sin(a) * 0.6, ex, ey, DAISY, () => sphere(Math.cos(a) * 0.5, -Math.sin(a) * 0.5), { bias: Math.sin(a) < 0 ? 1 : 0 });
    if (tip && k % 2 === 0) c.px(ex, ey, DAISY_TIP, TOP, { bias: 1 });
  }
  c.part();
  c.px(x - 0.5, y - 0.5, PETAL_Y, sphere(-0.4, 0.4), { bias: 2 });
  c.px(x + 0.5, y - 0.5, PETAL_Y, TOP, { bias: 1 });
  if (s > 0.9) c.px(x - 0.5, y + 0.5, PETAL_Y, TOP, { bias: 0 });
}

/**
 * An open poppy seen into its cup: a round of papery scarlet, darker where
 * the far petals curve up, seams where they overlap, and a black heart
 * round a grey-green seed head.
 */
function poppy(c: PixelCanvas, x: number, y: number, s: number): void {
  c.part();
  const rx = 2.6 * s;
  const ry = 2.1 * s;
  // Concave: the near inside faces up into the light, the far wall away from it.
  c.ellipse(x, y, rx, ry, POPPY, { normal: (_x, _y, dx, dy) => n3(-dx * 0.35 - 0.1, dy * 0.45 + 0.15, 0.9) });
  // A ruffled lit rim on the near side and a notch where the far petals part.
  for (let xx = Math.floor(x - rx + 1); xx < x + rx - 1; xx++) c.shade(xx, y + ry - 0.5, 1);
  c.erase(x - 0.5, y - ry);
  // Seams between the four petals.
  c.shade(x - 1.5, y - 1, -1);
  c.shade(x + 1, y + 1, -1);
  c.shade(x + 1.5, y - 1.2, -1);
  c.part();
  for (const [dx, dy] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]] as const) c.px(x + dx, y + dy, POPPY_EYE, TOP, { bias: dx < 0 ? 1 : 0 });
  c.px(x - 0.5, y - 0.5, POD, TOP, { bias: 3 });
}

/** A foxglove bell hanging off its spire to side `o` (-1/1): `s` 0..1 from a closed bud to a wide-mouthed bell. */
function bell(c: PixelCanvas, x: number, y: number, o: number, s: number, m: Material): void {
  c.part();
  const ex = x + o * (0.7 + s * 0.9);
  const ey = y + 0.8 + s * 1.2;
  c.capsule(x, y, ex, ey, 0.5 + s * 0.2, 0.55 + s * 0.65, m, { bias: s < 0.35 ? -1 : 0 });
  if (s > 0.45) {
    // The open mouth, dark, its speckled throat just inside the lip.
    const my = Math.round(ey + 0.4 + s * 0.6);
    c.px(ex, my, m, FACE, { bias: -4 });
    c.px(ex - o, my, m, FACE, { bias: -1 });
    c.px(ex, my - 1, FOX_SPECK, FACE, { bias: 2 });
  }
}

/** A trailing strand: a stem wandering down from (x, y), a leaf each side by turns. */
function trail(c: PixelCanvas, x: number, y: number, len: number, drift: number, m: Material, seed: number, flower?: Material): void {
  const R = rng(seed);
  c.part();
  let px = x;
  for (let j = 0; j < len; j++) {
    px += drift * 0.25 + Math.sin(j * 0.9 + seed) * 0.35;
    c.px(px, y + j, CANE_GREEN, FACE);
    if (j % 2 === 1) {
      const sd = (j >> 1) % 2 ? 1 : -1;
      c.px(px + sd, y + j, m, sphere(sd * 0.5, 0.2), { bias: sd < 0 ? 2 : 0 });
      if (R() < 0.5) c.px(px + sd, y + j - 1, m, sphere(sd * 0.5, 0.6), { bias: 1 });
    }
  }
  if (flower) {
    c.part();
    c.px(px, y + len, flower, FACE, { bias: 1 });
    c.px(px - 0.5, y + len + 1, flower, FACE, { bias: 0 });
    c.px(px + 0.5, y + len + 1, flower, FACE, { bias: -1 });
  }
}

// ---------------------------------------------------------------- Shrubs

const hydrangea = art('hydrangea', 5, 14, (c, g) => {
  // A rounded bush of broad glossy leaves, crowned with big mopheads: blue
  // at the back, pink in front, one turning lilac between.
  const R = rng(5101);
  const cx = g.cx;
  const gy = g.y1 - 4;
  c.part();
  c.ellipse(cx, gy - 6, 8.5, 5.5, GLOSSY, { bias: -2, flatten: 0.9 });
  // Leaves fanning out round the mound's foot and sides.
  for (let k = 0; k < 13; k++) {
    const a = Math.PI * (-0.1 + (k / 12) * 1.2);
    const bx = cx + Math.cos(a) * 3;
    const by = gy - 6 + Math.sin(a) * 2;
    const ex = cx + Math.cos(a) * (9.5 + R() * 1.5);
    const ey = gy - 6 + Math.sin(a) * (5 + R()) - 1;
    leafBlade(c, bx, by, ex, ey, 1.7, GLOSSY, Math.sin(a) > 0.5 ? 0 : -1);
  }
  const heads: [number, number, number, Material][] = [
    [-4, -13, 3.7, HYD_BLUE],
    [3.5, -14, 3.6, HYD_PINK],
    [0, -10, 3.5, HYD_LILAC],
    [-5.5, -7, 3.4, HYD_PINK],
    [5.5, -7.5, 3.4, HYD_BLUE],
    [0, -5, 3.6, HYD_BLUE],
  ];
  heads.forEach(([x, y, r, m], k) => {
    mophead(c, cx + x, gy + y, r, m, 5110 + k);
    // A leaf or two tucked between the heads.
    if (k === 2 || k === 4) leafBlade(c, cx + x - 1, gy + y + r * 0.7, cx + x + (k === 2 ? -4 : 4), gy + y + r * 0.9, 1.3, GLOSSY, 0);
  });
  tufts(c, cx, gy + 2, 8, 5102, 6);
});

const bamboo = art('bamboo', 5, 42, (c, g) => {
  // A clump of canes, ringed at every node, leaning a little apart, with
  // slim leaves hanging off the upper nodes in sprays.
  const R = rng(5201);
  const gy = g.y1 - 5;
  const canes = [
    { x: g.cx - 2, h: 34, lean: -3.5, back: true },
    { x: g.cx + 2.5, h: 38, lean: 3, back: true },
    { x: g.cx + 0.5, h: 27, lean: 0.5, back: false },
    { x: g.cx - 5, h: 21, lean: -2.5, back: false },
    { x: g.cx + 5, h: 16, lean: 2.5, back: false },
  ];
  // Each spray: where it springs from, and its leaves as (side, angle below level).
  const sprays: { x: number; y: number; leaves: [number, number][] }[] = [];
  for (const cn of canes) {
    const by = gy + (cn.back ? -2 : 0);
    const top = by - cn.h;
    const at = (y: number) => cn.x + cn.lean * ((by - y) / cn.h) ** 1.4;
    c.part();
    c.shape(top, by, (y) => {
      const u = (y - top) / cn.h;
      const hw = u < 0.08 ? 0.6 : 1.15;
      return [at(y) - hw, at(y) + hw];
    }, CANE, (_x, _y, t) => cyl(t, 0.05), { bias: cn.back ? -1 : 0 });
    // Nodes: a dark joint, a lit swelling above it.
    for (let y = by - 4; y > top + 2; y -= 5 + Math.round(R())) {
      c.shade(at(y) - 1, y, -2);
      c.shade(at(y), y, -2);
      c.shade(at(y) - 1, y - 1, 1);
      if ((by - y) / cn.h > 0.45 && R() < 0.6) {
        const d = R() < 0.5 ? -1 : 1;
        sprays.push({ x: at(y), y, leaves: [[d, 0.35 + R() * 0.2], [d, 0.8 + R() * 0.2], ...(R() < 0.5 ? [[-d, 0.6] as [number, number]] : [])] });
      }
    }
    // A fan at the tip, the cane's own lean carrying most of it.
    const d = cn.lean < 0 ? -1 : 1;
    sprays.push({ x: at(top + 1), y: top + 1, leaves: [[d, -0.5], [d, 0.15], [d, 0.75], [-d, -0.1], [-d, 0.6]] });
  }
  // The leaves: long, narrow, drooping away from the cane.
  sprays.sort((a, b) => a.y - b.y);
  for (const s of sprays) {
    for (const [dir, a] of s.leaves) {
      const len = 5 + R() * 2.5;
      c.part();
      const ex = s.x + dir * Math.cos(a) * len;
      const ey = s.y + Math.sin(a) * len * 0.8 + 1;
      c.capsule(s.x + dir * 0.8, s.y, ex, ey, 0.85, 0.3, BAMBOO_LEAF, { bias: a < 0 ? 1 : 0 });
      c.line(s.x + dir, s.y, (s.x + ex) / 2, (s.y + ey) / 2 - 0.3, BAMBOO_LEAF, () => TOP, { bias: 2 });
    }
  }
  // Fresh shoots and fallen leaves at the foot.
  c.part();
  c.capsule(g.cx - 1, gy + 1, g.cx - 1.3, gy - 3, 0.9, 0.3, CANE, { bias: 1 });
  c.capsule(g.cx + 6, gy + 1, g.cx + 6.3, gy - 1.5, 0.8, 0.3, CANE, { bias: 0 });
  c.part();
  c.line(g.cx - 7, gy + 2, g.cx - 4, gy + 2, HAY_LEAF, () => FLOOR);
  c.line(g.cx + 2, gy + 3, g.cx + 4, gy + 2, HAY_LEAF, () => FLOOR);
  tufts(c, g.cx, gy + 2, 7, 5202, 6);
});

const topiary = art('topiary', 3, 22, (c, g) => {
  // Two clipped balls of box on a bare stem, a big one and a little one, in
  // a rolled-rim terracotta pot.
  const cx = g.cx;
  const gy = g.y1 - 5;
  drum(c, cx, gy, 4.3, 2.3, 0, 6, TERRA, SOIL, { topBias: -1 });
  drum(c, cx, gy, 5, 2.7, 5, 8, TERRA, null, { bias: 1 });
  // A pressed band round the pot's belly.
  for (let x = Math.floor(cx - 4); x < cx + 4; x++) c.shade(x, gy + Math.round(Math.sqrt(Math.max(0, 1 - ((x + 0.5 - cx) / 4.3) ** 2)) * 2.3) - 3, -1);
  c.part();
  for (let x = Math.floor(cx - 3); x < cx + 3; x++) c.px(x, gy - 8, SOIL, TOP, { bias: hash2(x, gy, 5301) > 0.6 ? 1 : 0 });
  c.part();
  c.capsule(cx, gy - 8, cx, gy - 13, 0.8, 0.7, DARKW);
  boxBall(c, cx, gy - 16, 5.6, 5302);
  c.part();
  c.capsule(cx, gy - 21, cx, gy - 24, 0.7, 0.6, DARKW);
  boxBall(c, cx, gy - 27, 3.9, 5303);
  tufts(c, cx, gy + 3, 6, 5304, 4);
});

const lemontree = art('lemontree', 5, 22, (c, g) => {
  // A little citrus tree in a cobalt glazed pot with a cream band: a slim
  // trunk, a round crown of glossy leaves, ripe lemons and a few blossoms.
  const R = rng(5401);
  const cx = g.cx;
  const gy = g.y1 - 5;
  drum(c, cx, gy, 4, 2.2, 0, 7, COBALT, SOIL, { topBias: -1 });
  drum(c, cx, gy, 4.6, 2.5, 6, 8, COBALT, null, { bias: 1 });
  // The glaze's painted band: cream with a dotted blue wave on it.
  for (let x = Math.floor(cx - 3.5); x < cx + 3.5; x++) {
    const y = gy + Math.round(Math.sqrt(Math.max(0, 1 - ((x + 0.5 - cx) / 4) ** 2)) * 2.2) - 4;
    c.px(x, y - 1, LINEN, FACE, { bias: x < cx ? 1 : -1 });
    if ((x & 1) === 0) c.px(x, y, LINEN, FACE, { bias: x < cx ? 0 : -2 });
  }
  c.part();
  c.capsule(cx, gy - 8, cx - 0.5, gy - 11, 0.9, 0.7, OAKW);
  c.capsule(cx - 0.5, gy - 11, cx + 0.5, gy - 14, 0.7, 0.6, OAKW);
  // The crown: overlapping clumps of glossy leaves, a pointed leaf poking out here and there.
  const crown = { x: cx, y: gy - 20, rx: 7, ry: 6 };
  c.part();
  c.ellipse(crown.x, crown.y, crown.rx, crown.ry, GLOSSY, { bias: -2 });
  const clumps = Array.from({ length: 8 }, () => {
    const a = R() * Math.PI * 2;
    const d = Math.sqrt(R()) * 0.75;
    return { x: crown.x + Math.cos(a) * crown.rx * d, y: crown.y + Math.sin(a) * crown.ry * d, r: 2.6 + R() * 1.2 };
  }).sort((a, b) => a.y - b.y);
  for (const k of clumps) {
    c.part();
    c.ellipse(k.x, k.y, k.r, k.r * 0.85, GLOSSY, { flatten: 0.9 });
    c.px(k.x - 1, k.y - k.r * 0.5, GLOSSY, TOP, { bias: 1 });
  }
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI * (0.05 + (k / 6) * 0.9) + (k % 3 === 2 ? Math.PI : 0);
    const bx = crown.x + Math.cos(a) * crown.rx * 0.8;
    const by = crown.y + Math.sin(a) * crown.ry * 0.8;
    leafBlade(c, bx, by, bx + Math.cos(a) * 3, by + Math.sin(a) * 2.4, 1, GLOSSY, 0);
  }
  speckle(c, crown.x - 10, crown.x + 10, crown.y - 9, crown.y + 8, GLOSSY, 5402);
  // Lemons, mostly on the front and the sides where they catch the sun.
  for (const [x, y] of [[-4, 2.5], [3.5, 3], [0, 5], [5.5, -1], [-1.5, -1.5], [-6, -2]] as const) {
    c.part();
    // A lemon: an oval, a nub at its tip, hanging a touch below its leaves.
    c.ellipse(crown.x + x, crown.y + y, 1.5, 1.2, LEMON, { flatten: 0.9 });
    c.px(crown.x + x + 1.6, crown.y + y, LEMON, sphere(0.9, 0), { bias: -1 });
    c.px(crown.x + x - 1, crown.y + y - 1, LEMON, sphere(-0.6, 0.6), { bias: 1 });
  }
  // White blossoms, a pinch of their scent.
  c.part();
  for (const [x, y] of [[2, -4], [-3.5, -4.5]] as const) {
    c.px(crown.x + x, crown.y + y, LINEN, TOP, { bias: 3 });
    c.px(crown.x + x + 1, crown.y + y, LINEN, TOP, { bias: 0 });
  }
  tufts(c, cx, gy + 3, 6, 5403, 4);
});

// ---------------------------------------------------------------- Flowers

const foxgloves = art('foxgloves', 4, 28, (c, g) => {
  // Three slim spires over a rosette of soft leaves, their bells hanging
  // off both sides by turns, open and speckled low down, closed green buds
  // at the tips.
  const R = rng(5501);
  const cx = g.cx;
  const gy = g.y1 - 5;
  // The rosette.
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * (-0.12 + (k / 7) * 1.24);
    const len = 4.5 + R() * 2;
    leafBlade(c, cx + Math.cos(a) * 1.5, gy - 1 + Math.sin(a), cx + Math.cos(a) * len * 1.25, gy - 1 + Math.sin(a) * len * 0.55, 1.4, VELVET_LEAF, Math.sin(a) > 0.3 ? -1 : -2);
  }
  const spires = [
    { x: cx - 3.5, h: 20, lean: -1.5, m: FOX_PURPLE },
    { x: cx + 4, h: 16, lean: 1.5, m: FOX_WHITE },
    { x: cx + 0.5, h: 26, lean: 0.5, m: FOX_PINK },
  ];
  for (const s of spires) {
    const by = gy - 2;
    const top = by - s.h;
    const at = (y: number) => s.x + s.lean * ((by - y) / s.h);
    c.part();
    c.line(s.x, by, at(top), top, STEM, () => n3(0.2, 0, 1));
    // Two small leaves low on the stalk.
    leafBlade(c, at(by - 3), by - 3, at(by - 3) - 2.5, by - 4.5, 0.8, VELVET_LEAF, 0);
    leafBlade(c, at(by - 5), by - 5, at(by - 5) + 2.5, by - 6.5, 0.8, VELVET_LEAF, 0);
    // Bells from the tip down, so lower (bigger, nearer) ones sit in front.
    const bot = by - 6;
    const n = Math.floor((bot - top) / 1.7);
    for (let j = 0; j <= n; j++) {
      const y = top + j * 1.7;
      const u = j / n;
      bell(c, at(y), y, j % 2 ? 1 : -1, u, u < 0.2 ? VELVET_LEAF : s.m);
    }
  }
  tufts(c, cx, gy + 2, 7, 5502, 5);
});

const daisies = art('daisies', 3, 6, (c, g) => {
  // A low cushion of leaves starred with white daisies, a couple blushing
  // pink at their tips, a closed bud or two.
  const R = rng(5601);
  const gy = g.y1 - 3;
  c.part();
  for (let k = 0; k < 9; k++) {
    const x = g.cx - 6 + (k % 3) * 6 + (R() - 0.5) * 3;
    const y = gy - 3 - Math.floor(k / 3) * 3.5 + (R() - 0.5) * 2;
    c.ellipse(x, y, 3.2, 2, k % 2 ? LEAF : LEAF_DARK, { flatten: 0.6 });
  }
  for (let k = 0; k < 10; k++) {
    const a = Math.PI * (-0.1 + R() * 1.2);
    leafBlade(c, g.cx + Math.cos(a) * 3, gy - 4 + Math.sin(a) * 2, g.cx + Math.cos(a) * 8.5, gy - 4 + Math.sin(a) * 4.5, 1, LEAF, 0);
  }
  const flowers = [
    [-4, -11, 0.75], [3, -12, 0.7], [7, -7, 0.7], [-0.5, -7.5, 0.85], [-6.5, -4.5, 0.8], [4, -3.5, 0.85], [-1.5, -2, 0.8],
  ].sort((a, b) => a[1] - b[1]);
  flowers.forEach(([x, y, s], k) => {
    c.part();
    c.line(g.cx + x, gy + y + 1, g.cx + x, gy + y + 3, STEM);
    daisy(c, g.cx + x, gy + y, s, k === 1 || k === 5);
  });
  // Buds: pale green knots, one blushing.
  c.part();
  c.px(g.cx - 7.5, gy - 9, POD, sphere(-0.3, 0.4), { bias: 2 });
  c.px(g.cx + 0.5, gy - 15, DAISY_TIP, sphere(-0.3, 0.4), { bias: 2 });
  c.px(g.cx + 0.5, gy - 14, POD, FACE, { bias: 0 });
  tufts(c, g.cx, gy + 1, 8, 5602, 6);
});

const poppies = art('poppies', 4, 18, (c, g) => {
  // Scarlet poppies on wiry, wandering stems over a tuft of feathery grey
  // leaves; a nodding bud and one about to open.
  const R = rng(5701);
  const cx = g.cx;
  const gy = g.y1 - 4;
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * (-0.1 + (k / 7) * 1.2);
    const ex = cx + Math.cos(a) * (6 + R() * 2);
    const ey = gy - 2 + Math.sin(a) * 3;
    leafBlade(c, cx + Math.cos(a) * 1.5, gy - 2, ex, ey, 1.1, VELVET_LEAF, Math.sin(a) > 0.2 ? -1 : -2);
    // Lobes nicked out of the leaf's edge.
    c.erase((cx + ex) / 2 + 1, (gy - 2 + ey) / 2 - 1);
  }
  const flowers = [
    { x: cx - 3.5, y: gy - 14, s: 1, bend: -1.5 },
    { x: cx + 4.5, y: gy - 11, s: 0.9, bend: 1.5 },
    { x: cx, y: gy - 7, s: 1.05, bend: 0.8 },
  ];
  // Stems first, each a gentle curve, then the heads over them.
  c.part();
  for (const f of flowers) {
    const n = gy - 2 - f.y;
    for (let j = 0; j <= n; j++) {
      const u = j / n;
      c.px(cx + (f.x - cx) * u + Math.sin(u * Math.PI) * f.bend, gy - 2 - j, WIRY, n3(0.3, 0, 1), { bias: 1 });
    }
  }
  // The nodding bud: its stem hooks over and the bud hangs head down.
  c.part();
  const nb = { x: cx + 2, y: gy - 17 };
  c.line(cx + 0.5, gy - 3, nb.x, nb.y, WIRY, () => n3(0.3, 0, 1), { bias: 1 });
  c.line(nb.x, nb.y, nb.x + 2, nb.y + 1, WIRY, () => n3(0.3, 0, 1), { bias: 1 });
  c.part();
  c.capsule(nb.x + 2.5, nb.y + 2, nb.x + 2.5, nb.y + 3.5, 1.1, 1.3, POD);
  c.px(nb.x + 2, nb.y + 4.5, POPPY, FACE, { bias: 1 });
  // A bud splitting open, the red showing through.
  c.part();
  c.line(cx - 2, gy - 3, cx - 6.5, gy - 9, WIRY, () => n3(0.3, 0, 1), { bias: 1 });
  c.part();
  c.ellipse(cx - 6.5, gy - 10.5, 1.2, 1.6, POD);
  c.px(cx - 6.5, gy - 12, POPPY, TOP, { bias: 2 });
  c.px(cx - 6.5, gy - 11, POPPY, FACE, { bias: 0 });
  flowers.sort((a, b) => a.y - b.y);
  for (const f of flowers) poppy(c, f.x, f.y, f.s);
  tufts(c, cx, gy + 1, 7, 5702, 5);
});

const toadstools = art('toadstools', 3, 10, (c, g, f) => {
  // A fairy cluster of fly agarics on a pad of moss: red domes with pale
  // warts, cream stalks with a skirt. The warts hold a faint glow that
  // breathes slowly by night, each cap a beat after the last.
  const gy = g.y1 - 4;
  c.part();
  c.ellipse(g.cx, gy, 7, 2.6, MOSS, { normal: () => FLOOR });
  const caps = [
    { x: g.cx + 3.5, y: gy - 2, r: 3, stalk: 4, phase: 1 },
    { x: g.cx - 2, y: gy - 1, r: 4.3, stalk: 6, phase: 0 },
    { x: g.cx + 4.5, y: gy + 1.5, r: 2, stalk: 2.5, phase: 2 },
    { x: g.cx - 6, y: gy + 1, r: 1.6, stalk: 1.5, phase: 3 },
  ];
  for (const t of caps) {
    const glow = [0.18, 0.28, 0.36, 0.26][(f + t.phase) % 4];
    const top = t.y - t.stalk;
    // The stalk, swelling to its foot, a skirt under the cap on the big ones.
    c.part();
    c.shape(top, t.y, (y) => {
      const u = (y - top) / Math.max(1, t.stalk);
      const hw = t.r * 0.32 + u * u * t.r * 0.18;
      return [t.x - hw, t.x + hw];
    }, STALK, (_x, _y, tt) => cyl(tt, -0.1));
    if (t.r > 2.5) {
      c.part();
      for (let x = Math.round(t.x - t.r * 0.45); x < t.x + t.r * 0.45; x++) c.px(x, top + 1.5, STALK, FACE, { bias: x < t.x ? 1 : -1 });
    }
    // The gills' shadow under the rim, then the dome.
    c.part();
    for (let x = Math.round(t.x - t.r + 0.5); x < t.x + t.r - 0.5; x++) c.px(x, top, STALK, n3(0, -0.8, 0.4), { bias: -2 + (x & 1) });
    const h = Math.max(2, t.r * 1.15);
    c.part();
    c.shape(Math.round(top - h), top - 1, (y) => {
      const u = (y - top + h) / h;
      const hw = 0.6 + Math.sqrt(Math.max(0, u)) * (t.r - 0.4);
      return [t.x - hw, t.x + hw];
    }, TOAD_CAP, (_x, _y, tt, u) => n3(tt * 0.75, 0.62 - u * 0.8, 0.66));
    // Warts: scattered over the dome, fewer on the small ones.
    const R = rng(5801 + t.phase);
    const n = Math.round(t.r * 1.6);
    for (let k = 0; k < n; k++) {
      const a = -Math.PI * (0.1 + R() * 0.8);
      const d = 0.25 + R() * 0.6;
      const x = t.x + Math.cos(a) * t.r * d;
      const y = top - 1 + Math.sin(a) * h * d;
      if (c.materialAt(x, y) !== TOAD_CAP) continue;
      c.px(x, y, TOAD_SPOT, TOP, { bias: Math.cos(a) < 0 ? 1 : 0, glow });
    }
    halo(c, t.x, top - h * 0.5, t.r + 3, [255, 214, 196], glow * 0.18);
  }
  // A spore or two drifting up, only in the glow.
  c.spark(g.cx - 4 + (f % 2), gy - 10 - f, [255, 226, 210], 0.35);
  c.spark(g.cx + 2 - (f >> 1), gy - 7 - ((f + 2) % 4), [255, 214, 196], 0.25);
  tufts(c, g.cx, gy + 3, 7, 5802, 5);
}, 4, 2);

// ---------------------------------------------------------------- Beds and ornaments

const herbbed = art('herbbed', 2, 18, (c, g) => {
  // A raised bed of boards on corner posts, three herbs in a row: rosemary,
  // basil and chives in flower, a hand-written stick in front of the basil,
  // and thyme spilling over the rim.
  const R = rng(5901);
  const x0 = g.x0 + 1;
  const x1 = g.x1 - 1;
  const y0 = g.y0 + 4;
  const y1 = g.y1 - 2;
  const z = 7;
  box(c, x0, x1, y0, y1, 0, z, OAKW);
  // Two boards along the front, and the end posts standing a touch proud.
  for (let x = x0; x < x1; x++) c.shade(x, y1 - 4, -1);
  grain(c, x0, x1, y1 - z, y1, 5902);
  for (const px of [x0, x1 - 2]) {
    box(c, px, px + 2, y1 - 1, y1, 0, z + 1, DARKW, { bias: px === x0 ? 1 : 0 });
  }
  c.part();
  for (let y = y0 - z + 1; y < y1 - z - 1; y++) for (let x = x0 + 1; x < x1 - 1; x++) c.px(x, y, SOIL, TOP, { bias: hash2(x, y, 5903) > 0.7 ? 1 : 0 });
  const soilY = y1 - z - 2;
  // Rosemary: stiff upright sprigs, needles angled up off each side, a few blue flowers.
  const rx = x0 + 6;
  for (let k = 0; k < 7; k++) {
    const bx = rx - 4.5 + k * 1.6 + (R() - 0.5) * 0.6;
    const by = soilY - 1 - (k % 2) * 2;
    const h = (k % 2 ? 8 : 10) + R() * 3;
    const lean = (k - 3) * 0.45;
    c.part();
    for (let j = 0; j < h; j++) {
      const x = bx + lean * (j / h) * 2;
      const y = by - j;
      c.px(x, y, ROSEMARY, n3(0, 0.3, 0.9), { bias: j > h - 3 ? 1 : -1 });
      if (j > 0 && j < h - 1 && j % 2 === 1) {
        c.px(x - 1, y - 1, ROSEMARY, sphere(-0.6, 0.4), { bias: 0 });
        c.px(x + 1, y - 1, ROSEMARY, sphere(0.6, 0.4), { bias: -2 });
      }
    }
    if (R() < 0.7) c.px(bx + lean * 1.2 + 1, by - h * 0.6, ROSEMARY_FLOWER, TOP, { bias: 3 });
  }
  // Basil: a bushy mound of bright cupped leaves in pairs.
  const bxm = x0 + 15;
  const pairs = [
    [-3, -4, 1.9], [3, -4, 1.9], [-1.5, -7.5, 1.7], [2, -8.5, 1.7], [0, -11, 1.5], [-4, -8, 1.5], [4.5, -7.5, 1.5], [0.5, -2.5, 2],
  ].sort((a, b) => a[1] - b[1]);
  c.part();
  c.ellipse(bxm, soilY - 5, 5, 4.5, BASIL, { bias: -2 });
  for (const [dx, dy, s] of pairs) {
    c.part();
    c.ellipse(bxm + dx, soilY + dy, s, s * 0.75, BASIL, { normal: (_x, _y, ex, ey) => n3(ex * 0.6, 0.3 - ey * 0.6, 0.8) });
    c.line(bxm + dx - s * 0.5, soilY + dy, bxm + dx + s * 0.5, soilY + dy, BASIL, () => TOP, { bias: 2 });
  }
  // Chives: fine hollow blades, three mauve pompoms on top.
  const cxm = x0 + 25;
  c.part();
  for (let k = 0; k < 6; k++) {
    const bx = cxm - 4 + k * 1.7;
    const lean = (k - 2.5) * 0.7 + (R() - 0.5) * 0.5;
    const h = 8 + R() * 4;
    c.line(bx, soilY, bx + lean, soilY - h, CHIVE, () => n3(lean * 0.2, 0.3, 0.9), { bias: k % 2 ? 0 : -1 });
  }
  for (const [dx, dy] of [[-3, -12], [1.5, -14], [4, -10]] as const) {
    c.part();
    c.ellipse(cxm + dx, soilY + dy, 1.4, 1.3, CHIVE_FLOWER);
    c.shade(cxm + dx + 1, soilY + dy + 1, -1);
    c.px(cxm + dx - 0.5, soilY + dy - 0.5, CHIVE_FLOWER, TOP, { bias: 2 });
  }
  // Thyme spilling over the front-left rim.
  trail(c, x0 + 2, y1 - z - 1, 3, -1, VELVET_LEAF, 5904);
  trail(c, x1 - 4, y1 - z - 1, 2, 1, VELVET_LEAF, 5905);
  // The label: a peg with a little cream tag, a scribble of ink on it.
  const lx = bxm + 5;
  const ly = soilY + 1;
  c.part();
  c.line(lx, ly, lx, ly - 3, PALEW, () => FACE);
  c.part();
  for (let y = ly - 6; y < ly - 3; y++) for (let x = lx - 2; x < lx + 2; x++) c.px(x, y, LINEN, FACE, { bias: y === ly - 6 ? 3 : x === lx + 1 ? 1 : 2 });
  c.part();
  for (const [dx, dy] of [[-1, -5], [0, -5], [1, -4], [-1, -4]] as const) c.px(lx + dx, ly + dy, INK, FACE);
});

const urn = art('urn', 4, 26, (c, g) => {
  // A classical stone urn on a square plinth: a fluted bowl on a slim foot,
  // heaped with pink petunias, white daisies and lavender, ivy and a flower
  // trail spilling down its sides.
  const cx = g.cx;
  const gy = g.y1 - 5;
  box(c, cx - 5, cx + 5, gy - 3, gy + 2, 0, 4, PALE_STONE);
  box(c, cx - 4, cx + 4, gy - 2, gy + 1, 4, 5, PALE_STONE, { bias: -1 });
  // Foot, stem and a little collar.
  drum(c, cx, gy - 0.5, 3, 1.6, 5, 7, PALE_STONE);
  drum(c, cx, gy - 0.5, 1.6, 0.9, 7, 10, PALE_STONE, null);
  drum(c, cx, gy - 0.5, 2.4, 1.2, 9.5, 11, PALE_STONE, null, { bias: 1 });
  // The bowl: narrow at its foot, full and round below the lip.
  const bTop = gy - 0.5 - 19;
  const bBot = gy - 0.5 - 10;
  c.part();
  c.shape(bTop, bBot, (y) => {
    const u = (y - bTop) / (bBot - bTop);
    const hw = 1.6 + Math.sqrt(Math.sin((1 - u) * Math.PI * 0.5)) * 4.1;
    return [cx - hw, cx + hw];
  }, PALE_STONE, (_x, _y, t, u) => cyl(t, 0.3 - u * 0.6));
  // Gadroons: rounded flutes up the lower bowl.
  for (let y = bBot - 4; y <= bBot; y++) for (let x = Math.floor(cx - 5); x < cx + 5; x++) {
    if (c.materialAt(x, y) !== PALE_STONE) continue;
    if ((x - Math.floor(cx)) % 2 === 0) c.shade(x, y, -1);
  }
  // The lip, rolled outward.
  c.part();
  c.ellipse(cx, bTop + 0.5, 6.2, 2.4, PALE_STONE, { normal: () => TOP, bias: 1 });
  c.ellipse(cx, bTop + 0.5, 4.8, 1.6, SOIL);
  c.part();
  for (let x = Math.floor(cx - 6); x < cx + 6; x++) c.px(x, bTop + 2 + Math.round(Math.sqrt(Math.max(0, 1 - ((x + 0.5 - cx) / 6.2) ** 2)) * 1.4), PALE_STONE, FACE, { bias: x < cx ? 0 : -1 });
  // A mound of leaves, then the flowers on it.
  c.part();
  c.ellipse(cx, bTop - 1, 6, 3.6, LEAF_DARK, { bias: -1 });
    for (let k = 0; k < 8; k++) {
    const a = -Math.PI * (k / 7);
    leafBlade(c, cx + Math.cos(a) * 3, bTop - 1 + Math.sin(a) * 2, cx + Math.cos(a) * 7, bTop - 1 + Math.sin(a) * 4.5, 1, LEAF, 0);
  }
  // A few sprays of white gypsophila standing up at the back.
  c.part();
  for (const [dx, h] of [[-3, 5], [0.5, 6.5], [3.5, 4.5]] as const) {
    c.line(cx + dx, bTop - 2, cx + dx * 1.2, bTop - 2 - h, STEM);
    for (const [ox, oy] of [[0, 0], [-1, 1], [1, 1]] as const) c.px(cx + dx * 1.2 + ox, bTop - 2 - h + oy, DAISY, TOP, { bias: 2 - oy });
  }
  const blooms: [number, number, number][] = [[-3.5, -3, 0], [2.5, -4, 1], [0, -1.5, 2], [-5, 0.5, 1], [4.5, 0, 0], [-1.5, 1.5, 1], [2, 1, 0]];
  for (const [dx, dy, k] of blooms) {
    const x = cx + dx;
    const y = bTop + dy;
    if (k === 1) daisy(c, x, y, 0.75, false);
    else {
      c.part();
      // A petunia's open trumpet: five lobes round a deep throat.
      c.ellipse(x, y, 1.7, 1.4, PETUNIA, { flatten: 0.7 });
      c.px(x, y, PETUNIA, FACE, { bias: -3 });
      c.px(x - 1, y - 1, PETUNIA, sphere(-0.5, 0.5), { bias: 2 });
    }
  }
  // Trails: ivy down both sides, a petunia trail at the front.
  trail(c, cx - 6, bTop + 2, 12, -0.4, IVY, 6002);
  trail(c, cx + 6, bTop + 2, 7, 0.4, IVY, 6003);
  trail(c, cx + 3, bTop + 3, 5, 0.4, IVY, 6004, PETUNIA);
  // Moss in the plinth's corners.
  c.part();
  for (const [x, y] of [[cx - 5, gy + 1], [cx - 4, gy + 1], [cx - 5, gy], [cx + 4, gy + 1]] as const) c.px(x, y, MOSS, FACE, { bias: 1 });
  tufts(c, cx, gy + 3, 7, 6006, 5);
});

const lotus = art('lotus', 2, 10, (c, g) => {
  // A pink lotus open on its round pad, white at the heart with a gold seed
  // cup; a second pad, and a bud on its own stalk standing out of the water.
  const pads = [
    { x: g.cx - 1.5, y: g.cy + 1.5, r: 5.6, a: 0.9 },
    { x: g.cx + 5, y: g.cy + 5.5, r: 3, a: 2.6 },
  ];
  for (const p of pads) {
    c.part();
    c.ellipse(p.x, p.y, p.r, p.r * 0.7, LILY, { normal: (_x, _y, dx, dy) => n3(dx * 0.3, -dy * 0.3, 0.95) });
    for (let d = 0.9; d < p.r + 1; d += 0.5) c.erase(p.x + Math.cos(p.a) * d, p.y + Math.sin(p.a) * d * 0.7);
    for (let k = 0; k < 6; k++) {
      const a = p.a + 0.7 + k * 0.85;
      c.line(p.x, p.y, p.x + Math.cos(a) * p.r * 0.75, p.y + Math.sin(a) * p.r * 0.52, LILY, () => FLOOR, { bias: 1 });
    }
    // A wet rim catching the light on the far side.
    for (let x = Math.round(p.x - p.r * 0.6); x < p.x + p.r * 0.3; x++) c.shade(x, p.y - p.r * 0.7 + 0.5, 1);
  }
  // The bud, on a stalk out of the water beside the small pad.
  const bx = g.cx + 5.5;
  const by = g.cy - 1;
  c.part();
  c.line(bx, by + 2, bx, by - 3, STEM, () => n3(0.2, 0, 1));
  c.part();
  c.shape(by - 9, by - 3, (y) => {
    const u = (y - by + 9) / 6;
    const hw = 0.4 + Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.62) * 1.6;
    return [bx + 0.5 - hw, bx + 0.5 + hw];
  }, LOTUS, (_x, _y, t, u) => cyl(t, 0.4 - u * 0.4), { bias: 1 });
  c.shade(bx, by - 9, -3);
  c.shade(bx, by - 8, -2);
  c.shade(bx + 1, by - 8, -3);
  c.line(bx, by - 7, bx, by - 4, LOTUS, () => FACE, { bias: 1 });
  // The flower: an outer ring of petals laid back on the pad, then upright
  // inner ones round the seed cup. Petals pinken toward their tips.
  const fx = g.cx - 1.5;
  const fy = g.cy;
  const outer = Array.from({ length: 8 }, (_, k) => (k / 8) * Math.PI * 2 + 0.2).sort((a, b) => Math.sin(a) - Math.sin(b));
  for (const a of outer) {
    c.part();
    const ex = fx + Math.cos(a) * 4.4;
    const ey = fy + Math.sin(a) * 2.6 - 1;
    c.capsule(fx + Math.cos(a), fy + Math.sin(a) * 0.6 - 1, ex, ey, 1.3, 0.5, LOTUS, { bias: Math.sin(a) < 0 ? 0 : 1 });
    c.shade(ex, ey, -2);
  }
  const inner = [-2, -0.7, 0.7, 2].map((dx, k) => ({ dx, back: k === 1 || k === 2 }));
  for (const p of [...inner.filter((q) => q.back), ...inner.filter((q) => !q.back)]) {
    c.part();
    const lift = p.back ? 5 : 4;
    c.capsule(fx + p.dx * 0.6, fy - 1 + (p.back ? -0.5 : 0.5), fx + p.dx * 1.15, fy - 1 - lift, 1.2, 0.5, LOTUS, { bias: p.back ? 0 : 1 });
    c.shade(fx + p.dx * 1.15, fy - 1 - lift, -2);
    if (p.back) {
      // The seed cup shows between the back petals and the front ones.
      c.part();
      c.ellipse(fx, fy - 2.5, 1.4, 0.9, LOTUS_POD, { normal: () => TOP });
    }
  }
  c.part();
  c.px(fx - 0.5, fy - 2.5, LOTUS_POD, TOP, { bias: 2 });
  // Pollen's glint, only in the glow.
  c.spark(fx, fy - 3, [255, 236, 170], 0.25);
});

const trellis = art('trellis', 3, 24, (c, g) => {
  // A wooden lattice panel on two square posts, a climbing rose working its
  // way up from the left: canes, leaves and blooms in blush and red, the
  // top right still bare enough to show the diamonds.
  const R = rng(6101);
  const xl = g.x0 + 1;
  const xr = g.x1 - 3;
  const yb = g.cy + 2;
  const zs = 27;
  const top = yb - zs;
  // Back slats (one diagonal), then the front ones crossing them.
  c.part();
  for (let y = top + 2; y < yb - 2; y++) for (let x = xl + 2; x < xr; x++) if ((x + y) % 5 === 0) c.px(x, y, PALEW, FACE, { bias: -1 });
  c.part();
  for (let y = top + 2; y < yb - 2; y++) for (let x = xl + 2; x < xr; x++) if ((((x - y) % 5) + 5) % 5 === 0) c.px(x, y, PALEW, FACE, { bias: 1 });
  // Rails top and bottom, then the posts with ball finials.
  box(c, xl + 1, xr + 1, yb - 1, yb, zs - 3, zs - 1, PALEW);
  box(c, xl + 1, xr + 1, yb - 1, yb, 1, 3, PALEW, { bias: -1 });
  for (const x of [xl, xr]) {
    box(c, x, x + 2, yb - 1, yb, 0, zs, PALEW, { bias: x === xl ? 0 : -1 });
    c.part();
    c.ellipse(x + 1, top - 1, 1.4, 1.3, PALEW);
  }
  grain(c, xl, xr + 2, top, yb, 6102, false);
  // Rose canes climbing: wandering lines from the foot up the lattice.
  const canes = [
    { x: xl + 3, h: 25, sway: 2, ph: 0 },
    { x: xl + 6, h: 15, sway: 2, ph: 2 },
    { x: xr - 2, h: 8, sway: 1.2, ph: 1 },
  ];
  const spots: [number, number][] = [];
  c.part();
  for (const cn of canes) {
    for (let j = 0; j < cn.h; j++) {
      const x = cn.x + Math.sin(j * 0.35 + cn.ph) * cn.sway + j * 0.18;
      const y = yb - j;
      c.px(x, y, CANE_GREEN, FACE, { bias: 1 });
      if (j > 2 && j % 3 === cn.ph % 3) spots.push([x, y]);
    }
  }
  // Leaves along them, then the roses.
  for (const [x, y] of spots) {
    c.part();
    c.ellipse(x - 1.2 + (R() - 0.5), y + (R() - 0.5), 1.5, 1.1, R() < 0.5 ? LEAF : LEAF_DARK, { flatten: 0.7 });
    c.ellipse(x + 1.3 + (R() - 0.5), y - 1 + (R() - 0.5), 1.3, 1, R() < 0.5 ? LEAF : LEAF_DARK, { flatten: 0.7 });
  }
  spots.forEach(([x, y], k) => {
    if (hash2(k, 0, 6103) < 0.5) return;
    rose(c, x + (R() - 0.5) * 2, y - 1, k % 3 === 0 ? ROSE : BLUSH_ROSE);
  });
  c.part();
  for (const [x, y] of spots.filter((_, k) => hash2(k, 1, 6104) > 0.75)) c.px(x + 1.5, y - 2, BLUSH_ROSE, sphere(0, 0.5), { bias: 0 });
  tufts(c, xl + 3, yb + 2, 5, 6105, 5);
  tufts(c, xr, yb + 2, 4, 6106, 4);
});

export const BLOOM_ART: Record<string, PropArt> = {
  hydrangea,
  bamboo,
  topiary,
  lemontree,
  foxgloves,
  daisies,
  poppies,
  toadstools,
  herbbed,
  urn,
  lotus,
  trellis,
};

/** The turning ones' side (facing east; west is it mirrored) and back views. */
export const BLOOM_TURNS: Record<string, { side: PropArt; back: PropArt }> = {};
