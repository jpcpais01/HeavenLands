// The Home's the yard's later pieces: a sundial, an angel statue, a garden
// windmill, wind chimes, a pergola, a water pump, a bird feeder, a picnic
// table, a hammock, a bistro set, a log pile and a flower cart (see
// world/homeParts.ts), drawn the same way as homeProps.ts: the game's high
// three-quarter view, lit from the upper left, with a glow layer that alone
// animates (so things that move, like the chimes and the pump's drip, move
// in their glints and drops; the windmill's sails stand still).

import { PixelCanvas, cyl, sphere, type Material, type RGB } from './pixel';
import { hash2, rng } from './env';
import { FIELDSTONE, IRON } from './sanctum';
import {
  art, box, drum, grain, halo, tufts, rose, mat, n3,
  FACE, TOP, FLOOR,
  OAKW, DARKW, PALEW, BRASS, LINEN, LEAF, LEAF_DARK, STEM, ROSE, TERRA, SOIL, PALE_STONE, MOSS, WATER,
  TULIP_R, TULIP_Y, TULIP_P, LAVENDER, PETAL_Y, SOOT, HAY, GLASS, SEEDS, DENIM,
  type PropArt,
} from './homeProps';

// ---------------------------------------------------------------- Materials

/** The angel's marble: near white, cool in its shadows. */
const MARBLE = mat('#3c3640', '#746c76', '#948a92', '#b0a8ae', '#c8c0c4', '#dcd6d6', '#ece8e6', '#f8f6f2', '#fffefb');
/** Her wings: the same marble, a shade cooler and deeper, so she stands out against them. */
const WING = mat('#2e2a3c', '#5e5a70', '#7a7690', '#9692aa', '#b0acc2', '#c8c4d6', '#dcd9e6', '#eeedf4');
/** Gilt for the angel's halo, faintly lit from within. */
const GILT: Material = { ...mat('#7a5414', '#6a4a10', '#a07a20', '#d0aa3a', '#ecd068', '#fff0a8', '#fffbe0'), shine: true, emissive: 0.45, noAO: true };
/** Old bronze for the sundial, gone a little green at the edges. */
const BRONZE: Material = { ...mat('#120a04', '#2e1c0a', '#4a3010', '#684818', '#866024', '#a27a34', '#bc964a', '#d6b46a', '#ecd292'), shine: true };
const PATINA = mat('#06140e', '#14382c', '#205044', '#2e6a5a', '#428472', '#5ca08a', '#7cbaa2');
/** Cream paint (the windmill's boards, the bistro set's iron). */
const CREAM = mat('#2a2620', '#625a4e', '#8a8070', '#aea48e', '#cac0a8', '#e0d8c2', '#f0eadc', '#fcf8ee');
/** Painted iron for the bistro set: cream, with a darker line to read on the lawn. */
const IRON_CREAM: Material = { ...mat('#3a3428', '#7a7262', '#9c9482', '#bab2a0', '#d4ccba', '#e8e2d2', '#f6f2e6'), shine: true };
const SKY_PAINT = mat('#0c1a2a', '#1c3654', '#2a4c72', '#3c6490', '#527eaa', '#6c98c0', '#8ab2d4', '#aacce4');
const COTTON_RED = mat('#1a0406', '#4a0e12', '#7a1a1c', '#a42a26', '#c63e32', '#de5a44', '#ee7a5a');
const COTTON_PINK = mat('#2a1014', '#7a3c40', '#a65a5a', '#c87a74', '#e09c90', '#f0bcae', '#fad6ca');
/** The pump's cast iron, painted an old barn red. */
const PUMP_RED: Material = { ...mat('#160406', '#38090c', '#580f12', '#76181a', '#942424', '#ae3630', '#c64c40', '#da6852'), shine: true };
const WISTERIA = mat('#1a1030', '#3a2a62', '#5a4690', '#7a64b4', '#9a84d0', '#b8a6e4', '#d4c6f2', '#ece4fc');
const BARK = mat('#0a0604', '#1a120c', '#2a1e14', '#3a2a1c', '#4a3624', '#5c442e', '#6e5438');
const LOG_END = mat('#2a1a0c', '#6a4a2a', '#8e6a42', '#b08a58', '#cca46c', '#e0bc84', '#eed09c', '#f8e2b8');
const TIT_BLUE = mat('#06122a', '#0e2450', '#183a78', '#2654a0', '#3a70c0', '#5a90d8', '#80b0ea');
const SPARROW = mat('#140c06', '#3a2614', '#56381e', '#70502c', '#8a6a3c', '#a6844e', '#c0a066');
const HAMMOCK_A = mat('#0a1e1c', '#164240', '#22605a', '#327c74', '#48988c', '#66b2a4', '#8acabc');
const PIE: Material = { ...mat('#2a1404', '#6a3a10', '#9a5a1c', '#c47e2c', '#dea044', '#f0c066', '#fcdc90'), shine: true };
/** The axe head: bright steel. */
const STEEL_HEAD: Material = { ...mat('#0a0c10', '#2a2e38', '#3e4450', '#565e6a', '#727a86', '#929aa4', '#b8bec6', '#e0e4ea'), shine: true };
const SAGE_STEM: Material = { ...mat('#0c140e', '#1c2a22', '#2a3c30', '#3a5040', '#4c6450', '#607a62'), noOutline: true };
const BERRY = mat('#14040e', '#3a0a24', '#5c1238', '#7e1c4c', '#a02c62', '#bc4478');

// Glow colours: water glints, light motes, warm sun on brass.
const GLINT: RGB = [235, 248, 255];
const MOTE: RGB = [255, 240, 196];
const AQUA: RGB = [150, 215, 235];

// ---------------------------------------------------------------- Helpers

/** Repaint what's drawn of one material in a rect as another, keeping its shading: checks and stripes. */
function recolor(c: PixelCanvas, x0: number, x1: number, y0: number, y1: number, from: Material, to: Material, keep: (x: number, y: number) => boolean): void {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (c.materialAt(x, y) !== from || !keep(x, y)) continue;
      const i = y * c.w + x;
      c.px(x, y, to, { x: c.nx[i], y: c.ny[i], z: c.nz[i] }, { bias: c.bias[i] });
    }
  }
}

const roofZ = (x: number, cx: number, hw: number, zEave: number, zApex: number): number => zApex - (Math.abs(x + 0.5 - cx) / hw) * (zApex - zEave);

/**
 * A gable roof seen from its gable end: the ridge runs away from us over
 * ground rows [yb, yf], the two slopes fall east and west, shingled in
 * courses, with a painted barge board along the front edge.
 */
function gableRoof(c: PixelCanvas, cx: number, hw: number, yb: number, yf: number, zEave: number, zApex: number, m: Material, trim: Material): void {
  c.part();
  for (let x = Math.floor(cx - hw); x < Math.ceil(cx + hw); x++) {
    const d = x + 0.5 - cx;
    if (Math.abs(d) > hw) continue;
    const z = roofZ(x, cx, hw, zEave, zApex);
    const top = Math.round(yb - z);
    const bot = Math.round(yf - z);
    const side = d < 0 ? -1 : 1;
    const course = Math.floor(Math.abs(d) / 3);
    for (let y = top; y <= bot + 1; y++) {
      let b = 0;
      if (Math.abs(d) % 3 < 1) b -= 1;
      if ((y - top + course * 2) % 4 === 0) b -= 1;
      if (Math.abs(d) < 1) b += 1;
      if (y === bot + 1) b = -2;
      c.px(x, y, m, n3(side * 0.6, 0.45, 0.66), { bias: b });
    }
  }
  // The barge board along the front edge.
  c.part();
  for (let x = Math.floor(cx - hw); x < Math.ceil(cx + hw); x++) {
    if (Math.abs(x + 0.5 - cx) > hw) continue;
    const y = Math.round(yf - roofZ(x, cx, hw, zEave, zApex));
    c.px(x, y, trim, FACE, { bias: x < cx ? 1 : 0 });
    c.px(x, y + 1, trim, FACE, { bias: -1 });
  }
}

/** The wall under a gable roof, facing us: from `z0` up to just under the roof. */
function gableWall(c: PixelCanvas, x0: number, x1: number, yf: number, z0: number, cx: number, hw: number, zEave: number, zApex: number, m: Material): void {
  c.part();
  for (let x = x0; x < x1; x++) {
    const top = Math.round(yf - roofZ(x, cx, hw, zEave, zApex)) + 1;
    for (let y = top; y < yf - z0; y++) c.px(x, y, m, FACE, { bias: (x === x0 ? 1 : x === x1 - 1 ? -1 : 0) + (y === yf - z0 - 1 && z0 === 0 ? -1 : 0) });
  }
}

/** A little flower: four petals round a bright eye. */
function posy(c: PixelCanvas, x: number, y: number, petal: Material, eye: Material = PETAL_Y): void {
  c.part();
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.px(x + dx, y + dy, petal, sphere(dx * 0.5, -dy * 0.5), { bias: dy < 0 || dx < 0 ? 2 : 1 });
  c.px(x, y, eye, TOP, { bias: 2 });
}

