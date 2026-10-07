// The Home's the house's later furniture: a kitchen counter and sink, a dish
// hutch, a tea cart, a vanity, a rocking horse, a bunk bed, an easel, book
// stacks, a gramophone, a monstera and a folding screen (see
// world/homeParts.ts), drawn the same way as homeProps.ts: the game's high
// three-quarter view, lit from the upper left, with a glow layer that alone
// animates (the candle on the books, the gramophone's notes).

import { cyl, sphere, type Material, type PixelCanvas, type RGB, type Vec3 } from './pixel';
import { hash2, rng } from './env';
import { IRON } from './sanctum';
import {
  BOOKS, BRASS, DARKW, FACE, FLOOR, PAINT_DARK, GLASS, GOLD_CLOTH, HAY, LEAF, LEAF_DARK, LINEN, OAKW, PAINT_HILL, PAINT_SKY, PALEW,
  PETAL_Y, QUILT_B, QUILT_R, RED_PAINT, SOIL, SOOT, STEEL, STEM, TERRA, TOP, TULIP_P, TULIP_R, WATER, WAX,
  art, box, drum, flame, grain, halo, mat, n3, patchwork, type PropArt,
} from './homeProps';

// ---------------------------------------------------------------- Materials

// Painted woods: a kitchen's soft sage, a hutch's duck-egg blue, a vanity's cream.
const SAGE_PAINT = mat('#0e1610', '#223428', '#34493a', '#486050', '#5e7866', '#76907c', '#90a894', '#acc2ac', '#c8d8c4');
const DUCK_EGG = mat('#0c1a20', '#1e3840', '#30525a', '#446c74', '#5a868c', '#74a0a4', '#90b8b8', '#b0d0cc', '#d0e6e0');
const CREAM_PAINT = mat('#2a241c', '#62584a', '#887c6a', '#aea08a', '#ccbea6', '#e2d6be', '#f2e8d4', '#fcf6e8');
const CHERRYW = mat('#140604', '#2c0e08', '#44160c', '#5c2010', '#742c16', '#8c3a1e', '#a44c28', '#bc6234');
// White china, its blue-and-white pattern and a rose glaze.
const CHINA: Material = { ...mat('#2a2e38', '#6e7480', '#9aa0aa', '#c0c4cc', '#dcdfe4', '#eef0f2', '#fafbfc'), shine: true };
const DELFT = mat('#060e24', '#10204a', '#1a3270', '#284a96', '#3c64b4', '#5a84cc', '#80a4dc');
const ROSE_GLAZE: Material = { ...mat('#2a0c14', '#5a1e2c', '#843244', '#aa4c5e', '#c86a7a', '#de8c98', '#f0b0b8', '#fcd4d6'), shine: true };
// Bakes: a crusty loaf, a sponge and its pink icing.
const BREAD = mat('#2a1204', '#5a2a0a', '#844014', '#a85a1e', '#c4782c', '#da9a44', '#ecbc66', '#f6d690');
const CRUMB = mat('#3a2a14', '#8a7048', '#b49a6c', '#d4bc8c', '#ead6aa', '#f6eacc');
const SPONGE = mat('#3a2410', '#8a6230', '#b48a4c', '#d4ac6a', '#ead08c', '#f6e6b4');
const ICING = mat('#3a1424', '#8a3e5a', '#c0647e', '#e08ca2', '#f4b2c2', '#fcd6de', '#fff0f2');
const APPLE: Material = { ...mat('#1a0204', '#4a0a0e', '#781416', '#a41e1c', '#cc3226', '#e8503a', '#f87a5a'), shine: true };
// A mirror's cool silver and scent bottles' tinted glass.
const MIRROR: Material = { ...mat('#0e1620', '#283848', '#425466', '#5e7486', '#7c94a6', '#9eb6c4', '#c4d8e2', '#eaf4f8'), noAO: true };
const SCENT_PINK: Material = { ...mat('#3a0e1a', '#7a2a40', '#a8445e', '#d06680', '#ec8ea0', '#fcb6c0', '#ffdade'), shine: true, noAO: true };
const SCENT_LILAC: Material = { ...mat('#1a1030', '#3a2a64', '#5a468e', '#7a66b2', '#9c8ace', '#bcaee4', '#dcd2f4'), shine: true, noAO: true };
const VELVET_PLUM = mat('#120614', '#24102a', '#381a40', '#4c2456', '#62306c', '#7a4084', '#94549c');
const CUSHION = mat('#24080e', '#4e1426', '#782240', '#a0345a', '#c24c74', '#dc6c8e', '#f092aa', '#fcb8c8');
// The rocking horse: dapple grey paint, a yarn mane.
const DAPPLE = mat('#22242c', '#5a5e68', '#80848e', '#a2a6ae', '#c2c4c8', '#dcdcdc', '#efefea', '#fbfaf6');
const YARN = mat('#1c0a02', '#482006', '#72360c', '#985016', '#ba6a22', '#d48834', '#e8a650', '#f6c47a');
// Bunk quilts and the teddy on the top bunk.
const QUILT_G = mat('#06140a', '#10281a', '#1a3e28', '#285638', '#386e48', '#4c885a', '#64a06e', '#80b886');
const TEDDY = mat('#1c0a02', '#482006', '#72360c', '#985016', '#ba6a22', '#d48834', '#e8a650');
// The easel's painting and the screen's silk.
const MOUNT: Material = { ...mat('#2a3440', '#5a6a7c', '#7a8c9c', '#9cacb8', '#bcc8d0', '#d6dee2'), noOutline: true };
const SILK = mat('#2e2a22', '#7a7262', '#a49a86', '#c8bea8', '#e2d8c2', '#f2ead8', '#fcf8ee');
const SUN_SILK: Material = { ...mat('#4a1a14', '#a04a3a', '#d07058', '#ec9476', '#f8b898', '#ffd8c0'), noOutline: true };
const BLOSSOM: Material = { ...mat('#4a1a2a', '#a04a64', '#d07490', '#ec9cb4', '#fac4d4', '#ffe4ec'), noOutline: true };
const INK: Material = { ...mat('#08080a', '#16141a', '#24202a', '#34303a', '#46424c'), noOutline: true };
const REED: Material = { ...mat('#0c1a10', '#24402a', '#3a5c40', '#527a56', '#6c966c', '#8ab084'), noOutline: true };
// Black shellac for the record, green baize under it.
const SHELLAC: Material = { ...mat('#030205', '#09070c', '#120e16', '#1c1620', '#26202c', '#342a3a', '#463a4e'), shine: true };
const BAIZE = mat('#04120a', '#0a2414', '#12361e', '#1a4a2a', '#246036', '#307644');
const WICKER = mat('#241606', '#4e3410', '#70501c', '#906a28', '#ac8436', '#c49e4a', '#d8b664', '#e8cc84');

const WARM: RGB = [255, 196, 120];
const NOTE: RGB = [255, 226, 160];

// Facings for things turned off square (the screen's side panels, a leaning canvas).
const FACE_W: Vec3 = n3(-0.4, -0.35, 0.85);
const FACE_E: Vec3 = n3(0.4, -0.35, 0.85);
const LEAN: Vec3 = n3(0, -0.15, 0.98);
const EAST_N: Vec3 = n3(0.6, -0.1, 0.8);

// ---------------------------------------------------------------- Helpers

/** A grooved panel on a face, rows `top`..`bottom` inclusive: lit along its top and left, shadowed along its bottom and right. */
function groove(c: PixelCanvas, a: number, b: number, top: number, bottom: number): void {
  for (let x = a; x < b; x++) {
    c.shade(x, top, -2);
    c.shade(x, bottom, 1);
  }
  for (let y = top; y <= bottom; y++) {
    c.shade(a, y, -2);
    c.shade(b - 1, y, 1);
  }
}

/** A brass knob: a lit pixel and its shadow under it. */
function knob(c: PixelCanvas, x: number, y: number, m: Material = BRASS): void {
  c.part();
  c.px(x, y, m, FACE, { bias: 2 });
  c.shade(x, y + 1, -2);
}

/** Darkens a cabinet's bottom two rows into a recessed toe kick. */
function toeKick(c: PixelCanvas, x0: number, x1: number, gy: number): void {
  for (let x = x0; x < x1; x++) {
    c.shade(x, gy - 1, -3);
    c.shade(x, gy - 2, -2);
  }
}

/** A plate stood on its rim, seen face on: white china, a patterned rim and a little flower in its well. */
function plate(c: PixelCanvas, cx: number, cy: number, r: number, rim: Material): void {
  c.part();
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = (x + 0.5 - cx) / r;
      const dy = (y + 0.5 - cy) / r;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const onRim = d > 0.62;
      const a = Math.atan2(dy, dx);
      const dot = onRim && Math.round((a / Math.PI) * 4) % 2 === 0;
      c.px(x, y, dot ? rim : CHINA, onRim ? sphere(dx * 0.6, dy * 0.6) : n3(-dx * 0.3, dy * 0.3, 0.95), { bias: dot ? 1 : onRim ? 0 : 1 });
    }
  }
  c.px(cx - 0.5, cy - 0.5, rim, FACE, { bias: 2 });
}

/** A cup seen from the front: a small drum of china with a coloured band and a handle. */
function cup(c: PixelCanvas, x: number, gy: number, z: number, band: Material, handle = 1): void {
  drum(c, x, gy, 1.5, 0.8, z, z + 3, CHINA, SOIL);
  c.part();
  for (let k = -1; k <= 0; k++) c.px(x + k, gy - z - 1, band, FACE, { bias: 1 });
  c.px(x + handle * 2 - (handle < 0 ? 1 : 0), gy - z - 2, CHINA, FACE, { bias: 0 });
}

