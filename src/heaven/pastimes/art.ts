// The pastimes' art: the finds and the honey (16 x 16 icons, `find_<id>`,
// shown in the pantry and lying on the ground where they're found), the
// dishes cooked from them (`dish_<id>`), the touch button's icons for sitting,
// sleeping, playing and stargazing, and a few little textures drawn straight
// on a canvas: musical notes, bees, the stars' glints. The icons are drawn
// the farm's way (art/farm.ts: lit materials and normals) and made with its
// icons, so the kitchen and the hotbar find them.

import type Phaser from 'phaser';
import { PixelCanvas, type Material, type Vec3 } from '../../art/pixel';
import { farmKit as K, moreIcons } from '../../art/farm';

const { ICON, n3, UP, TOP, FACE, bowl, plate, steam, leaf, stem } = K;

/** A material from its outline and its ramp, dark to light (as the farm's). */
const m = K.mat;
const shiny = K.shiny;
const glowing = K.glowing;

// ---------------------------------------------------------------- Materials

const AMBER = glowing(shiny(m('#2a1202', '#5a2a04', '#8e4806', '#c06a0c', '#e8901a', '#ffb22e', '#ffd060', '#fff0a8')), 0.18);
const GLASS = { ...shiny(m('#3a4450', '#8a9aa8', '#b4c2cc', '#d4dee4', '#eef4f6', '#ffffff')), noAO: true };
const GINGHAM = m('#2a0604', '#6a1210', '#a0221c', '#c83a2e', '#e65a48', '#f88a76');
const TWINE = m('#2a2010', '#6a5a38', '#9a8858', '#c4b280');
const CHANTER = shiny(m('#2a1202', '#5e2c06', '#94500e', '#c27218', '#e69428', '#f8b240', '#ffd06a', '#ffe8a8'));
const CHANTER_GILL = m('#2a1406', '#6a3a10', '#a0601c', '#c8822c', '#e0a046');
const MINT = m('#06180c', '#0e3418', '#185024', '#246c30', '#348a3e', '#4aa850', '#6ac46a', '#94dc8c');
const MINT_STEM = m('#0a1a0a', '#1e3a1a', '#2e5426', '#426e32', '#5a8a42');
const SHELL = shiny(m('#2a1a16', '#6a4a42', '#9a786c', '#c4a294', '#e2c4b4', '#f4dccc', '#fff0e4'));
const SHELL_PINK = m('#3a1418', '#8a4048', '#b86a70', '#da9496', '#f2bcbc', '#ffdcd8');
const KELP = shiny(m('#04140a', '#0a2a14', '#14401e', '#1e582a', '#2c7036', '#3e8a44', '#58a456', '#78bc6c'));
const KELP_BULB = shiny(m('#1a1a04', '#3a400a', '#5a6614', '#7a8a22', '#9aaa36', '#bcc650'));
const SALT = { ...shiny(m('#3a1420', '#8a4458', '#b86a82', '#da92a6', '#f2b8c8', '#ffd8e2', '#fff2f6')), noAO: true };
const SNOWB = shiny(m('#3a4a5e', '#6a7e98', '#94a8c0', '#b8cade', '#d8e6f2', '#eef6fc', '#ffffff'));
const TWIG = m('#1a0e06', '#3a2412', '#58381e', '#74502c', '#90683c');
const DARKLEAF = m('#04120a', '#0a2414', '#12361e', '#1c4a28', '#286034', '#367642');
const CONE = m('#140a04', '#2e180a', '#4a2a12', '#663e1c', '#845428', '#a06c36', '#ba8648', '#d0a060');
const NUT = shiny(m('#2a1c0e', '#6a5030', '#9a7a50', '#c4a072', '#e2c496', '#f6e2be'));
const PETAL_GLOW = glowing({ ...m('#1a3a4a', '#2c6a84', '#4a98b4', '#74c2dc', '#a2e2f4', '#d2f6ff', '#f4feff'), noAO: true }, 0.8);
const PETAL_HEART = glowing({ ...m('#4a4a20', '#c8c070', '#f0ecb0', '#fffbe0'), noOutline: true }, 1);
const LUMEN = glowing(shiny(m('#100c3a', '#1e1a6a', '#30309a', '#4a50c4', '#6a78e4', '#909ef8', '#bcc6ff', '#e6eaff')), 0.7);
const CLOUDB = shiny(m('#2a0e02', '#5e2206', '#923a0c', '#c45a18', '#e8782a', '#fa9a44', '#ffbc70', '#ffdcaa'));
const SEPAL = m('#0a1a06', '#1a3610', '#2a501a', '#3e6c26', '#548834');
const LOTUS = m('#2a1418', '#6a4248', '#9a6c72', '#c4949a', '#e2bac0', '#f4d8dc', '#fff0f2');
const LOTUS_HOLE = { ...m('#1a0c0e', '#4a2a2e', '#6a4246', '#8a5a5e'), noOutline: true };
const GLOWCAP = glowing(shiny(m('#04241c', '#0a4434', '#12644c', '#1e8a66', '#30b084', '#52d4a2', '#86f0c4', '#c6ffe6')), 0.75);
const GLOWCAP_STEM = glowing(m('#1a2a26', '#3e5a52', '#668a80', '#90b4aa', '#bad8d0', '#e0f4ee'), 0.25);
const STARSUGAR = glowing({ ...shiny(m('#4a3a0a', '#a08420', '#d4b440', '#f0d868', '#fcec9a', '#fff8cc', '#ffffff')), noAO: true }, 0.65);
const CAKE = m('#2a1606', '#6a4018', '#a06a30', '#c8904a', '#e2b06a', '#f2cc8e', '#fce4b8');
const SPONGE = m('#4a3410', '#a8843c', '#d4ae5c', '#ecca7c', '#f8e2a4', '#fff2cc');
const TEA_GREEN = { ...m('#1a2a0a', '#3a5a18', '#5a7e28', '#7a9c3c', '#9ab858', '#bcd27a'), noAO: true };
const SOUP_GOLD = m('#3a2004', '#7a4a0c', '#ae7418', '#d89a2a', '#f0ba48', '#fcd474', '#ffeaaa');
const NORI = shiny(m('#020a06', '#061810', '#0c2618', '#123422', '#1a442c', '#245636'));
const FISHPINK = m('#3a1410', '#8a3e30', '#c46a54', '#e8907a', '#fab4a0', '#ffd4c4');
const BOARD = m('#1e1008', '#4a2c16', '#6c4422', '#8e5e30', '#ae7840', '#c89452');
const FROST = { ...m('#4a5260', '#a8b4c4', '#cad4e0', '#e4ecf4', '#f6faff', '#ffffff'), noAO: true };
const GLOWTEA = glowing({ ...m('#0c2a3a', '#185470', '#2a80a4', '#4aaacc', '#7ad0ea', '#b2ecfa', '#e6fcff'), noAO: true }, 0.75);
const PANCAKE = m('#2a1406', '#64360e', '#9a5a1c', '#c47e30', '#e0a04a', '#f2c070', '#fcdca0');
const DARKBOWL = shiny(m('#06080e', '#10141e', '#1c2230', '#2a3244', '#3c465c', '#525e78', '#6c7a96'));
const WOOD = m('#1e1008', '#4a2c16', '#6c4422', '#8e5e30', '#ae7840', '#c89452', '#deb070');
const CUSHION = m('#2a0a14', '#6a1a30', '#a02c4a', '#c8466a', '#e66a8a', '#f894ac');
const MOON = glowing(shiny(m('#3a3010', '#8a7a34', '#c4b058', '#e8d684', '#f8ecb0', '#fffbe0')), 0.5);
const NOTE_GOLD = shiny(m('#2a1802', '#6a4206', '#a8700e', '#d89a1e', '#f4c03a', '#ffe070', '#fff4b8'));
const BRASS = shiny(m('#1e1404', '#4a3008', '#7a5410', '#a87a1c', '#d0a030', '#eac454', '#fae08a', '#fff4c4'));
const STARGLOW = glowing({ ...m('#3a3a20', '#a8a060', '#e8e09a', '#fff8d0', '#ffffff'), noOutline: true }, 1);

