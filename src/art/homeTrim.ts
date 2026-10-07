// The Home's later lights and wall decor (see world/homeParts.ts): a moon
// lamp, a Tiffany lamp, string lights, a path light and a star lantern; and
// for the walls bunting, a plate rack, dried herbs, copper pans, a window box,
// a dreamcatcher, a sunburst mirror and an embroidery hoop.
//
// Drawn the way homeProps.ts draws everything: the game's high three-quarter
// view, each standing on its footprint (or hung on a wall's face), lit from
// the upper left. Only the glow changes between frames (the bulbs' twinkle,
// the star's flicker, the moon's shimmer), so the lit picture stays put.

import { cyl, sphere, type Material, type PixelCanvas, type RGB } from './pixel';
import { hash2, rng } from './env';
import { IRON, FIELDSTONE } from './sanctum';
import {
  BRASS, DARKW, FACE, LAVENDER, LEAF, LEAF_DARK, OAKW, PALEW, PETAL_Y, ROSE, SAGE, SOIL, STEM, TOP, TULIP_P, TULIP_R,
  art, box, decor, drum, halo, mat, n3, tufts, type PropArt,
} from './homeProps';

// ---------------------------------------------------------------- Materials

/** The moon lamp's globe: pale, cool and softly lit from within. */
const MOON: Material = { ...mat('#2a3450', '#56647e', '#76849e', '#96a4bc', '#b4c0d6', '#cdd7e8', '#e2e9f5', '#f6f9ff'), emissive: 0.22, noAO: true };
/** Dark bronze for the Tiffany lamp's foot, and the lead cames between its glass. */
const BRONZE: Material = { ...mat('#120a04', '#2a1a0c', '#442c14', '#5e401e', '#7a582a', '#96723a', '#b48e50'), shine: true };
const LEAD = mat('#0a0806', '#1a140c', '#2a2216', '#3a3020', '#4c402c');
// Stained glass, each a jewel colour glowing with the bulb behind it.
const AMBER_GL: Material = { ...mat('#2a1204', '#6a3208', '#a85a12', '#d8862a', '#f2ae4e', '#ffd086', '#ffe8bc'), emissive: 0.42, noAO: true };
const JADE_GL: Material = { ...mat('#04180e', '#0e3a22', '#1a6038', '#2e8a50', '#52b06c', '#86d494', '#c0f0c4'), emissive: 0.32, noAO: true };
const RUBY_GL: Material = { ...mat('#200408', '#5a0c18', '#981c2c', '#cc3444', '#ec6066', '#ff9a96', '#ffc8c0'), emissive: 0.42, noAO: true };
const COBALT_GL: Material = { ...mat('#060c24', '#122458', '#203e8a', '#3460b4', '#5a88d4', '#90b8ee', '#c4dcfa'), emissive: 0.32, noAO: true };
// Festoon bulbs, warm white and amber, on a dark wire.
const BULB_WARM: Material = { ...mat('#3a2008', '#8a5a1a', '#e0a850', '#ffd890', '#fff2cc', '#fffbee'), emissive: 0.95, noAO: true };
const BULB_AMBER: Material = { ...mat('#3a1a04', '#8a4610', '#d8802a', '#ffb050', '#ffd48a', '#fff0c8'), emissive: 0.95, noAO: true };
const WIRE: Material = { ...mat('#060606', '#16161a', '#24242a', '#34343c', '#46464e'), noOutline: true };
const SOCKET = mat('#060606', '#16161a', '#24242a', '#34343c', '#4a4a54');
/** Copper with the odd patch of verdigris, for the path light and the pans. */
const COPPER: Material = { ...mat('#180804', '#361406', '#56220c', '#784016', '#9a5a22', '#b87432', '#d29048', '#e8ae66', '#f8d098'), shine: true };
const VERDI = mat('#06140e', '#14382c', '#205044', '#2e6a5a', '#428472', '#5ca08a', '#7cbaa4');
/** Frosted glass under the path light's cap. */
const FROST: Material = { ...mat('#3a2a10', '#8a6a3a', '#d8b878', '#ffe2a8', '#fff4d8', '#fffcf2'), emissive: 0.85, noAO: true };
/** The star lantern's gold paper. */
const STAR_PAPER: Material = { ...mat('#3a2404', '#8a5a0e', '#c88e1e', '#eebc3e', '#ffdc78', '#fff0b4', '#fffbe4'), emissive: 0.7, noAO: true };
const TASSEL = mat('#1a0204', '#4a0a0e', '#7a1418', '#a82222', '#d03a2e', '#e8624a');
// Bunting in soft colours.
const FLAG_PINK = mat('#2a0c14', '#6a2a3a', '#a24c5e', '#d0727e', '#eca0a4', '#fcc8c4', '#ffe4e0');
const FLAG_BUTTER = mat('#2a2008', '#6a5420', '#a88a38', '#d8b858', '#f2d884', '#fff0b8', '#fffadc');
const FLAG_MINT = mat('#0a2018', '#225040', '#3a7e64', '#5aa888', '#88ccaa', '#bce8d0', '#e0f8ec');
const FLAG_SKY = mat('#0a1828', '#24466a', '#3e6a98', '#5e90c0', '#8cb6dc', '#bed8f0', '#e0eefa');
const TWINE: Material = { ...mat('#241a10', '#5e503a', '#88785a', '#b0a07e', '#d0c29e', '#e8dcbc'), noOutline: true };
/** Glazed china and its blue painting. */
const CHINA: Material = { ...mat('#2a2c34', '#7c808c', '#a8acb6', '#cacdd4', '#e2e4e8', '#f2f3f5', '#fdfdfe'), shine: true };
const DELFT = mat('#06102a', '#142a5c', '#22428a', '#3a62b0', '#5a86cc', '#86aade');
// Dried things: straw stems, dusty roses, yarrow.
const DRY_STEM: Material = { ...mat('#1a1608', '#3e3818', '#5c5426', '#7a7036', '#968c4a', '#b0a662'), noOutline: true };
const DRY_ROSE = mat('#200a0e', '#542430', '#7e3a48', '#a45662', '#c47a80', '#dca0a0');
const YARROW = mat('#2a2008', '#6a5620', '#a08638', '#c8aa52', '#e2c872', '#f2e0a0');
/** The window box's duck-egg paint. */
const BOX_PAINT = mat('#0e1a20', '#2e4a56', '#466a78', '#608a98', '#80aab4', '#a4c8cc', '#c8e2e2', '#e4f2f0');
const DAISY = mat('#2a2a30', '#9898a4', '#c4c4cc', '#e2e2e8', '#f6f6fa', '#ffffff');
// The dreamcatcher: a leather-wrapped hoop, a pale web, turquoise beads, feathers.
const WRAP = mat('#1a0e06', '#422814', '#64401e', '#86582c', '#a6743c', '#c4925a', '#dcae76');
const WEB: Material = { ...mat('#2a2418', '#7a705c', '#a69c86', '#cac2ae', '#e8e2d2', '#fbf8ef'), noOutline: true, noAO: true };
const TURQ: Material = { ...mat('#04201e', '#0e4a46', '#1a7470', '#2ea09a', '#56c6bc', '#94e6dc'), shine: true };
const CORAL: Material = { ...mat('#2a0c06', '#6a2414', '#a03e24', '#cc5c3a', '#ea845a', '#fcae84'), shine: true };
const FEATHER = mat('#2a2620', '#8a8478', '#b4ae9e', '#d4cebe', '#ece8dc', '#faf8f0', '#ffffff');
/** The sunburst's looking glass. */
const MIRROR: Material = { ...mat('#0e1620', '#283848', '#425466', '#5e7486', '#7c94a6', '#9eb6c4', '#c4d8e2', '#eaf4f8'), noAO: true };
const CLOTH = mat('#2a2218', '#6c5e4c', '#94846c', '#baaa8e', '#d8cbb0', '#ece2ca', '#f8f2e2');
const FLOSS: Material = { ...mat('#2a0814', '#5a1a30', '#8c2c4c', '#bc4868', '#e07088', '#f8a0b0', '#ffd0d8'), noOutline: true };