/** A book lying flat: its cover on top, and on its face toward us either the spine (gilt bands) or the pages. */
function book(c: PixelCanvas, x0: number, x1: number, y0: number, y1: number, z: number, t: number, m: Material, spine: boolean): void {
  box(c, x0, x1, y0, y1, z, z + t, m, { topBias: 1 });
  const fy = y1 - z - t;
  if (spine) {
    for (let k = 0; k < t; k++) {
      c.shade(x0 + 1, fy + k, 2);
      c.shade(x1 - 2, fy + k, 2);
    }
    if (t >= 3) for (let x = x0 + 3; x < x1 - 3; x++) c.px(x, fy + 1, GOLD_CLOTH, FACE, { bias: x === x0 + 3 ? 1 : 0 });
  } else if (t >= 3) {
    c.part();
    for (let k = 1; k < t - 1; k++) for (let x = x0 + 1; x < x1; x++) c.px(x, fy + k, LINEN, FACE, { bias: (k % 2 ? 0 : -1) + (x === x0 + 1 ? 1 : 0) });
  }
}

/** A tube from (ax, ay) to (bx, by), round across its width (a horn's neck, an easel's leg). */
function tube(c: PixelCanvas, ax: number, ay: number, bx: number, by: number, r0: number, r1: number, m: Material, bias = 0): void {
  c.part();
  const vx = bx - ax;
  const vy = by - ay;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len;
  const uy = vy / len;
  const R = Math.max(r0, r1) + 1;
  for (let y = Math.floor(Math.min(ay, by) - R); y <= Math.max(ay, by) + R; y++) {
    for (let x = Math.floor(Math.min(ax, bx) - R); x <= Math.max(ax, bx) + R; x++) {
      const qx = x + 0.5 - ax;
      const qy = y + 0.5 - ay;
      const t = (qx * ux + qy * uy) / len;
      if (t < 0 || t > 1) continue;
      const s = -qx * uy + qy * ux;
      const r = r0 + (r1 - r0) * t;
      if (Math.abs(s) > r) continue;
      const k = s / r;
      c.px(x, y, m, n3(-uy * k * 0.9, -ux * k * 0.9 + 0.15, Math.sqrt(1 - k * k * 0.81)), { bias });
    }
  }
}

// ---------------------------------------------------------------- Kitchen counter

const counter = art('counter', 1, 24, (c, g) => {
  // Sage cabinets under a butcher-block top, a tiled splashback, a tea towel
  // on a drawer pull; on top a board with a loaf, a bowl of apples and a crock of spoons.
  const x0 = g.x0 + 1;
  const x1 = g.x1 - 1;
  const y0 = g.y0 + 5;
  const gy = g.y1 - 2;
  const H = 13;
  // The splashback first: a strip of blue-and-white tiles along the back.
  box(c, x0 - 1, x1 + 1, y0 - 2, y0, H, H + 6, CHINA);
  for (let z = H + 2; z < H + 6; z++) {
    for (let x = x0 - 1; x < x1 + 1; x++) {
      const row = y0 - 1 - z;
      if ((x - x0 + 1) % 4 === 0 || (z - H) % 2 === 0) c.shade(x, row, -1);
      else if (((x - x0 + 1) >> 2) % 2 === (z >> 1) % 2) c.px(x, row, DELFT, FACE, { bias: 2 });
    }
  }
  box(c, x0, x1, y0, gy, 0, H, SAGE_PAINT);
  toeKick(c, x0, x1, gy);
  // Three bays: a drawer over a door each.
  const bays: [number, number][] = [[x0, x0 + 10], [x0 + 10, x0 + 20], [x0 + 20, x1]];
  for (const [a, b] of bays) {
    groove(c, a + 1, b - 1, gy - 12, gy - 10);
    groove(c, a + 1, b - 1, gy - 9, gy - 3);
    groove(c, a + 2, b - 2, gy - 8, gy - 4);
    knob(c, Math.floor((a + b) / 2), gy - 11);
  }
  knob(c, x0 + 8, gy - 7);
  knob(c, x0 + 11, gy - 7);
  knob(c, x1 - 3, gy - 7);
  // A gingham tea towel hung over the middle drawer's pull.
  c.part();
  const tx = x0 + 14;
  for (let y = gy - 11; y < gy - 4; y++) {
    for (let x = tx; x < tx + 4; x++) {
      const check = ((x - tx) >> 1) % 2 === 1 || ((y - gy) >> 1) % 2 === 1;
      c.px(x, y, check ? QUILT_R : LINEN, n3((x - tx - 1.5) * 0.2, -0.4, 0.88), { bias: (y === gy - 11 ? 1 : 0) + (check && ((x - tx) >> 1) % 2 === 1 && ((y - gy) >> 1) % 2 === 1 ? -1 : 0) });
    }
  }
  for (let x = tx; x < tx + 4; x += 2) c.px(x, gy - 4, LINEN, FACE, { bias: -1 });
  // The butcher-block worktop.
  box(c, x0 - 1, x1 + 1, y0 - 1, gy + 1, H, H + 2, PALEW, { topBias: 1 });
  const top = (y: number) => y - (H + 2);
  grain(c, x0 - 1, x1 + 1, top(y0 - 1), top(gy + 1), 7101);
  for (let y = top(y0 - 1); y < top(gy + 1); y++) for (let x = x0 + 3; x < x1; x += 6) c.shade(x, y, -1);
  // The bread board and its loaf, one slice cut.
  box(c, x0 + 1, x0 + 12, y0 + 2, gy - 1, H + 2, H + 3, OAKW, { topBias: 1 });
  c.part();
  const lx = x0 + 6;
  const ly = top(y0 + 6) - 2;
  c.ellipse(lx, ly, 4.4, 2.6, BREAD, { bias: 0 });
  c.ellipse(lx - 0.5, ly - 0.8, 3.2, 1.4, BREAD, { bias: 1, flatten: 0.7 });
  for (const dx of [-2, 0, 2]) {
    c.shade(lx + dx, ly - 1, -2);
    c.shade(lx + dx + 1, ly - 2, -2);
  }
  c.part();
  for (let y = ly - 1; y < ly + 3; y++) for (let x = lx + 4; x < lx + 6; x++) c.px(x, y, x === lx + 5 || y === ly + 2 ? BREAD : CRUMB, FACE, { bias: 1 });
  // A bowl of apples.
  const bx = x0 + 17;
  const bgy = y0 + 7;
  drum(c, bx, bgy, 3.4, 1.8, H + 2, H + 4, CHINA, SOIL);
  c.part();
  for (let x = Math.floor(bx - 3); x < bx + 3; x++) c.px(x, top(bgy) - 1, DELFT, FACE, { bias: 1 });
  c.part();
  for (const [dx, dy] of [[-1.5, -5], [1.5, -5], [0, -6.5]] as [number, number][]) {
    c.ellipse(bx + dx, top(bgy) + dy, 1.6, 1.5, dx === 0 ? PETAL_Y : APPLE, { bias: 1 });
    c.px(bx + dx, top(bgy) + dy - 1.5, STEM, FACE, { bias: 1 });
  }
  // The crock of wooden spoons and a whisk.
  const kx = x1 - 4;
  const kgy = y0 + 4;
  c.part();
  c.line(kx - 1, top(kgy) - 6, kx - 2, top(kgy) - 11, PALEW, () => FACE, { bias: 1 });
  c.ellipse(kx - 2, top(kgy) - 12, 1.2, 1.5, PALEW, { bias: 1 });
  c.line(kx + 1, top(kgy) - 6, kx + 2, top(kgy) - 10, OAKW, () => FACE, { bias: 1 });
  c.part();
  c.ellipse(kx + 2.5, top(kgy) - 11.5, 1.4, 1.9, STEEL, { bias: 0 });
  c.erase(kx + 2.5, top(kgy) - 11.5);
  c.line(kx, top(kgy) - 6, kx, top(kgy) - 12, OAKW, () => FACE, { bias: 0 });
  c.px(kx - 0.5, top(kgy) - 13, PALEW, FACE, { bias: 2 });
  drum(c, kx, kgy, 2.4, 1.3, H + 2, H + 8, TERRA, SOIL);
  c.part();
  for (let x = Math.floor(kx - 2); x < kx + 2; x++) c.px(x, top(kgy) - 5, CREAM_PAINT, FACE, { bias: 1 });
});

// ---------------------------------------------------------------- Kitchen sink

