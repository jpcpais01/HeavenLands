// Starwatch's art: the night sky round and below the isle (unlit: indigo
// deepening to violet, the Milky Way laid across it with its dark dust
// lanes, a soft rose and teal haze of nebula, a crescent moon in its halo,
// far isles with a lit window each, and moonlit clouds drifting far below),
// the isle itself (lit, with its own normal map and a glow layer: a night
// meadow starred with moonflowers, the moonstone terrace with the sky's map
// laid in its floor, a flagstone path, a pond full of reflected stars, two
// blankets on the grass, and rock hanging under its front edge with roots
// and glowing crystals), its props (lanterns, benches, the telescope,
// standing stones, starblossom trees, moonflowers, islets drifting near),
// the shooting stars, and its loading picture. Pure: a worker paints it.

import type Phaser from 'phaser';
import { Bitmap, bayer, clamp01, mix } from '../../art/bitmap';
import { hash2, rng, valueNoise } from '../../art/env';
import { KEY_LIGHT, PixelCanvas, cyl, hex, sphere, type Material, type RGB, type Vec3 } from '../../art/pixel';
import { packAtlas, registerAtlas } from '../../art/atlas';
import { pixelCanvas } from '../../art/canvas';
import type { LoadArt } from '../../art/loadArt';
import {
  BLANKETS,
  PATH_HALF,
  POND,
  SW_CX,
  SW_CY,
  SW_H,
  SW_RX,
  SW_RY,
  SW_UNDER,
  SW_W,
  TERRACE,
  TERRACE_STEP,
  blanketAt,
  frontEdgeY,
  isleR,
  pathDist,
  pondR,
  terraceR,
} from './layout';

const ramp = (...c: string[]): RGB[] => c.map(hex);

function fbm(x: number, y: number, scale: number, seed: number, octaves = 3): number {
  let v = 0;
  let amp = 0.5;
  let s = scale;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x, y, s, seed + i * 17) * amp;
    total += amp;
    amp *= 0.5;
    s *= 0.5;
  }
  return v / total;
}

const smooth = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Pick along a colour ramp, 0..1, blending between its steps. */
function along(r: RGB[], t: number): RGB {
  const f = clamp01(t) * (r.length - 1);
  const i = Math.min(r.length - 2, Math.floor(f));
  return mix(r[i], r[i + 1], f - i);
}

/** A ramp step, dithered between neighbours so gradients read as pixel art. */
const pick = (r: RGB[], idx: number, x: number, y: number): RGB => r[Math.max(0, Math.min(r.length - 1, Math.floor(idx + bayer(x, y))))];

/** Add `c` scaled by `k` into the pixel. */
function addTo(px: Uint8ClampedArray, i: number, c: RGB, k: number): void {
  px[i] = Math.min(255, px[i] + c[0] * k);
  px[i + 1] = Math.min(255, px[i + 1] + c[1] * k);
  px[i + 2] = Math.min(255, px[i + 2] + c[2] * k);
}

// ---------------------------------------------------------------- The sky

const SKY = ramp('#07071a', '#0b0b24', '#10112e', '#151838', '#1b1f46', '#222852', '#2a3260');
const MILKY = ramp('#2a2a5a', '#3e3a72', '#5a5088', '#7c6a9c', '#a48eb0', '#cab4c4', '#efdcd6');
const DUST: RGB = hex('#0a0920');
const ROSE: RGB = hex('#7a3a78');
const TEAL: RGB = hex('#1a5a72');
const NIGHT_CLOUD = ramp('#1a1a40', '#24264e', '#30335e', '#40446e', '#555a82', '#6e7498', '#8e94b2', '#b4b8cc');
const STARS: RGB[] = [hex('#ffffff'), hex('#dce8ff'), hex('#b8d0ff'), hex('#fff0d0'), hex('#ffd8e8')];

/** The moon: where it hangs and how big. */
export const MOON = { x: 132, y: 104, r: 22 };

/** The Milky Way's line across the sky: from lower left to upper right. */
const BAND_A: [number, number] = [-80, 720];
const BAND_B: [number, number] = [1040, 40];
const BAND_LEN = Math.hypot(BAND_B[0] - BAND_A[0], BAND_B[1] - BAND_A[1]);
const BAND_N: [number, number] = [-(BAND_B[1] - BAND_A[1]) / BAND_LEN, (BAND_B[0] - BAND_A[0]) / BAND_LEN];

/** How far (px) a point lies off the Milky Way's middle line, signed, and how far along it. */
function band(x: number, y: number): { d: number; t: number } {
  const dx = x - BAND_A[0];
  const dy = y - BAND_A[1];
  return { d: dx * BAND_N[0] + dy * BAND_N[1], t: (dx * (BAND_B[0] - BAND_A[0]) + dy * (BAND_B[1] - BAND_A[1])) / (BAND_LEN * BAND_LEN) };
}

/** Far isles hazed into the night: centre, width, and whether a window is lit. */
const FAR_ISLES: { x: number; y: number; s: number; lit: boolean }[] = [
  { x: 820, y: 96, s: 24, lit: true },
  { x: 60, y: 420, s: 18, lit: false },
  { x: 900, y: 520, s: 16, lit: true },
  { x: 214, y: 690, s: 22, lit: true },
  { x: 760, y: 712, s: 14, lit: false },
];

/** Is (x, y) off the isle and its hanging rock, roughly (stars and haze needn't be painted under it)? */
const underIsle = (x: number, y: number): boolean => isleR(x, y) < 0.97 || (Math.abs(x - SW_CX) < SW_RX * 0.95 && y > SW_CY && y < SW_CY + SW_RY + SW_UNDER * 0.8 * (1 - ((x - SW_CX) / SW_RX) ** 2));

/**
 * The backdrop, one image the size of the arena: deep blue night, the
 * Milky Way across it, nebula, stars, the moon, far isles and the moonlit
 * cloud sea far below along the bottom.
 */