const MOONLIGHT: RGB = [190, 214, 255];
const WARM: RGB = [255, 196, 120];
const GOLD: RGB = [255, 222, 140];

// ---------------------------------------------------------------- Helpers

/** A pool of light lying on the ground, wider than it is deep: only in the glow. */
function pool(c: PixelCanvas, cx: number, cy: number, rx: number, ry: number, col: RGB, a: number): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      if (d < 1) c.spark(x, y, col, a * (1 - d) * (1 - d));
    }
  }
}

/** A tiny four-pointed twinkle in the glow. */
function twinkle(c: PixelCanvas, x: number, y: number, col: RGB, a: number): void {
  c.spark(x, y, col, a);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.spark(x + dx, y + dy, col, a * 0.4);
}

/** A sagging line between two points (a wire, a string), its row at each column. */
const sagAt = (x: number, xa: number, xb: number, ya: number, yb: number, sag: number): number => {
  const t = (x + 0.5 - xa) / (xb - xa);
  return ya + (yb - ya) * t + sag * 4 * t * (1 - t);
};

/** Draw a sagging line pixel by pixel, filling the steps so it never breaks. */
function sagLine(c: PixelCanvas, xa: number, xb: number, ya: number, yb: number, sag: number, m: Material, bias = 1): void {
  let prev = Math.round(sagAt(xa, xa, xb, ya, yb, sag));
  for (let x = xa; x <= xb; x++) {
    const y = Math.round(sagAt(x, xa, xb, ya, yb, sag));
    const lo = Math.min(y, prev);
    const hi = Math.max(y, prev);
    for (let yy = lo; yy <= hi; yy++) c.px(x, yy, m, FACE, { bias: yy === y ? bias : bias - 1 });
    prev = y;
  }
}

// ---------------------------------------------------------------- Lights

const MOON_Z = 17;
const MOON_R = 5;
const CRATERS: [number, number, number][] = [[-1.8, -1.6, 1.4], [1.6, 0.6, 1.2], [-0.6, 2.2, 1], [2.2, -2.2, 0.8], [-3, 0.8, 0.8]];

const moonlamp = art('moonlamp', 4, 26, (c, g, f) => {
  // A pale moon globe, craters softly shaded, held in a brass cup on a slim
  // stand; its silvery light shimmers with a few twinkles round it.
  const cx = g.cx;
  const gy = g.y1 - 6;
  drum(c, cx, gy, 3.6, 1.9, 0, 1.5, BRASS);
  drum(c, cx, gy, 2.2, 1.1, 1.5, 2.5, BRASS);
  drum(c, cx, gy, 0.7, 0.45, 2.5, MOON_Z - 3, BRASS, null);
  drum(c, cx, gy, 1.4, 0.7, 7, 8, BRASS);
  // The globe, lit from the upper left like everything, darker on its far limb.
  const my = gy - MOON_Z;
  c.part();
  c.ellipse(cx, my, MOON_R, MOON_R, MOON, { normal: (_x, _y, dx, dy) => sphere(dx * 0.9, dy * 0.9), bias: -1 });
  // Seas: smooth darker patches.
  for (let y = Math.floor(my - MOON_R); y <= my + MOON_R; y++) {
    for (let x = Math.floor(cx - MOON_R); x <= cx + MOON_R; x++) {
      if (c.materialAt(x, y) !== MOON) continue;
      const n = hash2(Math.floor((x - cx + 9) / 2), Math.floor((y - my + 9) / 2), 6101);
      if (n > 0.72) c.shade(x, y, -1);
    }
  }
  // Craters: the rim facing the light falls in shadow, the far wall catches it.
  for (const [ox, oy, r] of CRATERS) {
    const kx = cx + ox;
    const ky = my + oy;
    for (let y = Math.floor(ky - r); y <= ky + r; y++) {
      for (let x = Math.floor(kx - r); x <= kx + r; x++) {
        if (c.materialAt(x, y) !== MOON) continue;
        const dx = (x + 0.5 - kx) / r;
        const dy = (y + 0.5 - ky) / r;
        if (dx * dx + dy * dy > 1) continue;
        const u = dx + dy;
        c.shade(x, y, u < -0.4 ? -2 : u > 0.6 ? 1 : -1);
      }
    }
  }
  // The brass cup it sits in, in front of its foot.
  c.part();
  c.shape(my + 3, my + 6, (y) => {
    const u = (y - my - 3) / 3;
    const hw = 3.2 - u * 1.8;
    return [cx - hw, cx + hw];
  }, BRASS, (_x, _y, t, u) => n3(t * 0.8, 0.2 - u * 0.5, 0.7));
  c.part();
  for (let x = Math.round(cx - 3); x < cx + 3; x++) c.px(x, my + 3, BRASS, TOP, { bias: x < cx ? 2 : 1 });
  // Its light: a cool pool, breathing, and twinkles drifting round.
  const breath = [0, 1, 2, 1][f];
  halo(c, cx, my, 10, MOONLIGHT, 0.26 + breath * 0.04);
  halo(c, cx, my, 6, [220, 236, 255], 0.12);
  const R = rng(6102);
  for (let k = 0; k < 3; k++) {
    const ph = R() * Math.PI * 2;
    const a = ph + f * 0.5;
    const on = (f + k) % 4;
    if (on === 3) continue;
    twinkle(c, Math.round(cx + Math.cos(a) * 7.5), Math.round(my - 1 + Math.sin(a) * 6), [210, 230, 255], on === 1 ? 0.75 : 0.45);
  }
  pool(c, cx, gy + 0.5, 6, 2.5, MOONLIGHT, 0.12);
}, 4, 4);