/** A terracotta pot with its soil showing. */
function pot(c: PixelCanvas, x: number, gy: number, rx: number, h: number, m: Material = TERRA): void {
  drum(c, x, gy, rx, rx * 0.52, 0, h, m, SOIL, { topBias: -1 });
  drum(c, x, gy, rx + 0.5, (rx + 0.5) * 0.52, h - 1.5, h, m, null, { bias: 1 });
}

/** Pits and stains over everything of one material in a rect. */
function weather(c: PixelCanvas, x0: number, x1: number, y0: number, y1: number, m: Material, seed: number, amount = 0.9): void {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (c.materialAt(x, y) === m && hash2(x, y, seed) > amount) c.shade(x, y, -1);
}

/** Moss on whatever of `m` faces the sky (nothing drawn just above it), patchy. */
function mossOn(c: PixelCanvas, x0: number, x1: number, y0: number, y1: number, m: Material, seed: number, odds = 0.55): void {
  c.part();
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (c.materialAt(x, y) !== m) continue;
      const above = c.materialAt(x, y - 1);
      if (above !== null && above !== MOSS) continue;
      if (hash2(x, y, seed) > odds) c.px(x, y, MOSS, sphere(0, 0.6), { bias: hash2(x, y, seed + 1) > 0.6 ? 1 : 0 });
    }
  }
}

/** A spoked wheel facing us: an iron tyre on a wooden rim, `n` spokes, a brass hub. */
function wheel(c: PixelCanvas, wx: number, wy: number, R: number, n: number, rim: Material = OAKW, spoke: Material = PALEW, bias = 0): void {
  c.part();
  for (let y = Math.floor(wy - R); y <= wy + R; y++) {
    for (let x = Math.floor(wx - R); x <= wx + R; x++) {
      const dx = x + 0.5 - wx;
      const dy = y + 0.5 - wy;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const nrm = n3((dx / R) * 0.6, (-dy / R) * 0.6, 0.6);
      if (d > R - 1.1) c.px(x, y, DARKW, nrm, { bias: (dy < 0 ? 1 : 0) + bias });
      else if (d > R - 2.1) c.px(x, y, rim, nrm, { bias });
      else {
        const a = (Math.atan2(dy, dx) / (Math.PI * 2)) * n + n + 0.5;
        if (Math.abs(a - Math.round(a)) < 0.12 + 0.6 / Math.max(1, d)) c.px(x, y, spoke, FACE, { bias: bias + (dx < 0 ? 1 : 0) });
      }
    }
  }
  c.part();
  c.ellipse(wx, wy, 1.3, 1.3, BRASS, { bias: 1 + bias });
}

// ---------------------------------------------------------------- Sundial

const sundial = art('sundial', 4, 16, (c, g, f) => {
  // A stone sundial: a stepped base, a turned baluster, a broad capital and
  // the bronze dial on it, its hours marked round the rim, the gnomon's
  // shadow falling across them; moss in the joints, a few daisies.
  const cx = g.cx;
  const gy = g.y1 - 6;
  c.part();
  c.ellipse(cx, gy + 1, 7.5, 3.6, MOSS, { normal: () => FLOOR });
  drum(c, cx, gy, 6.5, 3.2, 0, 2, PALE_STONE);
  drum(c, cx, gy, 4.6, 2.3, 2, 4, PALE_STONE);
  // The baluster: slim at its foot, swelling, slim again under the capital.
  c.part();
  for (let z = 4; z <= 12; z += 0.5) {
    const u = (z - 4) / 8;
    const r = 1.7 + Math.sin(u * Math.PI) * 1.1 - (u > 0.85 ? 0.3 : 0);
    const y = gy - z;
    for (let x = Math.floor(cx - r); x < cx + r; x++) {
      const t = (x + 0.5 - cx) / r;
      c.px(x, Math.round(y + Math.sqrt(Math.max(0, 1 - t * t)) * r * 0.5), PALE_STONE, cyl(t, -0.2), { bias: Math.abs(u - 0.5) < 0.12 ? 1 : 0 });
    }
  }
  // A ring cut round its waist.
  for (let x = cx - 3; x < cx + 3; x++) if (c.materialAt(x, gy - 8) === PALE_STONE) c.shade(x, gy - 8 + 1, -1);
  drum(c, cx, gy, 4, 2, 12, 13, PALE_STONE, PALE_STONE, { bias: -1 });
  drum(c, cx, gy, 6.2, 3.2, 13, 15, PALE_STONE);
  // The dial plate, its rim of hours, the numerals as dots of patina.
  const dy = gy - 15;
  c.part();
  c.ellipse(cx, dy, 5, 2.6, BRONZE, { normal: (_x, _y, ex, ey) => n3(ex * 0.25, 0.45 - ey * 0.2, 0.9) });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const x = cx + Math.cos(a) * 4;
    const y = dy + Math.sin(a) * 2;
    if (c.materialAt(x, y) === BRONZE) c.px(x, y, k % 3 === 0 ? PATINA : BRONZE, TOP, { bias: k % 3 === 0 ? 2 : -2 });
  }
  // The gnomon: a bronze fin standing along the noon line, its shadow to the east.
  c.part();
  for (let k = 0; k < 4; k++) c.px(cx - 1, dy - 3 + k, BRONZE, n3(-0.6, 0.3, 0.75), { bias: 3 - (k >> 1) });
  for (let k = 1; k < 4; k++) c.px(cx, dy - 3 + k, BRONZE, n3(0.6, 0.2, 0.75), { bias: -1 });
  for (const [x, y] of [[cx + 1, dy + 1], [cx + 2, dy + 1], [cx + 3, dy + 1], [cx + 4, dy + 2]]) c.shade(x, y, -3);
  // Weathering and moss on the stone's upper faces.
  weather(c, cx - 7, cx + 7, gy - 16, gy + 4, PALE_STONE, 4101, 0.86);
  mossOn(c, cx - 7, cx + 7, gy - 15, gy + 4, PALE_STONE, 4102, 0.62);
  // Daisies at its foot.
  tufts(c, cx, gy + 4, 7, 4103, 7);
  posy(c, cx - 6, gy + 2, LINEN);
  posy(c, cx + 6, gy + 3, LINEN);
  // The sun's glint on the bronze, wandering round the rim.
  const ga = (f / 4) * Math.PI * 2;
  c.spark(cx - 2 + Math.round(Math.cos(ga)), dy - 1, MOTE, 0.35);
}, 4, 2);

// ---------------------------------------------------------------- Angel

