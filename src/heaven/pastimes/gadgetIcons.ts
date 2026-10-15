// Icons for the juice press and the screens (see world/homeParts.ts `juicer`
// and `tv`, and pastimes/screen.ts): every juice in its glass (`dish_<id>`,
// as the kitchen and the hotbar find dishes), the touch button's juice press
// (`icon_juice`) and television (`icon_tv`). Drawn the farm's way (lit
// materials and normals, art/farm.ts) and made with its icons.

import { PixelCanvas, type Material, type RGB, type Vec3 } from '../../art/pixel';
import { farmKit as K, moreIcons } from '../../art/farm';

const { ICON, n3, TOP, FACE, UP, leaf } = K;
const m = K.mat;
const shiny = K.shiny;
const glowing = K.glowing;
const FLATN: Vec3 = { x: 0, y: 0, z: 1 };

// ---------------------------------------------------------------- Materials

const GLASS: Material = { ...shiny(m('#4a5866', '#8a9cac', '#b2c2ce', '#d2dee6', '#eaf2f6', '#ffffff')), noAO: true };
const ICE: Material = { ...shiny(m('#7a94a8', '#b4cad8', '#d4e4ee', '#ecf6fa', '#ffffff')), noAO: true };
const CARROT_J = shiny(m('#3a1604', '#7a3008', '#b4500e', '#e0701a', '#f8902e', '#ffb050', '#ffd08a'));
const TOMATO_J = shiny(m('#2a0406', '#5e0c0e', '#921a16', '#c42a20', '#e8442e', '#f86a4a', '#ff9a7a'));
const GREEN_J = shiny(m('#0e2206', '#1e4210', '#34641c', '#4c8a2a', '#68aa3c', '#8ac85a', '#b2e080'));
const PINK_J = m('#3a0a18', '#7a2440', '#b04466', '#d86888', '#f08ea6', '#fcb4c4', '#ffd8e2');
const CIDER_J = shiny(m('#2a1002', '#5a2806', '#8a440c', '#b86414', '#d8862a', '#eca84a', '#f8c878'));
const COOL_J = { ...shiny(m('#2a3a5a', '#5a76a0', '#86a2c8', '#acc4e2', '#cadcf2', '#e4eefc', '#f8fbff')), noAO: true };
const NECTAR_J = shiny(m('#3a1a02', '#7a4006', '#b0660e', '#da8c1e', '#f4ac36', '#ffc85a', '#ffe08e'));
const PUNCH_J = glowing({ ...shiny(m('#100c3a', '#22207a', '#3a3eb0', '#5a62d8', '#808cf0', '#aab4ff', '#d4daff')), noAO: true }, 0.7);
const FIZZ_J = glowing({ ...shiny(m('#4a3a10', '#9a8430', '#ccb456', '#ecd682', '#fcecb0', '#fff8dc', '#ffffff')), noAO: true }, 0.5);
const STRAW_W = m('#5a5a60', '#c8c8cc', '#ececee', '#ffffff');
const STRAW_R = m('#3a0610', '#8a1428', '#c42c44', '#ec5a6a', '#ff8a92');
const MINT = m('#06180c', '#0e3418', '#185024', '#246c30', '#348a3e', '#4aa850', '#6ac46a', '#94dc8c');
const BERRY = shiny(m('#2a0408', '#640c16', '#9a1624', '#cc2834', '#f0464a', '#ff7a72'));
const SEED_DOT = m('#3a3010', '#c8b060', '#f4e09a');
const FROND = m('#0a1a06', '#14300c', '#22481a', '#336426', '#468232', '#5ea03e', '#7cbc4c');
const SALT_RIM = { ...m('#5a2a3a', '#c88aa0', '#ecb4c4', '#fcd8e2', '#fff2f6'), noAO: true };
const CINNAMON = m('#1a0a04', '#3e1a0a', '#622c12', '#86401c', '#a4562a');
const CLOUDB = shiny(m('#2a0e02', '#5e2206', '#923a0c', '#c45a18', '#e8782a', '#fa9a44', '#ffbc70'));
const PETAL_GLOW = glowing({ ...m('#1a3a4a', '#2c6a84', '#4a98b4', '#74c2dc', '#a2e2f4', '#d2f6ff'), noAO: true }, 0.9);
const STAR = glowing({ ...shiny(m('#4a3a0a', '#a08420', '#d4b440', '#f0d868', '#fcec9a', '#fffbe0')), noAO: true }, 0.9);
// The juice press's sage cabinet and steel, and the television's walnut, cream and glass.
const SAGE = m('#0e1610', '#223428', '#34493a', '#486050', '#5e7866', '#76907c', '#90a894', '#acc2ac');
const STEEL = shiny(m('#0a0c10', '#1a1c24', '#2a2e38', '#3e4450', '#565e6a', '#727a86', '#929aa4', '#b8bec6', '#e0e4ea'));
const WALNUT = m('#120804', '#24120a', '#361c10', '#4a2816', '#5e341e', '#744228', '#8a5434');
const CREAM = m('#2a241c', '#62584a', '#887c6a', '#aea08a', '#ccbea6', '#e2d6be', '#f2e8d4');
const SCREEN = glowing({ ...m('#0c1a2a', '#1a3450', '#2a5276', '#3e749a', '#5a98bc', '#82bcd8', '#b4dcee'), noAO: true }, 0.6);
const BRASS = shiny(m('#1e1404', '#4a3008', '#7a5410', '#a87a1c', '#d0a030', '#eac454', '#fae08a'));