const TIF_Z0 = 17;
const TIF_Z1 = 25;

const tiffany = art('tiffany', 4, 29, (c, g, f) => {
  // A Tiffany lamp on a little round side table: a bronze foot and a dome of
  // jewel-coloured glass in lead, amber up top, a band of ruby flowers on
  // jade leaves, a scalloped hem of amber and cobalt drops.
  const cx = g.cx;
  const gy = g.y1 - 6;
  // The table: three splayed feet, a turned pedestal, a round top.
  c.part();
  for (const s of [-1, 1]) c.capsule(cx, gy - 3, cx + s * 3.5, gy + 0.5, 0.7, 0.6, OAKW);
  c.capsule(cx, gy - 2, cx, gy + 2, 0.7, 0.6, OAKW);
  drum(c, cx, gy, 0.9, 0.5, 2, 8, OAKW, null);
  drum(c, cx, gy, 1.5, 0.8, 4, 5.5, OAKW);
  drum(c, cx, gy, 4.8, 2.4, 8, 10, OAKW, OAKW, { topBias: 1, bias: -1 });
  // The lamp's foot, a little lily-pad base, and its stem.
  drum(c, cx, gy, 2.4, 1.2, 10, 11, BRONZE);
  drum(c, cx, gy, 0.6, 0.4, 11, TIF_Z0 + 1, BRONZE, null);
  // The dome.
  const top = gy - TIF_Z1;
  const foot = gy - TIF_Z0;
  c.part();
  c.shape(top, foot, (y) => {
    const u = (y - top) / (foot - top);
    const hw = 1.6 + Math.sqrt(u) * 5.6;
    return [cx - hw, cx + hw];
  }, AMBER_GL, (_x, _y, t, u) => n3(t * 0.75, 0.65 - u * 0.75, 0.6));
  for (let y = top; y <= foot; y++) {
    const u = (y - top) / (foot - top);
    for (let x = Math.floor(cx - 8); x < cx + 8; x++) {
      if (c.materialAt(x, y) !== AMBER_GL) continue;
      const dx = x + 0.5 - cx;
      const n = n3((dx / (1.6 + Math.sqrt(u) * 5.6)) * 0.75, 0.65 - u * 0.75, 0.6);
      const row = y - top;
      let m: Material = AMBER_GL;
      let b = 0;
      const col = Math.floor(dx + 8);
      if (row === 3 || row === 6) m = LEAD;
      else if (row === 4 || row === 5) {
        // The flower band: ruby blossoms on jade leaves.
        m = col % 4 === 1 || col % 4 === 2 ? RUBY_GL : JADE_GL;
        b = row === 4 ? 1 : 0;
      } else if (row >= 7) {
        // The hem: cobalt drops between amber.
        m = col % 4 < 2 ? COBALT_GL : AMBER_GL;
      } else {
        // The crown: honey panes between radial leads.
        if (row > 0 && Math.abs(dx) > 1 && col % 3 === 0) m = LEAD;
        b = row === 0 ? 1 : 0;
      }
      c.px(x, y, m, n, { bias: b });
    }
  }
  // Scallops: the hem's last row only under the drops.
  for (let x = Math.floor(cx - 8); x < cx + 8; x++) if (Math.floor(x + 0.5 - cx + 8) % 4 >= 2) c.erase(x, foot);
  // The bronze cap and its finial.
  c.part();
  c.ellipse(cx, top, 1.6, 0.8, BRONZE, { bias: 1 });
  c.px(cx - 0.5, top - 1, BRONZE, TOP, { bias: 2 });
  // Light falling from under the shade onto the table top.
  c.part();
  for (let x = Math.round(cx - 3); x < cx + 3; x++) c.px(x, foot + 1, AMBER_GL, n3(0, -0.8, 0.4), { bias: Math.abs(x + 0.5 - cx) < 2 ? 2 : 1, glow: 0.35 });
  const flick = [0, 1, 0, 2][f];
  pool(c, cx, gy - 10, 5, 2.4, WARM, 0.22 + flick * 0.03);
  halo(c, cx, gy - 18, 9, [255, 180, 110], 0.22 + flick * 0.03);
}, 4, 6);

const BULB_TS = [0.1, 0.28, 0.5, 0.72, 0.9];
const POST_H = 25;