export function* skyCanvas(): Generator<void, Uint8ClampedArray, void> {
  const W = SW_W;
  const H = SW_H;
  const px = new Uint8ClampedArray(W * H * 4);
  const R = rng(5150);

  // The noise is costly, so it is sampled every other pixel and blended.
  const GW = Math.ceil(W / 2) + 3;
  const GH = Math.ceil(H / 2) + 3;
  const gN = new Float32Array(GW * GH);
  const gL = new Float32Array(GW * GH);
  const gC = new Float32Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) {
    if (gy % 8 === 0) yield;
    for (let gx = 0; gx < GW; gx++) {
      const x = gx * 2;
      const y = gy * 2;
      const wx = x + (fbm(x, y, 80, 13) - 0.5) * 70;
      const wy = y + (fbm(x, y, 80, 31) - 0.5) * 70;
      const j = gy * GW + gx;
      gN[j] = fbm(wx, wy, 60, 5, 4);
      // The dust lanes: long dark ribbons along the band.
      gL[j] = fbm(wx * 0.8 + wy * 0.5, wy * 1.1 - wx * 0.3, 34, 41, 3);
      // Clouds far below are wider than tall, seen from here.
      gC[j] = fbm(x + (fbm(x, y, 110, 61) - 0.5) * 80, y * 1.7, 110, 71, 4);
    }
  }
  const sample = (g: Float32Array, x: number, y: number) => {
    const fx = Math.max(0, Math.min(GW - 2, x / 2));
    const fy = Math.max(0, Math.min(GH - 2, y / 2));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const j = y0 * GW + x0;
    const top = g[j] + (g[j + 1] - g[j]) * tx;
    const bot = g[j + GW] + (g[j + GW + 1] - g[j + GW]) * tx;
    return top + (bot - top) * ty;
  };

  for (let y = 0; y < H; y++) {
    if (y % 12 === 0) yield;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const n = sample(gN, x, y);
      const lane = sample(gL, x, y);
      // Deep at the top, lifting toward the clouds at the bottom, and a moonlit lift round the moon.
      const moonLift = Math.exp(-(((x - MOON.x) / 210) ** 2 + ((y - MOON.y) / 170) ** 2)) * 0.22;
      let col = along(SKY, 0.18 + (y / H) * 0.5 + (n - 0.5) * 0.22 + moonLift);
      // Nebula: a rose haze toward the upper left, a teal one low on the right, both faint.
      const a = Math.exp(-(((x - 250) / 230) ** 2 + ((y - 230) / 160) ** 2)) * smooth(0.45, 0.8, n);
      const b = Math.exp(-(((x - 760) / 220) ** 2 + ((y - 560) / 170) ** 2)) * smooth(0.42, 0.78, n);
      col = mix(col, ROSE, Math.min(0.42, a * 0.7));
      col = mix(col, TEAL, Math.min(0.42, b * 0.7));
      // The Milky Way: a soft broad glow, a brighter knotted core, dust lanes cut through it.
      const { d, t } = band(x, y);
      const wob = (fbm(x, y, 140, 83, 2) - 0.5) * 70;
      const broad = Math.exp(-(((d + wob) / 130) ** 2));
      const core = Math.exp(-(((d + wob * 0.6) / 52) ** 2)) * (0.55 + Math.sin(t * Math.PI) * 0.45);
      const dust = smooth(0.5, 0.66, lane) * Math.exp(-(((d + wob * 0.6 - 8) / 40) ** 2));
      const glowK = clamp01(broad * (0.28 + n * 0.5) + core * (0.3 + smooth(0.4, 0.75, n) * 0.55)) * (1 - dust * 0.85);
      if (glowK > 0.02) col = mix(col, along(MILKY, glowK * 1.1), Math.min(0.85, glowK * 1.15));
      if (dust > 0.05) col = mix(col, DUST, dust * 0.55 * broad);
      // The cloud sea far below, rising into view along the bottom, moonlit on its upper left.
      const cl = sample(gC, x, y);
      const deep = smooth(H * 0.7, H, y);
      const dens = smooth(0.5 - deep * 0.2, 0.66 - deep * 0.2, cl) * smooth(H * 0.62, H * 0.82, y);
      if (dens > 0) {
        const lit = (cl - sample(gC, x + 6, y + 8)) * 6;
        const c = along(NIGHT_CLOUD, clamp01(0.3 + dens * 0.25 + lit + (y / H - 0.8) * 0.4));
        col = mix(col, c, Math.min(1, dens * 1.4));
      }
      const q = 6;
      const dd = bayer(x, y);
      px[i] = Math.min(255, Math.floor(col[0] / q + dd) * q);
      px[i + 1] = Math.min(255, Math.floor(col[1] / q + dd) * q);
      px[i + 2] = Math.min(255, Math.floor(col[2] / q + dd) * q);
      px[i + 3] = 255;
    }
  }
  yield;

  // Far isles, small dark shapes with a lip of moonlight and maybe a window.
  for (const f of FAR_ISLES) farIsle(px, W, H, f.x, f.y, f.s, f.lit);

  // The moon: a crescent lit from the left, its dark part faintly earthlit, in a wide halo.
  for (let y = MOON.y - 90; y < MOON.y + 90; y++) {
    for (let x = MOON.x - 90; x < MOON.x + 90; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y * W + x) * 4;
      const dx = (x + 0.5 - MOON.x) / MOON.r;
      const dy = (y + 0.5 - MOON.y) / MOON.r;
      const dm = Math.hypot(dx, dy);
      if (dm > 1) {
        const halo = Math.exp(-((dm - 1) * 1.1)) * 0.38 + Math.exp(-((dm - 1) * 5)) * 0.25;
        if (halo > 0.03 && bayer(x, y) < halo * 2.2) addTo(px, i, hex('#c8cce8'), halo * 0.45);
        continue;
      }
      // The shadow's edge: a second disc offset to the right.
      const sh = Math.hypot(dx - 0.46, dy + 0.1);
      const lit = smooth(0.9, 1.08, sh);
      const z = Math.sqrt(1 - dm * dm);
      const shade = clamp01(0.35 + -dx * 0.4 - dy * 0.25 + z * 0.4);
      const maria = fbm(x, y, 7, 33, 2) > 0.58 ? 0.82 : 1;
      let c = mix(hex('#1c2040'), hex('#f6f2e4'), lit * shade * maria);
      if (lit > 0.05 && dm > 0.9) c = mix(c, hex('#fffaf0'), 0.5 * lit);
      if (lit < 0.05) c = mix(hex('#141834'), hex('#2a2e50'), z * 0.6);
      px.set([c[0], c[1], c[2], 255], i);
    }
  }
  yield;

  // Stars: many faint, crowded along the Milky Way, a few bright with a little cross of light.
  for (let k = 0; k < 4200; k++) {
    let x = Math.floor(R() * W);
    let y = Math.floor(R() * H);
    // Half of them gather to the band.
    if (k % 2 === 0) {
      const t = R();
      const off = (R() + R() + R() - 1.5) * 120;
      x = Math.floor(BAND_A[0] + (BAND_B[0] - BAND_A[0]) * t + BAND_N[0] * off);
      y = Math.floor(BAND_A[1] + (BAND_B[1] - BAND_A[1]) * t + BAND_N[1] * off);
    }
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 2 || underIsle(x, y)) continue;
    // Not over the thick of the clouds below.
    if (y > H * 0.72 && R() < 0.8) continue;
    const bright = Math.pow(R(), 3.2);
    const c = STARS[Math.floor(R() * STARS.length)];
    const i = (y * W + x) * 4;
    addTo(px, i, c, 0.18 + bright * 0.82);
    if (bright > 0.5) {
      for (const [ox, oy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = x + ox;
        const yy = y + oy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        addTo(px, (yy * W + xx) * 4, c, (bright - 0.35) * 0.45);
      }
    }
    if (bright > 0.85) {
      for (const [ox, oy] of [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ]) {
        const xx = x + ox;
        const yy = y + oy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        addTo(px, (yy * W + xx) * 4, c, 0.14);
      }
    }
  }
  return px;
}

function farIsle(px: Uint8ClampedArray, W: number, H: number, cx: number, cy: number, s: number, lit: boolean): void {
  const top = hex('#262a52');
  const lip = hex('#5a6290');
  const rock = hex('#141632');
  for (let y = cy - s; y < cy + s * 1.4; y++) {
    for (let x = cx - s - 2; x <= cx + s + 2; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const u = (x + 0.5 - cx) / s;
      const v = (y + 0.5 - cy) / (s * 0.34);
      const i = (y * W + x) * 4;
      if (u * u + v * v <= 1) {
        const c = v < -0.55 && u < 0.3 ? lip : top;
        px.set([c[0], c[1], c[2], 255], i);
        continue;
      }
      // The rock beneath, tapering to a point, a little ragged.
      const below = (y + 0.5 - cy) / (s * 1.3);
      if (below > 0 && Math.abs(u) < (1 - below) * (0.9 + hash2(x, 3, 7) * 0.12)) px.set([rock[0], rock[1], rock[2], 255], i);
    }
  }
  if (lit) {
    // A cottage's lit window, and its glow.
    const wx = Math.round(cx + s * 0.25);
    const wy = Math.round(cy - s * 0.12);
    for (let y = wy - 3; y <= wy + 3; y++) {
      for (let x = wx - 3; x <= wx + 3; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = Math.hypot(x - wx, y - wy);
        if (d < 3.5) addTo(px, (y * W + x) * 4, hex('#ffb060'), (1 - d / 3.5) * 0.5);
      }
    }
    px.set([255, 214, 140, 255], (wy * W + wx) * 4);
  }
}

// ---------------------------------------------------------------- The isle

/** The isle image's box in arena coordinates: the top, its edge and what hangs under it. */
export const ISLE_X = Math.floor(SW_CX - SW_RX * 1.1) - 2;
export const ISLE_Y = Math.floor(SW_CY - SW_RY * 1.1) - 2;
export const ISLE_W = (SW_CX - ISLE_X) * 2;
export const ISLE_H = Math.ceil(SW_CY + SW_RY * 1.1 + SW_UNDER + 8) - ISLE_Y;

const GRASS = ramp('#0c1c2a', '#112634', '#16303c', '#1c3b44', '#24484c', '#2e5754', '#3a675c', '#4c7a66', '#649070');
const MOONSTONE = ramp('#262c4a', '#30385a', '#3c466c', '#4c5880', '#5e6c94', '#7482aa', '#8e9cc0', '#acb8d6', '#ccd6ec');
const SILVER = ramp('#4a5878', '#71819f', '#a2b2cc', '#d6e2f2', '#f6faff');
const STARMAP = ramp('#090c26', '#0e1434', '#141c44', '#1c2654', '#263264');
const PATH = ramp('#2c3048', '#383e5a', '#464e6e', '#565f82', '#6a7496', '#808aaa', '#9aa2c0');
const WATER = ramp('#050818', '#08102a', '#0c183a', '#13234c', '#1c335e', '#2a4a76', '#466894', '#8aa6cc');
const PEBBLE = ramp('#2e3048', '#3e425c', '#525872', '#6a708a', '#888ea6', '#a8aec2');
const LILY = ramp('#0e2a24', '#16382c', '#1f4834', '#2c5a3e');
const SOIL = ramp('#170e18', '#221522', '#2e1e2c', '#3a2636', '#463040');
const ROCK = ramp('#100c1c', '#171326', '#201b32', '#2a2340', '#352d50', '#423862', '#524674', '#665a88');
const MOSS = ramp('#0c1e22', '#12292c', '#1a3636', '#244440');
const ROOT = ramp('#120a10', '#1e1418', '#2c1f20');
const PLAID = ramp('#5a1c2a', '#8a2e40', '#b84a5a', '#d87478');
const CREAM = ramp('#8a7e70', '#b8aa94', '#ddd0b8', '#f4ead8');
const QUILT = ramp('#1a2a5a', '#2a4282', '#3e5eaa', '#6a8ad0');
const HONEY = ramp('#7a4a18', '#b07428', '#e0a848', '#f8d888');
const FLOWERS: RGB[] = [hex('#eef4ff'), hex('#c4dcff'), hex('#dccbff'), hex('#fff4dc'), hex('#a8f0e8')];

const GLOW_SILVER: RGB = hex('#8ab8ff');
const GLOW_STAR: RGB = hex('#e8f0ff');
const GLOW_CRYSTAL: RGB[] = [hex('#6ab8ff'), hex('#b890ff'), hex('#7af0e0')];

export interface IsleArt {
  diffuse: Uint8ClampedArray;
  normal: Uint8ClampedArray;
  emissive: Uint8ClampedArray;
}

type N3 = [number, number, number];