const sink = art('sink', 1, 26, (c, g) => {
  // A deep white farmhouse sink in a sage cabinet with a gingham curtain
  // below; a brass tap, a plate drying in a rack, a pot of basil.
  const x0 = g.x0 + 1;
  const x1 = g.x1 - 1;
  const y0 = g.y0 + 5;
  const gy = g.y1 - 2;
  const H = 13;
  box(c, x0, x1, y0, gy, 0, H, SAGE_PAINT);
  toeKick(c, x0, x1, gy);
  // The curtain on a little rod, gathered into folds.
  c.part();
  for (let y = gy - 7; y < gy - 1; y++) {
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const fold = Math.sin((x - x0) * 1.6);
      const check = (x >> 1) % 2 === 1 || ((y - gy) >> 1) % 2 === 1;
      c.px(x, y, check ? QUILT_R : LINEN, n3(fold * 0.45, -0.35, 0.85), { bias: (check && (x >> 1) % 2 === 1 && ((y - gy) >> 1) % 2 === 1 ? -1 : 0) + (y === gy - 2 ? -1 : 0) });
    }
  }
  for (let x = x0; x < x1; x++) c.px(x, gy - 8, BRASS, FACE, { bias: x === x0 ? 2 : 0 });
  // The worktop, then the sink's apron standing proud of the cabinet.
  box(c, x0 - 1, x1 + 1, y0 - 1, gy + 1, H, H + 2, PALEW, { topBias: 1 });
  const top = (y: number) => y - (H + 2);
  grain(c, x0 - 1, x1 + 1, top(y0 - 1), top(gy + 1), 7201);
  box(c, x0, x1 - 4, y0 + 2, gy + 2, H - 5, H + 3, CHINA, { topBias: 1 });
  // The basin sunk in it: deep, shadowed under its back rim, a little water.
  c.part();
  const ba = x0 + 1;
  const bb = x1 - 5;
  const br0 = top(y0 + 3) - 1;
  const br1 = top(gy + 1) - 2;
  for (let y = br0; y <= br1; y++) {
    for (let x = ba; x < bb; x++) {
      const u = (y - br0) / (br1 - br0);
      const wet = u > 0.7 && x > ba + 1 && x < bb - 2;
      c.px(x, y, wet ? WATER : CHINA, n3((x === ba ? 0.6 : x === bb - 1 ? -0.6 : 0), u < 0.35 ? -0.6 : 0.4, 0.8), { bias: wet ? 2 : u < 0.35 ? -2 : x === bb - 1 ? 1 : -1 });
    }
  }
  c.px(Math.floor((ba + bb) / 2), br1 - 1, STEEL, TOP, { bias: -1 });
  c.spark(ba + 2, br1 - 1, [255, 255, 255], 0.25);
  // The brass tap: a gooseneck from the back, two cross handles.
  c.part();
  const tx = Math.floor((ba + bb) / 2);
  const ty = top(y0 + 1);
  for (let k = 0; k < 5; k++) c.px(tx, ty - k, BRASS, cyl(0), { bias: 1 });
  c.px(tx + 1, ty - 5, BRASS, TOP, { bias: 2 });
  c.px(tx + 2, ty - 4, BRASS, FACE, { bias: 1 });
  c.px(tx + 2, ty - 3, BRASS, FACE, { bias: 0 });
  for (const s of [-2, 2]) {
    c.px(tx + s, ty - 1, BRASS, FACE, { bias: 1 });
    c.px(tx + s, ty - 2, CHINA, TOP, { bias: 2 });
  }
  c.spark(tx + 2, ty - 1, [200, 230, 255], 0.35);
  // The dish rack on the drainer with a plate drying in it.
  c.part();
  const rx = x1 - 3;
  for (let y = top(y0 + 3); y < top(gy); y += 2) c.px(rx - 1, y, STEEL, TOP, { bias: 1 });
  plate(c, rx, top(y0 + 8) - 3, 2.6, DELFT);
  c.part();
  for (let y = top(y0 + 6); y < top(gy); y++) c.px(rx + 2, y, STEEL, EAST_N, { bias: 0 });
  // A pot of basil on the back corner.
  drum(c, x0 + 1.5, y0 + 1, 1.6, 0.9, H + 2, H + 5, TERRA, SOIL);
  c.part();
  for (const [dx, dy] of [[-1, -5], [1, -5.5], [0, -7], [-1.5, -7], [1.5, -7.5]] as [number, number][]) {
    c.ellipse(x0 + 1.5 + dx, top(y0 + 1) + dy, 1, 0.9, dy < -6.5 ? LEAF : LEAF_DARK, { bias: 1 });
  }
});

// ---------------------------------------------------------------- Dish hutch

const hutch = art('hutch', 1, 40, (c, g) => {
  // A duck-egg dresser: drawers, two doors and a basket nook below a wooden
  // top; above it open shelves of patterned plates and cups on hooks, under a crown.
  const x0 = g.x0 + 1;
  const x1 = g.x1 - 1;
  const y0 = g.y0 + 3;
  const gy = g.y0 + 12;
  const H = 12;
  const TOPZ = H + 2;
  const UZ = 34;
  // The upper shelves, set back on the top: a case with its inside sunk in shadow.
  const uy1 = y0 + 4;
  box(c, x0 + 1, x1 - 1, y0, uy1, TOPZ, UZ, DUCK_EGG);
  const row = (z: number) => uy1 - 1 - z;
  c.part();
  for (let z = TOPZ + 1; z < UZ - 3; z++) {
    for (let x = x0 + 3; x < x1 - 3; x++) {
      const shelf = z === TOPZ + 1 || z === 24;
      c.px(x, row(z), DUCK_EGG, FACE, { bias: shelf ? 1 : -2 + (z === 23 || z === UZ - 4 ? -1 : 0) });
    }
  }
  // A middle post splitting the case in two.
  const mid = Math.round(g.cx);
  for (let z = TOPZ + 1; z < UZ - 3; z++) {
    c.px(mid - 1, row(z), DUCK_EGG, FACE, { bias: 1 });
    c.px(mid, row(z), DUCK_EGG, FACE, { bias: 0 });
  }
  // The scalloped frieze along the top of the case.
  for (let x = x0 + 3; x < x1 - 3; x++) if ((x - x0) % 4 === 1) c.shade(x, row(UZ - 4), 2);
  // Top shelf: plates stood along the back, blue and rose by turns.
  const plates = [x0 + 6, x0 + 11, mid - 4, mid + 4, x1 - 11, x1 - 6];
  plates.forEach((px, k) => plate(c, px, row(28) + 0.5, 2.6, k % 2 ? ROSE_GLAZE : DELFT));
  // Lower shelf: a row of cups on the left, their bands blue and rose by turns.
  for (const [k, px] of [[0, x0 + 5], [1, x0 + 9], [2, x0 + 13]] as [number, number][]) {
    c.part();
    for (let z = TOPZ + 2; z < TOPZ + 5; z++) for (let dx = -1; dx <= 1; dx++) {
      const band = z === TOPZ + 3;
      c.px(px + dx, row(z), band ? (k % 2 ? ROSE_GLAZE : DELFT) : CHINA, FACE, { bias: (dx === -1 ? 1 : dx === 1 ? -1 : 0) + (band ? 1 : 0) });
    }
    c.px(px + 2, row(TOPZ + 3), CHINA, FACE, { bias: -1 });
  }
  // A blue cup beside the teapot on the right.
  c.part();
  for (let z = TOPZ + 2; z < TOPZ + 5; z++) for (let dx = -1; dx <= 1; dx++) c.px(x1 - 5 + dx, row(z), z === TOPZ + 3 ? DELFT : CHINA, FACE, { bias: dx === -1 ? 1 : 0 });
  c.part();
  c.ellipse(x1 - 9, row(TOPZ + 4), 2.4, 2, ROSE_GLAZE, { bias: 1 });
  c.px(x1 - 9.5, row(TOPZ + 7) - 0.5, ROSE_GLAZE, TOP, { bias: 2 });
  c.line(x1 - 12, row(TOPZ + 5), x1 - 13, row(TOPZ + 6), ROSE_GLAZE, () => FACE, { bias: 1 });
  c.px(x1 - 6, row(TOPZ + 4), ROSE_GLAZE, FACE, { bias: -1 });
  // The crown: a cornice overhanging the case.
  box(c, x0, x1, y0, uy1 + 1, UZ, UZ + 2, DUCK_EGG);
  c.part();
  for (let x = x0; x < x1; x++) c.px(x, uy1 + 1 - UZ - 1, PALEW, FACE, { bias: x === x0 ? 2 : 1 });
  // The lower cupboard and its wooden top.
  box(c, x0, x1, uy1, gy, 0, H, DUCK_EGG);
  toeKick(c, x0, x1, gy);
  const thirds: [number, number][] = [[x0, x0 + 10], [x0 + 10, x1 - 10], [x1 - 10, x1]];
  for (const [a, b] of thirds) {
    groove(c, a + 1, b - 1, gy - 11, gy - 9);
    knob(c, Math.floor((a + b) / 2), gy - 10);
  }
  for (const [a, b] of [thirds[0], thirds[2]]) {
    groove(c, a + 1, b - 1, gy - 8, gy - 3);
    groove(c, a + 2, b - 2, gy - 7, gy - 4);
  }
  knob(c, x0 + 8, gy - 6);
  knob(c, x1 - 9, gy - 6);
  // The middle nook, open, with a wicker basket of linen in it.
  c.part();
  const [na, nb] = thirds[1];
  for (let y = gy - 8; y < gy - 2; y++) for (let x = na + 1; x < nb - 1; x++) c.px(x, y, DUCK_EGG, FACE, { bias: -3 });
  c.part();
  for (let y = gy - 6; y < gy - 2; y++) {
    for (let x = na + 2; x < nb - 2; x++) c.px(x, y, WICKER, FACE, { bias: ((x + y) % 2 ? 0 : 1) + (y === gy - 6 ? 1 : 0) + (x === nb - 3 ? -1 : 0) });
  }
  c.part();
  for (let x = na + 3; x < nb - 3; x++) c.px(x, gy - 7, LINEN, TOP, { bias: x % 3 === 0 ? 0 : 1 });
  box(c, x0 - 1, x1 + 1, uy1 - 1, gy + 1, H, TOPZ, PALEW, { topBias: 1 });
  grain(c, x0 - 1, x1 + 1, uy1 - 1 - TOPZ, gy + 1 - TOPZ, 7301);
  // On the ledge: a china jug and a jar of lemons.
  const ly = gy - 2 - TOPZ;
  c.part();
  c.shape(ly - 6, ly, (y) => {
    const u = (y - (ly - 6)) / 6;
    const hw = 1.4 + Math.sin(u * Math.PI * 0.9) * 1.3;
    return [mid - hw, mid + hw];
  }, CHINA, (_x, _y, t) => cyl(t, 0));
  for (let x = mid - 2; x < mid + 2; x++) c.px(x, ly - 3, DELFT, FACE, { bias: 1 });
  c.px(mid - 3, ly - 6, CHINA, FACE, { bias: 1 });
  c.px(mid + 2, ly - 4, CHINA, FACE, { bias: -1 });
  c.px(mid + 2, ly - 3, CHINA, FACE, { bias: -1 });
  drum(c, x1 - 4, gy - 2, 2.2, 1.2, TOPZ, TOPZ + 6, GLASS, PALEW);
  c.part();
  for (const [dx, dz] of [[-1, 2], [1, 2], [0, 4]] as [number, number][]) c.ellipse(x1 - 4 + dx, gy - 2 - TOPZ - dz, 1.1, 1, PETAL_Y, { bias: 1 });
});