const FLATN: Vec3 = { x: 0, y: 0, z: 1 };
const icon = (draw: (c: PixelCanvas) => void) => () => {
  const c = new PixelCanvas(ICON, ICON);
  draw(c);
  return c;
};

/** A berry: a round shiny ball with a glint. */
function berry(c: PixelCanvas, x: number, y: number, r: number, mt: Material): void {
  c.part();
  c.ellipse(x, y, r, r, mt);
  c.shade(x - r * 0.35, y - r * 0.35, 2);
}

/** A mushroom: a stem, a cap (rounded or a funnel), its underside showing. */
function mushroom(c: PixelCanvas, x: number, y: number, h: number, rx: number, cap: Material, gill: Material, stalk: Material, funnel: boolean): void {
  c.part();
  c.capsule(x, y, x + 0.3, y - h, funnel ? 1.1 : 1.3, funnel ? 1.8 : 1.3, stalk);
  const top = y - h - (funnel ? 0.5 : 1.5);
  c.part();
  if (funnel) {
    // A golden funnel flaring up from the stem to a wavy rim, ridged gills down its outside, the hollow of its top in shade.
    const stemTop = y - h;
    const rim = stemTop - rx * 0.9;
    c.shape(Math.round(rim), Math.round(stemTop), (yy) => {
      const t = (stemTop - yy) / (stemTop - rim);
      const w = 1.2 + (rx - 1.2) * Math.pow(t, 0.8);
      return [x + 0.3 - w, x + 0.3 + w];
    }, gill, (_x, _y, t, u) => n3(t * 0.8, -0.2 - u * 0.2, 0.75));
    for (let yy = Math.round(rim); yy <= stemTop; yy++) for (let xx = Math.floor(x - rx); xx <= x + rx; xx++) if (c.materialAt(xx, yy) === gill && (xx + yy) % 2 === 0) c.shade(xx, yy, -1);
    c.part();
    c.ellipse(x + 0.3, rim, rx + 0.4, rx * 0.34 + 0.3, cap, { normal: (_x, _y, dx, dy) => n3(dx * 0.5, 0.4 - dy * 0.5, 0.75) });
    c.part();
    c.ellipse(x + 0.3, rim + 0.2, rx - 1.4, rx * 0.34 - 0.6, cap, { normal: () => n3(0, -0.5, 0.85), bias: -2 });
    // The rim's waves.
    for (let k = -2; k <= 2; k++) c.shade(x + 0.3 + k * rx * 0.42, rim + rx * 0.34, k % 2 ? 2 : 0);
  } else {
    c.ellipse(x + 0.3, top + 1, rx, 1.2, gill, { normal: () => FACE });
    c.part();
    c.shape(Math.round(top - rx * 0.75), Math.round(top + 0.5), (yy) => {
      const t = (top + 0.5 - yy) / (rx * 0.8);
      const w = rx * Math.sqrt(Math.max(0, 1 - t * t));
      return [x + 0.3 - w, x + 0.3 + w];
    }, cap, (_x, _y, t, u) => n3(t * 0.7, 0.75 - u * 0.6, 0.7));
  }
}