const stringlights = art('stringlights', 3, 30, (c, g, f) => {
  // Two rustic posts with festoon lights sagging between them: warm round
  // bulbs that twinkle each on its own beat.
  const gy = g.y1 - 6;
  const xa = g.x0 + 2;
  const xb = g.x1 - 3;
  for (const [x, s] of [[xa, 6201], [xb, 6202]] as [number, number][]) {
    c.part();
    c.ellipse(x + 0.5, gy + 0.5, 2.4, 1.2, FIELDSTONE, { flatten: 0.7 });
    c.part();
    c.shape(gy - POST_H, gy, () => [x - 0.6, x + 1.6], OAKW, (_x, _y, t) => cyl(t, 0));
    for (let y = gy - POST_H; y < gy; y++) if (hash2(0, Math.floor(y / 3), s) > 0.7) c.shade(x + 1, y, -1);
    // A rounded cap, and the hook the wire hangs from.
    c.part();
    c.ellipse(x + 0.5, gy - POST_H - 0.5, 1.6, 1, OAKW, { bias: 1 });
    c.part();
    c.px(x === xa ? x + 2 : x - 1, gy - POST_H + 2, IRON, FACE, { bias: 2 });
    tufts(c, x + 0.5, gy + 2, 3, s, 4);
  }
  // The wire, its ends trailing down the far side of each post.
  const wy = gy - POST_H + 2;
  const sag = 6;
  c.part();
  sagLine(c, xa + 2, xb - 1, wy, wy, sag, WIRE, 1);
  c.part();
  for (let k = 0; k < 4; k++) {
    c.px(xa - 2, wy + k, WIRE, FACE, { bias: 0 });
    c.px(xb + 2, wy + k, WIRE, FACE, { bias: 0 });
  }
  // The bulbs hang from the wire.
  BULB_TS.forEach((t, k) => {
    const x = Math.round(xa + 2 + t * (xb - 1 - xa - 2));
    const y = Math.round(sagAt(x, xa + 2, xb - 1, wy, wy, sag));
    const m = k % 2 ? BULB_AMBER : BULB_WARM;
    const on = [1, 0.75, 0.55, 0.8][(f + k * 3) % 4];
    c.part();
    c.px(x, y + 1, SOCKET, FACE, { bias: 2 });
    c.part();
    c.ellipse(x + 0.5, y + 3, 1.4, 1.6, m, { normal: (_x, _y, dx, dy) => sphere(dx * 0.7, dy * 0.7), bias: 0, glow: on });
    c.shade(x, y + 2, 1);
    if (on === 1) twinkle(c, x, y + 3, [255, 236, 190], 0.5);
    halo(c, x + 0.5, y + 3, 5, WARM, 0.12 + on * 0.12);
  });
  pool(c, g.cx, gy + 1, 14, 3.5, WARM, 0.1);
}, 4, 3);

const pathlight = art('pathlight', 3, 12, (c, g, f) => {
  // A little copper garden light like a toadstool: a short post, a frosted
  // ring of glass under a broad cap gone green in spots, its warm light
  // pooling on the ground round its foot.
  const cx = g.cx;
  const gy = g.y1 - 6;
  const flick = [0, 1, 1, 0][f];
  pool(c, cx, gy + 0.5, 7.5, 3.6, WARM, 0.32 + flick * 0.04);
  // Pebbles round its foot, lit on their tops by it.
  c.part();
  for (const [dx, dy, r] of [[-4, 1, 1.2], [3.5, 1.5, 1], [-2.5, 2.5, 0.9], [5, 0, 0.8], [1, 3, 0.9]] as [number, number, number][]) {
    c.ellipse(cx + dx, gy + dy, r * 1.3, r, FIELDSTONE, { flatten: 0.7, bias: 1 });
  }
  drum(c, cx, gy, 1.9, 1, 0, 1, COPPER);
  drum(c, cx, gy, 1, 0.6, 1, 4, COPPER, null);
  // The frosted ring.
  drum(c, cx, gy, 2, 1, 4, 7, FROST, null, { bias: -1 });
  // Two copper bars across the glass.
  c.part();
  for (let y = gy - 6; y < gy - 3; y++) {
    c.px(cx - 1, y + 1, COPPER, FACE, { bias: 1 });
    c.px(cx + 1, y + 1, COPPER, FACE, { bias: -1 });
  }
  // The cap: a wide shallow dome with a dark lip.
  const lip = gy - 7;
  c.part();
  c.shape(lip - 4, lip, (y) => {
    const u = (y - lip + 4) / 4;
    const hw = 1 + Math.sqrt(u) * 3.8;
    return [cx - hw, cx + hw];
  }, COPPER, (_x, _y, t, u) => n3(t * 0.75, 0.62 - u * 0.7, 0.66));
  for (let x = Math.round(cx - 5); x < cx + 5; x++) if (c.materialAt(x, lip) === COPPER) c.shade(x, lip, -2);
  // Verdigris where the rain sits.
  c.part();
  for (const [dx, dy] of [[-2, -2], [-3, -1], [2, -2], [3, -1]]) c.px(cx + dx, lip + dy, VERDI, TOP, { bias: 2 + (dx < 0 ? 0 : -1) });
  c.px(cx - 0.5, lip - 5, COPPER, TOP, { bias: 2 });
  // The glow under the cap.
  for (let x = Math.round(cx - 3); x < cx + 3; x++) c.spark(x, lip + 1, [255, 230, 170], 0.5);
  halo(c, cx, lip + 2, 5, WARM, 0.25 + flick * 0.04);
  tufts(c, cx, gy + 2, 6, 6301, 5);
}, 4, 4);

const STAR_R = 5.2;
const STAR_IN = 2.4;

/** Is (x, y) inside a five-pointed star pointing up, centred at (cx, cy)? Gives the facet's normal when it is. */
function starAt(x: number, y: number, cx: number, cy: number): ReturnType<typeof n3> | null {
  const dx = x + 0.5 - cx;
  const dy = y + 0.5 - cy;
  const r = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx) + Math.PI / 2; // 0 at the top point
  const seg = (Math.PI * 2) / 5;
  const k = Math.round(a / seg);
  const da = a - k * seg; // from the nearest point's ridge
  // The edge from a point's tip in to the notch, in polar form.
  const f = Math.abs(da) / (seg / 2);
  const edge = STAR_R * STAR_IN / (STAR_IN + (STAR_R - STAR_IN) * f) * (1 + f * 0.08);
  if (r > edge + 0.15) return null;
  // Each point is two facets meeting at a ridge: tilt toward its own side.
  const ang = k * seg - Math.PI / 2 + Math.sign(da || 1) * Math.PI / 2;
  const tip = k * seg - Math.PI / 2;
  return n3(Math.cos(ang) * 0.5 + Math.cos(tip) * 0.15, -(Math.sin(ang) * 0.5 + Math.sin(tip) * 0.15), 0.8);
}