// ---------------------------------------------------------------- Tea cart

const teacart = art('teacart', 3, 24, (c, g) => {
  // A two-tier wooden trolley on little wheels with a brass handle: a rose
  // teapot and two cups above, a pink-iced cake on the shelf below.
  const x0 = g.cx - 6;
  const x1 = g.cx + 6;
  const y0 = g.y0 + 6;
  const y1 = g.y1 - 4;
  const LZ = 3;
  const UZ = 14;
  const wheel = (x: number, y: number, back: boolean) => {
    c.part();
    c.ellipse(x, y, 1.7, 1.7, IRON, { bias: back ? -1 : 0 });
    c.px(x - 0.5, y - 0.5, BRASS, FACE, { bias: 1 });
  };
  wheel(x0 + 1, y0 - 1, true);
  wheel(x1 - 1, y0 - 1, true);
  // Back posts, the lower shelf, the cake on it.
  for (const x of [x0, x1 - 1]) box(c, x, x + 1, y0, y0 + 1, 1, UZ, OAKW);
  box(c, x0, x1, y0, y1, LZ, LZ + 1, OAKW, { top: PALEW, topBias: 1 });
  const cgy = y1 - 3;
  drum(c, g.cx, cgy, 3, 1.4, LZ + 1, LZ + 2, CHINA);
  drum(c, g.cx, cgy, 3.6, 1.6, LZ + 2, LZ + 3, CHINA, CHINA, { topBias: 1 });
  drum(c, g.cx, cgy, 3, 1.4, LZ + 3, LZ + 6, SPONGE, ICING, { topBias: 1 });
  c.part();
  for (let x = Math.floor(g.cx - 3); x < g.cx + 3; x++) {
    c.px(x, cgy - LZ - 5, ICING, FACE, { bias: 0 });
    if ((x + 1) % 2 === 0) c.px(x, cgy - LZ - 4, ICING, FACE, { bias: -1 });
  }
  c.part();
  c.ellipse(g.cx, cgy - LZ - 7.5, 0.9, 0.9, APPLE, { bias: 1 });
  // The upper tray with its gallery rail.
  box(c, x0, x1, y0, y1, UZ, UZ + 1, OAKW, { top: PALEW, topBias: 1 });
  const top = (y: number) => y - UZ - 1;
  c.part();
  for (let x = x0; x < x1; x++) c.px(x, top(y0) - 1, BRASS, FACE, { bias: 1 });
  // A cup on its saucer to the right, then the round teapot.
  c.part();
  c.ellipse(x1 - 3, top(y0 + 5), 2.1, 1, CHINA, { normal: () => TOP, bias: 1 });
  cup(c, x1 - 3, y0 + 5, UZ + 1, DELFT, 1);
  const tx = g.cx - 1.5;
  const ty = top(y1 - 2);
  c.part();
  c.capsule(tx - 2.5, ty - 2.5, tx - 5, ty - 5.5, 1, 0.6, ROSE_GLAZE);
  c.part();
  for (const [dx, dy] of [[3, -5], [4, -4], [4, -3], [3, -2]] as [number, number][]) c.px(tx + dx, ty + dy, ROSE_GLAZE, FACE, { bias: dx === 4 ? -1 : 1 });
  c.part();
  c.ellipse(tx, ty - 3, 3.3, 3, ROSE_GLAZE, { bias: 0 });
  // A white band of painted flowers round its belly.
  for (let x = Math.floor(tx - 3); x < tx + 3; x++) c.px(x, ty - 3, (x & 1) ? CHINA : PETAL_Y, FACE, { bias: 1 });
  c.part();
  c.ellipse(tx, ty - 6, 1.8, 0.9, ROSE_GLAZE, { normal: () => TOP, bias: 1 });
  c.px(tx - 0.5, ty - 7, CHINA, sphere(-0.3, 0.4), { bias: 2 });
  // Front posts, the handle's brass bar out to the east, front wheels.
  for (const x of [x0, x1 - 1]) box(c, x, x + 1, y1 - 1, y1, 1, UZ + 1, OAKW);
  c.part();
  c.line(x1, y1 - UZ - 1, x1 + 2, y1 - UZ - 4, BRASS, () => FACE, { bias: 1 });
  c.line(x1 + 2, y0 - UZ - 4, x1 + 2, y1 - UZ - 4, BRASS, () => EAST_N, { bias: 0 });
  c.px(x1 + 1, y0 - UZ - 2, BRASS, FACE, { bias: 1 });
  wheel(x0 + 0.5, y1 - 1, false);
  wheel(x1 - 0.5, y1 - 1, false);
});

// ---------------------------------------------------------------- Vanity