const icon = (draw: (c: PixelCanvas) => void) => () => {
  const c = new PixelCanvas(ICON, ICON);
  draw(c);
  return c;
};

// ---------------------------------------------------------------- The glass

interface GlassOpts {
  /** The juice, and a second one poured under it (the sunrise's two layers): from this row down. */
  juice: Material;
  under?: { m: Material; from: number };
  /** The glass's top and bottom rows, and its half-width at the top and the foot. */
  top?: number;
  foot?: number;
  wTop?: number;
  wFoot?: number;
  /** How far down from the rim the juice comes. */
  gap?: number;
  /** A handle on its right (a mug of cider). */
  handle?: boolean;
  straw?: boolean;
  ice?: boolean;
}

/**
 * A glass of juice seen a little from above: the juice through the glass's
 * sides with a bright stripe where the light goes through, its surface an
 * ellipse at the top, the glass rim over it and a glint.
 */
function glass(c: PixelCanvas, o: GlassOpts): { cx: number; top: number; rim: number } {
  const cx = 7.5;
  const top = o.top ?? 4;
  const foot = o.foot ?? 14;
  const wTop = o.wTop ?? 4.2;
  const wFoot = o.wFoot ?? 3.3;
  const gap = o.gap ?? 2;
  const half = (y: number) => wTop + (wFoot - wTop) * ((y - top) / (foot - top));
  // The foot's thick base, then the glass's back wall, then the juice in it.
  c.part();
  c.shape(top, foot, (y) => [cx - half(y), cx + half(y)], GLASS, (_x, _y, t) => n3(t * 0.8, -0.15, 0.6), { bias: -1 });
  c.part();
  const surface = top + gap;
  c.shape(surface, foot - 1, (y) => [cx - half(y) + 0.8, cx + half(y) - 0.8], o.juice, (_x, _y, t) => n3(t * 0.7, -0.2, 0.75));
  if (o.under) {
    c.part();
    c.shape(o.under.from, foot - 1, (y) => [cx - half(y) + 0.8, cx + half(y) - 0.8], o.under.m, (_x, _y, t) => n3(t * 0.7, -0.2, 0.75));
  }
  // The light coming through: a pale stripe down the left of the juice.
  for (let y = surface + 1; y < foot - 1; y++) c.shade(cx - half(y) + 1.6, y, 2);
  // The juice's surface.
  c.part();
  c.ellipse(cx, surface, half(surface) - 0.8, 1, o.juice, { normal: () => TOP, bias: 1 });
  if (o.ice) {
    c.part();
    for (const [x, y] of [[cx - 1.6, surface - 0.4], [cx + 1.4, surface + 0.2]] as const) {
      c.px(x, y, ICE, TOP, { bias: 2 });
      c.px(x + 1, y, ICE, TOP, { bias: 1 });
      c.px(x, y + 1, ICE, FACE, { bias: 0 });
    }
  }
  // The rim, and the base's thick glass catching the light.
  c.part();
  for (let x = Math.round(cx - wTop); x < cx + wTop; x++) c.px(x, top, GLASS, TOP, { bias: x < cx ? 2 : 1 });
  c.px(cx - wTop, top + 1, GLASS, FACE, { bias: 1 });
  c.px(cx + wTop - 1, top + 1, GLASS, FACE, { bias: 0 });
  for (let x = Math.round(cx - wFoot); x < cx + wFoot; x++) c.px(x, foot, GLASS, FACE, { bias: x < cx ? 1 : -1 });
  c.px(cx - half(top + 3) + 0.4, top + 3, GLASS, FLATN, { bias: 3 });
  c.px(cx - half(top + 4) + 0.4, top + 4, GLASS, FLATN, { bias: 2 });
  if (o.handle) {
    c.part();
    for (const [x, y] of [[cx + wTop, top + 2], [cx + wTop + 1, top + 3], [cx + wTop + 1, top + 5], [cx + wTop + 1, top + 4], [cx + wTop, top + 6]] as const) c.px(x, y, GLASS, FACE, { bias: 1 });
  }
  if (o.straw) {
    // A red-and-white striped straw leaning out to the right.
    c.part();
    for (let k = 0; k < 7; k++) c.px(cx + 1 + k * 0.5, surface - k, k % 2 ? STRAW_R : STRAW_W, n3(0.4, 0, 0.9), { bias: 1 });
  }
  return { cx, top, rim: surface };
}