const starlantern = art('starlantern', 6, 34, (c, g, f) => {
  // A star of gold paper hung on a little chain from an iron shepherd's hook,
  // glowing and gently flickering, forget-me-nots at the hook's foot.
  const sx = g.cx - 4;
  const gy = g.y1 - 5;
  c.part();
  c.ellipse(sx, gy + 0.5, 2.6, 1.3, FIELDSTONE, { flatten: 0.7 });
  c.part();
  c.shape(gy - 31, gy, () => [sx - 0.8, sx + 0.8], IRON, (_x, _y, t) => cyl(t, 0));
  // The hook arcs over to the right.
  const ar = 4;
  const acx = sx + ar;
  const acy = gy - 31;
  c.part();
  for (let k = 0; k < 12; k++) {
    const a0 = Math.PI + (k / 12) * Math.PI;
    const a1 = Math.PI + ((k + 1) / 12) * Math.PI;
    c.capsule(acx + Math.cos(a0) * ar, acy + Math.sin(a0) * ar, acx + Math.cos(a1) * ar, acy + Math.sin(a1) * ar, 0.7, 0.7, IRON);
  }
  // The chain.
  const lx = Math.round(sx + ar * 2);
  c.part();
  for (let y = acy + 1; y < acy + 4; y++) c.px(lx, y, BRASS, FACE, { bias: y % 2 ? 2 : 0 });
  // The star, its facets catching light and glowing from within.
  const sy = acy + 9;
  const flick = [0.85, 1, 0.8, 0.95][f];
  c.part();
  for (let y = Math.floor(sy - STAR_R - 1); y <= sy + STAR_R + 1; y++) {
    for (let x = Math.floor(lx + 0.5 - STAR_R - 1); x <= lx + 0.5 + STAR_R + 1; x++) {
      const n = starAt(x, y, lx + 0.5, sy);
      if (n) c.px(x, y, STAR_PAPER, n, { bias: 1, glow: 0.6 * flick });
    }
  }
  // Its bright heart and the tassel under it.
  c.shade(lx, sy, 1);
  c.shade(lx, sy - 1, 1);
  c.part();
  c.px(lx, sy - STAR_R - 0.5, BRASS, TOP, { bias: 2 });
  c.part();
  c.px(lx, sy + 3, TASSEL, FACE, { bias: 2 });
  c.px(lx, sy + 4, TASSEL, FACE, { bias: 1 });
  c.px(lx, sy + 5, TASSEL, FACE, { bias: 0 });
  c.spark(lx, sy, [255, 250, 220], 0.6 * flick);
  halo(c, lx + 0.5, sy, 9, GOLD, 0.22 + (flick - 0.8) * 0.5);
  halo(c, lx + 0.5, sy, 4, [255, 240, 190], 0.15 * flick);
  // Forget-me-nots and grass at its foot.
  c.part();
  for (const [dx, dy] of [[-2.5, 0], [2, 1], [-1, 2]]) {
    c.px(sx + dx, gy + dy, FLAG_SKY, TOP, { bias: 2 });
    c.px(sx + dx + 1, gy + dy, FLAG_SKY, TOP, { bias: 1 });
    c.px(sx + dx, gy + dy + 1, FLAG_SKY, TOP, { bias: 0 });
    c.px(sx + dx + 1, gy + dy + 1, PETAL_Y, TOP, { bias: 2 });
  }
  tufts(c, sx, gy + 2, 5, 6401, 6);
}, 4, 5);

// ---------------------------------------------------------------- Wall decor

const FLAGS = [FLAG_PINK, FLAG_BUTTER, FLAG_MINT, FLAG_SKY];

const bunting = decor((c) => {
  // A string of little pennants in soft colours, sagging between two nails.
  const sag = 4;
  c.part();
  c.px(0, 1, BRASS, FACE, { bias: 2 });
  c.px(15, 1, BRASS, FACE, { bias: 0 });
  c.part();
  sagLine(c, 0, 15, 2, 2, sag, TWINE, 1);
  // Three pennants, each row's width so they taper evenly to a point.
  const ROWS = [5, 5, 3, 3, 3, 1, 1];
  [2, 8, 13].forEach((fx, k) => {
    const m = FLAGS[k === 2 ? 3 : k];
    const top = Math.round(sagAt(fx, 0, 15, 2, 2, sag)) + 1;
    c.part();
    ROWS.forEach((w, j) => {
      for (let i = 0; i < w; i++) {
        const x = fx - (w - 1) / 2 + i;
        const t = (x - fx) / 2.5;
        // Lit along its top and on the left, the right half falling away over a soft fold.
        let b = (j === 0 ? 1 : 0) + (x > fx ? -1 : 0);
        // One dotted, one striped, so they read as cloth.
        if (k === 0 && (x + j) % 2 === 0 && j > 0 && j < 5) b += 3;
        if (k === 2 && j % 2 === 1 && j < 5) b += 2;
        c.px(x, top + j, m, n3(t * 0.25 - 0.1, -0.3, 0.9), { bias: b });
      }
    });
  });
});

/** A plate standing in the rack: china, a painted rim of `rim`, a little posy in its middle. */
function plate(c: PixelCanvas, x: number, y: number, r: number, rim: Material, heart: Material): void {
  c.part();
  c.ellipse(x, y, r, r, CHINA, {
    normal: (_x, _y, dx, dy) => {
      const d = Math.hypot(dx, dy);
      return d > 0.65 ? sphere(dx * 0.7, dy * 0.7) : n3(-dx * 0.3, dy * 0.3, 0.95);
    },
    bias: 1,
  });
  // The painted rim: a band of strokes round it.
  for (let yy = Math.floor(y - r); yy <= y + r; yy++) {
    for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
      if (c.materialAt(xx, yy) !== CHINA) continue;
      const dx = xx + 0.5 - x;
      const dy = yy + 0.5 - y;
      const d = Math.hypot(dx, dy) / r;
      const a = Math.atan2(dy, dx);
      if (d > 1) continue;
      // A solid band, broken into little strokes on its inner edge.
      if (d > 0.72 || (d > 0.5 && Math.round(a * 2.6) % 2 === 0)) c.px(xx, yy, rim, sphere((dx / r) * 0.7, (dy / r) * 0.7), { bias: d > 0.72 ? 1 : 2 });
    }
  }
  c.part();
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) c.px(x - 0.5 + dx, y - 0.5 + dy, heart, FACE, { bias: 2 });
  c.px(x - 0.5, y - 0.5, PETAL_Y, FACE, { bias: 2 });
}