const vanity = art('vanity', 1, 34, (c, g) => {
  // A cream dressing table with gilt knobs: drawers either side of a kneehole,
  // an oval mirror in a gilt frame, scent bottles, a jewel box, a vase of one
  // rose, and a pink stool tucked in under it.
  const x0 = g.x0 + 1;
  const x1 = g.x1 - 1;
  const y0 = g.y0 + 3;
  const gy = g.y1 - 4;
  const H = 11;
  const TZ = H + 2;
  const top = (y: number) => y - TZ;
  // The mirror on its stand, behind everything on the top.
  const mx = g.cx;
  const my = top(y0 + 1) - 10;
  for (const s of [-1, 1]) box(c, Math.round(mx + s * 8) - (s < 0 ? 1 : 0), Math.round(mx + s * 8) + (s < 0 ? 0 : 1), y0, y0 + 1, TZ, TZ + 10, CREAM_PAINT);
  c.part();
  const RX = 7;
  const RY = 8.5;
  for (let y = Math.floor(my - RY - 1); y <= my + RY + 1; y++) {
    for (let x = Math.floor(mx - RX - 1); x <= mx + RX + 1; x++) {
      const dx = (x + 0.5 - mx) / RX;
      const dy = (y + 0.5 - my) / RY;
      const d = Math.hypot(dx, dy);
      if (d > 1.12) continue;
      if (d > 0.9) {
        c.px(x, y, BRASS, sphere(dx * 0.7, -dy * 0.7), { bias: d > 1.04 ? -1 : 1 });
      } else {
        // A cool silver glass with a soft room reflected and two diagonal gleams.
        const gleam = (x - y + 400) % 9;
        const low = y > my + 3;
        c.px(x, y, low ? CREAM_PAINT : MIRROR, FACE, { bias: (gleam === 0 ? 2 : gleam === 1 ? 1 : 0) + (low ? -2 : 0) + (dy < -0.5 ? 1 : 0) });
      }
    }
  }
  // A crest of gilt leaves on the frame's top.
  c.part();
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [-2, 1], [2, 1]] as [number, number][]) c.px(mx + dx - 0.5, my - RY - 1.5 + dy, BRASS, FACE, { bias: dy < 0 ? 2 : 1 });
  // The body: two pedestals of drawers and an apron drawer over the kneehole.
  const pw = 10;
  box(c, x0, x0 + pw, y0, gy, 0, H, CREAM_PAINT);
  box(c, x1 - pw, x1, y0, gy, 0, H, CREAM_PAINT);
  box(c, x0 + pw, x1 - pw, y0, gy, 7, H, CREAM_PAINT);
  c.part();
  for (let y = gy - 7; y < gy; y++) for (let x = x0 + pw; x < x1 - pw; x++) c.px(x, y, CREAM_PAINT, FACE, { bias: -4 + (y === gy - 7 ? -1 : 0) });
  for (const [a, b] of [[x0, x0 + pw], [x1 - pw, x1]]) {
    for (const [r0, r1] of [[gy - 10, gy - 8], [gy - 7, gy - 5], [gy - 4, gy - 2]]) {
      groove(c, a + 1, b - 1, r0, r1);
      knob(c, Math.floor((a + b) / 2), r0 + 1, BRASS);
    }
  }
  groove(c, x0 + pw + 1, x1 - pw - 1, gy - 10, gy - 8);
  knob(c, Math.floor(g.cx), gy - 9);
  // Turned feet.
  for (const x of [x0, x0 + pw - 1, x1 - pw, x1 - 1]) {
    c.part();
    c.px(x, gy - 1, BRASS, FACE, { bias: 1 });
  }
  // The top, with a lace runner along its front.
  box(c, x0 - 1, x1 + 1, y0 - 1, gy + 1, H, TZ, CREAM_PAINT, { topBias: 1 });
  c.part();
  for (let x = x0 + 2; x < x1 - 2; x++) {
    c.px(x, top(gy), LINEN, TOP, { bias: 1 });
    c.px(x, top(gy) + 1, LINEN, FACE, { bias: x % 2 ? 1 : -1 });
  }
  // On the top: a pink bottle with a gilt stopper, a lilac one with a bulb, a jewel box, a bud vase.
  const bottle = (x: number, gyb: number, h: number, m: Material, rx: number) => {
    drum(c, x, gyb, rx, rx * 0.5, TZ, TZ + h, m);
    c.part();
    c.px(x - 0.5, top(gyb) - h - 1, BRASS, TOP, { bias: 2 });
    c.px(x - 0.5, top(gyb) - h, BRASS, FACE, { bias: 0 });
  };
  bottle(x0 + 4, y0 + 5, 4, SCENT_PINK, 1.6);
  bottle(x0 + 7, y0 + 6, 3, SCENT_LILAC, 2);
  c.part();
  c.line(x0 + 9, top(y0 + 6) - 2, x0 + 10, top(y0 + 6) - 1, CUSHION, () => FACE, { bias: 0 });
  c.ellipse(x0 + 10.5, top(y0 + 6) - 0.5, 1, 1, CUSHION, { bias: 1 });
  // A little jewel box with its lid open on a string of pearls.
  box(c, x1 - 11, x1 - 6, y0 + 5, y0 + 8, TZ, TZ + 3, SCENT_LILAC, { top: VELVET_PLUM, topBias: 1 });
  c.part();
  for (let x = x1 - 11; x < x1 - 6; x++) c.px(x, top(y0 + 8) - 2, BRASS, FACE, { bias: 0 });
  for (let x = x1 - 11; x < x1 - 6; x++) c.px(x, top(y0 + 5) - 4, SCENT_LILAC, FACE, { bias: x === x1 - 11 ? 1 : 0 });
  c.px(x1 - 9, top(y0 + 7) - 3, LINEN, TOP, { bias: 2 });
  c.px(x1 - 8, top(y0 + 7) - 3, LINEN, TOP, { bias: 2 });
  c.px(x1 - 8, top(y0 + 8) - 2, BRASS, FACE, { bias: 2 });
  // A powder pot and a bud vase with one pink rose.
  drum(c, x1 - 3.5, y0 + 8, 1.6, 0.9, TZ, TZ + 2, CHINA, CUSHION, { topBias: 1 });
  drum(c, x1 - 4, y0 + 3, 1, 0.6, TZ, TZ + 4, GLASS, WATER);
  c.part();
  c.line(x1 - 4, top(y0 + 3) - 4, x1 - 4.5, top(y0 + 3) - 7, STEM);
  c.ellipse(x1 - 4.5, top(y0 + 3) - 8, 1.3, 1.2, TULIP_P, { bias: 1 });
  c.shade(x1 - 4.5, top(y0 + 3) - 8, -1);
  // The stool tucked into the kneehole: a buttoned pink cushion on gilt legs.
  const sx = g.cx;
  const sgy = gy + 1;
  for (const dx of [-3, 2]) box(c, sx + dx, sx + dx + 1, sgy - 1, sgy, 0, 4, BRASS);
  drum(c, sx, sgy - 1, 4, 1.8, 3, 5, CREAM_PAINT, CUSHION, { topBias: 0 });
  c.part();
  c.ellipse(sx, sgy - 1 - 6, 3.6, 1.6, CUSHION, { bias: 1 });
  c.shade(sx, sgy - 7, -2);
  c.shade(sx - 1, sgy - 8, 1);
});

// ---------------------------------------------------------------- Rocking horse

const rockinghorse = art('rockinghorse', 4, 22, (c, g) => {
  // A dapple grey horse facing west, a yarn mane and tail, a red saddle and
  // bridle, on two bowed rockers that curl up at their ends.
  const cx = g.cx;
  const gy = g.y1 - 4;
  const rocker = (by: number, back: boolean) => {
    c.part();
    for (let x = Math.floor(cx - 8); x <= cx + 7; x++) {
      const t = (x + 0.5 - cx + 0.5) / 7.5;
      const y = Math.round(by - t * t * 3);
      c.px(x, y, OAKW, TOP, { bias: back ? 0 : 2 });
      c.px(x, y + 1, OAKW, FACE, { bias: back ? -2 : 0 });
    }
    // Curled ends.
    c.px(cx - 8, by - 4, OAKW, FACE, { bias: back ? -1 : 1 });
    c.px(cx + 7, by - 4, OAKW, FACE, { bias: back ? -1 : 1 });
  };
  const leg = (fx: number, fy: number, tx: number, ty: number, back: boolean) => {
    c.part();
    c.capsule(fx, fy, tx, ty, 1, 0.8, DAPPLE, { bias: back ? -2 : 0 });
    c.part();
    c.px(tx - 0.5, ty + 0.5, DARKW, FACE, { bias: back ? 0 : 2 });
  };
  // Far side first: its rocker and legs.
  rocker(gy - 3, true);
  leg(cx - 3, gy - 10, cx - 5, gy - 5, true);
  leg(cx + 4, gy - 10, cx + 5, gy - 5, true);
  // The tail, a yarn tuft off the rump.
  c.part();
  for (let k = 0; k < 6; k++) {
    const y = gy - 12 + k;
    c.px(cx + 6 + Math.floor(k / 2), y, YARN, FACE, { bias: k % 2 ? 1 : 0 });
    c.px(cx + 7 + Math.floor(k / 2), y + 1, YARN, FACE, { bias: -1 });
  }
  // The body, dappled.
  c.part();
  c.ellipse(cx + 1, gy - 11, 5.6, 3, DAPPLE, { bias: 1 });
  for (const [dx, dy] of [[-2, -1], [1, 0], [3, -1], [0, 1], [4, 1], [-3, 1], [2, -2]] as [number, number][]) c.shade(cx + 1 + dx, gy - 11 + dy, -1);
  // The neck and head, reaching up and forward.
  c.part();
  c.capsule(cx - 3, gy - 12, cx - 5, gy - 17, 2, 1.6, DAPPLE, { bias: 1 });
  c.part();
  c.capsule(cx - 5.5, gy - 18, cx - 8.5, gy - 16, 1.7, 1.3, DAPPLE, { bias: 1 });
  c.px(cx - 9, gy - 16, DAPPLE, FACE, { bias: -2 });
  c.px(cx - 6, gy - 18, SOOT, FACE, { bias: 2 });
  c.px(cx - 5, gy - 21, DAPPLE, FACE, { bias: 2 });
  c.px(cx - 4, gy - 20.5, DAPPLE, FACE, { bias: 0 });
  // The bridle and reins.
  c.part();
  c.px(cx - 7, gy - 18, RED_PAINT, FACE, { bias: 1 });
  c.px(cx - 7, gy - 17, RED_PAINT, FACE, { bias: 0 });
  c.px(cx - 7, gy - 16, RED_PAINT, FACE, { bias: -1 });
  c.line(cx - 6, gy - 16, cx - 1, gy - 14, RED_PAINT, () => FACE, { bias: 1 });
  c.px(cx - 4.5, gy - 19.5, BRASS, FACE, { bias: 2 });
  // The yarn mane falling down the back of the neck.
  c.part();
  for (let k = 0; k < 7; k++) {
    const x = cx - 4.5 + k * 0.55;
    const y = gy - 20 + k;
    c.px(x, y, YARN, FACE, { bias: 1 + (k % 2) });
    c.px(x + 1, y, YARN, FACE, { bias: k % 2 ? -1 : 0 });
  }
  c.px(cx - 6, gy - 20, YARN, FACE, { bias: 2 });
  // The saddle, its girth and a brass stirrup.
  c.part();
  c.ellipse(cx + 1.5, gy - 13.5, 2.6, 1.4, RED_PAINT, { bias: 1 });
  c.px(cx - 1, gy - 14, RED_PAINT, FACE, { bias: 2 });
  c.px(cx + 4, gy - 14, RED_PAINT, FACE, { bias: 0 });
  for (let y = gy - 12; y < gy - 9; y++) c.px(cx + 1, y, RED_PAINT, FACE, { bias: -1 });
  c.px(cx + 1, gy - 9, BRASS, FACE, { bias: 2 });
  c.px(cx + 4, gy - 12.5, GOLD_CLOTH, FACE, { bias: 2 });
  // Near legs and rocker.
  leg(cx - 2, gy - 9, cx - 4, gy - 3, false);
  leg(cx + 4, gy - 9, cx + 6, gy - 3, false);
  rocker(gy, false);
});

// ---------------------------------------------------------------- Bunk bed