const angel = art('angel', 5, 30, (c, g, f) => {
  // A marble angel on a little plinth, wings folded behind her, head bowed
  // over a shallow bowl of water held in both hands; a gilt halo, and motes
  // of light drifting up round her.
  const cx = g.cx;
  const gy = g.y1 - 5;
  // The plinth: a step, the block, a moulded cap.
  box(c, cx - 5, cx + 5, gy - 4, gy + 2, 0, 1, MARBLE, { bias: -1 });
  box(c, cx - 4, cx + 4, gy - 3, gy + 1, 1, 4, MARBLE);
  box(c, cx - 5, cx + 5, gy - 4, gy + 2, 4, 5, MARBLE);
  // A carved heart on its face.
  for (const [x, y] of [[-2, -2], [1, -2], [-1, -1], [0, -1], [-1, -2], [0, -2]]) c.shade(cx + x, gy + 1 + y, -2);
  const fb = gy - 7;
  // The wings, folded: tall feathered blades behind her shoulders, tips above her head.
  for (const s of [-1, 1]) {
    c.part();
    c.shape(fb - 17, fb - 2, (y) => {
      const u = (y - fb + 17) / 15;
      // Each edge through a few keys: the wing tip beside her head, full at the elbow, tapering to her hem.
      const lerp = (keys: number[][]) => {
        for (let k = 1; k < keys.length; k++) if (u <= keys[k][0]) return keys[k - 1][1] + ((u - keys[k - 1][0]) / (keys[k][0] - keys[k - 1][0])) * (keys[k][1] - keys[k - 1][1]);
        return keys[keys.length - 1][1];
      };
      const out = lerp([[0, 5.3], [0.2, 6.5], [0.45, 6.4], [0.75, 5], [1, 2.6]]);
      const inner = lerp([[0, 3.9], [0.3, 1], [1, 0.8]]);
      const a = cx + s * inner;
      const b = cx + s * out;
      return s < 0 ? [b, a] : [a, b];
    }, WING, (_x, _y, t, u) => n3(s * Math.abs(t) * 0.55 - 0.1, 0.6 - u * 0.8, 0.75), { bias: s > 0 ? -2 : -1 });
    // The long flight feathers below the shoulder, a row of coverts above them.
    for (let y = fb - 19; y < fb - 1; y++) {
      for (let x = cx - 7; x < cx + 8; x++) {
        if (c.materialAt(x, y) !== WING) continue;
        const d = Math.abs(x + 0.5 - cx);
        if (y > fb - 12 && Math.round(y - d * 0.9) % 2 === 0) c.shade(x, y, -1);
        if (y === fb - 13) c.shade(x, y, -1);
        if (y < fb - 14) c.shade(x, y, 1);
      }
    }
  }
  // Her gown, falling in folds to a flared hem over the plinth.
  c.part();
  c.shape(fb - 12, fb, (y) => {
    const u = (y - fb + 12) / 12;
    const hw = 2.1 + Math.pow(u, 1.4) * 2;
    return [cx - hw, cx + hw];
  }, MARBLE, (_x, _y, t, u) => n3(t * 0.7, 0.3 - u * 0.4, 0.75), { bias: 1 });
  for (let y = fb - 6; y <= fb; y++) {
    c.shade(cx - 2, y, -1);
    c.shade(cx + 1, y, -1);
  }
  for (let x = cx - 4; x < cx + 5; x++) c.shade(x, fb, -1);
  c.shade(cx - 1, fb + 1, 0);
  // Arms in long sleeves, meeting at the bowl.
  c.part();
  c.capsule(cx - 2.6, fb - 11, cx - 1.6, fb - 7.2, 1.1, 1, MARBLE);
  c.capsule(cx + 2.6, fb - 11, cx + 1.6, fb - 7.2, 1.1, 1, MARBLE);
  // The bowl, and the water in it catching the light.
  c.part();
  c.ellipse(cx, fb - 6.6, 2.4, 1.1, MARBLE, { bias: 1 });
  c.part();
  c.px(cx - 1, fb - 7.5, WATER, TOP, { bias: 3 });
  c.px(cx, fb - 7.5, WATER, TOP, { bias: 1 });
  // The halo's far half, behind her head.
  const ring = (front: boolean) => {
    c.part();
    for (let y = fb - 20; y <= fb - 15; y++) {
      for (let x = cx - 4; x < cx + 4; x++) {
        const dy = y + 0.5 - (fb - 17.6);
        if ((dy > 0) !== front) continue;
        const d = Math.hypot((x + 0.5 - cx) / 3, dy / 1.2);
        if (d > 0.6 && d <= 1.1) c.px(x, y, GILT, TOP, { bias: front ? 1 : 0 });
      }
    }
  };
  ring(false);
  // Her head, bowed: hair gathered in a knot, a quiet face.
  c.part();
  c.ellipse(cx, fb - 14.3, 2.1, 2.1, MARBLE, { bias: 2 });
  c.part();
  c.ellipse(cx + 0.4, fb - 16, 1.5, 0.9, MARBLE, { bias: 0 });
  c.shade(cx - 1, fb - 14, -1);
  c.shade(cx + 1, fb - 14, -1);
  c.shade(cx + 1, fb - 13, -2);
  ring(true);
  halo(c, cx, fb - 17.5, 4.5, [255, 236, 170], 0.22);
  weather(c, cx - 7, cx + 7, fb - 22, gy + 3, MARBLE, 4201, 0.93);
  mossOn(c, cx - 7, cx + 7, gy - 8, gy + 3, MARBLE, 4202, 0.72);
  tufts(c, cx, gy + 3, 7, 4203, 7);
  posy(c, cx - 6, gy + 1, TULIP_P);
  posy(c, cx + 6, gy + 2, LINEN);
  // Motes of light rising round her, each on its own beat.
  for (let k = 0; k < 4; k++) {
    const p = (f + k * 1.5) % 6;
    const x = cx + [-5, 5, -3, 4][k] + (p > 3 ? (k % 2 ? -1 : 1) : 0);
    const y = fb - 4 - [2, 6, 12, 9][k] - p * 1.5;
    c.spark(x, y, MOTE, 0.65 * Math.sin((p / 6) * Math.PI));
  }
  c.spark(cx - 1, fb - 7.5, GLINT, 0.35 + (f % 2) * 0.25);
}, 6, 5);

// ---------------------------------------------------------------- Garden windmill

const windmill = art('windmill', 7, 32, (c, g) => {
  // A little painted windmill for the garden: a cream clapboard tower on a
  // ring of fieldstone, a blue door and window, a red cap, and four lattice
  // sails with their cloths furled half out.
  const cx = g.cx;
  const gy = g.y1 - 5;
  drum(c, cx, gy, 5.6, 2.7, 0, 2, FIELDSTONE);
  for (let x = cx - 6; x < cx + 6; x++) if (hash2(x, 0, 4301) > 0.55) c.shade(x, gy + 1, -1);
  // The tower, tapering, built of slices so the higher cover the lower's tops.
  const H = 15;
  c.part();
  for (let z = 2; z <= 2 + H; z += 0.5) {
    const u = (z - 2) / H;
    const r = 4.6 - u * 1.5;
    const ry = r * 0.5;
    for (let y = Math.floor(gy - z - ry); y <= gy - z + ry; y++) {
      for (let x = Math.floor(cx - r); x < cx + r; x++) {
        const dx = (x + 0.5 - cx) / r;
        const ddy = (y + 0.5 - (gy - z)) / ry;
        if (dx * dx + ddy * ddy > 1) continue;
        c.px(x, y, CREAM, n3(dx * 0.85, -ddy * 0.2 + 0.1, 0.6), { bias: 0 });
      }
    }
  }
  // Clapboards: a shadow line every few rows.
  for (let y = gy - 2 - H - 3; y < gy + 2; y++) for (let x = cx - 5; x < cx + 5; x++) if (c.materialAt(x, y) === CREAM && (gy - y) % 3 === 0) c.shade(x, y, -1);
  // The door at its foot, a little window above.
  c.part();
  for (let y = gy - 6; y <= gy; y++) for (let x = cx - 1; x < cx + 2; x++) if (!(y === gy - 6 && x !== cx)) c.px(x, y, SKY_PAINT, FACE, { bias: x === cx - 1 ? 1 : y === gy - 6 ? 1 : 0 });
  c.px(cx + 1, gy - 3, BRASS, FACE, { bias: 2 });
  c.part();
  for (let y = gy - 12; y < gy - 9; y++) for (let x = cx - 1; x < cx + 1; x++) c.px(x, y, GLASS, FACE, { bias: y === gy - 12 ? 2 : 0 });
  for (const x of [cx - 2, cx + 1]) for (let y = gy - 12; y < gy - 9; y++) c.px(x, y, SKY_PAINT, FACE, { bias: x < cx ? 1 : -1 });
  // The cap: a red cone with a little finial, overhanging the tower.
  const zc = 2 + H;
  c.part();
  for (let z = zc - 0.5; z <= zc + 6; z += 0.5) {
    const u = (z - zc + 0.5) / 6.5;
    const r = 3.9 * (1 - u) + 0.4;
    const ry = r * 0.5;
    for (let y = Math.floor(gy - z - ry); y <= gy - z + ry; y++) {
      for (let x = Math.floor(cx - r); x < cx + r; x++) {
        const dx = (x + 0.5 - cx) / r;
        const ddy = (y + 0.5 - (gy - z)) / ry;
        if (dx * dx + ddy * ddy > 1) continue;
        c.px(x, y, COTTON_RED, n3(dx * 0.75, 0.35 + u * 0.3, 0.6), { bias: (Math.round(x + 0.5 - cx) % 2 === 0 ? 0 : -1) + (z < zc ? -1 : 0) });
      }
    }
  }
  c.part();
  c.px(cx, gy - zc - 7, BRASS, sphere(-0.3, 0.5), { bias: 2 });
  c.px(cx, gy - zc - 8, BRASS, sphere(-0.3, 0.5), { bias: 3 });
  // The sails, turned on a hub at the cap's front: a stock down each, a lattice cloth beside it.
  const hx = cx;
  const hy = gy - zc - 1;
  const L = 10.5;
  const angles = [-Math.PI / 4 - 0.15, Math.PI / 4 - 0.15, (3 * Math.PI) / 4 - 0.15, (-3 * Math.PI) / 4 - 0.15];
  for (const [k, a] of angles.entries()) {
    const ex = Math.cos(a);
    const ey = Math.sin(a);
    // The cloth sits on the trailing side of each stock.
    const px = -ey;
    const py = ex;
    c.part();
    for (let y = Math.floor(hy - L - 2); y <= hy + L + 2; y++) {
      for (let x = Math.floor(hx - L - 2); x <= hx + L + 2; x++) {
        const rx = x + 0.5 - hx;
        const ry = y + 0.5 - hy;
        const along = rx * ex + ry * ey;
        const side = rx * px + ry * py;
        if (along < 3 || along > L || side < 0.4 || side > 3.4) continue;
        const lattice = Math.abs(along - Math.round(along / 2.4) * 2.4) < 0.45 || side > 2.8;
        const cloth = k % 2 === 0 ? LINEN : CREAM;
        c.px(x, y, lattice ? PALEW : cloth, n3(-0.2, 0.2, 0.95), { bias: lattice ? 0 : 1 + (along > L - 2 ? -1 : 0) });
      }
    }
    c.part();
    c.line(hx + ex * 1.5, hy + ey * 1.5, hx + ex * (L + 0.5), hy + ey * (L + 0.5), DARKW, () => FACE, { bias: 2 });
  }
  c.part();
  c.ellipse(hx, hy, 1.2, 1.2, DARKW, { bias: 2 });
  c.px(hx, hy, BRASS, sphere(-0.5, 0.5), { bias: 2 });
  tufts(c, cx, gy + 3, 7, 4302, 7);
  posy(c, cx - 6, gy + 1, TULIP_Y, OAKW);
  posy(c, cx + 5, gy + 2, TULIP_R);
});

// ---------------------------------------------------------------- Wind chimes