/** A strawberry hung on the rim: its red body with seeds, a green crown. */
function berryOnRim(c: PixelCanvas, x: number, y: number): void {
  c.part();
  c.ellipse(x, y + 1, 1.7, 2, BERRY);
  c.px(x - 0.5, y + 1, SEED_DOT, FACE, { bias: 1 });
  c.px(x + 0.5, y + 2, SEED_DOT, FACE);
  c.part();
  c.px(x - 1, y - 1, FROND, UP, { bias: 1 });
  c.px(x, y - 1, FROND, UP, { bias: 2 });
  c.px(x + 1, y - 1, FROND, UP);
}

// ---------------------------------------------------------------- The juices

const JUICES: Record<string, () => PixelCanvas> = {
  carrotjuice: icon((c) => {
    // A tumbler of bright orange, a striped straw, a frond of carrot top tucked in.
    const g = glass(c, { juice: CARROT_J, straw: true });
    c.part();
    leaf(c, g.cx - 2.5, g.rim - 0.5, g.cx - 5, g.rim - 4, 0.8, FROND, { rib: false });
  }),
  tomatojuice: icon((c) => {
    // A tall glass of red with a pink salt rim.
    const g = glass(c, { juice: TOMATO_J, top: 3, wTop: 3.8, wFoot: 3.2, straw: true });
    c.part();
    for (let x = Math.round(g.cx - 3.8); x < g.cx + 3.8; x += 2) c.px(x, g.top - 1, SALT_RIM, UP, { bias: 1 });
    for (let x = Math.round(g.cx - 2.8); x < g.cx + 3.8; x += 2) c.px(x, g.top, SALT_RIM, UP, { bias: 2 });
  }),
  greenjuice: icon((c) => {
    // Garden green, a mint sprig standing in it.
    const g = glass(c, { juice: GREEN_J, straw: true });
    c.part();
    leaf(c, g.cx - 1.5, g.rim, g.cx - 3.5, g.rim - 4.5, 1, MINT, { rib: false });
    leaf(c, g.cx - 1.5, g.rim, g.cx + 0.5, g.rim - 4, 0.9, MINT, { rib: false });
  }),
  smoothie: icon((c) => {
    // A thick pink smoothie in a jar, a soft heap on top and a strawberry on the rim.
    const g = glass(c, { juice: PINK_J, gap: 1, wTop: 4.4, wFoot: 4, straw: true });
    c.part();
    c.ellipse(g.cx - 0.5, g.rim - 1, 3, 1.4, PINK_J, { bias: 1 });
    berryOnRim(c, g.cx + 3.5, g.top - 1);
  }),
  sunrise: icon((c) => {
    // Two layers, strawberry red under carrot gold, like the sky at dawn.
    const g = glass(c, { juice: CARROT_J, under: { m: TOMATO_J, from: 10 }, straw: true });
    berryOnRim(c, g.cx - 3.6, g.top - 1);
  }),
  cider: icon((c) => {
    // A glass mug of spiced cider with a cinnamon stick in it.
    const g = glass(c, { juice: CIDER_J, top: 5, wTop: 3.8, wFoot: 3.8, handle: true });
    c.part();
    c.line(g.cx + 0.5, g.rim, g.cx + 2.5, g.rim - 5, CINNAMON, () => n3(0.3, 0, 0.9), { bias: 1 });
    c.line(g.cx + 1.5, g.rim, g.cx + 3.5, g.rim - 5, CINNAMON, () => n3(0.6, 0, 0.8), { bias: -1 });
  }),
  snowcooler: icon((c) => {
    // Icy blue with cubes in it, frost on the glass and a mint leaf.
    const g = glass(c, { juice: COOL_J, ice: true, straw: true });
    for (const [x, y] of [[g.cx - 3, 10], [g.cx + 2, 12], [g.cx - 1, 13], [g.cx + 3, 8]] as const) c.shade(x, y, 2);
    c.part();
    leaf(c, g.cx - 2, g.rim, g.cx - 4.5, g.rim - 3, 0.9, MINT, { rib: false });
  }),
  nectar: icon((c) => {
    // Golden nectar in a stemmed glass, a cloudberry on its rim.
    const cx = 7.5;
    c.part();
    c.line(cx, 11, cx, 13, GLASS, () => n3(0.2, 0, 0.9), { bias: 1 });
    c.part();
    c.ellipse(cx, 14, 3, 0.9, GLASS, { normal: () => TOP, bias: 1 });
    const g = glass(c, { juice: NECTAR_J, top: 3, foot: 10, wTop: 4.6, wFoot: 1.6 });
    c.part();
    c.ellipse(g.cx + 3.6, g.top, 1.6, 1.5, CLOUDB);
    c.shade(g.cx + 3, g.top - 1, 2);
  }),
  glowpunch: icon((c) => {
    // Punch that glows, a glowpetal afloat on it.
    const g = glass(c, { juice: PUNCH_J, ice: true });
    c.part();
    c.px(g.cx - 0.5, g.rim, PETAL_GLOW, TOP, { bias: 2 });
    c.px(g.cx + 0.5, g.rim, PETAL_GLOW, TOP, { bias: 1 });
    c.px(g.cx, g.rim - 1, PETAL_GLOW, TOP, { bias: 1 });
    c.spark(g.cx, g.rim + 3, [150, 160, 255], 0.5);
  }),
  starfizz: icon((c) => {
    // Pale gold fizz, its bubbles twinkling, a star sugar on the rim.
    const g = glass(c, { juice: FIZZ_J, wTop: 3.8, wFoot: 3 });
    for (const [x, y] of [[g.cx - 1, 12], [g.cx + 1, 10], [g.cx - 2, 8], [g.cx + 2, 13], [g.cx, 7]] as const) {
      c.shade(x, y, 2);
      c.spark(x, y, [255, 250, 220], 0.5);
    }
    c.part();
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) c.px(g.cx + 3 + dx, g.top - 1 + dy, STAR, FLATN, { bias: dx || dy ? 0 : 2 });
  }),
};