/** One bunk at height `z`, drawn as bedArt draws a bed: frame, mattress, pillow, the quilt turned down. */
function bunk(c: PixelCanvas, x0: number, x1: number, ya: number, yb: number, z: number, quilt: Material): void {
  box(c, x0, x1, ya, yb, z, z + 4, PALEW);
  box(c, x0 + 1, x1 - 1, ya, yb - 1, z + 4, z + 7, LINEN, { topBias: 1 });
  c.part();
  const py = ya - z - 7 + 3;
  c.ellipse((x0 + x1) / 2, py, (x1 - x0 - 4) / 2, 2.4, LINEN, { bias: 1, flatten: 0.8 });
  c.shade((x0 + x1) / 2, py, -1);
  const qy0 = ya + 9;
  box(c, x0, x1, qy0, yb, z + 2, z + 8, quilt);
  c.part();
  for (let y = qy0 - z - 8; y < qy0 - z - 6; y++) for (let x = x0; x < x1; x++) c.px(x, y, LINEN, TOP, { bias: y === qy0 - z - 8 ? 2 : 0 });
  patchwork(c, quilt, x0, x1, qy0 - z - 6, yb - z - 2);
}

const bunkbed = art('bunkbed', 1, 38, (c, g) => {
  // Two bunks one over the other, posts at the corners, a rail along the top
  // bunk's side, a teddy on its pillow and a ladder up the foot.
  const x0 = g.x0 + 1;
  const x1 = g.x1 - 1;
  const ya = g.y0 + 3;
  const yb = g.y1 - 2;
  const U = 18;
  const POST = U + 15;
  // The lower bunk (its head is hidden under the top one).
  bunk(c, x0, x1, ya, yb, 0, QUILT_G);
  // The shadow under the top bunk falls on the lower quilt.
  for (let y = yb - U - 4; y < yb - U + 3; y++) for (let x = x0; x < x1; x++) c.shade(x, y, y < yb - U + 1 ? -2 : -1);
  // The top bunk: headboard, back posts, the bunk, its rail.
  box(c, x0, x1, g.y0 + 1, ya, U, U + 12, PALEW);
  grain(c, x0, x1, ya - U - 12, ya - U, 7501, false);
  c.part();
  for (let x = x0 + 2; x < x1 - 2; x++) {
    const t = (x + 0.5 - g.cx) / ((x1 - x0) / 2);
    const rise = Math.round(Math.cos(t * Math.PI * 0.5) * 2);
    for (let k = 1; k <= rise; k++) c.px(x, ya - U - 12 - k, PALEW, FACE, { bias: k === rise ? 2 : 0 });
  }
  for (const x of [x0, x1 - 2]) box(c, x, x + 2, g.y0 + 1, ya, 0, POST, OAKW);
  bunk(c, x0, x1, ya, yb, U, QUILT_B);
  // A little bear sat against the pillow.
  c.part();
  const bx = x0 + 4;
  const by = ya - U - 7 + 3;
  c.ellipse(bx, by + 1, 1.8, 1.6, TEDDY, { bias: 0 });
  c.ellipse(bx, by - 1.5, 1.5, 1.3, TEDDY, { bias: 1 });
  c.px(bx - 1.5, by - 3, TEDDY, FACE, { bias: 1 });
  c.px(bx + 0.5, by - 3, TEDDY, FACE, { bias: 0 });
  c.px(bx - 0.5, by - 1, SOOT, FACE, { bias: 2 });
  c.px(bx - 0.5, by + 0.5, QUILT_R, FACE, { bias: 1 });
  // The rail along the west side of the top bunk.
  box(c, x0, x0 + 1, ya + 1, ya + 15, U + 7, U + 10, PALEW);
  for (const y of [ya + 1, ya + 8, ya + 14]) box(c, x0, x0 + 1, y, y + 1, U + 4, U + 10, PALEW);
  // Footboards for both bunks, then the front posts.
  box(c, x0, x1, yb - 1, yb + 1, 0, 5, PALEW);
  box(c, x0, x1, yb - 1, yb + 1, U, U + 6, PALEW);
  grain(c, x0, x1, yb + 1 - U - 6, yb + 1 - U, 7502, false);
  for (const x of [x0, x1 - 2]) box(c, x, x + 2, yb - 1, yb + 1, 0, U + 8, OAKW);
  // The ladder hooked over the top footboard.
  c.part();
  const la = x1 - 5;
  const lb = x1 - 2;
  for (let y = yb + 1 - U - 8; y < yb + 1; y++) {
    c.px(la, y, OAKW, cyl(-0.5), { bias: 2 });
    c.px(lb, y, OAKW, cyl(0.5), { bias: 0 });
  }
  c.part();
  for (let y = yb + 1 - U - 6; y < yb - 1; y += 4) for (let x = la + 1; x < lb; x++) c.px(x, y, PALEW, TOP, { bias: 2 });
});

// ---------------------------------------------------------------- Easel

const easel = art('easel', 5, 36, (c, g) => {
  // A tripod of pale wood holding a canvas with a little landscape (a
  // cottage under hills, its corner still sketched), a palette and a jar of brushes at its feet.
  const cx = g.cx;
  const gy = g.y1 - 6;
  const apex = gy - 31;
  // The back leg, then the front two splayed.
  tube(c, cx + 0.5, apex + 1, cx + 1.5, gy - 5, 0.6, 0.7, PALEW, -2);
  tube(c, cx - 0.5, apex, cx - 5.5, gy + 1, 0.7, 0.8, PALEW, 0);
  tube(c, cx + 0.5, apex, cx + 5.5, gy + 1, 0.7, 0.8, PALEW, 0);
  // The canvas, leant back on the ledge: sky, a sun, hills, a cottage.
  const ca = cx - 7;
  const cb = cx + 6;
  const ct = gy - 27;
  const cbm = gy - 12;
  c.part();
  for (let y = ct; y < cbm; y++) {
    for (let x = ca; x < cb; x++) {
      const v = y - ct;
      const far = 6 + Math.sin(x * 0.7 + 1) * 1.2;
      const near = 9 + Math.cos(x * 0.45) * 1.3;
      const sketch = x > cb - 5 && y > cbm - 4;
      let m: Material = PAINT_SKY;
      let b = 3 - Math.floor(v / 3);
      if (sketch) {
        m = LINEN;
        b = hash2(x, y, 7601) > 0.75 ? -2 : 1;
      } else if (v > near) {
        m = PAINT_HILL;
        b = 2 - Math.floor((v - near) / 3);
      } else if (v > far) {
        m = MOUNT;
        b = 2;
      }
      c.px(x, y, m, LEAN, { bias: b });
    }
  }
  // The sun and a cloud.
  c.px(cb - 4, ct + 2, PETAL_Y, LEAN, { bias: 3 });
  c.px(cb - 3, ct + 2, PETAL_Y, LEAN, { bias: 2 });
  c.px(cb - 4, ct + 3, PETAL_Y, LEAN, { bias: 2 });
  for (const x of [ca + 2, ca + 3, ca + 4]) c.px(x, ct + 3, LINEN, LEAN, { bias: 2 });
  c.px(ca + 3, ct + 2, LINEN, LEAN, { bias: 2 });
  // The cottage: white walls, a red roof, a door; a tree beside it.
  const hx = ca + 4;
  const hy = ct + 10;
  for (let x = hx; x < hx + 3; x++) for (let y = hy; y < hy + 2; y++) c.px(x, y, LINEN, LEAN, { bias: 1 });
  for (let x = hx - 1; x < hx + 4; x++) c.px(x, hy - 1, TULIP_R, LEAN, { bias: 1 });
  c.px(hx + 1, hy - 2, TULIP_R, LEAN, { bias: 2 });
  c.px(hx + 1, hy + 1, PAINT_DARK, LEAN, { bias: 1 });
  c.px(hx + 6, hy, PAINT_HILL, LEAN, { bias: -1 });
  c.px(hx + 6, hy - 1, PAINT_HILL, LEAN, { bias: 0 });
  c.px(hx + 5, hy - 1, PAINT_HILL, LEAN, { bias: 0 });
  c.px(hx + 6, hy + 1, OAKW, LEAN, { bias: 1 });
  // Pencil lines where it isn't painted yet.
  for (let x = cb - 4; x < cb; x++) c.shade(x, cbm - 3 + ((x - cb) % 2 ? 1 : 0), -1);
  // The canvas's edge, and the clamp holding its top.
  c.part();
  for (let y = ct; y < cbm; y++) c.px(cb, y, LINEN, EAST_N, { bias: -1 });
  c.part();
  for (let x = cx - 2; x < cx + 2; x++) for (let y = ct - 2; y < ct + 1; y++) c.px(x, y, PALEW, FACE, { bias: y === ct - 2 ? 2 : 0 });
  // The ledge it stands on.
  c.part();
  for (let x = ca - 1; x <= cb + 1; x++) {
    c.px(x, cbm, PALEW, TOP, { bias: 2 });
    c.px(x, cbm + 1, PALEW, FACE, { bias: x === ca - 1 ? 1 : -1 });
  }
  // A palette on the floor before it, dabbed with paint, and a jar of brushes.
  c.part();
  const px = cx - 4;
  const py = gy + 3;
  c.ellipse(px, py, 3.8, 1.8, PALEW, { normal: () => FLOOR, bias: 1 });
  c.erase(px + 2, py);
  for (const [dx, dy, m] of [[-2, -1, TULIP_R], [0, -1, PETAL_Y], [-3, 0, QUILT_B], [-1, 1, LEAF], [1, 1, LINEN]] as [number, number, Material][]) c.px(px + dx, py + dy, m, TOP, { bias: 2 });
  drum(c, cx + 5, gy + 3, 1.5, 0.8, 0, 3, GLASS, WATER);
  c.part();
  c.line(cx + 4.5, gy - 1, cx + 3.5, gy - 5, OAKW, () => FACE, { bias: 1 });
  c.line(cx + 5.5, gy - 1, cx + 6.5, gy - 4, DARKW, () => FACE, { bias: 1 });
  c.px(cx + 3, gy - 6, QUILT_B, FACE, { bias: 2 });
  c.px(cx + 7, gy - 5, TULIP_R, FACE, { bias: 2 });
});