/** The colour of a moonflower whose left petal sits at (x, y), or -1: most grow in drifts, a few stray. */
function flowerAt(x: number, y: number): number {
  const h = hash2(x, y, 61);
  if (h < 0.986) return -1;
  const drift = fbm(x, y, 30, 77, 2);
  if (drift < 0.62 && h < 0.9994) return -1;
  if (hash2(x - 2, y, 61) >= 0.986 || hash2(x - 1, y - 1, 61) >= 0.986) return -1;
  return Math.floor(hash2(Math.floor(x / 28), Math.floor(y / 22), 7) * 4 + (h > 0.993 ? 1 : 0)) % FLOWERS.length;
}

/** The stars laid in the terrace's floor, in its radii (a few are bright), and the lines joining some into figures. */
function starMap(): { stars: { u: number; v: number; b: number }[]; lines: [number, number][] } {
  const R = rng(4321);
  const stars: { u: number; v: number; b: number }[] = [];
  while (stars.length < 46) {
    const a = R() * Math.PI * 2;
    const r = Math.sqrt(R()) * 0.37;
    stars.push({ u: Math.cos(a) * r, v: Math.sin(a) * r, b: R() });
  }
  // Join each of a few bright stars to its two nearest: little constellations.
  const lines: [number, number][] = [];
  stars.forEach((s, i) => {
    if (s.b < 0.82) return;
    const near = stars
      .map((o, j) => ({ j, d: Math.hypot(o.u - s.u, o.v - s.v) }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    for (const o of near) if (o.d < 0.16) lines.push([i, o.j]);
  });
  return { stars, lines };
}

/** Is (u, v) inside a star with `points` points, outer radius `ro` and inner `ri`? */
function inStar(u: number, v: number, ro: number, ri: number, points: number): boolean {
  const r = Math.hypot(u, v);
  if (r > ro) return false;
  const seg = (Math.PI * 2) / points;
  let a = Math.atan2(v, u) + Math.PI / 2;
  a = ((a % seg) + seg) % seg;
  const t = Math.abs(a / seg - 0.5) * 2;
  return r <= ri + (ro - ri) * t;
}

/**
 * The isle: a night meadow starred with moonflowers; the moonstone terrace
 * (a raised kerb with a silver inlay, rings of slabs with the twelve signs
 * glowing faintly in a band, and at its heart a disc of dark polished stone
 * with the stars laid in it, joined into figures); stairs where the path
 * meets it; the flagstone path; the pond with lilies and the stars in it;
 * the blankets. Under its front edge hang a lip of grass, soil and rock in
 * layers, with roots, and crystals glowing in the rock.
 */
export function* isleArt(): Generator<void, IsleArt, void> {
  const W = ISLE_W;
  const H = ISLE_H;
  const diffuse = new Uint8ClampedArray(W * H * 4);
  const normal = new Uint8ClampedArray(W * H * 4);
  const emissive = new Uint8ClampedArray(W * H * 4);
  const L = KEY_LIGHT;
  const Ll = Math.hypot(L.x, L.y, L.z);
  const shadeOf = (n: N3) => (n[0] * L.x + n[1] * L.y + n[2] * L.z) / ((Math.hypot(n[0], n[1], n[2]) || 1) * Ll);
  const put = (i: number, c: RGB, n: N3, glow?: RGB, gk = 1) => {
    diffuse.set([c[0], c[1], c[2], 255], i);
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    normal.set([Math.round((n[0] / l) * 127.5 + 127.5), Math.round((n[1] / l) * 127.5 + 127.5), Math.round((n[2] / l) * 127.5 + 127.5), 255], i);
    if (glow) emissive.set([Math.round(glow[0] * gk), Math.round(glow[1] * gk), Math.round(glow[2] * gk), 255], i);
  };
  const UP: N3 = [0, 0, 1];

  const edgeY = new Int32Array(W);
  for (let px = 0; px < W; px++) edgeY[px] = frontEdgeY(ISLE_X + px);
  const map = starMap();
  // Lily pads on the pond, most in flower.
  const LR = rng(808);
  const lilies = [0, 1, 2, 3, 4].map(() => ({ x: POND.x + (LR() - 0.5) * POND.rx * 1.2, y: POND.y + (LR() - 0.5) * POND.ry * 0.9, r: 2.4 + LR() * 1.6, bloom: LR() < 0.75 }));
  const segOf = (u: number, v: number, a: { u: number; v: number }, b: { u: number; v: number }) => {
    const vx = b.u - a.u;
    const vy = b.v - a.v;
    const t = clamp01(((u - a.u) * vx + (v - a.v) * vy) / (vx * vx + vy * vy));
    return Math.hypot((u - a.u - vx * t) * TERRACE.rx, (v - a.v - vy * t) * TERRACE.ry);
  };
  yield;

  for (let py = 0; py < H; py++) {
    if (py % 8 === 0) yield;
    for (let px = 0; px < W; px++) {
      const X = ISLE_X + px;
      const Y = ISLE_Y + py;
      const x = X + 0.5;
      const y = Y + 0.5;
      const i = (py * W + px) * 4;
      const ir = isleR(x, y);

      if (ir <= 1) {
        // ------------------------------------------------ The top surface
        const tr = terraceR(x, y);
        const ru = (x - TERRACE.x) / TERRACE.rx;
        const rv = (y - TERRACE.y) / TERRACE.ry;
        // Moonlight from the upper left lifts the far side of anything round.
        const sheen = (-ru - rv) * 0.16;

        if (tr <= 1) {
          const ou = ru / (tr || 1);
          const ov = rv / (tr || 1);
          if (tr > 0.93) {
            // The kerb: a raised rim of moonstone, its inner and outer edges sloping, a silver inlay along it.
            let n: N3 = UP;
            if (tr < 0.945) n = [-ou * 0.55, ov * 0.55, 0.83];
            else if (tr > 0.985) n = [ou * 0.55, -ov * 0.55, 0.83];
            if (Math.abs(tr - 0.964) * TERRACE.ry < 0.6) {
              put(i, pick(SILVER, 2.6 + shadeOf(n), X, Y), n, GLOW_SILVER, 0.12);
              continue;
            }
            put(i, pick(MOONSTONE, 5.2 + sheen * 2 + (shadeOf(n) - 0.7) * 2.5 + (hash2(X, Y, 3) - 0.5) * 0.6, X, Y), n);
            continue;
          }
          if (tr < 0.4) {
            // The heart: a disc of dark polished stone with the stars laid in it.
            if (Math.abs(tr - 0.385) * TERRACE.ry < 0.7) {
              put(i, pick(SILVER, 2.4 + sheen * 2, X, Y), UP, GLOW_SILVER, 0.22);
              continue;
            }
            // A compass star of silver beneath the stars, faint.
            let drawn = false;
            for (const s of map.stars) {
              const d = Math.hypot((ru - s.u) * TERRACE.rx, (rv - s.v) * TERRACE.ry);
              const big = s.b > 0.82;
              if (d < (big ? 1.1 : 0.6)) {
                put(i, big ? hex('#ffffff') : hex('#c8d8ff'), UP, GLOW_STAR, big ? 1 : 0.55 + s.b * 0.3);
                drawn = true;
                break;
              }
              if (big && d < 1.8 && (Math.abs((ru - s.u) * TERRACE.rx) < 0.5 || Math.abs((rv - s.v) * TERRACE.ry) < 0.5)) {
                put(i, hex('#8aa0d8'), UP, GLOW_STAR, 0.35);
                drawn = true;
                break;
              }
            }
            if (drawn) continue;
            for (const [a, b] of map.lines) {
              if (segOf(ru, rv, map.stars[a], map.stars[b]) < 0.45) {
                put(i, hex('#46588e'), UP, GLOW_SILVER, 0.16);
                drawn = true;
                break;
              }
            }
            if (drawn) continue;
            if (inStar(ru, rv, 0.3, 0.07, 8) && !inStar(ru, rv, 0.3 - 1.4 / TERRACE.rx, 0.07 - 1 / TERRACE.rx, 8)) {
              put(i, pick(SILVER, 1.4, X, Y), UP, GLOW_SILVER, 0.08);
              continue;
            }
            // The polish: a soft sheen across it, and the far sky's glimmer.
            let idx = 1.6 + sheen * 4 + (fbm(x, y, 10, 91, 2) - 0.5) * 0.6;
            if (Math.abs(ru + rv - 0.12) < 0.035) idx += 1;
            put(i, pick(STARMAP, idx, X, Y), UP);
            continue;
          }
          // Silver rings between the bands.
          if (Math.abs(tr - 0.6) * TERRACE.ry < 0.55 || Math.abs(tr - 0.78) * TERRACE.ry < 0.55) {
            put(i, pick(SILVER, 1.8 + sheen * 2, X, Y), UP, GLOW_SILVER, 0.07);
            continue;
          }
          const ang = Math.atan2(rv, ru);
          if (tr < 0.6) {
            // The band of the twelve signs: a ring of small glowing marks on dark slate.
            const seg = (Math.PI * 2) / 12;
            const k = Math.floor((ang + Math.PI) / seg);
            const mid = -Math.PI + (k + 0.5) * seg;
            const mu = Math.cos(mid) * 0.5;
            const mv = Math.sin(mid) * 0.5;
            const du = (ru - mu) * TERRACE.rx;
            const dv = (rv - mv) * TERRACE.ry;
            const dm = Math.hypot(du, dv);
            // Each sign a ring with a mark of its own inside.
            if (Math.abs(dm - 3.2) < 0.6) {
              put(i, pick(SILVER, 2.2, X, Y), UP, GLOW_SILVER, 0.4);
              continue;
            }
            if (dm < 2.4) {
              const glyph = (k % 4 === 0 && Math.abs(du) < 0.6) || (k % 4 === 1 && Math.abs(dv) < 0.6) || (k % 4 === 2 && Math.abs(du - dv) < 0.7) || (k % 4 === 3 && dm < 1);
              if (glyph) {
                put(i, hex('#dce8ff'), UP, GLOW_SILVER, 0.6);
                continue;
              }
            }
            const edgeA = Math.min(((ang + Math.PI) % seg + seg) % seg, seg - (((ang + Math.PI) % seg + seg) % seg)) * tr * TERRACE.rx;
            if (edgeA < 0.5) {
              put(i, pick(MOONSTONE, 1.2, X, Y), UP);
              continue;
            }
            put(i, pick(MOONSTONE, 2.4 + sheen * 2 + (hash2(k, 4, 9) - 0.5) * 0.6, X, Y), UP);
            continue;
          }
          // Slabs laid in rings, a little moss in the joints.
          const segs = tr > 0.78 ? 34 : 26;
          const seg = (Math.PI * 2) / segs;
          const sa = (((ang + Math.PI) % seg) + seg) % seg;
          const edgeA = Math.min(sa, seg - sa) * tr * TERRACE.rx;
          const edgeR = Math.min(Math.abs(tr - 0.6), Math.abs(tr - 0.78), Math.abs(tr - 0.93)) * TERRACE.ry;
          if (edgeA < 0.55 || edgeR < 0.6) {
            const moss = fbm(x, y, 9, 57, 2) > 0.58;
            put(i, moss ? pick(MOSS, 2.4, X, Y) : pick(MOONSTONE, 1.6, X, Y), UP);
            continue;
          }
          const slab = hash2(Math.floor((ang + Math.PI) / seg), tr > 0.78 ? 2 : 1, 13);
          let idx = 4.6 + (slab - 0.5) * 1.2 + sheen * 2.2;
          if (edgeA < 1.5 || edgeR < 1.5) idx += 0.5;
          if (hash2(X, Y, 27) > 0.992) idx += 2; // flecks of mica
          put(i, pick(MOONSTONE, idx, X, Y), UP);
          continue;
        }

        // The kerb's south face, a few pixels tall, with stairs where the path comes up.
        if (rv > 0 && terraceR(x, y - TERRACE_STEP) <= 1) {
          const stairs = Math.abs(x - TERRACE.x) < PATH_HALF + 1;
          if (stairs) {
            const rise = (Y - Math.floor(TERRACE.y + TERRACE.ry * Math.sqrt(Math.max(0, 1 - ru * ru)))) % 2;
            put(i, pick(PATH, rise ? 2.4 : 4.4, X, Y), rise ? [0, -0.6, 0.8] : UP);
            continue;
          }
          const n: N3 = [ru * 0.5, -0.55, 0.65];
          const top = terraceR(x, y - 1) <= 1;
          put(i, pick(MOONSTONE, (top ? 3.4 : 2.4) + shadeOf(n) * 1.5 + sheen, X, Y), n);
          continue;
        }

        // The pond: the night sky held in it, stars glinting, lilies with pale glowing flowers.
        const pr = pondR(x, y);
        if (pr < 1) {
          let lily = false;
          for (const l of lilies) {
            const d = Math.hypot(x - l.x, (y - l.y) * 1.5);
            if (d > l.r) continue;
            lily = true;
            if (x > l.x && Math.abs(y - l.y) < 0.6) {
              lily = false;
              break;
            }
            if (l.bloom && d < 1.2) put(i, hex('#f4f0ff'), UP, GLOW_STAR, 0.7);
            else put(i, pick(LILY, 2 + (l.x - x) * 0.3 + (l.y - y) * 0.4, X, Y), UP);
            break;
          }
          if (lily) continue;
          const deep = 1 - pr;
          let idx = 3.4 - deep * 2.4 + (fbm(x, y * 2, 6, 44, 2) - 0.5) * 0.8;
          // The Milky Way's pale smear across it, and its stars.
          if (Math.abs((x - POND.x) * 0.5 + (y - POND.y)) < 6) idx += 0.8;
          const h = hash2(X, Y, 911);
          if (h > 0.985) {
            put(i, hex('#dce6ff'), UP, GLOW_STAR, 0.4 + (h - 0.985) * 40);
            continue;
          }
          if (valueNoise(x * 1.5, y * 3, 5, 91) > 0.82) idx = 5.6;
          put(i, pick(WATER, idx, X, Y), UP);
          continue;
        }
        if (pr < 1.2) {
          const s = hash2(Math.floor(x / 3), Math.floor(y / 2), 17);
          const bump: N3 = [(hash2(X, Y, 8) - 0.5) * 0.6, 0.3, 0.9];
          put(i, pick(PEBBLE, 1.4 + s * 2.4 + (pr < 1.06 ? -0.8 : 0), X, Y), bump);
          continue;
        }

        // The path: pale flagstones, ragged at its edge where the grass creeps in.
        const pd = pathDist(x, y);
        const ragged = PATH_HALF - (fbm(x, y, 5, 33, 2) - 0.3) * 3;
        if (pd < ragged) {
          // Each stone the nearest of a jittered grid's points.
          const G = 6;
          const gx = Math.floor(x / G);
          const gy = Math.floor(y / G);
          let d1 = 99;
          let d2 = 99;
          let id = 0;
          for (let j = -1; j <= 1; j++) {
            for (let k = -1; k <= 1; k++) {
              const cx = (gx + k + 0.2 + hash2(gx + k, gy + j, 71) * 0.6) * G;
              const cy = (gy + j + 0.2 + hash2(gx + k, gy + j, 73) * 0.6) * G;
              const d = Math.hypot(x - cx, (y - cy) * 1.2);
              if (d < d1) {
                d2 = d1;
                d1 = d;
                id = hash2(gx + k, gy + j, 79);
              } else if (d < d2) d2 = d;
            }
          }
          if (d2 - d1 < 0.9) {
            const moss = hash2(X, Y, 5) > 0.5;
            put(i, moss ? pick(MOSS, 2.2, X, Y) : pick(PATH, 0.6, X, Y), UP);
            continue;
          }
          const lit = d2 - d1 < 2 ? -0.5 : 0;
          const n: N3 = [(hash2(Math.floor(id * 100), 1, 3) - 0.5) * 0.3, 0.1, 1];
          put(i, pick(PATH, 3.6 + (id - 0.5) * 1.6 + lit + (pd > ragged - 1.2 ? -0.8 : 0), X, Y), n);
          continue;
        }

        // The blankets.
        const bi = blanketAt(x, y);
        if (bi >= 0) {
          const b = BLANKETS[bi];
          const lx = X - b.x;
          const ly = Y - b.y;
          const n: N3 = [(valueNoise(x, y, 4, 61) - 0.5) * 0.5, (valueNoise(x, y, 4, 63) - 0.5) * 0.5 + 0.1, 1];
          // A pillow at the west end, and a fringe at both short ends.
          if (lx >= 2 && lx < 8 && ly >= 3 && ly < b.h - 3) {
            const edge = lx === 2 || lx === 7 || ly === 3 || ly === b.h - 4;
            put(i, pick(CREAM, edge ? 1.6 : 2.6 + (ly < b.h / 2 ? 0.6 : 0), X, Y), [0, 0.3, 0.95]);
            continue;
          }
          if (lx === 0 || lx === b.w - 1) {
            put(i, ly % 2 ? pick(CREAM, 1.4, X, Y) : pick(b.kind === 'plaid' ? PLAID : QUILT, 1, X, Y), n);
            continue;
          }
          if (b.kind === 'plaid') {
            const sx = Math.floor(lx / 3) % 3;
            const sy = Math.floor(ly / 3) % 3;
            let c: RGB;
            if (sx === 1 && sy === 1) c = pick(CREAM, 2.4, X, Y);
            else if (sx === 1 || sy === 1) c = pick(PLAID, 3, X, Y);
            else c = pick(PLAID, (lx + ly) % 2 ? 1.6 : 2, X, Y);
            if (ly === 0 || ly === b.h - 1) c = pick(PLAID, 0.6, X, Y);
            put(i, c, n);
          } else {
            const qx = Math.floor((lx - 1) / 5);
            const qy = Math.floor(ly / 5);
            const stitch = (lx - 1) % 5 === 0 || ly % 5 === 0;
            const h2 = hash2(qx, qy + bi * 10, 31);
            let c = h2 > 0.66 ? pick(QUILT, 2.6, X, Y) : h2 > 0.33 ? pick(CREAM, 2.4, X, Y) : pick(HONEY, 2, X, Y);
            if (stitch) c = mix(c, hex('#101830'), 0.35);
            if (ly === 0 || ly === b.h - 1) c = pick(QUILT, 0.8, X, Y);
            put(i, c, n);
          }
          continue;
        }

        // The meadow: dark moonlit grass, broad swathes, then finer tufts.
        const big = fbm(x, y, 64, 5);
        const mid = fbm(x, y, 16, 15, 2);
        const fine = valueNoise(x, y, 5, 9);
        const cu = (x - SW_CX) / SW_RX;
        const cv = (y - SW_CY) / SW_RY;
        let idx = 3.6 + (big - 0.5) * 3 + (mid - 0.5) * 1.2 + (fine - 0.5) * 0.9 + (-cu - cv) * 0.35;
        if (hash2(X, Y, 31) > 0.9) idx += 1.3;
        else if (hash2(X, Y - 1, 31) > 0.9) idx -= 0.9;
        // Lusher by the water and the stones, shaded at the terrace's foot.
        if (pr < 1.5) idx -= 0.5;
        if (tr < 1.08) idx -= 1;
        // A blanket's shadow on the grass to its south and east.
        if (blanketAt(x, y - 1) >= 0 || blanketAt(x - 1, y) >= 0 || blanketAt(x - 1, y - 1) >= 0) idx -= 1.8;
        // The far rim catches the moon; the front one leads down to the lip.
        if (ir > 0.992) idx += Y < SW_CY ? 1.2 : -0.6;
        // Moonflowers in drifts: two-pixel blooms, faintly glowing, a shadow under them.
        const f = flowerAt(X, Y);
        if (f >= 0 || flowerAt(X - 1, Y) >= 0) {
          const k = f >= 0 ? f : flowerAt(X - 1, Y);
          put(i, f >= 0 ? FLOWERS[k] : mix(FLOWERS[k], hex('#8090c0'), 0.3), [0, 0.3, 0.95], FLOWERS[k], f >= 0 ? 0.32 : 0.16);
          continue;
        }
        if (flowerAt(X, Y - 1) >= 0 || flowerAt(X - 1, Y - 1) >= 0) idx -= 1.4;
        const nx = (valueNoise(x + 1, y, 5, 9) - valueNoise(x - 1, y, 5, 9)) * 1.4;
        const ny = (valueNoise(x, y - 1, 5, 9) - valueNoise(x, y + 1, 5, 9)) * 1.4;
        put(i, pick(GRASS, idx, X, Y), [nx, ny, 1]);
        continue;
      }

      // ------------------------------------------------ Under the front edge
      const e = edgeY[px];
      if (e < 0 || Y <= e) continue;
      const d = Y - e;
      const u = (x - SW_CX) / SW_RX;
      const au = Math.min(1, Math.abs(u) / 1.09);
      const lip = 2 + (hash2(X, 0, 5) > 0.7 ? Math.floor(hash2(X, 1, 5) * 3) : 0);
      const soil = 9 + Math.floor(fbm(x, 0, 9, 3, 2) * 4);
      const spur = Math.pow(fbm(x, 0, 7, 91, 2), 3) * 28 * (1 - au);
      const depth = Math.min(SW_UNDER, 12 + (SW_UNDER - 28) * Math.pow(1 - au, 1.4) * (0.78 + 0.4 * fbm(x, 0, 24, 88, 2)) + spur);

      // Roots dangle from the soil, some past the rock's end.
      const rh = hash2(X, 0, 41);
      if (d > soil && rh > 0.91) {
        const len = 8 + hash2(X, 2, 41) * (rh > 0.965 ? 40 : 20);
        if (d < soil + len) {
          put(i, pick(ROOT, 1 + (d % 4 === 0 ? 1 : 0), X, Y), [u * 0.4, -0.3, 0.85]);
          continue;
        }
      }
      if (d > depth) continue;
      if (d <= lip) {
        const n: N3 = [u * 0.3, -0.55, 0.8];
        put(i, pick(GRASS, 2.6 - d * 0.5 + shadeOf(n), X, Y), n);
        continue;
      }
      const facet = (valueNoise(x, 0, 5, 13) - 0.5) * 1.1 + (valueNoise(x, y, 11, 17) - 0.5) * 0.4;
      const sideN: N3 = [u * 0.75 + facet, -0.25 - (d / depth) * 0.35, 0.7];
      if (d <= soil) {
        let idx = 2.6 - ((d - lip) / (soil - lip)) * 1.2 + shadeOf(sideN) * 1.2 + (hash2(X, Y, 19) - 0.5) * 0.8;
        if (hash2(X, Y, 29) > 0.93) idx = 0;
        put(i, pick(SOIL, idx, X, Y), sideN);
        continue;
      }
      const fade = (d - soil) / Math.max(1, depth - soil);
      // Crystals in the rock, glowing blue, violet and sea-green: a few small clusters, pointing down and out.
      const cg = Math.floor(x / 11);
      const cr = Math.floor((d - soil) / 10);
      const ch = hash2(cg, cr, 501);
      if (ch > 0.93 && fade > 0.12 && fade < 0.8) {
        const ccx = (cg + 0.3 + hash2(cg, cr, 503) * 0.4) * 11;
        const ccy = soil + (cr + 0.5) * 10 + e;
        const dx = x - ccx;
        const dy = y - ccy;
        const lean = hash2(cg, cr, 505) > 0.5 ? 0.35 : -0.35;
        const big = ch > 0.97;
        const blade = Math.abs(dx - dy * lean) < (big ? 1.3 : 0.9) - Math.max(0, dy) * 0.3 && dy > -1.5 && dy < (big ? 4 : 3);
        const blade2 = big && Math.abs(dx + 2 - dy * lean * 2) < 0.8 - Math.max(0, dy) * 0.3 && dy > -0.5 && dy < 2.5;
        if (blade || blade2) {
          const tint = GLOW_CRYSTAL[Math.floor(ch * 1000) % 3];
          put(i, mix(tint, hex('#ffffff'), dx - dy * lean < 0 ? 0.5 : 0.05), [dx < 0 ? -0.5 : 0.5, -0.2, 0.8], tint, dy < 0.5 ? 0.9 : 0.6);
          continue;
        }
      }
      const layer = d + fbm(x, 0, 20, 51, 2) * 8;
      const strata = Math.floor(layer / 7) % 2;
      let idx = 4.4 - fade * 3 - strata * 0.6 + (shadeOf(sideN) - 0.4) * 2.2 + (fbm(x, y, 4, 71, 2) - 0.5) * 0.9;
      if (layer % 7 < 0.9 && hash2(Math.floor(x / 4), Math.floor(layer / 7), 3) > 0.25) idx -= 1.3;
      if (fade > 0.92) idx -= 0.8;
      if (fade < 0.22 && fbm(x, y, 7, 37, 2) > 0.62 - (0.22 - fade) * 0.7) {
        put(i, pick(MOSS, 2.2 - fade * 3 + shadeOf(sideN), X, Y), sideN);
        continue;
      }
      put(i, pick(ROCK, idx, X, Y), sideN);
    }
  }
  return { diffuse, normal, emissive };
}

// ---------------------------------------------------------------- Props

const M_STONE: Material = { ramp: ramp('#22283e', '#2e364e', '#3c4660', '#4e5a76', '#64708e', '#7c88a6', '#98a4c0', '#b8c2d8'), outline: hex('#0c0e1c'), outlineLit: hex('#2a3048') };
/** The stone lanterns' stone: weathered darker than the terrace, so the lamp's glow is what reads. */
const M_LSTONE: Material = { ramp: ramp('#1a1e30', '#22283c', '#2c344c', '#3a445e', '#4a5672', '#5c6886', '#727e9c'), outline: hex('#0a0c18'), outlineLit: hex('#22283c') };
const M_GLASS: Material = { ramp: ramp('#a8602a', '#e09040', '#ffc870', '#fff0c0'), outline: hex('#3a1a08'), emissive: 0.95, noAO: true };
const M_IRON: Material = { ramp: ramp('#0e0e16', '#1a1a26', '#2a2a3a', '#40405a'), outline: hex('#06060c') };
const M_WOOD: Material = { ramp: ramp('#1e120e', '#2e1c14', '#42291c', '#583826', '#704a32'), outline: hex('#0c0606') };
const M_BRASS: Material = { ramp: ramp('#3a2408', '#6a4414', '#a07028', '#d4a448', '#f6d888'), outline: hex('#1a0e02'), shine: true };
const M_LENS: Material = { ramp: ramp('#1a3a6a', '#3a70b0', '#8ac0ff', '#e0f0ff'), outline: hex('#08142a'), emissive: 0.6, noAO: true };
const M_RUNE: Material = { ramp: ramp('#2a5aa8', '#5a9ae8', '#a8d4ff', '#eef8ff'), outline: hex('#0c1a3a'), emissive: 1, noAO: true, noOutline: true };
const M_MOSS: Material = { ramp: ramp('#0e2224', '#163230', '#20423a', '#2e5446'), outline: hex('#060e10') };
const M_BARK: Material = { ramp: ramp('#140e18', '#201824', '#2e2232', '#3e3042', '#504056'), outline: hex('#08060a') };
const M_BLOSSOM: Material = { ramp: ramp('#2a2048', '#3c2e62', '#54427e', '#705a9a', '#9078b6', '#b09ad0', '#d2c0e6', '#eee4f8'), outline: hex('#140e24'), outlineLit: hex('#2a2048') };
const M_LEAF: Material = { ramp: ramp('#143430', '#1c463c', '#285a48', '#367056'), outline: hex('#0a1c1a') };
const M_PETAL: Material = { ramp: ramp('#7a8ac0', '#a8b8e8', '#d4e0ff', '#f4f8ff'), outline: hex('#1a2040'), emissive: 0.55, noAO: true };
const M_PETAL_V: Material = { ramp: ramp('#7a68b8', '#a890e0', '#d0c0ff', '#f4eeff'), outline: hex('#1e1640'), emissive: 0.55, noAO: true };
const M_GRASS: Material = { ramp: ramp('#0e2026', '#16302e', '#20403a', '#2c5246', '#3c6452'), outline: hex('#06100e') };
const M_ROCK: Material = { ramp: ramp('#100c1c', '#1a1528', '#262036', '#322a46', '#403658', '#524670', '#685a88'), outline: hex('#06040c') };

const TOP: Vec3 = { x: 0, y: 0.62, z: 0.78 };
const FRONT: Vec3 = { x: 0, y: -0.16, z: 0.99 };

export const LANTERN_W = 16;
export const LANTERN_H = 32;
export const LANTERN_FOOT = 30;

/** v0: a stone lantern for the terrace's rim; v1: a wooden post with a lantern hung from its arm. */
function lantern(v: number): PixelCanvas {
  const c = new PixelCanvas(LANTERN_W, LANTERN_H);
  const cx = 8;
  const f = LANTERN_FOOT;
  if (v === 0) {
    // Plinth, post, firebox, roof, finial.
    c.shape(f - 2, f, () => [cx - 4, cx + 4], M_LSTONE, (_x, y, t) => (y === f - 2 ? TOP : cyl(t)));
    c.part();
    c.shape(f - 12, f - 3, () => [cx - 2, cx + 2], M_LSTONE, (_x, _y, t) => cyl(t));
    c.part();
    c.shape(f - 14, f - 13, () => [cx - 4, cx + 4], M_LSTONE, () => TOP);
    c.part();
    c.shape(f - 21, f - 15, () => [cx - 4, cx + 4], M_LSTONE, (_x, _y, t) => cyl(t));
    // The lit window in its face.
    for (let y = f - 20; y <= f - 16; y++) for (let x = cx - 2; x < cx + 2; x++) c.px(x, y, M_GLASS, FRONT, { bias: y < f - 18 ? 1 : 0 });
    c.part();
    c.shape(f - 24, f - 22, (y) => [cx - 6 + (f - 22 - y), cx + 6 - (f - 22 - y)], M_LSTONE, (_x, y, t) => (y < f - 22 ? TOP : cyl(t, 0.4)));
    c.px(cx - 1, f - 25, M_LSTONE, TOP);
    c.px(cx, f - 25, M_LSTONE, TOP);
    c.px(cx - 1, f - 26, M_LSTONE, sphere(-0.3, -0.6));
    c.px(cx, f - 26, M_LSTONE, sphere(0.3, -0.6));
  } else {
    // A wooden post with a little lamp on top: an iron base, warm glass, a peaked iron cap.
    c.shape(f - 16, f, () => [cx - 1, cx + 1], M_WOOD, (_x, _y, t) => cyl(t));
    c.part();
    c.shape(f - 17, f - 17, () => [cx - 3, cx + 3], M_IRON, () => TOP);
    c.part();
    for (let y = f - 23; y <= f - 18; y++) {
      c.px(cx - 3, y, M_IRON, cyl(-0.9));
      c.px(cx + 2, y, M_IRON, cyl(0.9));
      for (let x = cx - 2; x <= cx + 1; x++) c.px(x, y, M_GLASS, FRONT, { bias: y < f - 21 ? 1 : x === cx - 2 ? 0 : -1 });
    }
    c.part();
    c.shape(f - 25, f - 24, (y) => (y === f - 25 ? [cx - 2, cx + 2] : [cx - 4, cx + 4]), M_IRON, (_x, y, t) => (y === f - 25 ? TOP : cyl(t, 0.4)));
    c.px(cx - 1, f - 26, M_IRON, TOP);
    c.px(cx, f - 26, M_IRON, TOP);
    // A clump of grass round the post's foot.
    for (const [x, y] of [
      [cx - 3, f],
      [cx - 3, f - 1],
      [cx + 2, f],
      [cx + 2, f - 1],
      [cx + 3, f],
    ]) c.px(x, y, M_GRASS, TOP);
  }
  return c;
}

export const BENCH_W = 28;
export const BENCH_H = 18;
export const BENCH_FOOT = 16;

function bench(): PixelCanvas {
  const c = new PixelCanvas(BENCH_W, BENCH_H);
  const f = BENCH_FOOT;
  // Two legs, the seat slab over them.
  for (const lx of [4, 20]) {
    c.part();
    c.shape(f - 6, f, () => [lx, lx + 4], M_STONE, (_x, _y, t) => cyl(t));
  }
  c.part();
  c.shape(f - 10, f - 8, () => [1, 27], M_STONE, () => TOP);
  c.shape(f - 7, f - 6, () => [1, 27], M_STONE, () => FRONT);
  // Moss on the slab's top corner, a carved star on its front.
  for (const [x, y] of [
    [2, f - 10],
    [3, f - 10],
    [2, f - 9],
  ]) c.px(x, y, M_MOSS, TOP);
  c.px(14, f - 7, M_RUNE, FRONT, { glow: 0.5 });
  c.px(13, f - 7, M_RUNE, FRONT, { glow: 0.3 });
  c.px(15, f - 7, M_RUNE, FRONT, { glow: 0.3 });
  return c;
}

export const SCOPE_W = 28;
export const SCOPE_H = 32;
export const SCOPE_FOOT = 30;

function telescope(): PixelCanvas {
  const c = new PixelCanvas(SCOPE_W, SCOPE_H);
  const f = SCOPE_FOOT;
  const hx = 13;
  const hy = f - 14;
  // Three legs splayed from the head.
  c.line(hx, hy, hx - 7, f, M_WOOD, () => cyl(-0.5));
  c.line(hx, hy, hx + 7, f, M_WOOD, () => cyl(0.5));
  c.part();
  c.line(hx, hy, hx + 1, f - 1, M_WOOD, () => FRONT);
  c.part();
  // The brass tube, pointing up to the north-west sky, wider at its far end.
  c.capsule(hx + 6, hy + 3, hx - 7, hy - 10, 1.4, 2.4, M_BRASS);
  c.part();
  // Rings round the tube, the lens at its end catching the sky, the eyepiece at the near end.
  c.capsule(hx - 2, hy - 5, hx - 3, hy - 6, 2.4, 2.4, M_BRASS, { bias: 1 });
  c.ellipse(hx - 8, hy - 11, 2, 2, M_LENS);
  c.part();
  c.capsule(hx + 7, hy + 4, hx + 9, hy + 6, 1, 1, M_IRON);
  c.px(hx, hy, M_IRON, TOP);
  return c;
}

export const STONE_W = 18;
export const STONE_H = 34;
export const STONE_FOOT = 32;

/** The figures cut into the standing stones, in the stone's own pixels. */
const STONE_FIGURES: [number, number][][] = [
  [
    [9, 8],
    [7, 12],
    [10, 15],
    [8, 19],
    [11, 23],
  ],
  [
    [6, 9],
    [11, 10],
    [9, 14],
    [6, 18],
    [12, 19],
  ],
  [
    [8, 7],
    [10, 11],
    [7, 14],
    [11, 17],
    [9, 22],
  ],
];

function standingStone(v: number): PixelCanvas {
  const c = new PixelCanvas(STONE_W, STONE_H);
  const f = STONE_FOOT;
  const R = rng(700 + v * 13);
  const top = 4 + Math.floor(R() * 2);
  c.shape(top, f, (y) => {
    const t = (y - top) / (f - top);
    const half = 3.4 + Math.sqrt(Math.min(1, t * 3)) * 2.6 + t * 0.6 + (R() - 0.5) * 0.3;
    const lean = (1 - t) * (v === 1 ? -1 : 1);
    return [9 + lean - half, 9 + lean + half];
  }, M_STONE, (_x, y, t) => (y < top + 2 ? TOP : cyl(t, 0.1)));
  // Moss climbing from the foot.
  for (let y = f - 6; y <= f; y++) {
    for (let x = 2; x < 16; x++) {
      if (!c.filled(x, y)) continue;
      if (hash2(x, y, 90 + v) < 0.25 + (y - (f - 6)) * 0.1) c.px(x, y, M_MOSS, cyl((x - 9) / 6));
    }
  }
  // The figure: its stars glowing, joined by fine cut lines.
  c.part();
  const fig = STONE_FIGURES[v % STONE_FIGURES.length];
  for (let k = 0; k < fig.length - 1; k++) {
    const [ax, ay] = fig[k];
    const [bx, by] = fig[k + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let s = 1; s < n; s++) c.px(Math.round(ax + ((bx - ax) * s) / n), Math.round(ay + ((by - ay) * s) / n), M_RUNE, FRONT, { glow: 0.3, bias: -2 });
  }
  for (const [x, y] of fig) c.px(x, y, M_RUNE, FRONT, { glow: 1, bias: 1 });
  return c;
}

export const TREE_W = 60;
export const TREE_H = 70;
export const TREE_FOOT = 67;

/** A starblossom: a dark crooked trunk under a crown of pale lilac blossom, glinting. */
function starTree(v: number): PixelCanvas {
  const c = new PixelCanvas(TREE_W, TREE_H);
  const R = rng(1200 + v * 41);
  const f = TREE_FOOT;
  const cx = 30;
  // The trunk, leaning, forking into limbs toward the crown's clumps.
  const lean = v ? -4 : 5;
  const forkX = cx + lean;
  const forkY = f - 26;
  c.capsule(cx, f, forkX, forkY, 3.2, 2.2, M_BARK);
  // Roots spreading at the foot.
  c.capsule(cx - 1, f - 1, cx - 6, f, 1.4, 0.8, M_BARK);
  c.capsule(cx + 1, f - 1, cx + 6, f, 1.4, 0.8, M_BARK);
  const clumps: { x: number; y: number; r: number }[] = [];
  const n = 10 + Math.floor(R() * 3);
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k / (n - 1) - 0.5) * 2.9 + (R() - 0.5) * 0.3;
    const d = 11 + R() * 9;
    clumps.push({ x: forkX + Math.cos(a) * d * 1.25, y: forkY - 13 + Math.sin(a) * d * 0.85, r: 6 + R() * 4 });
  }
  // The crown's middle, filled, so it reads as one canopy of many florets.
  clumps.push({ x: forkX - 5, y: forkY - 14, r: 10 });
  clumps.push({ x: forkX + 6, y: forkY - 17, r: 10 });
  for (const k of clumps) c.capsule(forkX, forkY, k.x * 0.6 + forkX * 0.4, k.y * 0.6 + forkY * 0.4, 1.6, 0.9, M_BARK);
  // The crown: clumps from the back to the front, each lit on its upper left.
  clumps.sort((a, b) => a.y - b.y);
  for (const k of clumps) {
    c.part();
    for (let y = Math.floor(k.y - k.r); y <= k.y + k.r; y++) {
      for (let x = Math.floor(k.x - k.r * 1.15); x <= k.x + k.r * 1.15; x++) {
        const dx = (x + 0.5 - k.x) / (k.r * 1.15);
        const dy = (y + 0.5 - k.y) / k.r;
        const d = dx * dx + dy * dy;
        // A scalloped rim: blossom in little florets, not a smooth ball.
        const lumpy = 1 - hash2(Math.floor(x / 2), Math.floor(y / 2), 300 + v) * 0.28;
        if (d > lumpy) continue;
        const bias = hash2(x, y, 310 + v) > 0.8 ? 1 : hash2(x, y, 320 + v) > 0.85 ? -1 : 0;
        c.px(x, y, M_BLOSSOM, sphere(dx, dy, 0.9), { bias });
      }
    }
  }
  // Glints of starlight caught in the blossom.
  for (let k = 0; k < 16; k++) {
    const cl = clumps[Math.floor(R() * clumps.length)];
    const x = Math.round(cl.x + (R() - 0.6) * cl.r);
    const y = Math.round(cl.y + (R() - 0.6) * cl.r);
    if (c.filled(x, y)) c.spark(x, y, R() < 0.5 ? hex('#ffffff') : hex('#d8c8ff'), 0.9);
  }
  return c;
}