/** A little mug hung on a hook by its handle: china with a painted band. */
function mug(c: PixelCanvas, x: number, y: number, band: Material): void {
  c.part();
  for (let yy = y; yy < y + 3; yy++) {
    for (let xx = x; xx < x + 3; xx++) c.px(xx, yy, yy === y + 1 ? band : CHINA, cyl((xx - x - 1) / 1.5, 0), { bias: yy === y ? 1 : 0 });
  }
  c.px(x + 3, y + 1, CHINA, FACE, { bias: -1 });
  c.px(x + 1, y - 1, BRASS, FACE, { bias: 2 });
}

const plates = decor((c) => {
  // A pale wooden plate rack: two painted plates standing on its shelf
  // behind a rail, a curved crest over them, and mugs on hooks beneath.
  c.part();
  for (const x of [1, 14]) for (let y = 2; y < 14; y++) c.px(x, y, PALEW, FACE, { bias: x === 1 ? 1 : -1 });
  plate(c, 5, 7.5, 3.2, DELFT, ROSE);
  plate(c, 11, 7.5, 3.2, ROSE, DELFT);
  // The rail across the plates and the shelf they stand on.
  c.part();
  for (let x = 2; x < 14; x++) c.px(x, 9, PALEW, FACE, { bias: 1 });
  box(c, 1, 15, 12, 13, 0, 2, PALEW);
  // The crest: a gentle arch with a knob at each end.
  c.part();
  for (let x = 1; x < 15; x++) {
    const h = Math.round(1.5 * (1 - ((x + 0.5 - 8) / 7) ** 2));
    for (let y = 3 - h; y <= 3; y++) c.px(x, y, PALEW, FACE, { bias: y === 3 - h ? 2 : 0 });
  }
  c.px(1, 1, PALEW, TOP, { bias: 2 });
  c.px(14, 1, PALEW, TOP, { bias: 1 });
  // Mugs hung under the shelf.
  mug(c, 2, 14, DELFT);
  mug(c, 7, 14, ROSE);
  mug(c, 11, 14, FLAG_MINT);
});

const herbs = decor((c) => {
  // A peg rail with three bundles of herbs and flowers hung upside down to
  // dry: lavender, sage, and dusty roses with yarrow, each tied with twine.
  c.part();
  for (let y = 1; y < 4; y++) for (let x = 0; x < 16; x++) c.px(x, y, OAKW, FACE, { bias: y === 1 ? 2 : y === 3 ? -1 : 0 });
  const pegs = [3, 8, 13];
  c.part();
  for (const x of pegs) {
    c.px(x - 0.5, 3, DARKW, FACE, { bias: 2 });
    c.px(x - 0.5, 4, DARKW, FACE, { bias: 0 });
  }
  // One bundle: stems fanning from a tie, foliage heaped toward the bottom.
  const bundle = (x: number, len: number, seed: number, leaf: (xx: number, yy: number, R: () => number) => void) => {
    const R = rng(seed);
    c.part();
    for (let k = 0; k < 5; k++) {
      const spread = (k - 2) * 0.9;
      c.line(x, 6, x + spread, 6 + len, DRY_STEM, () => FACE, { bias: 1 + (k % 2) });
    }
    c.part();
    for (let k = 0; k < 16; k++) {
      const u = 0.35 + R() * 0.65;
      const xx = x + (R() - 0.5) * 2 * (0.6 + u * 2.2);
      const yy = 6 + u * len;
      leaf(xx, yy, R);
    }
    // The twine tied round the stems, and its loop over the peg.
    c.part();
    c.px(x - 1, 6, TWINE, FACE, { bias: 0 });
    c.px(x, 6, TWINE, FACE, { bias: 1 });
    c.px(x + 1, 6, TWINE, FACE, { bias: -1 });
    c.px(x, 5, TWINE, FACE, { bias: 0 });
  };
  bundle(3, 9, 6501, (xx, yy, R) => c.px(xx, yy, LAVENDER, FACE, { bias: Math.floor(R() * 3) + 1 }));
  bundle(8, 10, 6502, (xx, yy, R) => c.ellipse(xx, yy, 1, 0.8, SAGE, { bias: Math.floor(R() * 3) }));
  bundle(13, 8, 6503, (xx, yy, R) => {
    if (R() < 0.45) c.ellipse(xx, yy, 0.9, 0.9, DRY_ROSE, { bias: 1 + Math.floor(R() * 2) });
    else c.px(xx, yy, YARROW, FACE, { bias: 1 + Math.floor(R() * 3) });
  });
});

/** A pan's base seen face on, hung by its handle: a gently domed copper disc, the edge where it turns into its side, a bright glint. */
function panBase(c: PixelCanvas, x: number, y: number, r: number): void {
  c.part();
  c.ellipse(x, y, r, r, COPPER, { normal: (_x, _y, dx, dy) => (Math.hypot(dx, dy) > 0.8 ? sphere(dx * 0.8, dy * 0.8) : sphere(dx * 0.3, dy * 0.3)) });
  for (let yy = Math.floor(y - r); yy <= y + r; yy++) {
    for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
      if (c.materialAt(xx, yy) !== COPPER) continue;
      const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y) / r;
      if (Math.abs(d - 0.66) < 0.13) c.shade(xx, yy, -2);
    }
  }
  c.shade(x - r * 0.45, y - r * 0.45, 2);
  c.shade(x - r * 0.45 + 1, y - r * 0.45, 1);
  c.shade(x - r * 0.45, y - r * 0.45 + 1, 1);
}

/** A long handle up to its hook, a hole in its end. */
function handle(c: PixelCanvas, x: number, y0: number, y1: number, m: Material): void {
  c.part();
  for (let y = y0; y <= y1; y++) c.px(x, y, m, FACE, { bias: y === y0 + 1 ? -1 : 1 });
}