// ---------------------------------------------------------------- Finds

const FIND_ART: Record<string, () => PixelCanvas> = {
  honey: icon((c) => {
    // A round glass jar of honey, a gingham cloth tied over its lid, a wooden dipper leaning in.
    c.part();
    c.shape(5, 14, (y) => {
      const t = (y - 9.5) / 5.2;
      const w = 5.4 * Math.sqrt(Math.max(0, 1 - t * t * t * t));
      return [8 - w, 8 + w];
    }, GLASS, (_x, _y, t, u) => n3(t * 0.8, 0.2 - u * 0.3, 0.7));
    c.part();
    c.shape(7, 13, (y) => {
      const t = (y - 10) / 3.6;
      const w = 4.3 * Math.sqrt(Math.max(0, 1 - t * t * t * t));
      return [8 - w, 8 + w];
    }, AMBER, (_x, _y, t, u) => n3(t * 0.7, 0.3 - u * 0.5, 0.75));
    for (let y = 8; y <= 12; y++) c.shade(5, y, 2);
    c.px(5, 9, GLASS, FLATN, { bias: 3 });
    c.part();
    c.ellipse(8, 4.2, 5.2, 1.6, GINGHAM, { normal: () => TOP });
    for (let x = 3; x <= 13; x += 2) c.shade(x, 4, (x / 2) % 2 ? 2 : -1);
    c.part();
    c.line(3, 5, 13, 5, TWINE, () => FACE, { bias: 1 });
    c.px(3, 6, GINGHAM, FACE);
    c.px(13, 6, GINGHAM, FACE, { bias: -1 });
    c.part();
    c.line(11, 1, 12, 4, WOOD, () => UP, { bias: 1 });
    c.ellipse(11, 1, 1.2, 1, WOOD);
  }),
  chanterelle: icon((c) => {
    mushroom(c, 5, 14, 4, 3.4, CHANTER, CHANTER_GILL, CHANTER_GILL, true);
    mushroom(c, 10, 15, 6, 4.6, CHANTER, CHANTER_GILL, CHANTER_GILL, true);
    c.part();
    c.px(2, 15, DARKLEAF, UP);
    c.px(13, 15, DARKLEAF, UP, { bias: 1 });
  }),
  mint: icon((c) => {
    // A sprig: a square stem, pairs of toothed leaves, the youngest at the top.
    c.part();
    stem(c, 6, 15, 9, 2, MINT_STEM, 0);
    for (const [y, w, l] of [[12, 1.7, 4.2], [8, 1.6, 3.8], [5, 1.3, 3]] as const) {
      const x = 6 + ((15 - y) / 13) * 3;
      c.part();
      leaf(c, x, y, x - l, y - 1.6, w, MINT);
      leaf(c, x, y, x + l, y - 2, w, MINT);
    }
    c.part();
    leaf(c, 9, 3, 9.5, 0.4, 1, MINT, { rib: false });
  }),
  clam: icon((c) => {
    // A scallop shell: ribs fanning from the hinge, its little ears either side, banded in rose.
    c.part();
    for (let y = 1; y < 15; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8;
      const dy = 13.5 - (y + 0.5);
      const r = Math.hypot(dx * 1.05, dy * 0.95);
      const a = Math.atan2(dx, dy);
      if (r > 8.4 - Math.abs(Math.sin(a * 5.5)) * 0.5 || Math.abs(a) > 1.3 || dy < 0) continue;
      const rib = Math.cos(a * 11);
      const mt = r > 5.2 && r < 6.3 ? SHELL_PINK : r > 2.6 && r < 3.4 ? SHELL_PINK : SHELL;
      c.px(x, y, mt, n3(Math.sin(a) * 0.5 + rib * 0.3, 0.35, 0.8), { bias: rib > 0.35 ? 1 : rib < -0.35 ? -2 : 0 });
    }
    c.part();
    c.shape(12, 14, (y) => [4 + (y - 12) * 0.8, 12 - (y - 12) * 0.8], SHELL, () => FACE, { bias: -1 });
  }),
  kelp: icon((c) => {
    // Three wavy fronds of kelp, a float bladder at the root of each.
    for (const [x0, lean, h] of [[4, -1.5, 11], [8, 1, 13], [12, 2.5, 9]] as const) {
      c.part();
      for (let k = 0; k <= h; k++) {
        const y = 15 - k;
        const x = x0 + Math.sin(k * 0.7 + x0) * 1.1 + lean * (k / h);
        const w = 1.4 - (k / h) * 0.6;
        c.ellipse(x, y, w, 0.7, KELP, { normal: () => n3(Math.cos(k * 0.7 + x0) * 0.5, 0.2, 0.85) });
      }
      c.part();
      c.ellipse(x0 + lean * 0.2, 13, 1.1, 1.1, KELP_BULB);
    }
  }),
  salt: icon((c) => {
    // A cluster of pink salt crystals: square prisms leaning out of a heap of grains.
    const prism = (x: number, y: number, w: number, h: number, lean: number) => {
      c.part();
      for (let k = 0; k < h; k++) for (let i = 0; i < w; i++) c.px(x + i + Math.round((lean * k) / h), y - k, SALT, n3(i < w / 2 ? -0.6 : 0.5, 0.1, 0.8), { bias: i === 0 ? -1 : i === w - 1 ? 1 : 0 });
      for (let i = 0; i < w; i++) c.px(x + i + Math.round(lean), y - h, SALT, TOP, { bias: 2 });
    };
    prism(3, 14, 3, 6, -1);
    prism(9, 14, 3, 7, 1.2);
    prism(6, 14, 4, 10, 0);
    c.part();
    for (let x = 2; x <= 13; x++) c.px(x, 15, SALT, UP, { bias: x % 3 ? 0 : 2 });
    c.px(7, 6, SALT, FLATN, { bias: 3 });
  }),
  snowberry: icon((c) => {
    c.part();
    stem(c, 3, 3, 9, 8, TWIG, 0);
    stem(c, 9, 8, 13, 6, TWIG, 0);
    c.part();
    leaf(c, 5, 4, 2, 1, 1.2, DARKLEAF);
    leaf(c, 11, 7, 14, 4.5, 1.2, DARKLEAF);
    for (const [x, y, r] of [[8, 10.5, 2.1], [11.6, 11.2, 1.8], [5, 10.2, 1.8], [9.6, 13.8, 1.7], [6, 13.6, 1.8], [12.6, 8.2, 1.3]] as const) berry(c, x, y, r, SNOWB);
  }),
  pinecone: icon((c) => {
    // A pinecone, scale over scale, and two pine nuts beside it.
    c.part();
    c.ellipse(7, 8, 4.2, 6.2, CONE);
    for (let y = 3; y <= 14; y++) for (let x = 2; x <= 11; x++) {
      if (c.materialAt(x, y) !== CONE) continue;
      const row = (y - 2) % 3;
      const off = ((y - 2) / 3) % 2 < 1 ? 0 : 1;
      if (row === 0) c.shade(x, y, -2);
      else if ((x + off) % 2 === 0) c.shade(x, y, row === 1 ? 1 : 0);
    }
    c.part();
    c.px(7, 1, TWIG, UP);
    c.px(7, 2, TWIG, UP);
    c.part();
    c.ellipse(12.5, 13, 1.4, 1.9, NUT);
    c.ellipse(10.5, 14.2, 1.3, 1.6, NUT, { bias: -1 });
  }),
  glowpetal: icon((c) => {
    // Five glowing petals round a bright heart.
    c.part();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
      leaf(c, 8 + Math.cos(a) * 1.2, 8.5 + Math.sin(a) * 1.2, 8 + Math.cos(a) * 6, 8.5 + Math.sin(a) * 5.6, 2.1, PETAL_GLOW, { rib: false });
    }
    c.part();
    c.ellipse(8, 8.5, 1.6, 1.5, PETAL_HEART);
    c.spark(8, 8, [255, 255, 230], 1);
  }),
  lumenberry: icon((c) => {
    c.part();
    stem(c, 8, 1, 8, 5, TWIG, 0);
    stem(c, 8, 5, 4, 8, TWIG, 0);
    stem(c, 8, 5, 12, 8, TWIG, 0);
    c.part();
    leaf(c, 8, 2, 12, 0.5, 1.2, DARKLEAF);
    for (const [x, y, r] of [[4, 10, 2.3], [8, 11.5, 2.6], [12, 10, 2.3], [6, 14, 1.8], [10.5, 14, 1.8]] as const) berry(c, x, y, r, LUMEN);
  }),
  cloudberry: icon((c) => {
    // An amber cloudberry: a cluster of round drupelets on a leafy cup.
    c.part();
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * 0.15 + (k / 4) * Math.PI * 0.7;
      leaf(c, 8, 6, 8 + Math.cos(a + Math.PI) * 5.5, 6 + Math.sin(a + Math.PI) * 2.5, 1.3, SEPAL, { rib: false });
    }
    c.part();
    for (const [x, y] of [[8, 9.5], [5.5, 9], [10.5, 9], [6.5, 12], [9.5, 12], [8, 14], [5, 11.5], [11, 11.5], [8, 7.5]] as const) {
      c.ellipse(x, y, 1.75, 1.75, CLOUDB);
      c.shade(x - 0.6, y - 0.6, 2);
    }
  }),
  lotus: icon((c) => {
    // A lotus root: a pale segment, and a slice of it showing its ring of holes.
    c.part();
    c.capsule(2, 13, 7, 9, 2.6, 2.6, LOTUS);
    c.part();
    c.ellipse(10, 9, 5, 5, LOTUS, { normal: () => n3(0.1, 0.1, 0.99), flatten: 0.4 });
    c.part();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      c.ellipse(10 + Math.cos(a) * 2.9, 9 + Math.sin(a) * 2.9, 0.9, 0.9, LOTUS_HOLE, { normal: () => n3(0, -0.6, 0.8) });
    }
    c.ellipse(10, 9, 1, 1, LOTUS_HOLE, { normal: () => n3(0, -0.6, 0.8) });
  }),
  glowcap: icon((c) => {
    mushroom(c, 5, 15, 4, 3.6, GLOWCAP, GLOWCAP_STEM, GLOWCAP_STEM, false);
    mushroom(c, 10, 14, 7, 5, GLOWCAP, GLOWCAP_STEM, GLOWCAP_STEM, false);
    c.part();
    for (const [x, y] of [[9, 5], [12, 6], [10, 3], [4, 9]] as const) c.px(x, y, PETAL_HEART, FLATN);
  }),
  starsugar: icon((c) => {
    // A five-pointed lump of star sugar, faceted, glinting, and a crumb or two.
    c.part();
    const pts: [number, number][] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
      const r = k % 2 ? 2.6 : 6.4;
      pts.push([8 + Math.cos(a) * r, 8.5 + Math.sin(a) * r]);
    }
    for (let y = 1; y < 16; y++) for (let x = 0; x < 16; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) {
        const a = Math.atan2(y + 0.5 - 8.5, x + 0.5 - 8);
        c.px(x, y, STARSUGAR, n3(Math.cos(a) * 0.55, -Math.sin(a) * 0.55, 0.65), { bias: Math.cos(a * 5) > 0.3 ? 1 : 0 });
      }
    }
    c.spark(6, 6, [255, 255, 240], 1);
    c.part();
    c.px(2, 14, STARSUGAR, UP);
    c.px(14, 13, STARSUGAR, UP, { bias: 1 });
  }),
};