const chimes = art('chimes', 7, 34, (c, g, f) => {
  // Wind chimes on a shepherd's hook: a slim iron crook planted by a few
  // flowers, a wooden crown hung from it, five brass tubes of falling
  // lengths on threads, the striker among them and a painted heart below
  // for the wind to catch. The light runs along the tubes as they turn.
  const cx = g.cx;
  const gy = g.y1 - 5;
  const hx = cx - 4;
  const top = gy - 28;
  // The crook: straight up, then over in a curl.
  c.part();
  c.line(hx, gy, hx, top, IRON, (i, n) => n3(-0.3, 0.2 + (i / n) * 0.2, 0.9), { bias: 2 });
  c.px(hx - 1, gy, IRON, FACE, { bias: 1 });
  c.px(hx + 1, gy, IRON, FACE, { bias: 0 });
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI - (k / 12) * Math.PI * 1.15;
    c.px(hx + 3 + Math.cos(a) * 3, top - Math.sin(a) * 3, IRON, n3(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.7), { bias: 2 });
  }
  const ax = hx + 6;
  const ay = top + 1;
  // A thread to the crown.
  c.part();
  for (let y = ay + 1; y < ay + 3; y++) c.px(ax, y, LINEN, FACE, { bias: 0 });
  // The crown: a little wooden disc.
  const dy = ay + 4;
  drum(c, ax, dy, 4, 1.4, 0, 1, OAKW);
  // Threads, then the tubes: longest at the middle.
  const tubes = [
    { x: ax - 3, len: 8 },
    { x: ax - 1.5, len: 11 },
    { x: ax, len: 13 },
    { x: ax + 1.5, len: 10 },
    { x: ax + 3, len: 7 },
  ];
  c.part();
  for (const t of tubes) c.px(t.x, dy + 1, LINEN, FACE, { bias: -1 });
  // Back row first (the even ones), then the front row, so they overlap.
  for (const row of [[1, 3], [0, 2, 4]]) {
    c.part();
    for (const i of row) {
      const t = tubes[i];
      for (let y = dy + 2; y < dy + 2 + t.len; y++) c.px(t.x, y, BRASS, cyl(row.length === 2 ? 0.3 : -0.3, 0), { bias: (row.length === 2 ? -1 : 1) + (y === dy + 2 ? 1 : 0) });
    }
  }
  // The striker, the thread on down, and the heart.
  c.part();
  c.ellipse(ax, dy + 8.5, 1.6, 0.8, PALEW, { bias: 1 });
  c.part();
  for (let y = dy + 10; y < dy + 15; y++) c.px(ax, y, LINEN, FACE, { bias: 0 });
  c.part();
  const hy = dy + 17;
  c.ellipse(ax - 0.9, hy - 0.7, 1.2, 1.1, COTTON_PINK, { bias: 1 });
  c.ellipse(ax + 1.1, hy - 0.7, 1.2, 1.1, COTTON_PINK, { bias: 0 });
  c.shape(hy - 0.5, hy + 2, (y) => {
    const u = (y - hy + 0.5) / 2.5;
    const hw = 2.2 * (1 - u);
    return [ax + 0.1 - hw, ax + 0.1 + hw];
  }, COTTON_PINK, () => FACE);
  c.px(ax - 1, hy - 1, COTTON_PINK, sphere(-0.5, 0.5), { bias: 3 });
  // Flowers at the crook's foot.
  tufts(c, hx, gy + 2, 5, 4401, 6);
  posy(c, hx - 2, gy - 1, LAVENDER);
  posy(c, hx + 2, gy, TULIP_Y, OAKW);
  // The light running down one tube and then the next.
  const t = tubes[[2, 0, 3, 1, 4, 2][f % 6]];
  const gyy = dy + 3 + ((f * 3) % Math.max(3, t.len - 3));
  c.spark(t.x, gyy, [255, 240, 190], 0.75);
  c.spark(t.x, gyy + 1, [255, 220, 150], 0.35);
  if (f % 3 === 0) c.spark(ax - 1, hy - 1, [255, 220, 230], 0.25);
}, 6, 4);

// ---------------------------------------------------------------- Pergola

/** A raceme of wisteria hanging from (x, y), `len` long: full at the top, a point at the bottom. */
function wisteria(c: PixelCanvas, x: number, y: number, len: number, seed: number): void {
  const R = rng(seed);
  c.part();
  for (let j = 0; j < len; j++) {
    const u = j / len;
    const hw = 1.5 * (1 - u * 0.8);
    const sx = x + Math.sin(j * 0.9 + seed) * 0.4;
    for (let xx = Math.round(sx - hw); xx < Math.round(sx + hw); xx++) {
      if (R() < 0.15 && j > 1) continue;
      const b = 1 - Math.floor(u * 3) + (xx < sx ? 1 : 0) + (R() < 0.3 ? -1 : 0);
      c.px(xx, y + j, WISTERIA, sphere((xx + 0.5 - sx) / 2, 0.3), { bias: b });
    }
  }
}

const pergola = art('pergola', 4, 40, (c, g) => {
  // A cedar pergola to walk under: four square posts, a beam along the
  // front and back, slim rafters across them and battens over those, a vine
  // climbing every post and wandering over the top, wisteria hanging from it
  // all in lilac drops. Open between, so whatever stands beneath still shows.
  const xl = g.x0 + 1;
  const xr = g.x1 - 3;
  const yb = g.y0 + 4;
  const yf = g.y1 - 3;
  const zs = 30;
  const R = rng(4506);
  // Back posts, the back beam.
  for (const x of [xl, xr]) box(c, x, x + 2, yb - 1, yb + 1, 0, zs, PALEW, { bias: -1 });
  box(c, g.x0 - 3, g.x1 + 3, yb - 1, yb, zs - 3, zs, PALEW, { bias: -1 });
  // Wisteria under the back beam, glimpsed through.
  for (let x = g.x0; x < g.x1; x += 5) wisteria(c, x + (hash2(x, 1, 4501) - 0.5) * 2, yb - zs + 1, 3 + Math.floor(hash2(x, 2, 4501) * 3), 4502 + x);
  // Front posts on little plinths.
  for (const x of [xl, xr]) {
    box(c, x, x + 2, yf - 1, yf + 1, 0, zs, PALEW);
    grain(c, x, x + 2, yf + 1 - zs, yf + 1, 4503 + x, false);
    box(c, x - 1, x + 3, yf - 1, yf + 2, 0, 2, PALE_STONE, { bias: -1 });
  }
  // The rafters, back to front, their ends overhanging both beams.
  for (let x = g.x0 - 1; x < g.x1 + 2; x += 6) box(c, x, x + 1, yb - 3, yf + 3, zs, zs + 2, PALEW, { topBias: 1 });
  // Battens across the rafters.
  for (const y of [yb + 2, yb + 9, yb + 16, yb + 23]) box(c, g.x0 - 2, g.x1 + 2, y, y + 1, zs + 2, zs + 3, PALEW, { topBias: 0 });
  // The vine wandering over the top: leaves in drifts, thicker over the corners where it climbs.
  c.part();
  for (let k = 0; k < 70; k++) {
    const corner = R() < 0.45;
    const x = corner ? (R() < 0.5 ? xl + 1 : xr + 1) + (R() - 0.5) * 12 : g.x0 - 2 + R() * (g.x1 - g.x0 + 4);
    const gyy = yb - 2 + R() * (yf - yb + 4);
    if (!corner && hash2(Math.floor(x / 7), Math.floor(gyy / 7), 4507) < 0.45) continue;
    c.ellipse(x, gyy - zs - 3, 1.5, 1.1, R() < 0.5 ? LEAF : LEAF_DARK, { flatten: 0.7 });
  }
  // The front beam, over the rafters' feet.
  box(c, g.x0 - 3, g.x1 + 3, yf, yf + 1, zs - 3, zs, PALEW);
  grain(c, g.x0 - 3, g.x1 + 3, yf - zs, yf + 1 - zs + 3, 4505);
  for (const x of [g.x0 - 3, g.x1 + 2]) c.erase(x, yf + 1 - zs + 2);
  // Vines climbing the front posts.
  for (const x of [xl, xr]) {
    c.part();
    for (let z = 1; z < zs + 2; z += 2) {
      const sx = x + 1 + Math.sin(z * 0.55 + x) * 1.8;
      c.ellipse(sx, yf - z, 1.4, 1, (z >> 1) % 2 ? LEAF : LEAF_DARK, { flatten: 0.7 });
    }
  }
  // Wisteria: from the battens over the middle, then along the front beam, longest at the corners.
  for (const y of [yb + 9, yb + 16, yb + 23]) {
    for (let x = g.x0 + 3; x < g.x1 - 2; x += 7) if (hash2(x, y, 4509) > 0.35) wisteria(c, x + hash2(x, y, 4510) * 3, y - zs - 2, 3 + Math.floor(hash2(x, y, 4511) * 3), 4512 + x + y);
  }
  for (let k = 0; k < 9; k++) {
    const x = g.x0 - 1 + k * ((g.x1 - g.x0 + 2) / 8) + (hash2(k, 3, 4508) - 0.5) * 2;
    const edge = Math.min(k, 8 - k);
    const len = edge === 0 ? 9 : edge === 1 ? 6 : 3 + Math.floor(hash2(k, 4, 4508) * 3);
    wisteria(c, x, yf - zs + 2, len, 4520 + k);
  }
  // A few blooms on the climbing vines.
  for (const x of [xl, xr]) {
    for (let z = 6; z < zs - 4; z += 7) {
      const sx = x + 1 + Math.sin(z * 0.55 + x) * 1.8;
      wisteria(c, sx + 1, yf - z, 3, 4530 + z + x);
    }
  }
  tufts(c, xl + 1, yf + 2, 4, 4540, 4);
  tufts(c, xr + 1, yf + 2, 4, 4541, 4);
  tufts(c, xl + 1, yb + 1, 3, 4542, 3);
  tufts(c, xr + 1, yb + 1, 3, 4543, 3);
});