export const BLOOM_W = 16;
export const BLOOM_H = 18;
export const BLOOM_FOOT = 16;

/** A clump of moonflowers: a few fine leaves, slender stems, pale cupped flowers that glow. */
function moonflowers(v: number): PixelCanvas {
  const c = new PixelCanvas(BLOOM_W, BLOOM_H);
  const R = rng(1500 + v * 17);
  const f = BLOOM_FOOT;
  const cx = 8;
  // Fine leaves arching out from the foot.
  for (let k = 0; k < 4; k++) {
    const dir = k % 2 ? 1 : -1;
    const len = 4 + Math.floor(R() * 3);
    for (let s = 0; s < len; s++) {
      const t = s / len;
      c.px(cx + dir * (1 + s * 0.8), f - s * 0.9 + t * t * 2.5, M_LEAF, TOP, { bias: t > 0.5 ? 1 : 0 });
    }
  }
  const petal = v === 1 ? M_PETAL_V : M_PETAL;
  const stems = 3 + (v === 2 ? 1 : 0);
  for (let k = 0; k < stems; k++) {
    c.part();
    const bx = cx + (k - (stems - 1) / 2) * 3 + (R() - 0.5);
    const h = 7 + R() * 5;
    const bend = (k - (stems - 1) / 2) * 1.2 + (R() - 0.5);
    let tx = bx;
    let ty = f;
    for (let s = 0; s <= h; s++) {
      const t = s / h;
      tx = bx + bend * t * t;
      ty = f - s;
      c.px(tx, ty, M_LEAF, cyl(0.3), { bias: 1 });
    }
    // The flower: a cup open to the sky, three wide, its heart brighter.
    c.part();
    const hx = Math.round(tx);
    const hy = Math.round(ty) - 1;
    c.px(hx - 1, hy, petal, sphere(-0.6, -0.4));
    c.px(hx + 1, hy, petal, sphere(0.6, -0.4));
    c.px(hx, hy, petal, TOP, { bias: 2 });
    c.px(hx - 1, hy + 1, petal, sphere(-0.4, 0.3), { bias: -1 });
    c.px(hx, hy + 1, petal, sphere(0, 0.4));
    c.px(hx + 1, hy + 1, petal, sphere(0.4, 0.3), { bias: -1 });
    if (v !== 1) c.px(hx, hy - 1, petal, TOP, { bias: 1 });
  }
  return c;
}