// ---------------------------------------------------------------- Dishes

const DISH_ART: Record<string, () => PixelCanvas> = {
  honeycake: icon((c) => {
    // A wedge of layered sponge on a plate, honey running down from the top.
    plate(c, 8, 12, 7);
    c.part();
    const top = 5;
    c.shape(top + 1, 11, (y) => [3.5 + (y - top) * 0.1, 12.5], SPONGE, (_x, _y, t) => n3(t * 0.3, -0.35, 0.88));
    for (let x = 4; x <= 12; x++) c.px(x, 8, CAKE, FACE, { bias: -1 });
    c.part();
    c.shape(top - 1, top + 1, (y) => [3.5 + (top + 1 - y) * 1.2, 12.5 - (top + 1 - y) * 0.4], CAKE, () => TOP, { bias: 1 });
    c.part();
    for (let x = 4; x <= 12; x++) c.px(x, top, AMBER, TOP, { bias: 1 });
    for (const [x, len] of [[5, 3], [8, 5], [11, 2]] as const) for (let k = 1; k <= len; k++) c.px(x, top + k, AMBER, FACE, { bias: k === len ? 2 : 0 });
  }),
  minttea: icon((c) => {
    // A teacup and saucer, pale green tea, a mint leaf floating, steam rising.
    plate(c, 8, 13, 6.5);
    c.part();
    c.shape(7, 12, (y) => {
      const t = (y - 7) / 5;
      const w = 5 - t * t * 1.8;
      return [7.5 - w, 7.5 + w];
    }, K.CERAMIC, (_x, _y, t, u) => n3(t * 0.8, -0.3 - u * 0.3, 0.8));
    c.part();
    c.ellipse(13, 9, 1.6, 1.8, K.CERAMIC);
    c.ellipse(13, 9, 0.6, 0.8, K.CERAMIC, { bias: -2 });
    c.part();
    c.ellipse(7.5, 7, 5, 1.5, K.CERAMIC, { normal: () => TOP, bias: 2 });
    c.part();
    c.ellipse(7.5, 7, 4, 0.9, TEA_GREEN, { normal: () => TOP });
    c.part();
    leaf(c, 6, 7, 9, 6.5, 0.8, MINT, { rib: false });
    steam(c, 6, 4);
    steam(c, 9, 3);
  }),
  mushsoup: icon((c) => {
    bowl(c, 8, 8, 6.5, SOUP_GOLD, K.WOODBOWL);
    c.part();
    for (const [x, y] of [[5, 8], [8, 7], [10, 8.5]] as const) {
      c.ellipse(x, y, 1.4, 0.8, CHANTER, { normal: () => TOP });
      c.px(x, y + 1, CHANTER_GILL, FACE);
    }
    c.px(7, 9, K.PARSLEY, UP, { bias: 1 });
    c.px(12, 8, K.CREAM, UP, { bias: 1 });
    steam(c, 6, 5);
    steam(c, 10, 4);
  }),
  clamchowder: icon((c) => {
    bowl(c, 8, 8, 6.5, K.CREAM, K.CERAMIC_BLUE);
    c.part();
    c.px(6, 8, SOUP_GOLD, UP, { bias: 1 });
    c.px(9, 7, K.PARSLEY, UP, { bias: 1 });
    c.px(10, 8, K.PARSLEY, UP);
    c.px(5, 7, K.PARSLEY, UP);
    // A clam shell on the rim.
    c.part();
    c.ellipse(12, 6.4, 2.2, 1.6, SHELL);
    c.shade(12, 6, 1);
    steam(c, 7, 4);
  }),
  kelprolls: icon((c) => {
    // Three rolls on a little board: dark kelp round white rice round pink fish.
    c.part();
    c.shape(11, 14, () => [1, 15], BOARD, (_x, y) => (y === 11 ? TOP : FACE));
    for (const x of [4, 8, 12]) {
      c.part();
      c.ellipse(x, 9, 2.2, 2.4, NORI);
      c.part();
      c.ellipse(x, 8, 1.6, 1.3, K.RICE, { normal: () => TOP });
      c.px(x, 8, FISHPINK, TOP, { bias: 1 });
    }
  }),
  snowtart: icon((c) => {
    // A round tart: golden pastry, white berries heaped on a frosted top.
    c.part();
    c.shape(8, 12, (y) => [2 + (y - 8) * 0.2, 14 - (y - 8) * 0.2], K.CRUST, (_x, _y, t) => n3(t * 0.6, -0.4, 0.8));
    for (let x = 3; x <= 13; x += 2) c.shade(x, 10, -1);
    c.part();
    c.ellipse(8, 8, 6, 2.2, FROST, { normal: () => TOP });
    for (const [x, y] of [[5, 7.5], [7, 6.5], [9, 7.5], [11, 6.8], [8, 8.4], [6, 8.6], [10.5, 8.6]] as const) berry(c, x, y, 1.15, SNOWB);
    c.part();
    leaf(c, 8, 6, 10, 4.5, 0.8, DARKLEAF, { rib: false });
  }),
  pineloaf: icon((c) => {
    c.part();
    c.ellipse(8, 10, 6.6, 4.2, K.CRUST, { flatten: 0.9 });
    c.part();
    for (const [x, y] of [[5, 8], [7, 7], [9, 7.5], [11, 8], [6, 9.5], [8, 9], [10, 9.5], [12, 10]] as const) c.px(x, y, NUT, UP, { bias: 1 });
    steam(c, 5, 5);
  }),
  glowtea: icon((c) => {
    // A glass cup of tea that glows like the meadow, a petal afloat.
    plate(c, 8, 13, 6.5);
    c.part();
    c.shape(4, 12, (y) => [4 + (y - 4) * 0.12, 12 - (y - 4) * 0.12], GLASS, (_x, _y, t) => n3(t * 0.8, -0.2, 0.75));
    c.part();
    c.shape(6, 11, (y) => [4.8 + (y - 6) * 0.12, 11.2 - (y - 6) * 0.12], GLOWTEA, (_x, _y, t) => n3(t * 0.5, -0.1, 0.85));
    c.part();
    c.ellipse(8, 6, 3.4, 0.8, GLOWTEA, { normal: () => TOP, bias: 1 });
    c.px(7, 6, PETAL_GLOW, TOP, { bias: 2 });
    c.px(8, 6, PETAL_GLOW, TOP, { bias: 1 });
    c.part();
    c.px(4, 6, GLASS, FLATN, { bias: 3 });
    steam(c, 9, 3);
  }),
  pancakes: icon((c) => {
    // A stack of four, cloudberries on top and honey running down.
    plate(c, 8, 13, 7);
    for (let k = 0; k < 4; k++) {
      c.part();
      const y = 11 - k * 1.8;
      c.ellipse(8, y, 5.6, 1.8, PANCAKE, { normal: (_x, _y, dx, dy) => n3(dx * 0.4, 0.3 - dy * 0.6, 0.85) });
    }
    c.part();
    c.ellipse(8, 5.4, 4.2, 1.2, AMBER, { normal: () => TOP });
    for (const [x, len] of [[4, 4], [11, 3]] as const) for (let k = 0; k < len; k++) c.px(x, 6 + k, AMBER, FACE, { bias: k === len - 1 ? 2 : 0 });
    berry(c, 7, 4.4, 1.3, CLOUDB);
    berry(c, 9.5, 4.8, 1.2, CLOUDB);
  }),
  stirfry: icon((c) => {
    bowl(c, 8, 8, 6.5, K.RICE, DARKBOWL);
    c.part();
    for (const [x, y] of [[5, 7.5], [10, 8]] as const) {
      c.ellipse(x, y, 1.6, 1, LOTUS, { normal: () => TOP });
      c.px(x, y, LOTUS_HOLE, TOP);
    }
    for (const [x, y] of [[7.5, 7], [8.5, 8.6], [11.5, 7]] as const) c.ellipse(x, y, 1.3, 0.9, GLOWCAP, { normal: () => TOP });
    c.px(6, 9, K.PARSLEY, UP, { bias: 1 });
    steam(c, 6, 5);
    steam(c, 10, 4);
  }),
  stardrops: icon((c) => {
    // A little glass jar of star sugar sweets, open, one spilled.
    c.part();
    c.shape(5, 14, () => [3.5, 12.5], GLASS, (_x, _y, t) => n3(t * 0.8, -0.1, 0.7));
    c.part();
    for (const [x, y] of [[5, 12], [7.5, 12.5], [10.5, 12], [6, 9.8], [9, 10], [11, 9.6], [7.5, 7.6]] as const) {
      c.ellipse(x, y, 1.3, 1.2, STARSUGAR);
      c.spark(x - 0.5, y - 0.5, [255, 250, 220], 0.6);
    }
    c.part();
    c.ellipse(8, 5, 4.6, 1.1, GLASS, { normal: () => TOP, bias: 1 });
    c.part();
    c.ellipse(14, 14.5, 1.2, 1, STARSUGAR);
  }),
};

