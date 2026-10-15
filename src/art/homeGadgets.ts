// The Home's gadgets: a juice press on its kitchen cabinet and a television
// (see world/homeParts.ts `juicer` and `tv`, and heaven/pastimes: E at the
// press opens its juices, E at the television sits the wanderer down before
// it to watch). Drawn as homeProps.ts draws things, from the game's high
// three-quarter view, lit from the upper left. The television is drawn off:
// while someone watches, the world lays the screen's moving light over it
// (TV_SCREEN says where).

import { type Material, type PixelCanvas } from './pixel';
import { BRASS, DARKW, FACE, GLASS, LEAF, LEAF_DARK, LINEN, PALEW, SOIL, STEEL, TERRA, TOP, art, box, drum, grain, mat, n3, type PropArt } from './homeProps';

// ---------------------------------------------------------------- Materials

// The kitchen's soft sage paint, as on the counter and the sink.
const SAGE_PAINT = mat('#0e1610', '#223428', '#34493a', '#486050', '#5e7866', '#76907c', '#90a894', '#acc2ac', '#c8d8c4');
const WALNUT = mat('#100604', '#200e08', '#30180c', '#422212', '#542e18', '#683a20', '#7e4a2a', '#965c36');
const CREAM: Material = { ...mat('#2a241c', '#62584a', '#887c6a', '#aea08a', '#ccbea6', '#e2d6be', '#f2e8d4', '#fcf6e8'), shine: true };
// The screen off: deep green-grey glass with the room's light lying on it.
const TUBE: Material = { ...mat('#040806', '#0a120e', '#121e18', '#1a2a22', '#24382e', '#30483c', '#3e5a4c', '#567262'), shine: true, noAO: true };
const GRILLE = mat('#140e08', '#2a1e12', '#3e2c1a', '#544024', '#6a5430', '#806a40');
const ORANGE: Material = { ...mat('#2a0e02', '#5e2404', '#94400a', '#c86014', '#ec8222', '#fca23c', '#ffc26a', '#ffdca0'), shine: true };
const PITH = mat('#5a4a30', '#c8b488', '#ecdcb0', '#fcf2d4', '#fffaec');
const JUICE: Material = { ...mat('#3a1604', '#7a3008', '#b4500e', '#e0701a', '#f8902e', '#ffb050', '#ffd08a'), shine: true, noAO: true };
const DOILY = mat('#4a4a52', '#b8b6bc', '#dcdad8', '#f2f0ea', '#fcfaf4');

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

function knob(c: PixelCanvas, x: number, y: number, m: Material = BRASS): void {
  c.part();
  c.px(x, y, m, FACE, { bias: 2 });
  c.shade(x, y + 1, -2);
}

// ---------------------------------------------------------------- Juice press