// ---------------------------------------------------------------- Water pump

const pump = art('pump', 6, 28, (c, g, f) => {
  // An old hand pump of red-painted cast iron on a stone slab: a round
  // column with a domed head, a square spout reaching west with a brass lip,
  // the long handle raised to the east, a wooden pail under the spout with
  // water dripping into it; moss in the joints.
  const cx = g.cx + 1;
  const gy = g.y1 - 6;
  box(c, cx - 8, cx + 5, gy - 4, gy + 2, 0, 3, FIELDSTONE);
  // Joints between the slabs.
  for (let x = cx - 8; x < cx + 5; x++) if ((x - cx + 8) % 5 === 4) for (let y = gy - 1; y < gy + 2; y++) c.shade(x, y, -2);
  for (let x = cx - 8; x < cx + 5; x++) c.shade(x, gy - 4, -1);
  weather(c, cx - 8, cx + 5, gy - 8, gy + 2, FIELDSTONE, 4601, 0.85);
  mossOn(c, cx - 8, cx + 5, gy - 8, gy + 2, FIELDSTONE, 4602, 0.7);
  // The column: a foot flange, the round body, a collar, the domed head.
  const px = cx + 1;
  const py = gy - 1;
  drum(c, px, py, 3.2, 1.6, 3, 5, PUMP_RED);
  drum(c, px, py, 2.4, 1.2, 5, 16, PUMP_RED, null);
  drum(c, px, py, 3, 1.5, 15, 17, PUMP_RED, null, { bias: 1 });
  drum(c, px, py, 2.6, 1.3, 17, 20, PUMP_RED, null);
  c.part();
  c.ellipse(px, py - 20, 2.6, 1.8, PUMP_RED, { bias: 1 });
  c.part();
  c.px(px - 1, py - 22, PUMP_RED, sphere(-0.3, 0.6), { bias: 2 });
  c.px(px, py - 22, PUMP_RED, sphere(0.3, 0.6), { bias: 1 });
  // The spout: square, out to the west, turning down at the lip.
  box(c, px - 7, px - 1, py - 1, py + 1, 11, 13, PUMP_RED);
  box(c, px - 7, px - 5, py - 1, py + 1, 9, 11, PUMP_RED, { bias: -1 });
  c.part();
  c.px(px - 7, py - 9, BRASS, FACE, { bias: 2 });
  c.px(px - 6, py - 9, BRASS, FACE, { bias: 0 });
  // The handle: from a pivot on the head, up and out to the east, a curled grip.
  c.part();
  c.capsule(px + 1.5, py - 19, px + 7.5, py - 24, 0.9, 0.8, PUMP_RED);
  c.capsule(px + 7.5, py - 24, px + 9, py - 22, 0.9, 0.9, PUMP_RED);
  c.part();
  c.px(px + 1, py - 19, BRASS, FACE, { bias: 2 });
  // The pail on the slab, iron-banded staves, water in it.
  const bx = px - 6;
  const by = gy + 1;
  drum(c, bx, by, 2.8, 1.4, 3, 8, OAKW, null);
  for (let y = by - 9; y < by; y++) for (let x = Math.floor(bx - 3); x < bx + 3; x++) if (c.materialAt(x, y) === OAKW && Math.round(x - bx) % 2 === 0) c.shade(x, y, -1);
  for (const z of [4, 7]) for (let x = Math.floor(bx - 2.8); x < bx + 2.8; x++) {
    const t = (x + 0.5 - bx) / 2.8;
    c.px(x, Math.round(by - z + Math.sqrt(Math.max(0, 1 - t * t)) * 1.4), SOOT, cyl(t, -0.3), { bias: 3 });
  }
  c.part();
  c.ellipse(bx, by - 8, 2.8, 1.4, OAKW, { normal: () => TOP, bias: 1 });
  c.part();
  c.ellipse(bx, by - 7.8, 2, 0.9, WATER, { normal: () => TOP });
  // A little puddle where it splashed.
  c.part();
  c.ellipse(cx - 9, gy + 3, 2.4, 1, WATER, { normal: () => TOP, bias: -1 });
  tufts(c, cx, gy + 4, 7, 4603, 7);
  // The drip: a drop falling from the lip, then rings in the pail.
  const drop = f % 4;
  if (drop < 3) c.spark(px - 6.5, py - 8 + drop, AQUA, 0.8);
  else {
    c.spark(bx - 1, by - 8, GLINT, 0.6);
    c.spark(bx + 1, by - 8, GLINT, 0.4);
  }
  c.spark(cx - 10, gy + 3, GLINT, 0.25 + (f % 2) * 0.2);
}, 4, 5);

// ---------------------------------------------------------------- Bird feeder