// ---------------------------------------------------------------- The touch button's icons

const BUTTON_ART: Record<string, () => PixelCanvas> = {
  icon_sit: icon((c) => {
    // A little wooden chair side on, a rose cushion on its seat.
    c.part();
    c.line(4, 2, 4, 14, WOOD, () => n3(-0.5, 0, 0.85), { bias: 1 });
    c.line(5, 2, 5, 14, WOOD, () => n3(0.3, 0, 0.95));
    c.line(12, 9, 12, 14, WOOD, () => FACE);
    c.line(11, 9, 11, 14, WOOD, () => FACE, { bias: -1 });
    for (const y of [4, 6]) c.line(5, y, 5, y, WOOD, () => FACE, { bias: 2 });
    c.part();
    c.shape(8, 9, () => [4, 13], WOOD, (_x, y) => (y === 8 ? TOP : FACE));
    c.part();
    c.ellipse(9, 7.2, 3.8, 1.3, CUSHION, { normal: (_x, _y, dx, dy) => n3(dx * 0.4, 0.5 - dy * 0.5, 0.8) });
  }),
  icon_sleep: icon((c) => {
    // A sleepy crescent moon, and a "z" or two drifting up.
    c.part();
    c.ellipse(7, 9, 5.4, 5.4, MOON);
    for (let y = 2; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + 0.5 - 9.8) ** 2 + (y + 0.5 - 7.4) ** 2 < 4.6 ** 2) c.erase(x, y);
    c.part();
    for (const [x, y, s] of [[10, 3, 3], [13, 8, 2]] as const) {
      c.line(x, y, x + s - 1, y, NOTE_GOLD, () => UP, { bias: 1 });
      c.line(x + s - 1, y + 1, x, y + s - 1, NOTE_GOLD, () => UP);
      c.line(x, y + s, x + s - 1, y + s, NOTE_GOLD, () => UP, { bias: 1 });
    }
  }),
  icon_music: icon((c) => {
    // Two quavers beamed together.
    c.part();
    c.ellipse(4.5, 12.5, 2.4, 1.9, NOTE_GOLD);
    c.ellipse(11.5, 11, 2.4, 1.9, NOTE_GOLD);
    c.part();
    c.line(6, 3.5, 6, 12, NOTE_GOLD, () => n3(0.4, 0, 0.9), { bias: 1 });
    c.line(13, 2, 13, 10.5, NOTE_GOLD, () => n3(0.4, 0, 0.9), { bias: 1 });
    for (let k = 0; k < 2; k++) c.line(6, 3 + k, 13, 1.5 + k, NOTE_GOLD, () => TOP, { bias: 2 - k });
  }),
  icon_stars: icon((c) => {
    // A brass telescope on its tripod, pointed up at a bright star.
    c.part();
    c.line(7, 10, 4, 15, WOOD, () => FACE);
    c.line(8, 10, 8, 15, WOOD, () => FACE, { bias: 1 });
    c.line(9, 10, 12, 15, WOOD, () => FACE);
    c.part();
    c.capsule(3, 11, 11, 5, 1.2, 1.9, BRASS);
    c.part();
    c.ellipse(11.4, 4.8, 1.8, 1.8, BRASS, { normal: () => n3(0.6, 0.6, 0.5), bias: 1 });
    c.px(2, 11, BRASS, FACE, { bias: -1 });
    c.part();
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) c.px(14 + dx, 2 + dy, STARGLOW, FLATN, { bias: dx || dy ? 0 : 2 });
  }),
};