export const ISLET_W = 48;
export const ISLET_H = 46;

/** A small isle drifting near: a cap of grass, rock tapering beneath, and on top a crystal, a lantern or a little tree. */
function islet(v: number): PixelCanvas {
  const c = new PixelCanvas(ISLET_W, ISLET_H);
  const R = rng(1900 + v * 23);
  const cx = 24;
  const cy = 16;
  const rx = 14 + v * 2;
  const ry = 5 + v;
  // The rock beneath, ragged, tapering to a point.
  const deep = 20 + v * 3;
  c.shape(cy, cy + deep, (y) => {
    const t = (y - cy) / deep;
    const half = rx * (1 - t) ** 1.3 + (R() - 0.5) * 1.2;
    return half > 0.5 ? [cx - half, cx + half] : null;
  }, M_ROCK, (_x, _y, t, u) => ({ x: t * 0.8, y: -0.3 - u * 0.3, z: 0.6 }));
  c.part();
  c.ellipse(cx, cy, rx, ry, M_GRASS, { normal: (_x, _y, dx, dy) => ({ x: dx * 0.3, y: -dy * 0.3 + 0.4, z: 0.85 }) });
  c.part();
  if (v === 0) {
    // A crystal standing up from the grass.
    c.shape(cy - 10, cy, (y) => {
      const t = (y - (cy - 10)) / 10;
      return [cx - 0.5 - t * 2.4, cx + 0.5 + t * 2.4];
    }, M_RUNE, (_x, _y, t) => cyl(t, 0.2), { glow: 0.7 });
  } else if (v === 1) {
    // A tiny lantern post.
    c.line(cx + 2, cy - 1, cx + 2, cy - 9, M_WOOD, () => cyl(0));
    c.px(cx + 3, cy - 9, M_WOOD, TOP);
    c.px(cx + 4, cy - 8, M_GLASS, FRONT);
    c.px(cx + 4, cy - 7, M_GLASS, FRONT, { bias: -1 });
  } else {
    // A little starblossom.
    c.line(cx - 2, cy - 1, cx - 3, cy - 6, M_BARK, () => cyl(0));
    c.ellipse(cx - 3, cy - 9, 5, 4, M_BLOSSOM);
    c.spark(cx - 4, cy - 10, hex('#ffffff'), 0.8);
  }
  return c;
}