const juicer = art('juicer', 1, 27, (c, g) => {
  // A little sage cabinet to match the kitchen counter, its door and drawer;
  // on its butcher-block top a steel citrus press with an orange half on
  // it, another half waiting, and a glass jug of fresh juice with a glass
  // poured beside it.
  const x0 = g.x0 + 1;
  const x1 = g.x1 - 1;
  const y0 = g.y0 + 5;
  const gy = g.y1 - 2;
  const H = 13;
  box(c, x0, x1, y0, gy, 0, H, SAGE_PAINT);
  for (let x = x0; x < x1; x++) {
    c.shade(x, gy - 1, -3);
    c.shade(x, gy - 2, -2);
  }
  groove(c, x0 + 1, x1 - 1, gy - 12, gy - 10);
  groove(c, x0 + 1, x1 - 1, gy - 9, gy - 3);
  groove(c, x0 + 2, x1 - 2, gy - 8, gy - 4);
  knob(c, Math.floor((x0 + x1) / 2), gy - 11);
  knob(c, x1 - 4, gy - 6);
  // The worktop.
  box(c, x0 - 1, x1 + 1, y0 - 1, gy + 1, H, H + 2, PALEW, { topBias: 1 });
  const top = (y: number) => y - (H + 2);
  grain(c, x0 - 1, x1 + 1, top(y0 - 1), top(gy + 1), 9101);
  // The press, back left: a steel base, its bowl brimming with juice, and
  // an orange half pressed rind-up on the reamer; a spout at the front, dripping.
  const px = x0 + 4;
  const pgy = y0 + 3;
  drum(c, px, pgy, 3.2, 1.6, H + 2, H + 5, STEEL, STEEL, { topBias: 1 });
  c.part();
  c.ellipse(px, top(pgy) - 3.5, 3.9, 1.8, STEEL, { normal: (_x, _y, dx, dy) => n3(dx * 0.4, 0.5 - dy * 0.4, 0.8), bias: 1 });
  c.part();
  c.ellipse(px, top(pgy) - 3.5, 2.9, 1.1, JUICE, { normal: () => TOP, bias: 1 });
  c.part();
  c.ellipse(px, top(pgy) - 5, 2.3, 1.9, ORANGE, { flatten: 0.8 });
  c.px(px - 1, top(pgy) - 6, ORANGE, TOP, { bias: 2 });
  c.part();
  c.px(px + 3, top(pgy) - 2, STEEL, FACE, { bias: 1 });
  c.px(px + 3, top(pgy) - 1, JUICE, FACE, { bias: 1 });
  // Half an orange in front of the press, cut face up.
  c.part();
  const ox = x0 + 3;
  const oy = top(gy - 2) - 1;
  c.ellipse(ox, oy, 2.2, 1.6, ORANGE, { flatten: 0.8 });
  c.part();
  c.ellipse(ox, oy - 1, 1.8, 0.9, PITH, { normal: () => TOP, bias: 1 });
  c.px(ox, oy - 1, ORANGE, TOP, { bias: 1 });
  // The jug, back right: clear glass, the juice inside, a handle and a lip.
  const jx = x1 - 3.5;
  const jgy = y0 + 4;
  c.part();
  for (let y = top(jgy) - 9; y <= top(jgy); y++) {
    const u = (y - (top(jgy) - 9)) / 9;
    const w = 2.2 + Math.sin(u * Math.PI) * 0.6;
    for (let x = Math.floor(jx - w); x <= jx + w; x++) {
      const t = (x + 0.5 - jx) / w;
      const inside = u > 0.3 && Math.abs(t) < 0.75;
      c.px(x, y, inside ? JUICE : GLASS, n3(t * 0.7, -0.15, 0.7), { bias: inside ? (t < -0.2 ? 2 : 0) : t < 0 ? 1 : -1 });
    }
  }
  c.part();
  c.ellipse(jx, top(jgy) - 9, 2.2, 0.8, GLASS, { normal: () => TOP, bias: 2 });
  c.px(jx - 2.5, top(jgy) - 10, GLASS, TOP, { bias: 2 });
  c.part();
  for (const [dx, dy] of [[3, -8], [3.8, -7], [3.8, -6], [3.8, -5], [3, -4]] as const) c.px(jx + dx, top(jgy) + dy, GLASS, FACE, { bias: 1 });
  c.spark(jx - 1, top(jgy) - 6, [255, 255, 255], 0.25);
  // A glass poured, at the front edge.
  const gx = x1 - 2;
  const ggy = gy - 1;
  c.part();
  for (let y = top(ggy) - 5; y <= top(ggy); y++) {
    for (let x = gx - 1; x <= gx + 1; x++) {
      const inside = y > top(ggy) - 4 && x === gx;
      c.px(x, y, inside ? JUICE : GLASS, n3((x - gx) * 0.6, -0.15, 0.75), { bias: inside ? 1 : x < gx ? 1 : -1 });
    }
  }
  c.px(gx, top(ggy) - 4, JUICE, TOP, { bias: 2 });
}, 1);

// ---------------------------------------------------------------- Television

/** The television's footprint pad and how far it rises over its footprint, px. */
const TV_PAD = 1;
const TV_UP = 34;
/** Its cabinet: inset from the footprint's back, standing on legs this tall, to this height. */
const TV_BACK = 6;
const TV_LEGS = 5;
const TV_H = 24;
/** The glass, in the canvas: columns and rows. */
const GLASS_X0 = TV_PAD + 5;
const GLASS_X1 = TV_PAD + 20;
const GLASS_Y0 = TV_UP + 16 - 2 - TV_H + 4;
const GLASS_Y1 = TV_UP + 16 - 2 - TV_LEGS - 4;

/** Where the screen's glass is, from the footprint's top-left corner, px (for the world's light over it while it plays). */
export const TV_SCREEN = { x: GLASS_X0 - TV_PAD, y: GLASS_Y0 - TV_UP, w: GLASS_X1 - GLASS_X0, h: GLASS_Y1 - GLASS_Y0 + 1 };