// ---------------------------------------------------------------- Book stacks

const bookstacks = art('bookstacks', 3, 26, (c, g, f) => {
  // Two piles of old books, spines and page edges turned every way: a candle
  // stub burning on the tall one, a cup of tea on the short one, one more on the floor.
  const cx = g.cx;
  const R = rng(7701);
  // Each pile: the books' colours bottom up; widths, offsets and thicknesses vary.
  const pile = (xa: number, ya: number, yb: number, cols: number[], seed: number): number => {
    let z = 0;
    cols.forEach((ci, k) => {
      const w = 9 + Math.floor(R() * 3) - (k >= cols.length - 1 ? 1 : 0);
      const off = Math.floor(R() * 3) - 1;
      const t = 2 + Math.floor(R() * 2);
      book(c, xa + off, xa + off + w, ya + (k % 2), yb - ((k + 1) % 2), z, t, BOOKS[ci], (k + seed) % 2 === 0);
      z += t;
    });
    return z;
  };
  // The tall pile at the back left.
  const ax = cx - 7;
  const ay0 = g.y0 + 4;
  const ay1 = g.y0 + 9;
  const tall = pile(ax, ay0, ay1, [3, 0, 2, 5, 1], 1);
  // A candle stub in a brass dish on it, burning.
  const kx = ax + 5;
  const ky = ay1 - 3;
  drum(c, kx, ky, 2, 1, tall, tall + 1, BRASS);
  drum(c, kx, ky, 1.1, 0.6, tall + 1, tall + 4, WAX);
  c.part();
  c.px(kx + 0.5, ky - tall - 2, WAX, FACE, { bias: 2 });
  c.px(kx - 1, ky - tall - 1, WAX, FACE, { bias: 1 });
  flame(c, kx, ky - tall - 5, 0.9, 3, f, 7702);
  halo(c, kx, ky - tall - 6, 8, WARM, 0.35);
  // The short pile at the front right, a teacup on it.
  const bx = cx - 2;
  const by0 = g.y0 + 10;
  const by1 = g.y1 - 1;
  const short = pile(bx, by0, by1, [4, 2, 0], 2);
  c.part();
  c.ellipse(bx + 5, by1 - 4 - short, 2.2, 1, CHINA, { normal: () => TOP, bias: 1 });
  cup(c, bx + 5, by1 - 4, short, ROSE_GLAZE, 1);
  c.spark(bx + 5, by1 - 4 - short - 5, [255, 255, 255], 0.2);
  c.spark(bx + 4, by1 - 4 - short - 7, [255, 255, 255], 0.12);
  // A book left lying open on the floor, a ribbon in it.
  const ox = cx - 7;
  const oy = g.y1 - 4;
  c.part();
  for (let y = oy; y < oy + 3; y++) for (let x = ox; x < ox + 6; x++) c.px(x, y - 1, LINEN, FLOOR, { bias: x === ox + 3 ? -2 : (y - oy) % 2 ? 0 : 1 });
  c.part();
  for (let x = ox - 1; x < ox + 7; x++) c.px(x, oy + 2, BOOKS[1], FACE, { bias: 0 });
  c.px(ox + 3, oy + 3, QUILT_R, FACE, { bias: 1 });
}, 4, 7);

// ---------------------------------------------------------------- Gramophone

const gramophone = art('gramophone', 5, 36, (c, g, f) => {
  // A little walnut cabinet with a fretwork front and a crank; on it a record
  // on green baize, its tone arm, and a great brass horn opening like a
  // flower. A few notes drift up from it in the glow.
  const x0 = g.cx - 6;
  const x1 = g.cx + 6;
  const y0 = g.y0 + 5;
  const y1 = g.y1 - 3;
  const H = 10;
  const top = (y: number) => y - H - 1;
  // The horn's neck rises from the back right first, behind everything.
  const nx = x1 - 3;
  const ny = top(y0 + 1);
  const bellX = g.cx - 2;
  const bellY = ny - 17;
  tube(c, nx, ny, nx + 1, ny - 7, 1.1, 1.2, BRASS, 0);
  tube(c, nx + 1, ny - 7, bellX + 2, bellY + 3, 1.2, 1.6, BRASS, 0);
  // Feet and cabinet.
  for (const x of [x0, x1 - 2]) box(c, x, x + 2, y0, y0 + 2, 0, 2, DARKW);
  box(c, x0, x1, y0, y1, 2, H, OAKW);
  grain(c, x0, x1, y1 - H, y1 - 2, 7801);
  // A fretwork grille on the front with a cloth behind it.
  c.part();
  for (let y = y1 - H + 2; y < y1 - 4; y++) {
    for (let x = x0 + 2; x < x1 - 2; x++) {
      const cut = ((x - x0) + (y - y1)) % 3 === 0 || ((x - x0) - (y - y1) + 30) % 3 === 0;
      c.px(x, y, cut ? GOLD_CLOTH : OAKW, FACE, { bias: cut ? -1 : 1 });
    }
  }
  groove(c, x0 + 1, x1 - 1, y1 - H + 1, y1 - 4);
  for (const x of [x0, x1 - 2]) box(c, x, x + 2, y1 - 2, y1, 0, 2, DARKW);
  box(c, x0 - 1, x1 + 1, y0 - 1, y1 + 1, H, H + 1, DARKW, { topBias: 1 });
  // The crank out of its east side.
  c.part();
  c.line(x1 + 1, y1 - 6, x1 + 2, y1 - 6, BRASS, () => EAST_N, { bias: 1 });
  c.line(x1 + 2, y1 - 6, x1 + 2, y1 - 3, BRASS, () => EAST_N, { bias: 0 });
  c.px(x1 + 3, y1 - 3, DARKW, FACE, { bias: 2 });
  // The turntable: baize, the record with its grooves and a red label.
  const rx = g.cx - 1;
  const ry = Math.round((y0 + y1) / 2);
  c.part();
  c.ellipse(rx, top(ry), 5, 2.6, BAIZE, { normal: () => TOP, bias: 0 });
  c.part();
  for (let y = Math.floor(top(ry) - 2.4); y <= top(ry) + 2.4; y++) {
    for (let x = Math.floor(rx - 4.4); x <= rx + 4.4; x++) {
      const dx = (x + 0.5 - rx) / 4.4;
      const dy = (y + 0.5 - top(ry)) / 2.2;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const label = d < 0.32;
      c.px(x, y, label ? APPLE : SHELLAC, TOP, { bias: label ? 1 : Math.round(d * 6) % 2 ? 1 : 0 });
    }
  }
  c.px(rx - 0.5, top(ry) - 0.5, PETAL_Y, TOP, { bias: 2 });
  // The tone arm swung out over the record from its brass post.
  c.part();
  c.px(x1 - 2, top(y0 + 3), BRASS, TOP, { bias: 2 });
  c.px(x1 - 2, top(y0 + 3) + 1, BRASS, FACE, { bias: 0 });
  c.line(x1 - 2, top(y0 + 3) - 1, rx + 2, top(ry) + 1, STEEL, () => TOP, { bias: 2 });
  c.px(rx + 2, top(ry) + 2, STEEL, FACE, { bias: 0 });
  // The bell: eight scalloped petals round a dark throat, lit on the upper left.
  c.part();
  const RX = 7.5;
  const RY = 6;
  for (let y = Math.floor(bellY - RY - 1); y <= bellY + RY + 1; y++) {
    for (let x = Math.floor(bellX - RX - 1); x <= bellX + RX + 1; x++) {
      const dx = (x + 0.5 - bellX) / RX;
      const dy = (y + 0.5 - bellY) / RY;
      const a = Math.atan2(dy, dx);
      const lobe = Math.abs(Math.cos(a * 4));
      const edge = 0.8 + lobe * 0.2;
      const d = Math.hypot(dx, dy);
      if (d > edge) continue;
      if (d < 0.3) {
        c.px(x, y, SOOT, FACE, { bias: d < 0.18 ? -2 : 0 });
        continue;
      }
      // Inside the bell the metal faces back toward its throat.
      const seam = lobe < 0.18;
      const inner = d < 0.62;
      c.px(x, y, BRASS, n3(-dx * 0.7, dy * 0.7, 0.7), { bias: (seam ? -2 : 0) + (inner ? -1 : 0) + (d > edge - 0.14 ? 2 : 0) });
    }
  }
  // Notes drifting up and fading, only in the glow.
  for (let k = 0; k < 2; k++) {
    const ph = (f + k * 2) % 4;
    const x = bellX - 6 - k * 3 + (ph % 2);
    const y = bellY - 6 - ph * 2 - k;
    const a = 0.8 - ph * 0.17;
    c.spark(x, y, NOTE, a);
    c.spark(x + 1, y, NOTE, a);
    c.spark(x + 1, y - 1, NOTE, a);
    c.spark(x + 1, y - 2, NOTE, a);
    c.spark(x + 2, y - 2, NOTE, a * 0.7);
  }
}, 4, 4);

// ---------------------------------------------------------------- Monstera