for (const [id, draw] of Object.entries(FIND_ART)) moreIcons.push({ name: `find_${id}`, draw });
for (const [id, draw] of Object.entries(DISH_ART)) moreIcons.push({ name: `dish_${id}`, draw });
for (const [name, draw] of Object.entries(BUTTON_ART)) moreIcons.push({ name, draw });

// ---------------------------------------------------------------- Little canvas textures

/** Notes, a bee, a glint: drawn straight on a canvas, made once. */
export function warmPastimes(scene: Phaser.Scene): void {
  if (scene.textures.exists('hl_pastime')) return;
  const tex = scene.textures.createCanvas('hl_pastime', 64, 12)!;
  const g = tex.getContext();
  const put = (ox: number, rows: string[], pal: Record<string, string>) =>
    rows.forEach((r, y) =>
      [...r].forEach((ch, x) => {
        if (!pal[ch]) return;
        g.fillStyle = pal[ch];
        g.fillRect(ox + x, y, 1, 1);
      }),
    );
  // Notes in white with a soft edge, to be tinted the note's colour.
  const W = { w: '#ffffff', s: '#c8c8d8' };
  put(0, ['...ww', '...w.w', '...w..w', '...w...', '...w...', '.www...', 'wwww...', 'www....', '.w.....'], W);
  put(8, ['..wwwww', '..w...w', '..w...w', '..w...w', '.ww..ww', 'www.www', 'www.www', '.w...w.'], W);
  put(16, ['...w', '...w', '...w', '...w', '.wsw', 'wwww', 'www.', '.w..'], W);
  // A bee: striped body, glassy wings up (frame 0) and down (frame 1).
  const B = { y: '#ffd23a', k: '#2a1a0a', w: '#e8f4ff', o: '#c89418' };
  put(24, ['.ww..', 'wwww.', '.yky.', 'oykyk', '.yky.'], B);
  put(30, ['.....', '.....', 'wyky.', 'oykyk', 'wyky.'], B);
  // A four-pointed glint.
  put(36, ['..w..', '..w..', 'wwsww', '..w..', '..w..'], { w: '#ffffff', s: '#fffbe0' });
  // A soft "z".
  put(42, ['www', '..w', '.w.', 'w..', 'www'], { w: '#ffffff' });
  tex.add('note0', 0, 0, 0, 7, 9);
  tex.add('note1', 0, 8, 0, 7, 8);
  tex.add('note2', 0, 16, 0, 4, 8);
  tex.add('bee0', 0, 24, 0, 5, 5);
  tex.add('bee1', 0, 30, 0, 5, 5);
  tex.add('glint', 0, 36, 0, 5, 5);
  tex.add('z', 0, 42, 0, 3, 5);
  tex.refresh();
}