const tv = art('tv', TV_PAD, TV_UP, (c, g) => {
  // A walnut console set on four splayed legs: a cream-rimmed, round-cornered
  // screen with the room's light lying across its glass, a cloth speaker
  // grille with two brass dials, rabbit-ear aerials, and on top a lace doily
  // with a little potted fern.
  const x0 = g.x0 + 1;
  const x1 = g.x1 - 1;
  const y0 = g.y0 + TV_BACK;
  const gy = g.y1 - 2;
  // The aerials, behind everything: two thin brass rods in a V with ball tips.
  const ax = x1 - 9;
  const atop = gy - TV_H - (gy - y0) + 1;
  c.part();
  c.line(ax, atop, ax - 6, atop - 10, BRASS, () => n3(-0.5, 0, 0.85), { bias: 1 });
  c.line(ax + 1, atop, ax + 5, atop - 11, BRASS, () => n3(0.5, 0, 0.85), { bias: 0 });
  c.px(ax - 6, atop - 11, BRASS, FACE, { bias: 2 });
  c.px(ax + 5, atop - 12, BRASS, FACE, { bias: 2 });
  // The legs, tapering and splayed out at the front corners (the back two peek from behind).
  c.part();
  for (const [x, dx] of [[x0 + 2, -1], [x1 - 3, 1]] as const) {
    c.line(x, gy - TV_LEGS, x + dx, gy, DARKW, () => FACE, { bias: 1 });
  }
  for (const [x, dx] of [[x0 + 3, -1], [x1 - 4, 1]] as const) c.line(x, y0 + 2 - TV_LEGS, x + dx, y0 + 2, DARKW, () => FACE, { bias: -1 });
  // The cabinet.
  box(c, x0, x1, y0, gy, TV_LEGS, TV_H, WALNUT, { topBias: 1 });
  grain(c, x0, x1, gy - TV_H - (gy - y0), gy - TV_H, 9201);
  const fTop = gy - TV_H;
  const fBot = gy - TV_LEGS - 1;
  // A darker plinth band along the cabinet's foot.
  for (let x = x0; x < x1; x++) {
    c.shade(x, fBot, -2);
    c.shade(x, fBot - 1, -1);
  }
  // The screen's cream bezel, round-cornered, standing a little proud.
  c.part();
  const bx0 = GLASS_X0 - 2;
  const bx1 = GLASS_X1 + 2;
  const by0 = GLASS_Y0 - 2;
  const by1 = GLASS_Y1 + 2;
  for (let y = by0; y <= by1; y++) {
    const corner = y === by0 || y === by1 ? 1 : 0;
    for (let x = bx0 + corner; x < bx1 - corner; x++) c.px(x, y, CREAM, FACE, { bias: (y === by0 ? 2 : y === by1 ? -2 : 0) + (x === bx0 + corner ? 1 : x === bx1 - corner - 1 ? -1 : 0) });
  }
  // The glass: a little bulged, round at the corners, the window's light lying across it in two pale bands.
  c.part();
  const cx = (GLASS_X0 + GLASS_X1) / 2;
  const cy = (GLASS_Y0 + GLASS_Y1) / 2;
  for (let y = GLASS_Y0; y <= GLASS_Y1; y++) {
    const corner = y === GLASS_Y0 || y === GLASS_Y1 ? 1 : 0;
    for (let x = GLASS_X0 + corner; x < GLASS_X1 - corner; x++) {
      const dx = (x + 0.5 - cx) / ((GLASS_X1 - GLASS_X0) / 2);
      const dy = (y + 0.5 - cy) / ((GLASS_Y1 - GLASS_Y0) / 2);
      const band = x - GLASS_X0 + (y - GLASS_Y0) * 1.4;
      const sheen = (band > 2 && band < 4) || (band > 6 && band < 7);
      c.px(x, y, TUBE, n3(dx * 0.35, -dy * 0.35, 0.9), { bias: (sheen ? 2 : 0) + (dy > 0.6 ? -1 : 0) });
    }
  }
  // The speaker grille on the right: woven cloth in fine ribs, two brass dials under it.
  c.part();
  const sx0 = GLASS_X1 + 4;
  const sx1 = x1 - 2;
  for (let y = fTop + 3; y <= fTop + 10; y++) for (let x = sx0; x < sx1; x++) c.px(x, y, GRILLE, FACE, { bias: y % 2 ? -1 : 1 });
  groove(c, sx0, sx1, fTop + 3, fTop + 10);
  for (const dy of [13, 16]) {
    c.part();
    c.ellipse((sx0 + sx1) / 2, fTop + dy, 1.4, 1.2, BRASS);
    c.px((sx0 + sx1) / 2, fTop + dy - 1, DARKW, FACE, { bias: 0 });
  }
  // On top: a lace doily, a small terracotta pot with a fern.
  const top = (y: number) => y - TV_H;
  c.part();
  const dx = x0 + 7;
  const dyy = top(Math.round((y0 + gy) / 2));
  c.ellipse(dx, dyy, 4.2, 1.8, DOILY, { normal: () => TOP, bias: 1 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    c.shade(dx + Math.cos(a) * 3.4, dyy + Math.sin(a) * 1.3, -1);
  }
  drum(c, dx, Math.round((y0 + gy) / 2) - 0.5, 1.8, 1, TV_H, TV_H + 4, TERRA, SOIL);
  c.part();
  for (const [lx, ly, dark] of [[-2, -6, true], [2, -6, true], [-1, -8, false], [1, -8, false], [0, -9, false], [-3, -5, true], [3, -5, true]] as const) {
    c.ellipse(dx + lx, dyy + ly, 1.1, 0.8, dark ? LEAF_DARK : LEAF, { bias: 1 });
  }
  // A folded linen runner hanging down the cabinet's left side.
  c.part();
  for (let y = fTop; y < fTop + 4; y++) c.px(x0, y, LINEN, n3(-0.6, -0.2, 0.75), { bias: y === fTop ? 1 : 0 });
});

// ---------------------------------------------------------------- Registry

export const GADGET_ART: Record<string, PropArt> = { juicer, tv };