/** A monstera leaf from its stem's end along `ang`: heart-shaped, folded at its midrib, cut with splits and holes. */
function monLeaf(c: PixelCanvas, bx: number, by: number, ang: number, L: number, W: number, m: Material, seed: number): void {
  c.part();
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const qx = -uy;
  const qy = ux;
  const R = L + W + 1;
  for (let y = Math.floor(by - R); y <= by + R; y++) {
    for (let x = Math.floor(bx - R); x <= bx + R; x++) {
      const rx = x + 0.5 - bx;
      const ry = y + 0.5 - by;
      const u = (rx * ux + ry * uy) / L;
      const v = (rx * qx + ry * qy) / W;
      if (u < -0.08 || u > 1) continue;
      // Broadest just past the base, tapering to the tip; a notch at the stem.
      const w = Math.sqrt(Math.max(0, (1 - u) * (u + 0.12))) * 1.75;
      const av = Math.abs(v);
      if (av > w) continue;
      if (u < 0.05 && av < 0.25) continue;
      // Splits from the edge in toward the midrib, swept toward the tip.
      const s = (u * 3.4 - av * 0.5 + 10) % 1;
      if (av > w * 0.34 && s < 0.3 && u > 0.1 && u < 0.9) continue;
      // A hole here and there near the midrib.
      const h = (u * 3.4 + 10.6) % 1;
      if (av > w * 0.16 && av < w * 0.3 && h < 0.2 && u > 0.25 && u < 0.7) continue;
      const side = v > 0 ? 1 : -1;
      const n = n3(qx * side * 0.45, -qy * side * 0.45 + 0.3, 0.85);
      const rib = av < 0.09;
      c.px(x, y, m, n, { bias: rib ? 2 : (hash2(x, y, seed) > 0.9 ? 1 : 0) + (av > w - 0.25 ? 0 : 0) });
    }
  }
}

const monstera = art('monstera', 8, 34, (c, g) => {
  // A big monstera in a woven basket: broad split leaves fanning out on long
  // stems, the far ones darker, one tipping over the rim.
  const cx = g.cx;
  const gy = g.y1 - 5;
  const leaves: { a: number; d: number; l: number; w: number; tilt: number; back: boolean }[] = [
    { a: -2.2, d: 14, l: 10, w: 4, tilt: -0.5, back: true },
    { a: -0.95, d: 15, l: 10, w: 4, tilt: 0.5, back: true },
    { a: -1.6, d: 17, l: 10, w: 4.2, tilt: 0, back: true },
    { a: -2.75, d: 9, l: 9, w: 3.8, tilt: -0.6, back: false },
    { a: -0.4, d: 9, l: 9, w: 3.8, tilt: 0.6, back: false },
    { a: -1.85, d: 9, l: 8, w: 3.6, tilt: -0.3, back: false },
  ];
  const base = { x: cx, y: gy - 8 };
  leaves.forEach((lf, k) => {
    const sx = base.x + Math.cos(lf.a) * lf.d * 0.7;
    const sy = base.y + Math.sin(lf.a) * lf.d * 0.75;
    c.part();
    c.line(base.x + (k % 3) - 1, base.y, sx, sy, STEM, () => FACE, { bias: lf.back ? -1 : 1 });
    // Each leaf hangs a little off its stem's line, so the fan opens.
    monLeaf(c, sx, sy, lf.a + lf.tilt, lf.l, lf.w, lf.back ? LEAF_DARK : LEAF, 7900 + k);
  });
  // The woven basket: upright stakes with strands woven between them, a rolled rim.
  drum(c, cx, gy, 5.5, 2.6, 0, 8, WICKER, SOIL);
  for (let y = gy - 9; y < gy + 3; y++) {
    for (let x = Math.floor(cx - 6); x < cx + 6; x++) {
      if (c.materialAt(x, y) !== WICKER) continue;
      const col = Math.floor(x - cx + 12);
      if (col % 3 === 0) c.shade(x, y, -1);
      else c.shade(x, y, (y + Math.floor(col / 3)) % 2 ? 1 : 0);
    }
  }
  drum(c, cx, gy, 5.9, 2.8, 7, 9, HAY, null, { bias: 1 });
  c.part();
  for (let x = Math.floor(cx - 6); x < cx + 6; x++) if (x % 2 === 0) c.shade(x, gy - 9 + 3, -1);
  monLeaf(c, cx + 3, gy - 8, 0.7, 7, 3, LEAF, 7950);
});

// ---------------------------------------------------------------- Folding screen

/** The silk scene across the screen, by position (`u` across from its west edge, `z` up): a rose sun, a far misty mountain, a blossom branch, two cranes, water and reeds. */
function silkAt(u: number, z: number): { m: Material; b: number } {
  // Two cranes flying east, wings in a shallow V, a red cap each.
  for (const [cu, cz] of [[21, 20], [25, 17]] as [number, number][]) {
    const dx = u - cu;
    const dz = z - cz;
    if (Math.abs(dx) <= 3 && dz === Math.min(1, Math.abs(dx) - 1)) return { m: Math.abs(dx) === 3 ? INK : LINEN, b: 2 };
    if (dx === 1 && dz === 0) return { m: LINEN, b: 2 };
    if (dx === 2 && dz === 0) return { m: TULIP_R, b: 1 };
    if (dx === -1 && dz === -1) return { m: INK, b: 1 };
  }
  // The blossom branch reaching in from the top left, crowded with flowers.
  const bz = 23 - u * 0.4 + Math.sin(u * 0.5) * 0.8;
  const near = Math.abs(z - bz);
  if (u < 13 && near < 0.6) return { m: INK, b: 1 };
  if (u < 16 && near < 2.6 && hash2(u, z, 8001) > 0.4 - (2.6 - near) * 0.15) return { m: BLOSSOM, b: hash2(u, z, 8002) > 0.5 ? 3 : 1 };
  // The rose sun over the mountain.
  if (Math.hypot(u - 17, z - 17.5) < 2.6) return { m: SUN_SILK, b: 2 };
  // The far mountain, its snowy cap, mist across its foot.
  const mz = 16 - Math.abs(u - 13) * 0.7;
  if (z < mz && z > 7) {
    if (z > mz - 2) return { m: LINEN, b: 1 };
    if (z === 9 || z === 10) return { m: SILK, b: 2 };
    return { m: MOUNT, b: (u > 13 ? 0 : 1) + (z < 9 ? 1 : 0) };
  }
  // Water, rippled, and reeds standing in it.
  if (z <= 7 && (u % 6 === 2 || u % 7 === 4) && z <= 5 + (u % 3)) return { m: REED, b: 1 + (z > 6 ? 1 : 0) };
  if (z <= 7) return { m: z === 7 || (u + z) % 5 === 0 ? MOUNT : SILK, b: z === 7 ? 3 : 1 };
  // The silk itself, paler toward the top.
  return { m: SILK, b: 1 + (z > 14 ? 1 : 0) };
}

const screen = art('screen', 1, 24, (c, g) => {
  // Three cherry-wood panels in a shallow bay: the middle one square to us,
  // the side ones turned in; one painted scene runs across their silk.
  const x0 = g.x0 + 1;
  const H = 25;
  const back = g.y1 - 7;
  const front = g.y1 - 3;
  const panels: { xa: number; xb: number; ya: number; yb: number; n: Vec3 }[] = [
    { xa: x0, xb: x0 + 9, ya: back, yb: front, n: FACE_W },
    { xa: x0 + 9, xb: x0 + 21, ya: front, yb: front, n: FACE },
    { xa: x0 + 21, xb: x0 + 30, ya: front, yb: back, n: FACE_E },
  ];
  for (const p of panels) {
    c.part();
    for (let x = p.xa; x < p.xb; x++) {
      const t = (x + 0.5 - p.xa) / (p.xb - p.xa);
      const base = Math.round(p.ya + (p.yb - p.ya) * t);
      const side = x === p.xa || x === p.xb - 1;
      for (let z = 1; z < H; z++) {
        const y = base - z;
        const rail = z === 1 || z === H - 1 || z === 4;
        if (side || rail) {
          c.px(x, y, CHERRYW, p.n, { bias: (x === p.xa || z === H - 1 ? 1 : 0) + (x === p.xb - 1 ? -1 : 0) });
        } else if (z < 4) {
          // A solid wooden kick panel under the silk.
          c.px(x, y, CHERRYW, p.n, { bias: z === 3 ? -1 : 0 });
        } else {
          const s = silkAt(x - x0, z);
          c.px(x, y, s.m, p.n, { bias: s.b + (p.n === FACE_E ? -1 : 0) });
        }
      }
      // The frame's top edge, seen from above.
      c.px(x, base - H, CHERRYW, TOP, { bias: 2 });
      // A little foot under each side post.
      if (side) c.px(x, base, CHERRYW, FACE, { bias: -1 });
    }
  }
  // Brass hinges where the panels meet.
  c.part();
  for (const x of [x0 + 9, x0 + 21]) {
    for (const z of [5, 19]) {
      c.px(x - 1, front - z, BRASS, FACE, { bias: 2 });
      c.px(x, front - z, BRASS, FACE, { bias: 0 });
    }
  }
});

// ---------------------------------------------------------------- Registry

export const HOUSE_ART: Record<string, PropArt> = {
  counter,
  sink,
  hutch,
  teacart,
  vanity,
  rockinghorse,
  bunkbed,
  easel,
  bookstacks,
  gramophone,
  monstera,
  screen,
};

/** The turning ones' side (facing east; west is it mirrored) and back views. */
export const HOUSE_TURNS: Record<string, { side: PropArt; back: PropArt }> = {};