const pans = decor((c) => {
  // An iron rail on two brackets, copper hung from it on S-hooks: a big
  // frying pan with an oak handle, a saucepan, and a ladle hung from its rim.
  c.part();
  for (let x = 1; x < 16; x++) c.px(x, 2, IRON, FACE, { bias: 1 });
  for (const x of [1, 15]) {
    c.px(x, 1, IRON, FACE, { bias: 2 });
    c.px(x, 3, IRON, FACE, { bias: 0 });
  }
  // The frying pan, its oak handle up to the hook.
  handle(c, 5, 3, 6, DARKW);
  panBase(c, 5.5, 11, 4);
  // The saucepan, its copper handle.
  handle(c, 12, 3, 5, COPPER);
  panBase(c, 12.5, 8.5, 2.8);
  // A little ladle under it.
  c.part();
  c.line(13, 12, 13, 14, COPPER, () => FACE, { bias: 1 });
  c.ellipse(13, 15.5, 1.5, 1.4, COPPER, { normal: (_x, _y, dx, dy) => sphere(dx * 0.8, dy * 0.8) });
  // The hooks over the rail.
  c.part();
  for (const x of [5, 12]) c.px(x, 1, IRON, FACE, { bias: 3 });
});

const windowbox = decor((c) => {
  // A painted box under a window, on two brackets, brimming with geraniums
  // and daisies, ivy spilling over its front.
  c.part();
  for (const x of [3, 12]) for (let y = 13; y < 17; y++) {
    const w = 17 - y;
    for (let k = 0; k < Math.min(2, w); k++) c.px(x + (x < 8 ? -k : k), y, DARKW, FACE, { bias: k ? -1 : 1 });
  }
  // The box: a soil top and a front of painted planks.
  box(c, 1, 15, 11, 13, 0, 3, BOX_PAINT, { top: SOIL });
  for (let x = 1; x < 15; x++) c.shade(x, 11, 1);
  for (const x of [5, 10]) for (let y = 10; y < 13; y++) c.shade(x, y, -1);
  // Leaves heaped over the soil.
  c.part();
  const L = rng(6601);
  for (let k = 0; k < 14; k++) c.ellipse(2 + L() * 12, 6.5 + L() * 2.5, 1.4, 1, k % 3 ? LEAF : LEAF_DARK, { bias: Math.floor(L() * 3) });
  // Flowers: round heads of pink and red geranium, white daisies.
  const heads: [number, number, Material][] = [[4, 5, TULIP_P], [8.5, 4, TULIP_R], [12.5, 5, TULIP_P], [6.5, 7, ROSE]];
  for (const [x, y, m] of heads) {
    c.part();
    c.ellipse(x, y, 1.7, 1.5, m, { bias: 1 });
    c.shade(x - 1, y - 1, 2);
    c.shade(x, y - 1, 1);
  }
  c.part();
  for (const [x, y] of [[2, 7], [10.5, 6.5], [14, 7.5]]) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.px(x + dx, y + dy, DAISY, FACE, { bias: dy < 0 || dx < 0 ? 3 : 2 });
    c.px(x, y, PETAL_Y, FACE, { bias: 2 });
  }
  // Ivy over the front.
  c.part();
  for (const [x0, len] of [[2, 6], [8, 5], [13, 4]] as [number, number][]) {
    for (let k = 0; k < len; k++) {
      const x = x0 + Math.round(Math.sin(k * 0.9 + x0) * 0.7);
      const y = 9 + k;
      c.px(x, y, STEM, FACE, { bias: 0 });
      if (k % 2 === 1) c.px(x + (k % 4 === 1 ? -1 : 1), y, k % 4 === 1 ? LEAF : LEAF_DARK, FACE, { bias: 2 });
    }
  }
});

const dreamcatcher = decor((c) => {
  // A leather-wrapped hoop with a web woven across it round a turquoise bead,
  // three strands of beads and feathers hanging below.
  const cx = 8;
  const cy = 6.5;
  const R0 = 5.4;
  // The web: a thread from each knot on the hoop in to the bead, left open
  // so the wall shows through.
  c.part();
  const N = 6;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2 + Math.PI / 6;
    c.line(cx + Math.cos(a) * (R0 - 1) - 0.5, cy + Math.sin(a) * (R0 - 1) - 0.5, cx + Math.cos(a) * 1.5 - 0.5, cy + Math.sin(a) * 1.5 - 0.5, WEB, () => FACE, { bias: k < 3 ? -1 : 0 });
  }
  // The hoop.
  c.part();
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const x = cx + Math.cos(a) * R0;
    const y = cy + Math.sin(a) * R0;
    c.px(x - 0.5, y - 0.5, WRAP, sphere(Math.cos(a) * 0.7, Math.sin(a) * 0.7), { bias: k % 4 === 0 ? -1 : 1 });
  }
  // The bead in the middle, and the loop it hangs from.
  c.part();
  c.ellipse(cx, cy, 1, 1, TURQ, { bias: 1 });
  c.part();
  c.px(cx - 0.5, 0, WRAP, FACE, { bias: 2 });
  // The strands: string, a bead, a feather.
  const strand = (x: number, y0: number, len: number, bead: Material, tip: Material) => {
    c.part();
    for (let y = y0; y < y0 + len; y++) c.px(x, y, TWINE, FACE, { bias: 1 });
    c.px(x, y0 + 1, bead, sphere(-0.4, 0.4), { bias: 2 });
    c.part();
    const fy = y0 + len;
    c.shape(fy, fy + 4, (y) => {
      const u = (y - fy) / 4;
      const hw = 0.5 + Math.sin(u * Math.PI) * 0.9;
      return [x + 0.5 - hw, x + 0.5 + hw];
    }, FEATHER, (_x, _y, t) => n3(t * 0.5, -0.3, 0.85));
    c.px(x, fy + 4, tip, FACE, { bias: 2 });
    c.px(x + 1, fy + 3, tip, FACE, { bias: 1 });
  };
  strand(4, 10, 2, CORAL, FLAG_SKY);
  strand(7.5, 12, 1, TURQ, DRY_ROSE);
  strand(11, 10, 2, CORAL, FLAG_SKY);
});