// ---------------------------------------------------------------- Light and shooting stars

/** A shooting star's streak, lying east to west: its head at the right end, white-hot, its tail fading out behind it. */
export const STREAK_W = 72;
export const STREAK_H = 5;
function streak(): Uint8ClampedArray {
  const W = STREAK_W;
  const H = STREAK_H;
  const px = new Uint8ClampedArray(W * H * 4);
  for (let x = 0; x < W; x++) {
    const u = x / (W - 1);
    const k = u ** 2.2;
    for (let y = 0; y < H; y++) {
      const off = Math.abs(y - 2);
      let a = off === 0 ? k : off === 1 ? k * (u > 0.7 ? 0.55 : 0.2) : u > 0.93 ? 0.3 : 0;
      // The head: a bright knot with a halo.
      const hd = Math.hypot(W - 2 - x, (y - 2) * 1.2);
      if (hd < 2.4) a = Math.max(a, 1 - hd / 3);
      const white = clamp01((u - 0.82) * 5);
      const i = (y * W + x) * 4;
      px[i] = Math.round(255 * a);
      px[i + 1] = Math.round((236 + white * 19) * a);
      px[i + 2] = Math.round(255 * a);
      px[i + 3] = 255;
    }
  }
  return px;
}

// ---------------------------------------------------------------- The whole set