// ---------------------------------------------------------------- The touch button's icons

const BUTTONS: Record<string, () => PixelCanvas> = {
  icon_juice: icon((c) => {
    // The press: a sage base, a steel reamer dome on it and a glass of orange beside.
    c.part();
    c.shape(10, 14, () => [2, 10], SAGE, (_x, y) => (y === 10 ? TOP : FACE));
    c.part();
    c.ellipse(6, 9.5, 3.4, 1.2, STEEL, { normal: () => TOP, bias: 1 });
    c.part();
    c.ellipse(6, 7.5, 2.2, 2.4, STEEL, { flatten: 0.8 });
    for (let k = -1; k <= 1; k++) c.shade(6 + k, 7, k === 0 ? 2 : -1);
    c.part();
    c.shape(6, 14, (y) => [10.5 - (14 - y) * 0.05, 14.5 + (14 - y) * 0.05], GLASS, (_x, _y, t) => n3(t * 0.8, -0.15, 0.6), { bias: -1 });
    c.part();
    c.shape(8, 13, () => [11.3, 13.7], CARROT_J, (_x, _y, t) => n3(t * 0.7, -0.2, 0.75));
    c.part();
    c.line(11, 6, 14, 6, GLASS, () => TOP, { bias: 2 });
  }),
  icon_tv: icon((c) => {
    // A little walnut television with a glowing screen and two brass knobs.
    c.part();
    c.line(4, 2, 6, 4, BRASS, () => FACE, { bias: 1 });
    c.line(12, 2, 10, 4, BRASS, () => FACE, { bias: 1 });
    c.part();
    c.shape(4, 13, () => [1, 15], WALNUT, (_x, y) => (y === 4 ? TOP : FACE));
    c.part();
    c.shape(5, 12, (y) => (y === 5 || y === 12 ? [3, 11] : [2, 12]), CREAM, () => FACE, { bias: 1 });
    c.part();
    c.shape(6, 11, (y) => (y === 6 || y === 11 ? [4, 10] : [3, 11]), SCREEN, (_x, _y, t, u) => n3(t * 0.3, -u * 0.3, 0.9));
    c.px(4, 7, SCREEN, FLATN, { bias: 3 });
    c.px(5, 7, SCREEN, FLATN, { bias: 2 });
    c.part();
    c.px(13, 7, BRASS, FACE, { bias: 2 });
    c.px(13, 10, BRASS, FACE, { bias: 1 });
    c.part();
    c.line(2, 14, 2, 15, WALNUT, () => FACE);
    c.line(13, 14, 13, 15, WALNUT, () => FACE);
  }),
};

for (const [id, draw] of Object.entries(JUICES)) moreIcons.push({ name: `dish_${id}`, draw });
for (const [name, draw] of Object.entries(BUTTONS)) moreIcons.push({ name, draw });

/** The screen's glow colours as it plays, for the world's TV (pastimes/index.ts). */
export const SCREEN_TINTS: RGB[] = [
  [140, 190, 255],
  [255, 200, 150],
  [170, 255, 200],
  [255, 170, 210],
  [200, 180, 255],
];