const birdfeeder = art('birdfeeder', 6, 30, (c, g, f) => {
  // A bird feeder on a post: a tray with a lip, a glass hopper full of seed
  // between four corner posts, a little moss-green shingled roof, a blue tit
  // on the tray's edge and a sparrow pecking at the spilled seed below.
  const cx = g.cx;
  const gy = g.y1 - 6;
  // Seed spilled on the grass, and the sparrow at it.
  c.part();
  for (let k = 0; k < 9; k++) c.px(cx - 5 + hash2(k, 0, 4701) * 10, gy + 1 + hash2(k, 1, 4701) * 3, SEEDS, TOP, { bias: 3 + (k % 2) });
  box(c, cx - 1, cx + 1, gy - 1, gy + 1, 0, 18, OAKW);
  grain(c, cx - 1, cx + 1, gy - 19, gy + 1, 4702, false);
  // Braces under the tray.
  c.part();
  c.line(cx - 1, gy - 12, cx - 4, gy - 16, OAKW, () => FACE, { bias: 1 });
  c.line(cx, gy - 12, cx + 3, gy - 16, OAKW, () => FACE, { bias: -1 });
  // The tray and its lip.
  const z0 = 17;
  box(c, cx - 6, cx + 6, gy - 4, gy + 2, z0, z0 + 1, PALEW);
  // Back posts, hopper, front posts.
  for (const x of [cx - 5, cx + 4]) box(c, x, x + 1, gy - 3, gy - 2, z0 + 1, z0 + 9, PALEW, { bias: -1 });
  box(c, cx - 3, cx + 3, gy - 2, gy + 1, z0 + 1, z0 + 8, GLASS);
  // Seed showing through the glass, up to its last third.
  for (let y = gy + 1 - z0 - 9; y < gy + 1 - z0 - 1; y++) {
    for (let x = cx - 3; x < cx + 3; x++) {
      if (c.materialAt(x, y) !== GLASS) continue;
      if (y > gy + 1 - z0 - 6 && x > cx - 3 && x < cx + 2) c.px(x, y, SEEDS, FACE, { bias: 2 + ((x + y) & 1) * 2 });
    }
  }
  c.px(cx - 3, gy + 1 - z0 - 7, GLASS, FACE, { bias: 4 });
  // Seed heaped on the tray in front of the hopper.
  c.part();
  for (let x = cx - 5; x < cx + 5; x++) {
    c.px(x, gy + 1 - z0 - 1, SEEDS, TOP, { bias: 3 + (hash2(x, 0, 4703) > 0.5 ? 1 : 0) });
    if (Math.abs(x + 0.5 - cx) < 3) c.px(x, gy - z0 - 1, SEEDS, TOP, { bias: 4 });
  }
  box(c, cx - 6, cx + 6, gy + 1, gy + 2, z0 + 1, z0 + 2, PALEW);
  for (const x of [cx - 5, cx + 4]) box(c, x, x + 1, gy + 1, gy + 2, z0 + 1, z0 + 9, PALEW);
  // The roof: a gable end to us, a little heart cut in its pale board, moss-green shingles.
  const zE = z0 + 9;
  const zA = z0 + 15;
  const hw = 7.5;
  gableWall(c, cx - 5, cx + 5, gy + 2, zE, cx, hw, zE, zA, PALEW);
  for (const [x, y] of [[-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]) c.px(cx - 0.5 + x * 0.9, gy + 2 - zE - 4 + y, SOOT, FACE, { bias: 1 });
  gableRoof(c, cx, hw, gy - 5, gy + 3, zE, zA, PATINA, PALEW);
  // The blue tit on the tray's front lip.
  const tx = cx + 5;
  const ty = gy + 1 - z0 - 2;
  c.part();
  c.ellipse(tx, ty, 1.8, 1.4, PETAL_Y, { bias: 1 });
  c.px(tx + 2, ty, TIT_BLUE, FACE, { bias: 0 });
  c.px(tx + 3, ty + 1, TIT_BLUE, FACE, { bias: -1 });
  c.px(tx + 1, ty - 1, TIT_BLUE, FACE, { bias: 1 });
  c.part();
  c.ellipse(tx - 1, ty - 2.2, 1.4, 1.2, LINEN, { bias: 1 });
  c.px(tx - 1, ty - 3, TIT_BLUE, TOP, { bias: 2 });
  c.px(tx, ty - 3, TIT_BLUE, TOP, { bias: 1 });
  c.px(tx - 2, ty - 2, SOOT, FACE, { bias: 2 });
  c.px(tx - 3, ty - 2, SOOT, FACE, { bias: 0 });
  // The sparrow on the grass, head down to the seed.
  const sx = cx - 5;
  const sy = gy + 2;
  c.part();
  c.ellipse(sx, sy, 1.9, 1.3, SPARROW, { bias: 1 });
  c.px(sx + 2, sy - 1, SPARROW, FACE, { bias: -1 });
  c.px(sx + 3, sy - 2, SPARROW, FACE, { bias: -1 });
  c.part();
  c.ellipse(sx - 1.6, sy + 0.2, 1.1, 1, SPARROW, { bias: 2 });
  c.px(sx - 3, sy + 1, PETAL_Y, FACE, { bias: 0 });
  c.px(sx - 1, sy, LINEN, FACE, { bias: 1 });
  tufts(c, cx, gy + 2, 6, 4704, 6);
  posy(c, cx + 5, gy + 1, LAVENDER);
  // A seed glinting as the tit picks it.
  if (f % 4 === 1) c.spark(tx - 3, ty - 1, MOTE, 0.4);
}, 4, 3);

// ---------------------------------------------------------------- Picnic table

const picnic = art('picnic', 3, 20, (c, g) => {
  // A picnic table with its benches: a red gingham cloth over the top and
  // hanging at the front, a wicker basket with its lid up, a berry pie, a
  // jug of lemonade and two cups.
  const x0 = g.x0 + 2;
  const x1 = g.x1 - 2;
  const yb = g.y0 + 1;
  const yf = g.y1 - 2;
  // The back bench and its legs.
  for (const x of [x0 + 2, x1 - 4]) box(c, x, x + 2, yb + 1, yb + 2, 0, 6, DARKW);
  box(c, x0, x1, yb, yb + 3, 6, 7, OAKW, { bias: -1 });
  // The table's A-frame legs.
  for (const x of [x0 + 3, x1 - 5]) {
    c.part();
    c.line(x, yf - 4, x + 1, yb + 4 - 11, DARKW, () => FACE, { bias: 1 });
    c.line(x + 1, yf - 4, x + 1, yb + 4 - 11, DARKW, () => FACE, { bias: 0 });
  }
  // The top, its cloth, the drop of the cloth at the front.
  const tb = yb + 4;
  const tf = yf - 4;
  const zt = 11;
  box(c, x0 + 1, x1 - 1, tb, tf, zt - 1, zt, OAKW, { bias: -1 });
  box(c, x0 + 1, x1 - 1, tb, tf, zt, zt + 1, LINEN, { topBias: 0 });
  c.part();
  for (let x = x0 + 1; x < x1 - 1; x++) {
    const hem = 3 + ((x - x0) % 4 === 0 ? 0 : (x - x0) % 4 === 2 ? 1 : 0);
    for (let y = tf - zt; y < tf - zt + hem; y++) c.px(x, y, LINEN, FACE, { bias: (x === x0 + 1 ? 1 : 0) + (y === tf - zt + hem - 1 ? -1 : 0) });
  }
  // Gingham: red where both bands cross, pink where one does.
  const gx = (x: number) => Math.floor((x - x0) / 2) % 2 === 0;
  const gyb = (y: number) => Math.floor((y - tb) / 2) % 2 === 0;
  const ry0 = tb - zt - 2;
  const ry1 = tf - zt + 5;
  recolor(c, x0, x1, ry0, ry1, LINEN, COTTON_RED, (x, y) => gx(x) && gyb(y));
  recolor(c, x0, x1, ry0, ry1, LINEN, COTTON_PINK, (x, y) => gx(x) !== gyb(y));
  // The front bench and legs, in front of it all.
  box(c, x0, x1, yf - 2, yf + 1, 6, 7, OAKW);
  grain(c, x0, x1, yf - 2 - 7, yf + 1 - 6, 4801);
  for (const x of [x0 + 2, x1 - 4]) box(c, x, x + 2, yf, yf + 1, 0, 6, DARKW);
  // On the table: the basket (left), the pie (middle), the jug and cups (right).
  const ty = (yy: number) => yy - zt - 1;
  const bx = x0 + 7;
  const by = tb + 3;
  // The basket: woven sides, a closed lid with a cloth peeping out, the bent-willow handle.
  box(c, bx - 3, bx + 3, by - 2, by + 1, zt + 1, zt + 5, HAY);
  for (let y = ty(by) - 6; y < ty(by) + 2; y++) for (let x = bx - 3; x < bx + 3; x++) if (c.materialAt(x, y) === HAY && (x + y) % 2 === 0) c.shade(x, y, -1);
  box(c, bx - 3, bx + 3, by - 2, by + 1, zt + 5, zt + 6, HAY, { bias: -1, topBias: 1 });
  c.part();
  c.px(bx + 2, ty(by + 1) - 4, COTTON_RED, FACE, { bias: 1 });
  c.px(bx + 2, ty(by + 1) - 3, COTTON_RED, FACE, { bias: 0 });
  c.part();
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI;
    c.px(bx - 0.5 - Math.cos(a) * 2.6, ty(by) - 7 - Math.sin(a) * 3.5, PALEW, TOP, { bias: k < 6 ? 2 : 1 });
  }
  // The pie on its plate: a golden crust, a lattice over the berries.
  const pxc = x0 + 15.5;
  const pyc = tb + 3.5;
  c.part();
  c.ellipse(pxc, ty(pyc) + 0.5, 3.8, 1.9, LINEN, { normal: () => TOP, bias: 1 });
  drum(c, pxc, ty(pyc) + zt + 1.3, 3, 1.5, zt + 1, zt + 2.5, PIE, PIE);
  for (let y = Math.floor(ty(pyc) - 3); y < ty(pyc) + 1; y++) for (let x = Math.floor(pxc - 3); x < pxc + 3; x++) {
    if (c.materialAt(x, y) !== PIE) continue;
    const d = Math.hypot((x + 0.5 - pxc) / 2.1, (y + 0.5 - (ty(pyc) - 1.2)) / 1);
    if (d < 1 && (x + y) % 2 === 0) c.px(x, y, BERRY, TOP, { bias: 1 });
  }
  // The lemonade jug and two cups.
  const jx = x1 - 7;
  const jy = tb + 2.5;
  drum(c, jx, ty(jy) + zt + 1, 1.8, 1, zt + 1, zt + 7, GLASS, PETAL_Y);
  for (let y = ty(jy) - 6; y < ty(jy) - 1; y++) for (let x = jx - 2; x < jx + 2; x++) if (c.materialAt(x, y) === GLASS && y > ty(jy) - 4) c.px(x, y, PETAL_Y, FACE, { bias: x < jx ? 2 : 1 });
  c.part();
  c.px(jx + 2, ty(jy) - 5, GLASS, FACE, { bias: 2 });
  c.px(jx + 2, ty(jy) - 4, GLASS, FACE, { bias: 1 });
  c.px(jx - 2, ty(jy) - 6, GLASS, FACE, { bias: 3 });
  for (const [x, y] of [[x1 - 11, tb + 5.5], [x1 - 4, tb + 5]]) {
    drum(c, x, ty(y) + zt + 1, 1.1, 0.6, zt + 1, zt + 3, LINEN, PETAL_Y);
    c.shade(x - 1, ty(y) - 1, 1);
  }
  tufts(c, g.cx, g.y1, 14, 4802, 7);
});

// ---------------------------------------------------------------- Hammock