/** Build every Starwatch texture (on a worker's stand-in scene or the game's), a step at a time. */
export function* starwatchTextures(scene: Phaser.Scene): Generator<void, void, void> {
  const sky = yield* skyCanvas();
  scene.textures.addCanvas('sw_sky', pixelCanvas(SW_W, SW_H, sky));
  const isle = yield* isleArt();
  scene.textures.addCanvas('sw_isle', pixelCanvas(ISLE_W, ISLE_H, isle.diffuse))!.setDataSource(pixelCanvas(ISLE_W, ISLE_H, isle.normal));
  scene.textures.addCanvas('sw_isle_e', pixelCanvas(ISLE_W, ISLE_H, isle.emissive));
  yield;
  const sheet = (key: string, frames: PixelCanvas[], w: number, h: number) => registerAtlas(scene, key, packAtlas(frames.map((f, i) => ({ name: `v${i}`, r: f.render() })), w, h, 8), w, h, true);
  sheet('sw_lantern', [lantern(0), lantern(1)], LANTERN_W, LANTERN_H);
  sheet('sw_bench', [bench()], BENCH_W, BENCH_H);
  sheet('sw_scope', [telescope()], SCOPE_W, SCOPE_H);
  yield;
  sheet('sw_stone', [0, 1, 2].map(standingStone), STONE_W, STONE_H);
  sheet('sw_tree', [0, 1].map(starTree), TREE_W, TREE_H);
  yield;
  sheet('sw_bloom', [0, 1, 2].map(moonflowers), BLOOM_W, BLOOM_H);
  sheet('sw_islet', [0, 1, 2].map(islet), ISLET_W, ISLET_H);
  // Last: its presence means everything above is built.
  scene.textures.addCanvas('sw_streak', pixelCanvas(STREAK_W, STREAK_H, streak()));
}