const sunmirror = decor((c) => {
  // A gilded sunburst: rays long and short round a beaded ring, a round
  // looking glass in its middle with a soft sheen across it.
  const cx = 8;
  const cy = 9;
  const N = 12;
  c.part();
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const k = Math.round(a / ((Math.PI * 2) / N));
      const da = a - k * ((Math.PI * 2) / N);
      const long = ((k % 2) + 2) % 2 === 0;
      const L = long ? 8.2 : 6.4;
      if (r < 4 || r > L) continue;
      const u = (r - 4) / (L - 4);
      const hw = (long ? 1.3 : 1.1) * (1 - u) + 0.3;
      if (Math.abs(da) * r > hw) continue;
      // Each ray a ridge: its side toward the light bright, the other dim.
      const s = Math.sign(da || 1);
      const px = (-dy / r) * s;
      const py = (dx / r) * s;
      c.px(x, y, BRASS, n3(px * 0.6 + (dx / r) * 0.15, -(py * 0.6 + (dy / r) * 0.15), 0.75), { bias: long ? 0 : -1 });
    }
  }
  // The beaded ring.
  c.part();
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      if (r < 3.4 || r > 4.6) continue;
      const bead = Math.round((Math.atan2(dy, dx) / Math.PI) * 8) % 2 === 0;
      c.px(x, y, BRASS, sphere((dx / r) * 0.7, (dy / r) * 0.7), { bias: bead ? 1 : 0 });
    }
  }
  // The glass.
  c.part();
  c.ellipse(cx, cy, 3.4, 3.4, MIRROR, { normal: () => FACE, bias: 1 });
  for (let y = Math.floor(cy - 3); y <= cy + 3; y++) {
    for (let x = Math.floor(cx - 3); x <= cx + 3; x++) {
      if (c.materialAt(x, y) !== MIRROR) continue;
      const u = x - cx + (y - cy);
      if (Math.abs(u + 1) < 0.8) c.shade(x, y, 3);
      else if (Math.abs(u - 1.5) < 0.5) c.shade(x, y, 2);
      else if (y > cy + 1) c.shade(x, y, -1);
    }
  }
});

const hoop = decor((c) => {
  // An embroidery hoop hung from a ribbon: linen stretched in a wooden ring,
  // a pink flower stitched on it with leaves and little blue knots, the
  // thread still trailing from it.
  const cx = 8;
  const cy = 9.5;
  // The ribbon loop over the nail.
  c.part();
  c.px(7, 1, FLAG_PINK, FACE, { bias: 2 });
  c.px(8, 1, FLAG_PINK, FACE, { bias: 1 });
  c.px(6, 2, FLAG_PINK, FACE, { bias: 2 });
  c.px(9, 2, FLAG_PINK, FACE, { bias: 0 });
  // The linen, its weave showing.
  c.part();
  c.ellipse(cx, cy, 5.2, 5.2, CLOTH, { normal: () => FACE, bias: 1 });
  for (let y = 3; y < 16; y++) for (let x = 2; x < 14; x++) if (c.materialAt(x, y) === CLOTH && (x + y * 3) % 4 === 0) c.shade(x, y, -1);
  // The stitching: a stem, two leaves, five petals round a gold heart, knots.
  c.part();
  for (let y = 10; y < 14; y++) c.px(cx - 0.5 + (y > 12 ? -1 : 0), y, STEM, FACE, { bias: 2 });
  c.px(cx - 2.5, 11, LEAF, FACE, { bias: 2 });
  c.px(cx - 1.5, 11, LEAF, FACE, { bias: 1 });
  c.px(cx + 0.5, 12, LEAF, FACE, { bias: 2 });
  c.px(cx + 1.5, 11, LEAF, FACE, { bias: 1 });
  c.part();
  const fy = 7.5;
  c.ellipse(cx, fy, 2.4, 2.4, FLOSS, { normal: () => FACE });
  for (let y = Math.floor(fy - 3); y <= fy + 3; y++) {
    for (let x = Math.floor(cx - 3); x <= cx + 3; x++) {
      if (c.materialAt(x, y) !== FLOSS) continue;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - fy;
      // Petals lighter toward their tips on the lit side, a notch between each.
      c.shade(x, y, Math.hypot(dx, dy) > 1.5 ? (dx + dy < 0 ? 2 : 0) : 1);
    }
  }
  for (const [x, y] of [[cx - 2, fy - 2], [cx + 1, fy - 2], [cx - 2, fy + 1], [cx + 1, fy + 1]]) c.erase(x, y);
  c.part();
  c.px(cx - 0.5, fy - 0.5, PETAL_Y, FACE, { bias: 2 });
  c.part();
  for (const [x, y] of [[4, 8], [11, 7], [11, 11], [4, 11]]) c.px(x, y, LAVENDER, FACE, { bias: 3 });
  // The wooden ring, inner and outer hoop, and its brass screw.
  c.part();
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      if (r < 5.1 || r > 6.4) continue;
      c.px(x, y, PALEW, sphere((dx / r) * 0.75, (dy / r) * 0.75), { bias: r > 5.8 ? 0 : 1 });
    }
  }
  c.part();
  c.px(7, 3, BRASS, FACE, { bias: 2 });
  c.px(8, 3, BRASS, FACE, { bias: 1 });
  c.px(7.5, 2.5, BRASS, TOP, { bias: 2 });
  // The thread trailing from the flower out over the hoop.
  c.part();
  c.line(10, 9, 13, 13, FLOSS, () => FACE, { bias: 1 });
  c.line(13, 14, 13, 17, FLOSS, () => FACE, { bias: 0 });
});

// ---------------------------------------------------------------- The list

export const TRIM_ART: Record<string, PropArt> = {
  moonlamp,
  tiffany,
  stringlights,
  pathlight,
  starlantern,
  bunting,
  plates,
  herbs,
  pans,
  windowbox,
  dreamcatcher,
  sunmirror,
  hoop,
};

/** The turning ones' side (facing east; west is it mirrored) and back views: none turn. */
export const TRIM_TURNS: Record<string, { side: PropArt; back: PropArt }> = {};