const hammock = art('hammock', 3, 26, (c, g) => {
  // A striped cloth hammock slung between two posts: ropes fanning to
  // spreader bars, the cloth sagging into a deep curve, a fringe along its
  // edge, a pillow at one end and a folded blanket at the other.
  const yc = g.cy + 3;
  const xl = g.x0 + 1;
  const xr = g.x1 - 3;
  const zp = 21;
  for (const x of [xl, xr]) {
    box(c, x, x + 2, yc - 1, yc + 1, 0, zp, OAKW);
    grain(c, x, x + 2, yc + 1 - zp, yc + 1, 4901 + x, false);
    box(c, x - 1, x + 3, yc - 2, yc + 2, 0, 2, OAKW, { bias: -1 });
    // A ring at the top for the rope.
    c.part();
    c.px(x + (x === xl ? 2 : -1), yc - zp + 3, SOOT, FACE, { bias: 3 });
  }
  const sl = xl + 5;
  const sr = xr - 3;
  const zs = 14;
  const sag = 5;
  // A soft curve, flatter along its bottom than a plain arc.
  const dip = (x: number) => Math.pow(Math.sin(Math.max(0, Math.min(1, (x + 0.5 - sl) / (sr - sl))) * Math.PI), 0.6);
  const zAt = (x: number) => zs - dip(x) * sag;
  // The ropes from the rings to the bars (the far ones first).
  c.part();
  for (const [px, bx] of [[xl + 2, sl], [xr - 1, sr]] as const) {
    for (const off of [-2, 0, 2]) c.line(px, yc - zp + 3, bx, yc - zs + off - 1, HAY, () => FACE, { bias: off === 0 ? 1 : 0 });
  }
  // The cloth: its inside showing from the far edge to the near one, the belly under it.
  const yN = yc - 3;
  const yS = yc + 3;
  c.part();
  for (let x = sl; x < sr; x++) {
    const z = zAt(x);
    const deep = dip(x);
    const top = Math.round(yN - z);
    const lip = Math.round(yS - z - 1 - deep * 1.5);
    const belly = Math.round(yS - z + 1 + deep * 2);
    for (let y = top; y <= belly; y++) {
      const inside = y <= lip;
      const u = inside ? (y - top) / Math.max(1, lip - top) : 1;
      c.px(x, y, LINEN, inside ? n3(0, 0.6 - u * 0.9, 0.8) : n3(0, -0.7, 0.7), { bias: inside ? (y === top ? 1 : 0) : y === lip + 1 ? 1 : -1 });
    }
  }
  recolor(c, sl, sr, 0, c.h, LINEN, HAMMOCK_A, (x) => Math.floor((x - sl) / 3) % 3 === 0);
  recolor(c, sl, sr, 0, c.h, LINEN, COTTON_PINK, (x) => Math.floor((x - sl) / 3) % 3 === 2);
  // The fringe hanging from the near edge.
  c.part();
  for (let x = sl + 1; x < sr - 1; x += 2) {
    const deep = dip(x);
    const y = Math.round(yS - zAt(x) + 2 + deep * 2);
    c.px(x, y, LINEN, FACE, { bias: 0 });
    if (x % 4 === 1) c.px(x, y + 1, LINEN, FACE, { bias: -1 });
  }
  // Spreader bars.
  for (const x of [sl - 1, sr]) box(c, x, x + 1, yN - 1, yS + 1, zs - 1, zs, PALEW);
  // The pillow at the west end, the blanket folded at the east.
  c.part();
  const pX = sl + 5;
  c.ellipse(pX, yc - zAt(pX) - 2.5, 2.6, 2, LINEN, { bias: 1 });
  c.shade(pX, yc - zAt(pX) - 2.5, -1);
  c.shade(pX + 1, yc - zAt(pX) - 1.5, -1);
  const bX = sr - 6;
  box(c, bX - 3, bX + 3, Math.round(yc - 2), Math.round(yc + 1), Math.round(zAt(bX)) - 1, Math.round(zAt(bX)) + 1, SKY_PAINT);
  for (let y = 0; y < c.h; y++) if (c.materialAt(bX, y) === SKY_PAINT) c.shade(bX, y, -1);
  tufts(c, xl + 1, yc + 2, 4, 4902, 4);
  tufts(c, xr + 1, yc + 2, 4, 4903, 4);
  tufts(c, g.cx, yc + 3, 6, 4904, 5);
});

// ---------------------------------------------------------------- Bistro set

/** A curly bistro chair, its back to one side (`s` = -1 west, 1 east), turned to the table. */
function bistroChair(c: PixelCanvas, x: number, gy: number, s: number): void {
  // Legs: four thin bowed rods.
  c.part();
  for (const [dx, dy] of [[-2, -1], [2, -1]]) c.line(x + dx, gy + dy - 7, x + dx * 1.4, gy + dy, IRON_CREAM, () => FACE, { bias: 0 });
  // The back: an oval hoop with a scroll in it, behind the seat.
  const bx = x + s * 1.5;
  const by = gy - 13;
  c.part();
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    c.px(bx + Math.cos(a) * 2.6, by + Math.sin(a) * 4, IRON_CREAM, n3(Math.cos(a) * 0.5, -Math.sin(a) * 0.5, 0.7), { bias: Math.cos(a) < 0 ? 2 : 0 });
  }
  c.px(bx - 0.5, by - 1, IRON_CREAM, FACE, { bias: 1 });
  c.px(bx + 0.5, by, IRON_CREAM, FACE, { bias: 1 });
  c.px(bx - 0.5, by + 1, IRON_CREAM, FACE, { bias: 1 });
  // The round seat, a cushion on it.
  c.part();
  c.ellipse(x, gy - 7.5, 3.4, 1.8, IRON_CREAM, { bias: 0 });
  c.part();
  c.ellipse(x, gy - 8.2, 2.6, 1.3, COTTON_PINK, { bias: 1 });
  // The front legs.
  c.part();
  for (const dx of [-2.5, 2.5]) c.line(x + dx, gy - 6, x + dx * 1.3, gy + 1, IRON_CREAM, () => FACE, { bias: dx < 0 ? 1 : -1 });
}

const bistro = art('bistro', 3, 24, (c, g) => {
  // A wrought-iron bistro set in cream paint: a round table with a tiled
  // top on a curling tripod foot, a chair either side with a cushion, a
  // spotted teapot, two cups and a bud vase with a rose.
  const cx = g.cx;
  const gy = g.cy + 4;
  bistroChair(c, cx - 11, gy - 1, -1);
  bistroChair(c, cx + 11, gy - 1, 1);
  // The tripod foot, the stem.
  c.part();
  for (const s of [-1, 1]) {
    c.line(cx, gy - 2, cx + s * 4, gy, IRON_CREAM, () => FACE, { bias: s < 0 ? 1 : -1 });
    c.px(cx + s * 4, gy - 1, IRON_CREAM, FACE, { bias: 1 });
  }
  c.line(cx, gy - 1, cx, gy + 1, IRON_CREAM, () => FACE, { bias: 0 });
  drum(c, cx, gy - 1, 0.9, 0.5, 1, 11, IRON_CREAM, null);
  // The top: an iron rim round a mosaic of pale tiles.
  const zt = 12;
  drum(c, cx, gy - 1, 6.6, 3.6, zt - 1, zt, IRON_CREAM, IRON_CREAM);
  c.part();
  c.ellipse(cx, gy - 1 - zt, 5.4, 2.8, LINEN, { normal: () => TOP });
  for (let y = gy - zt - 5; y < gy - zt + 3; y++) for (let x = cx - 6; x < cx + 6; x++) {
    if (c.materialAt(x, y) !== LINEN) continue;
    // Blue tiles set in a loose ring, the rest pale.
    if ((x + y * 3) % 7 === 0) c.px(x, y, SKY_PAINT, TOP, { bias: 3 });
  }
  const ty = gy - 1 - zt;
  // The teapot: a round white body with blue spots, its lid and knob, spout and handle.
  const tx = cx - 2;
  c.part();
  c.capsule(tx + 2, ty - 2, tx + 3.6, ty - 4, 0.6, 0.5, LINEN);
  c.part();
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * 0.5 + (k / 7) * Math.PI;
    c.px(tx - 2.2 + Math.cos(a) * 1.3, ty - 3 + Math.sin(a) * 1.3, LINEN, FACE, { bias: 0 });
  }
  c.part();
  c.ellipse(tx, ty - 2.6, 2.2, 2, LINEN, { bias: 1 });
  for (const [x, y] of [[-1, -2], [1, -3], [0, -1], [1, -1]]) c.px(tx + x, ty + y, DENIM, sphere(0, 0), { bias: 3 });
  c.part();
  c.ellipse(tx, ty - 4.6, 1.2, 0.6, LINEN, { bias: 2 });
  c.px(tx, ty - 5.5, DENIM, TOP, { bias: 3 });
  // A cup on a saucer.
  c.part();
  c.ellipse(cx + 2.5, ty + 1, 1.8, 0.8, LINEN, { normal: () => TOP, bias: 1 });
  drum(c, cx + 2.5, ty + 1, 1, 0.55, 0, 1.6, LINEN, OAKW);
  // The bud vase and its rose.
  const vx = cx + 3;
  const vy = ty - 1;
  drum(c, vx, vy, 0.9, 0.5, 0, 3, GLASS, null);
  c.part();
  c.line(vx, vy - 3, vx, vy - 6, STEM);
  c.px(vx + 1, vy - 5, LEAF, FACE, { bias: 2 });
  rose(c, vx, vy - 7.5, ROSE);
  tufts(c, g.cx, g.y1, 14, 5001, 8);
});

// ---------------------------------------------------------------- Log pile

/**
 * A log lying north-south, its sawn end facing us at (x, yEnd), `len` px of
 * it running back. A split one lies flat side up: pale riven wood along its
 * top, its end a half round.
 */