/** A prop's drawing: its kind and which of them. */
export function propFrame(kind: string, v: number): PixelCanvas {
  if (kind === 'lantern') return lantern(v);
  if (kind === 'bench') return bench();
  if (kind === 'telescope') return telescope();
  if (kind === 'stone') return standingStone(v);
  if (kind === 'tree') return starTree(v);
  return moonflowers(v);
}

/** The prop sheets' frame sizes and feet, by prop kind. */
export const PROP_ART: Record<string, { key: string; w: number; h: number; foot: number }> = {
  lantern: { key: 'sw_lantern', w: LANTERN_W, h: LANTERN_H, foot: LANTERN_FOOT },
  bench: { key: 'sw_bench', w: BENCH_W, h: BENCH_H, foot: BENCH_FOOT },
  telescope: { key: 'sw_scope', w: SCOPE_W, h: SCOPE_H, foot: SCOPE_FOOT },
  stone: { key: 'sw_stone', w: STONE_W, h: STONE_H, foot: STONE_FOOT },
  tree: { key: 'sw_tree', w: TREE_W, h: TREE_H, foot: TREE_FOOT },
  bloom: { key: 'sw_bloom', w: BLOOM_W, h: BLOOM_H, foot: BLOOM_FOOT },
};

// ---------------------------------------------------------------- The loading picture

/**
 * Starwatch for its loading screen: the isle small against the night, its
 * terrace and lanterns lit, the Milky Way behind, the moon, a star falling.
 */
export function paintStarwatchLoad(): LoadArt {
  const W = 224;
  const H = 132;
  const base = new Bitmap(W, H);
  const glow = new Bitmap(W, H);
  const R = rng(616);
  const sky = ramp('#06061a', '#0a0b24', '#0f1230', '#15193c', '#1c2148');
  // Sky, the band of the Milky Way across it from lower left to upper right.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(x, y, 24, 5, 3);
      let c = along(sky, 0.15 + (y / H) * 0.55 + (n - 0.5) * 0.25);
      const d = ((x - 0) * 0.5 + (y - 132) * 0.866) * -1 - 50;
      const bk = Math.exp(-((d / 26) ** 2)) * (0.5 + n * 0.6);
      const lane = smooth(0.52, 0.66, fbm(x * 1.3, y, 10, 41, 2)) * Math.exp(-(((d - 3) / 9) ** 2));
      c = mix(c, along(MILKY, bk), Math.min(0.8, bk * 0.9) * (1 - lane * 0.8));
      const dd = bayer(x, y);
      base.set(x, y, [Math.floor(c[0] / 6 + dd) * 6, Math.floor(c[1] / 6 + dd) * 6, Math.floor(c[2] / 6 + dd) * 6]);
      if (bk > 0.4) glow.set(x, y, mix([0, 0, 0], hex('#3a3060'), (bk - 0.4) * 0.6));
    }
  }
  for (let k = 0; k < 260; k++) {
    const x = Math.floor(R() * W);
    const y = Math.floor(R() * H * 0.8);
    const b = Math.pow(R(), 2.5);
    base.set(x, y, mix(hex('#8090c0'), hex('#ffffff'), b));
    if (b > 0.6) glow.set(x, y, hex('#a0b0ff'));
  }
  // The moon, a crescent, top left.
  const mx = 30;
  const my = 24;
  for (let y = my - 14; y <= my + 14; y++) {
    for (let x = mx - 14; x <= mx + 14; x++) {
      const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my);
      if (d > 7) {
        if (d < 14 && bayer(x, y) < (14 - d) / 14) glow.set(x, y, hex('#2a2e48'));
        continue;
      }
      const sh = Math.hypot(x + 0.5 - mx - 3.4, y + 0.5 - my + 0.8);
      base.set(x, y, sh > 6.6 ? hex(d > 6 ? '#fffaf0' : '#f0ecdc') : hex('#1a1e3a'));
      if (sh > 6.6) glow.set(x, y, hex('#605a50'));
    }
  }
  // A star falling, upper right, its tail behind it.
  for (let k = 0; k < 26; k++) {
    const x = 196 - k * 1.8;
    const y = 14 + k * 0.7;
    const a = 1 - k / 26;
    base.set(x, y, mix(hex('#15193c'), hex('#ffffff'), a));
    glow.set(x, y, mix([0, 0, 0], hex('#c0d0ff'), a));
  }
  // The isle: grass on top, rock tapering beneath, the terrace a pale ring, lanterns lit.
  const ix = 120;
  const iy = 86;
  const rx = 56;
  const ry = 14;
  const lanterns: [number, number][] = [];
  for (let x = ix - rx; x <= ix + rx; x++) {
    const u = (x - ix) / rx;
    const rim = iy + ry * Math.sqrt(Math.max(0, 1 - u * u));
    const depth = (1 - u * u) * 30 + 4 + fbm(x, 0, 5, 56, 2) * 6;
    for (let y = Math.floor(rim); y < rim + depth; y++) {
      const t = (y - rim) / depth;
      const c = along(ramp('#0c0a18', '#16122a', '#221c3a', '#30284c'), 0.75 - t * 0.6 - u * 0.25);
      base.set(x, y, c);
      glow.set(x, y, [0, 0, 0]);
      if (hash2(x, y, 9) > 0.996 && t > 0.2 && t < 0.8) {
        base.set(x, y, hex('#9ad0ff'));
        glow.set(x, y, hex('#4a90ff'));
      }
    }
  }
  for (let y = iy - ry; y <= iy + ry; y++) {
    for (let x = ix - rx; x <= ix + rx; x++) {
      const d = Math.hypot((x + 0.5 - ix) / rx, (y + 0.5 - iy) / ry);
      if (d > 1) continue;
      glow.set(x, y, [0, 0, 0]);
      let c = along(GRASS, 0.35 + (-(x - ix) / rx - (y - iy) / ry) * 0.15 + (fbm(x, y, 6, 3, 2) - 0.5) * 0.3);
      const td = Math.hypot((x + 0.5 - ix) / 22, (y + 0.5 - iy + 2) / 6);
      if (td < 1) c = along(MOONSTONE, td > 0.85 ? 0.85 : td < 0.4 ? 0.12 : 0.5);
      if (td < 0.4 && hash2(x, y, 4) > 0.8) {
        c = hex('#e8f0ff');
        glow.set(x, y, hex('#6080c0'));
      }
      if (hash2(x, y, 12) > 0.992 && td > 1.2) {
        c = hex('#dce6ff');
        glow.set(x, y, hex('#4a5a90'));
      }
      base.set(x, y, c);
    }
  }
  for (const [lx, ly] of [
    [ix - 24, iy - 4],
    [ix + 24, iy - 4],
    [ix - 16, iy + 4],
    [ix + 16, iy + 4],
    [ix + 4, iy + 10],
  ]) {
    base.set(lx, ly, hex('#2a2e48'));
    base.set(lx, ly - 1, hex('#ffe4a0'));
    base.set(lx, ly - 2, hex('#ffd080'));
    base.set(lx, ly - 3, hex('#2a2e48'));
    for (let y = ly - 5; y <= ly + 2; y++) {
      for (let x = lx - 3; x <= lx + 3; x++) {
        const d = Math.hypot(x - lx, (y - ly + 1.5) * 1.2);
        if (d < 3.6) glow.set(x, y, mix([0, 0, 0], hex('#ff9a40'), (1 - d / 3.6) * 0.8));
      }
    }
    lanterns.push([lx, ly - 1]);
  }
  // Two starblossoms at either side.
  for (const [tx, ty] of [
    [ix - 40, iy - 2],
    [ix + 38, iy + 2],
  ]) {
    for (let y = ty - 9; y <= ty; y++) base.set(tx, y, hex('#201826'));
    for (let y = ty - 16; y <= ty - 6; y++) {
      for (let x = tx - 7; x <= tx + 7; x++) {
        const d = Math.hypot((x - tx) / 7, (y - ty + 11) / 5.5);
        if (d > 1 - hash2(x >> 1, y >> 1, 2) * 0.2) continue;
        base.set(x, y, along(ramp('#3c2e62', '#705a9a', '#b09ad0', '#e2d6f2'), 0.7 - (x - tx) / 14 - (y - ty + 11) / 11));
      }
    }
  }
  return { base, glow, spots: { lanterns, moon: [[mx, my]], isle: [[ix, iy]] } };
}