function log(c: PixelCanvas, x: number, yEnd: number, r: number, len: number, seed: number, split: boolean): void {
  const flat = -r * 0.25;
  // The body: bark along its top going back, or the split face between two strips of bark.
  c.part();
  for (let y = Math.floor(yEnd - len - r); y <= yEnd; y++) {
    for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
      const dx = xx + 0.5 - x;
      const ay = Math.max(yEnd - len, Math.min(yEnd, y + 0.5));
      const dy = y + 0.5 - ay;
      if (dx * dx + dy * dy > r * r) continue;
      if (split && Math.abs(dx) < r * 0.7) {
        if (dy < -r * 0.6) continue;
        c.px(xx, y + 1, LOG_END, n3(0, 0.6, 0.8), { bias: (hash2(xx, Math.floor(y / 2), seed) > 0.75 ? -1 : 0) + (dx < 0 ? 1 : 0) });
        continue;
      }
      const ridge = hash2(Math.round(dx * 1.4), Math.floor((y - yEnd) / 3), seed) > 0.7 ? -1 : 0;
      c.px(xx, y, BARK, sphere(dx / r, dy / r, 1.1), { bias: ridge });
    }
  }
  // The sawn end: a ring of bark, growth rings, a dark heart and a check.
  c.part();
  for (let y = Math.floor(yEnd - r); y <= yEnd + r; y++) {
    for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
      const dx = xx + 0.5 - x;
      const dy = y + 0.5 - yEnd;
      const d = Math.hypot(dx, dy);
      if (d > r || (split && dy < flat)) continue;
      if (d > r - 0.9) c.px(xx, y, BARK, FACE, { bias: 1 });
      else {
        const ring = Math.floor(d * 1.3) % 2 === 1 ? -1 : 0;
        const check = Math.abs(dx - dy * 0.3) < 0.5 && dy > 0 && d > 0.8 ? -1 : 0;
        c.px(xx, y, LOG_END, FACE, { bias: 1 + ring + check + (dx < 0 && dy < 0 ? 1 : 0) + (d < 0.8 ? -2 : 0) });
      }
    }
  }
}

const logpile = art('logpile', 3, 18, (c, g) => {
  // Firewood stacked in a little pyramid, sawn ends to us with their rings
  // showing, some round, some split; a chopping block beside it with the
  // axe left in it and chips scattered round.
  const x0 = g.x0 + 1;
  const yf = g.y1 - 3;
  const depth = 6;
  const r = 3;
  const step = 6;
  const courses = [
    { n: 4, off: 0, z: r },
    { n: 3, off: step / 2, z: r + 5 },
    { n: 2, off: step, z: r + 10 },
  ];
  // Bottom course first: each one up rests on the logs below it, further back.
  for (const [row, cr] of courses.entries()) {
    for (let i = 0; i < cr.n; i++) {
      const x = x0 + r + cr.off + i * step;
      const split = hash2(i, row, 5101) > 0.6;
      const rr = r - (hash2(i, row, 5103) > 0.6 ? 0.4 : 0);
      log(c, x, yf - cr.z - row, rr, depth, 5104 + i + row * 7, split);
    }
  }
  // The chopping block: a round of trunk, its top ringed, the axe sunk in it.
  const bx = g.x1 - 4;
  const by = yf + 1;
  drum(c, bx, by, 3.6, 1.9, 0, 6, BARK, LOG_END);
  c.part();
  for (let y = by - 9; y < by - 4; y++) for (let x = bx - 4; x < bx + 4; x++) {
    if (c.materialAt(x, y) !== LOG_END) continue;
    const d = Math.hypot((x + 0.5 - bx) / 3.6, (y + 0.5 - (by - 6)) / 1.9);
    if (Math.floor(d * 3.5) % 2 === 1) c.shade(x, y, -1);
  }
  // The axe: its head sunk in the top, the haft rising to the north-east.
  c.part();
  c.line(bx, by - 7, bx + 4, by - 15, PALEW, () => n3(-0.3, 0.3, 0.9), { bias: 1 });
  c.line(bx + 1, by - 7, bx + 5, by - 15, PALEW, () => FACE, { bias: -1 });
  c.part();
  for (const [x, y, b] of [[-2, -7, 2], [-1, -7, 1], [0, -7, 1], [1, -7, 0], [-2, -6, 1], [-1, -6, 0], [0, -6, 0], [-1, -8, 2], [0, -8, 1]] as const) c.px(bx + x, by + y, STEEL_HEAD, FACE, { bias: b });
  // Chips on the grass.
  c.part();
  for (let i = 0; i < 7; i++) c.px(bx - 6 + hash2(i, 0, 5105) * 9, by + 1 + hash2(i, 1, 5105) * 2.5, LOG_END, TOP, { bias: 1 + (i % 2) });
  tufts(c, g.cx - 4, g.y1, 12, 5106, 7);
});

// ---------------------------------------------------------------- Flower cart

const flowercart = art('flowercart', 3, 26, (c, g) => {
  // A florist's hand cart: a sky-blue bed of planks on one big spoked wheel
  // and a prop leg, handles reaching west, loaded with potted flowers,
  // geraniums, daisies, lavender, marigolds and roses, ivy over the side.
  const xa = g.x0 + 8;
  const xb = g.x1 - 2;
  const yN = g.y0 + 4;
  const yS = g.y1 - 4;
  const zb = 8;
  const zw = 12;
  const wx = Math.round((xa + xb) / 2) + 2;
  // The far wheel, mostly hidden.
  wheel(c, wx, yN - 6, 7, 6, OAKW, PALEW, -2);
  // The far handle.
  c.part();
  c.capsule(xa + 1, yN + 1 - zb - 1, g.x0 + 1, yN + 1 - zb + 3, 0.8, 0.8, DARKW);
  // The bed: floor, back and end walls.
  box(c, xa, xb, yN, yS, zb - 1, zb, PALEW, { bias: -1 });
  box(c, xa, xb, yN, yN + 1, zb, zw, SKY_PAINT, { bias: -1 });
  box(c, xa, xa + 1, yN, yS, zb, zw, SKY_PAINT);
  box(c, xb - 1, xb, yN, yS, zb, zw, SKY_PAINT, { bias: -1 });
  // The pots and their flowers, back row then front, a colour to a pot.
  const R = rng(5201);
  const pots = [
    { x: xa + 4, y: yN + 3, m: LAVENDER },
    { x: xa + 11, y: yN + 3, m: ROSE },
    { x: xa + 18, y: yN + 3, m: LINEN },
    { x: xa + 7.5, y: yS - 3, m: TULIP_R },
    { x: xa + 14.5, y: yS - 3, m: TULIP_Y },
    { x: xa + 21, y: yS - 3, m: TULIP_P },
  ];
  for (const p of pots) {
    pot(c, p.x, p.y - zb, 2.6, 5);
    const top = p.y - zb - 5;
    // A mound of leaves, then the flowers on it.
    c.part();
    for (let j = 0; j < 5; j++) c.ellipse(p.x + (R() - 0.5) * 4, top - 1 - R() * 2, 1.7, 1.2, R() < 0.5 ? LEAF : LEAF_DARK, { flatten: 0.7 });
    if (p.m === LAVENDER) {
      c.part();
      for (let j = -2; j <= 2; j++) {
        c.line(p.x + j, top - 1, p.x + j * 1.4, top - 4, SAGE_STEM);
        for (let h = 0; h < 3; h++) c.px(p.x + j * 1.4 + j * 0.2 * h, top - 4 - h - (j & 1), LAVENDER, sphere(-0.3, 0.4), { bias: 2 - (h >> 1) });
      }
    } else if (p.m === ROSE) {
      rose(c, p.x - 1.2, top - 3, ROSE);
      rose(c, p.x + 1.6, top - 2.4, ROSE);
      rose(c, p.x + 0.3, top - 4.6, TULIP_P);
    } else {
      const eye = p.m === TULIP_Y ? OAKW : PETAL_Y;
      for (const [dx, dy] of [[-1.5, -2], [1.5, -2.5], [0, -4.5]]) posy(c, Math.round(p.x + dx), Math.round(top + dy), p.m, eye);
    }
  }
  // The front wall: planks, a white rail along its top.
  box(c, xa, xb, yS - 1, yS, zb - 2, zw, SKY_PAINT);
  for (let x = xa; x < xb; x++) {
    c.shade(x, yS - 1 - zw + 4, -1);
    c.shade(x, yS - 1 - zw + 8, -1);
  }
  box(c, xa - 1, xb + 1, yS - 1, yS, zw, zw + 1, CREAM);
  // Ivy trailing over it.
  c.part();
  for (let i = 0; i < 5; i++) {
    const x = xa + 3 + i * 4 + (i % 2);
    for (let j = 0; j < 2 + (i % 3); j++) c.px(x + (j % 2), yS - zw + j, LEAF_DARK, sphere(0, 0), { bias: 2 - (j % 2) });
  }
  // The prop leg at the west end, and the near handle.
  box(c, xa + 1, xa + 2, yS - 1, yS, 0, zb - 1, DARKW);
  c.part();
  c.capsule(xa + 1, yS - zb - 2, g.x0 + 1, yS - zb + 2, 0.9, 0.9, OAKW);
  c.capsule(g.x0 + 1.5, yS - zb + 2, g.x0 - 1.5, yS - zb + 2.5, 1.1, 1.1, DARKW);
  // The big near wheel.
  wheel(c, wx, yS + 1 - 7, 7, 6);
  tufts(c, g.cx, g.y1, 14, 5202, 8);
});

export const GARDEN_ART: Record<string, PropArt> = { sundial, angel, windmill, chimes, pergola, pump, birdfeeder, picnic, hammock, bistro, logpile, flowercart };

/** The turning ones' side (facing east; west is it mirrored) and back views: none of these turn. */
export const GARDEN_TURNS: Record<string, { side: PropArt; back: PropArt }> = {};
