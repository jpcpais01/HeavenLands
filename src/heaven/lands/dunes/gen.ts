// Sunsong Dunes, grown: an endless sea of golden dunes under a wide sky. The
// wind comes always from the west, so every dune has a long gentle windward
// slope, rippled, catching the sun, and a short steep slip face on its east
// side in rust-coloured shade, the crest a crisp line between. Between the
// dune fields lie hard pans of rose clay. Here and there an oasis: a pool of
// turquoise water with lily pads and lotus, a ring of green grass, date palms
// and papyrus, sometimes a lantern on its bank. And now and then a site: a
// caravan camp with its tent, rugs and resting camels, a great sandstone arch
// among hoodoos, or the ruins of an old colonnade half under the sand. By
// night the dunes go silver-blue and a grain of the singing sand glints here
// and there under the stars.
//
// Everything is a function of the fixed seed and the position (see
// ../types.ts). Oases and sites live on coarse cells so a pixel only asks its
// own cell; the dunes themselves are a warped wave, each pixel working out
// where it is on its dune.
//
// No Phaser here: the land worker and scripts/lands.ts grow it too.

import { hash2, rng, valueNoise } from '../../../art/env';
import { smooth } from '../paint';
import { CHUNK, LAND_MID, type ChunkLayout, type GroundCell, type LandGen, type LandGround, type LandLight, type LandProp, type LifeSpot, type TileFields } from '../types';
import { DUNE_KINDS, K } from './palette';

/** The one Sunsong Dunes everyone walks. */
export const DUNE_SEED = 52817;

// ---------------------------------------------------------------- the dunes

/** A dune's width crest to crest (px), and its height at full strength (px-ish, for the normals). */
const DUNE_W = 132;
const DUNE_H = 15;
/** Where on its wave the crest stands (0..1): the windward slope before it, the slip face after. */
const LEE = 0.74;
/** How strongly the dune field rises: broad fields and smaller swells. */
const FIELD_SCALES: [number, number][] = [[620, 0.72], [190, 0.28]];
const FIELD_LO = 0.22;
const FIELD_HI = 0.55;
/** Where the field is weaker than PAN_TOP, the clay pan shows in the troughs between the dunes, more of it the weaker. */
const PAN_TOP = 0.42;
const PAN_SPREAD = 1.5;
/** Ripples across the windward slopes: their spacing (px). */
const RIPPLE = 5;
/** The singing sand: a share of sand pixels that glint by night. */
const GLINT_ODDS = 0.0011;

// ---------------------------------------------------------------- oases

/** One oasis at most per cell (px), at these odds, this big (px), kept inside its cell. */
const OASIS_CELL = 880;
const OASIS_ODDS = 0.42;
const OASIS_R: [number, number] = [38, 68];
const OASIS_MARGIN = 220;
/** Pools are this much wider than tall. */
const OASIS_SQUASH = 1.4;
/** The rings round the water, in pool radii: wet bank, grass, damp sand; dunes flatten out to DUNE_CALM. */
const BANK = 1.08;
const GRASS = 1.42;
const DAMP = 1.62;
const DUNE_CALM: [number, number] = [1.7, 3.3];
/** Stars in the pool by night. */
const STAR_ODDS = 0.004;
/** The share of oases with a lantern on the bank. */
const LAMP_ODDS = 0.5;

// ---------------------------------------------------------------- sites

const SITE_CELL = 1040;
const CAMP_ODDS = 0.2;
const ARCH_ODDS = 0.16;
const RUIN_ODDS = 0.16;
/** How far round a site the dunes lie down flat (px). */
const SITE_CALM: [number, number] = [96, 210];
/** The ruins' court of paving, its half sizes (px). */
const COURT: [number, number] = [86, 44];
const COLUMN_STEP = 26;

const CAMP_LIGHT: Omit<LandLight, 'x' | 'y'> = { radius: 110, color: 0xffa860, intensity: 1.2, day: 0, flicker: 0.3, halo: 0.55 };
const TENT_LIGHT: Omit<LandLight, 'x' | 'y'> = { radius: 80, color: 0xffb070, intensity: 0.9, day: 0, flicker: 0.2, halo: 0.3 };
const OASIS_LIGHT: Omit<LandLight, 'x' | 'y'> = { radius: 100, color: 0xffbe72, intensity: 1.05, day: 0, flicker: 0.25, halo: 0.5 };

interface Oasis {
  x: number;
  y: number;
  r: number;
  seed: number;
}

export interface Site {
  kind: 'camp' | 'arch' | 'ruin';
  x: number;
  y: number;
  flip: boolean;
  seed: number;
}

const ROW = 4096;

export class DuneGen implements LandGen {
  readonly seed = DUNE_SEED;
  readonly ground: LandGround;
  private oases = new Map<number, Oasis | null>();
  private sites = new Map<number, Site | null>();
  private lastOKey = NaN;
  private lastO: Oasis | null = null;
  private lastSKey = NaN;
  private lastS: Site | null = null;
  /** The last dune worked out (see dune): where on its wave, its profile 0..1, the field's strength, how calm it lies (near water and sites), its own size. */
  private df = 0;
  private dp = 0;
  private dk = 0;
  private dc = 1;
  private da = 1;

  constructor() {
    const self = this;
    this.ground = {
      kinds: DUNE_KINDS,
      feet: ['sand', 'earth', 'sand', 'grass', 'wade', 'wade', 'wade', 'stone', 'stone'],
      cell: (x, y, c) => self.cell(x, y, c),
      decorate: (f) => self.decorate(f),
    };
  }

  /** A well-mixed 0..1 draw for cell (i, j). */
  private draw(i: number, j: number, salt: number): number {
    let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(salt + this.seed, 0x9e3779b9);
    for (let k = 0; k < 2; k++) {
      h ^= h >>> 16;
      h = Math.imul(h, 0x7feb352d);
      h ^= h >>> 15;
      h = Math.imul(h, 0x846ca68b);
      h ^= h >>> 16;
      if (k === 0) h ^= Math.imul(j, 0x165667b1);
    }
    return (h >>> 0) / 4294967296;
  }

  // ---------------------------------------------------------------- sites and oases, by cell

  /** The site of cell (i, j), if it has one. The cell the wanderer starts in always has a caravan camp. */
  siteOf(i: number, j: number): Site | null {
    const key = i * ROW + j;
    const had = this.sites.get(key);
    if (had !== undefined) return had;
    let s: Site | null = null;
    const ox = i * SITE_CELL;
    const oy = j * SITE_CELL;
    const d = (k: number) => this.draw(i, j, k);
    const si = Math.floor(LAND_MID / SITE_CELL);
    if (i === si && j === si) s = { kind: 'camp', x: LAND_MID + 150, y: LAND_MID + 36, flip: true, seed: 11 };
    else {
      const r = d(1);
      const at = { x: ox + 260 + Math.floor(d(2) * (SITE_CELL - 520)), y: oy + 220 + Math.floor(d(3) * (SITE_CELL - 440)), flip: d(4) < 0.5, seed: Math.floor(d(6) * 1e6) };
      if (r < CAMP_ODDS) s = { kind: 'camp', ...at };
      else if (r < CAMP_ODDS + ARCH_ODDS) s = { kind: 'arch', ...at };
      else if (r < CAMP_ODDS + ARCH_ODDS + RUIN_ODDS) s = { kind: 'ruin', ...at };
    }
    if (this.sites.size > 1024) this.sites.clear();
    this.sites.set(key, s);
    return s;
  }

  private siteAt(x: number, y: number): Site | null {
    const i = Math.floor(x / SITE_CELL);
    const j = Math.floor(y / SITE_CELL);
    const key = i * ROW + j;
    if (key !== this.lastSKey) {
      this.lastSKey = key;
      this.lastS = this.siteOf(i, j);
    }
    return this.lastS;
  }

  /** The oasis of cell (i, j), if it has one (never crowding a site). The wanderer starts beside one. */
  oasisOf(i: number, j: number): Oasis | null {
    const key = i * ROW + j;
    const had = this.oases.get(key);
    if (had !== undefined) return had;
    let o: Oasis | null = null;
    const oi = Math.floor(LAND_MID / OASIS_CELL);
    if (i === oi && j === oi) o = { x: LAND_MID - 64, y: LAND_MID - 40, r: 58, seed: 4242 };
    else if (this.draw(i, j, 101) < OASIS_ODDS) {
      const x = i * OASIS_CELL + OASIS_MARGIN + this.draw(i, j, 102) * (OASIS_CELL - OASIS_MARGIN * 2);
      const y = j * OASIS_CELL + OASIS_MARGIN + this.draw(i, j, 103) * (OASIS_CELL - OASIS_MARGIN * 2);
      const r = OASIS_R[0] + this.draw(i, j, 104) * (OASIS_R[1] - OASIS_R[0]);
      o = { x, y, r, seed: Math.floor(this.draw(i, j, 105) * 1e6) };
      const si = Math.floor(x / SITE_CELL);
      const sj = Math.floor(y / SITE_CELL);
      for (let b = sj - 1; b <= sj + 1 && o; b++) {
        for (let a = si - 1; a <= si + 1 && o; a++) {
          const s = this.siteOf(a, b);
          if (s && Math.hypot(x - s.x, (y - s.y) * 1.3) < r * DAMP + SITE_CALM[1]) o = null;
        }
      }
    }
    if (this.oases.size > 1024) this.oases.clear();
    this.oases.set(key, o);
    return o;
  }

  private oasisAt(x: number, y: number): Oasis | null {
    const i = Math.floor(x / OASIS_CELL);
    const j = Math.floor(y / OASIS_CELL);
    const key = i * ROW + j;
    if (key !== this.lastOKey) {
      this.lastOKey = key;
      this.lastO = this.oasisOf(i, j);
    }
    return this.lastO;
  }

  /** How far out from oasis `o` (x, y) is, in its ragged radii: under 1 is the water. */
  private oasisE(x: number, y: number, o: Oasis): number {
    const dx = x - o.x;
    const dy = (y - o.y) * OASIS_SQUASH;
    const d = Math.hypot(dx, dy);
    if (d > o.r * 3.6) return 9;
    return d / (o.r * (0.8 + 0.36 * valueNoise(x, y, o.r * 0.6, o.seed)));
  }

  /** How far (x, y) is from the middle of a site, stretched like its ground (px), or Infinity. */
  private siteD(x: number, y: number, s: Site | null): number {
    return s ? Math.hypot(x - s.x, (y - s.y) * 1.3) : Infinity;
  }

  // ---------------------------------------------------------------- the dunes

  /** Where (x, y) lies on its dune: sets df (0..1 along the wave), dp (its profile 0..1), dk (the field's strength 0..1), dc (calm), da (this dune's own size). */
  private dune(x: number, y: number, calm: number): void {
    const s = this.seed;
    // The crests snake north to south, bent by broad and smaller warps, so they wander, fork and join.
    const u = (x + valueNoise(x, y, 300, s + 1) * 190 + valueNoise(x, y, 110, s + 3) * 70 + valueNoise(x, y, 40, s + 2) * 14 + Math.sin(y / 160 + valueNoise(x, y, 420, s + 4) * 5) * 34) / DUNE_W;
    const n = Math.floor(u);
    const f = u - n;
    this.df = f;
    // A long windward slope, steepening toward the crest; a straight slip face down the lee, softening at its toe.
    this.dp = f < LEE ? Math.pow(f / LEE, 1.35) : Math.pow(1 - (f - LEE) / (1 - LEE), 1.15);
    const field = valueNoise(x, y, FIELD_SCALES[0][0], s + 5) * FIELD_SCALES[0][1] + valueNoise(x, y, FIELD_SCALES[1][0], s + 6) * FIELD_SCALES[1][1];
    this.dk = smooth(FIELD_LO, FIELD_HI, field);
    this.dc = calm;
    // Each dune its own size along its crest, now and then dying away, so ridges end in horns and gaps.
    this.da = 0.15 + 1.05 * smooth(0.22, 0.62, valueNoise(n * 37, y, 190, s + 7));
  }

  /** Whether the last dune's spot is clay pan: the troughs where the field is weak. */
  private panHere(x: number, y: number): boolean {
    const thr = (PAN_TOP - this.dk) * PAN_SPREAD * this.dc;
    // Lying calm near water and sites, the sand covers the pan.
    if (thr < 0.03) return false;
    return this.dp * this.da < thr + (valueNoise(x, y, 9, this.seed + 29) - 0.5) * 0.12 * Math.min(1, thr * 4);
  }

  // ---------------------------------------------------------------- the ground, a pixel at a time

  cell(x: number, y: number, c: GroundCell): void {
    const o = this.oasisAt(x, y);
    const e = o ? this.oasisE(x, y, o) : 9;
    if (e < 1) return this.pool(x, y, e, o!, c);
    const site = this.siteAt(x, y);
    const sd = this.siteD(x, y, site);
    if (site && site.kind === 'ruin' && this.court(x, y, site, c)) return;
    let calm = 1;
    if (e < DUNE_CALM[1]) calm *= smooth(DUNE_CALM[0], DUNE_CALM[1], e);
    if (sd < SITE_CALM[1]) calm *= smooth(SITE_CALM[0], SITE_CALM[1], sd);
    this.dune(x, y, calm);
    const h = this.dk * this.dc * this.da * this.dp * DUNE_H;
    if (e < BANK) {
      c.kind = K.Damp;
      c.height = h * 0.2;
      c.tone = -0.6 + (e - 1) * 6 + (valueNoise(x, y, 4, this.seed + 21) - 0.5) * 0.8;
      return;
    }
    if (e < GRASS + (valueNoise(x, y, 10, this.seed + 23) - 0.5) * 0.32) return this.grass(x, y, e, c);
    if (e < DAMP + (valueNoise(x, y, 14, this.seed + 25) - 0.5) * 0.3) {
      c.kind = K.Damp;
      c.height = h;
      // Drying out toward the sand.
      c.tone = 1 + (e - GRASS) * 9 + (valueNoise(x, y, 6, this.seed + 27) - 0.5) * 0.9;
      return;
    }
    if (this.panHere(x, y)) return this.pan(x, y, h, c);
    this.sand(x, y, h, c);
  }

  /** Dune sand: ripples on the windward slopes, a bright crest, the slip face smooth. */
  private sand(x: number, y: number, h: number, c: GroundCell): void {
    const s = this.seed;
    c.kind = K.Sand;
    c.height = h;
    const f = this.df;
    let t = (valueNoise(x, y, 60, s + 31) - 0.5) * 0.7;
    if (f < LEE) {
      // Wind ripples, wavy lines across the slope, fading out near the crest and in the troughs.
      const p = (x + valueNoise(x, y, 34, s + 33) * 16 + y * 0.42) / RIPPLE;
      const r = p - Math.floor(p);
      const k = Math.max(1 - this.dc, this.dk * smooth(0.04, 0.2, this.dp) * (1 - smooth(0.82, 0.97, this.dp)));
      if (k > 0.25) t += r < 0.2 ? 0.95 : r < 0.42 ? -0.55 : 0;
      // The very crest: a sunlit lip along it.
      const tall = this.dk * this.dc * this.da;
      if (f > LEE - 0.014 && tall > 0.35) t += 1.4;
    } else {
      const tall = this.dk * this.dc * this.da;
      // A line of shade just over the crest where the slip face drops away; the face itself lit by the sky, not black.
      if (f < LEE + 0.012 && tall > 0.35) t -= 0.8;
      else t += (2.2 + ((f - LEE) / (1 - LEE)) * 0.8) * Math.min(1, tall * 1.6);
    }
    // Low in the troughs the sand is a little redder.
    t -= (1 - this.dp) * this.dk * this.dc * 0.5;
    c.tone = t;
    const g = hash2(x, y, s + 35);
    if (g > 1 - GLINT_ODDS) c.glow = 0.4 + ((g - 1 + GLINT_ODDS) / GLINT_ODDS) * 0.6;
  }

  /** A clay pan between the dunes, cracked into plates, a skin of blown sand over it here and there. */
  private pan(x: number, y: number, h: number, c: GroundCell): void {
    const s = this.seed;
    const drift = valueNoise(x * 0.5, y * 1.6, 30, s + 41) * 0.8 + valueNoise(x, y, 7, s + 43) * 0.2;
    if (drift > 0.7) {
      // Sand blown across the pan in tongues.
      c.kind = K.Sand;
      c.height = h + (drift - 0.7) * 3;
      c.tone = -0.4 + (drift - 0.7) * 6;
      return;
    }
    c.kind = K.Pan;
    c.height = h * 0.5 + valueNoise(x, y, 5, s + 45) * 0.25;
    const crack = Math.abs(valueNoise(x, y, 13, s + 47) - 0.5) < 0.016;
    c.tone = (valueNoise(x, y, 40, s + 51) - 0.5) * 1.2 + (crack ? -1 : 0) - smooth(0.55, 0.7, drift) * 0.6;
  }

  /** The grass round an oasis, in soft clumps. */
  private grass(x: number, y: number, e: number, c: GroundCell): void {
    const s = this.seed;
    c.kind = K.Grass;
    const clump = valueNoise(x, y, 6, s + 61);
    c.height = 0.3 + clump * 0.7;
    c.tone = (clump - 0.5) * 2.2 + (hash2(x, y, s + 63) > 0.9 ? 1 : 0) - smooth(GRASS - 0.15, GRASS + 0.1, e) * 1.2;
  }

  /** The pool: deep teal in its middle, turquoise shallows, a bright lip at the edge, stars by night. */
  private pool(x: number, y: number, e: number, o: Oasis, c: GroundCell): void {
    c.kind = K.Water;
    c.height = 0;
    if (e > 0.955) {
      c.tone = 8.4;
      return;
    }
    const swirl = valueNoise(x * 0.6, y * 1.4, 12, o.seed + 3);
    c.tone = Math.pow(e, 1.6) * 6.2 + (swirl > 0.68 ? 0.9 : 0) + (e > 0.88 ? 0.8 : 0);
    const h = hash2(x, y, this.seed + 71);
    if (h > 1 - STAR_ODDS) c.glow = 0.4 + ((h - 1 + STAR_ODDS) / STAR_ODDS) * 0.6;
  }

  /** The ruins' paving: worn slabs in courses, sand lying over them in drifts. False off it. */
  private court(x: number, y: number, site: Site, c: GroundCell): boolean {
    const dx = (x - site.x) / COURT[0];
    const dy = (y - site.y) / COURT[1];
    const d = dx * dx + dy * dy;
    if (d > 1.15) return false;
    const s = this.seed;
    // Sand over the slabs: thicker toward the edge, in drifts.
    const drift = valueNoise(x, y, 18, site.seed + 1) * 0.6 + d * 0.55;
    if (drift > 0.78) return false;
    c.kind = K.Flag;
    const row = Math.floor((y - site.y + 200) / 7);
    const col = Math.floor((x - site.x + 200 + (row % 2) * 5) / 11);
    const lx = (x - site.x + 200 + (row % 2) * 5) % 11;
    const ly = (y - site.y + 200) % 7;
    const own = hash2(col, row, s + 81);
    c.height = 0.4 + own * 0.3;
    c.tone = (own - 0.5) * 1.6 - (lx === 0 || ly === 0 ? 1.8 : 0) + (ly === 1 && lx > 0 ? 0.7 : 0) - smooth(0.6, 0.78, drift) * 0.8;
    // A cracked slab, now and then.
    if (own > 0.86 && Math.abs(lx - ly * 1.4 - 1) < 0.6) c.tone -= 1.4;
    return true;
  }

  /** Small things over the finished ground: lily pads and lotus, pebbles of sandstone on the pans, flowers in the grass. */
  decorate(f: TileFields): void {
    const R = rng(Math.floor(hash2(f.x0 / 64, f.y0 / 64, this.seed + 401) * 2 ** 31));
    const at = (x: number, y: number) => (y - f.y0 + 1) * f.pw + (x - f.x0) + 1;
    const inside = (x: number, y: number) => x >= f.x0 - 1 && x <= f.x0 + f.w && y >= f.y0 - 1 && y <= f.y0 + f.h;
    const W = f.w;
    const H = f.h;
    // Lily pads floating in the shallows, a lotus on some.
    for (let k = 0; k < (W * H) / 90; k++) {
      const x = f.x0 + Math.floor(R() * W);
      const y = f.y0 + Math.floor(R() * H);
      const i = at(x, y);
      if (f.kind[i] !== K.Water || f.tone[i] < 3.4 || f.tone[i] > 8) continue;
      const big = R() < 0.4;
      const cut = Math.floor(R() * 4);
      for (const [dx, dy] of big ? PAD_BIG : PAD) {
        // The pad's notch.
        if ((cut === 0 && dx === 1 && dy === 0) || (cut === 1 && dx === 0 && dy === 1)) continue;
        if (!inside(x + dx, y + dy)) continue;
        const b = at(x + dx, y + dy);
        if (f.kind[b] !== K.Water) continue;
        f.kind[b] = K.Pad;
        f.height[b] = 0.3;
        f.tone[b] = (dy < 0 ? 1 : 0) + (dx < 0 ? 0.5 : 0) + R() * 0.6;
        f.glow[b] = 0;
      }
      if (R() < 0.35) {
        for (const [dx, dy, t] of LOTUS) {
          if (!inside(x + dx, y + dy)) continue;
          const b = at(x + dx, y + dy);
          f.kind[b] = K.Lotus;
          f.height[b] = 1 + (dy < 0 ? 0.6 : 0);
          f.tone[b] = t;
        }
      }
    }
    // Pebbles of sandstone on the pans.
    for (let k = 0; k < (W * H) / 260; k++) {
      const x = f.x0 + Math.floor(R() * W);
      const y = f.y0 + Math.floor(R() * H);
      if (f.kind[at(x, y)] !== K.Pan) continue;
      const big = R() < 0.25;
      for (const [i, j] of big ? PEBBLE_BIG : PEBBLE) {
        if (!inside(x + i, y + j)) continue;
        const b = at(x + i, y + j);
        if (f.kind[b] !== K.Pan) continue;
        f.kind[b] = K.Rock;
        f.height[b] += 1 + (j < 0 ? 0.5 : 0);
        f.tone[b] = 0.8 + (j < 0 ? 0.8 : 0) + (i > 0 ? -0.5 : 0);
      }
    }
    // Little flowers in the oasis grass.
    for (let k = 0; k < (W * H) / 160; k++) {
      const x = f.x0 + Math.floor(R() * W);
      const y = f.y0 + Math.floor(R() * H);
      const i = at(x, y);
      if (f.kind[i] !== K.Grass) continue;
      f.kind[i] = K.Lotus;
      f.height[i] += 0.5;
      f.tone[i] = 2 + R() * 2;
    }
  }

  // ---------------------------------------------------------------- feet

  /** Everywhere but the pools can be walked. */
  open(x: number, y: number): boolean {
    const o = this.oasisAt(x, y);
    return !o || this.oasisE(x, y, o) >= 0.97;
  }

  spawn(): { x: number; y: number } {
    // On the grass by the first oasis's south-east bank, the camp in sight.
    return { x: LAND_MID - 6, y: LAND_MID + 6 };
  }

  // ---------------------------------------------------------------- questions the land's life asks

  /** Is (x, y) a pool's open water? */
  water(x: number, y: number): boolean {
    const o = this.oasisAt(x, y);
    return !!o && this.oasisE(x, y, o) < 0.94;
  }

  /** Is (x, y) a dune's crest, high enough for the wind to lift sand off it? */
  crest(x: number, y: number): boolean {
    const o = this.oasisAt(x, y);
    const e = o ? this.oasisE(x, y, o) : 9;
    if (e < DUNE_CALM[1]) return false;
    const sd = this.siteD(x, y, this.siteAt(x, y));
    if (sd < SITE_CALM[1]) return false;
    this.dune(x, y, 1);
    return this.dk * this.da > 0.6 && this.df > LEE - 0.03 && this.df < LEE + 0.005;
  }

  /** Is (x, y) open dune sand (not pan, nor near water or a site)? */
  dunes(x: number, y: number): boolean {
    const o = this.oasisAt(x, y);
    const e = o ? this.oasisE(x, y, o) : 9;
    if (e < DAMP + 0.2) return false;
    const site = this.siteAt(x, y);
    const sd = this.siteD(x, y, site);
    let calm = 1;
    if (e < DUNE_CALM[1]) calm *= smooth(DUNE_CALM[0], DUNE_CALM[1], e);
    if (sd < SITE_CALM[1]) calm *= smooth(SITE_CALM[0], SITE_CALM[1], sd);
    this.dune(x, y, calm);
    return !this.panHere(x, y);
  }

  /** The nearest pool to (x, y): its middle and how far its water's edge is (px), or null past `reach`. */
  nearestPool(x: number, y: number, reach: number): { x: number; d: number } | null {
    const i = Math.floor(x / OASIS_CELL);
    const j = Math.floor(y / OASIS_CELL);
    let best: { x: number; d: number } | null = null;
    for (let b = j - 1; b <= j + 1; b++) {
      for (let a = i - 1; a <= i + 1; a++) {
        const o = this.oasisOf(a, b);
        if (!o) continue;
        const d = Math.max(0, Math.hypot(x - o.x, (y - o.y) * OASIS_SQUASH) - o.r);
        if (d < reach && (!best || d < best.d)) best = { x: o.x, d };
      }
    }
    return best;
  }

  /** Is (x, y) kept clear for a site's things? */
  private crowds(x: number, y: number): boolean {
    for (const s of this.sitesNear(x, y)) {
      const dx = x - s.x;
      const dy = y - s.y;
      if (s.kind === 'camp' && Math.abs(dx) < 92 && dy > -56 && dy < 46) return true;
      if (s.kind === 'arch' && Math.abs(dx) < 120 && dy > -40 && dy < 34) return true;
      if (s.kind === 'ruin' && Math.hypot(dx / (COURT[0] + 16), dy / (COURT[1] + 16)) < 1) return true;
    }
    return false;
  }

  private sitesNear(x: number, y: number): Site[] {
    const out: Site[] = [];
    const i = Math.floor(x / SITE_CELL);
    const j = Math.floor(y / SITE_CELL);
    for (let b = j - 1; b <= j + 1; b++) {
      for (let a = i - 1; a <= i + 1; a++) {
        const s = this.siteOf(a, b);
        if (s && Math.abs(s.x - x) < 360 && Math.abs(s.y - y) < 300) out.push(s);
      }
    }
    return out;
  }

  private oasesNear(x: number, y: number): Oasis[] {
    const out: Oasis[] = [];
    const i = Math.floor(x / OASIS_CELL);
    const j = Math.floor(y / OASIS_CELL);
    for (let b = j - 1; b <= j + 1; b++) {
      for (let a = i - 1; a <= i + 1; a++) {
        const o = this.oasisOf(a, b);
        if (o && Math.abs(o.x - x) < 360 && Math.abs(o.y - y) < 300) out.push(o);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- what stands

  layout(cx: number, cy: number): ChunkLayout {
    const props: LandProp[] = [];
    const lights: LandLight[] = [];
    const life: LifeSpot[] = [];
    const R = rng(Math.floor(hash2(cx, cy, this.seed + 501) * 2 ** 31));
    const x0 = cx * CHUNK;
    const y0 = cy * CHUNK;
    const inChunk = (x: number, y: number) => x >= x0 && x < x0 + CHUNK && y >= y0 && y < y0 + CHUNK;
    const put = (p: LandProp) => {
      if (inChunk(p.x, p.y)) props.push(p);
    };
    const mid = { x: x0 + CHUNK / 2, y: y0 + CHUNK / 2 };

    for (const s of this.sitesNear(mid.x, mid.y)) this.site(s, put, lights, life, inChunk);

    // A lantern on the south bank of some oases.
    for (const o of this.oasesNear(mid.x, mid.y)) {
      if (o.seed % 100 >= LAMP_ODDS * 100) continue;
      const lx = Math.round(o.x + o.r * 0.42);
      const ly = Math.round(o.y + (o.r * 1.3) / OASIS_SQUASH);
      if (!inChunk(lx, ly) || !this.open(lx, ly)) continue;
      props.push({ sheet: 'dune_lamp', frame: 'l0', x: lx, y: ly, block: { rx: 3, ry: 2 } });
      lights.push({ x: lx, y: ly - 30, ...OASIS_LIGHT });
    }

    const G = 30;
    for (let j = 0; j < CHUNK / G; j++) {
      for (let i = 0; i < CHUNK / G; i++) {
        const x = Math.round(x0 + (i + 0.15 + R() * 0.7) * G);
        const y = Math.round(y0 + (j + 0.15 + R() * 0.7) * G);
        const r = R();
        const v = R();
        const flip = R() < 0.5;
        if (this.crowds(x, y)) continue;
        const o = this.oasisAt(x, y);
        const e = o ? this.oasisE(x, y, o) : 9;
        if (e < 0.97) continue;
        if (e < 1.12) {
          if (r < 0.5) props.push({ sheet: 'dune_reed', frame: `r${Math.floor(v * 3)}`, x, y, flip, shadow: false });
          continue;
        }
        if (e < 1.65) {
          if (r < 0.34) props.push(palm(x, y, v, flip));
          else if (r < 0.48) props.push({ sheet: 'dune_reed', frame: `r${Math.floor(v * 3)}`, x, y, flip, shadow: false });
          else if (r < 0.6) props.push({ sheet: 'dune_shrub', frame: `s${Math.floor(v * 2)}`, x, y, flip, block: { rx: 6, ry: 2.5 } });
          continue;
        }
        if (e < 2.4) {
          if (r < 0.08) props.push(palm(x, y, v, flip));
          else if (r < 0.2) props.push({ sheet: 'dune_grass', frame: `g${Math.floor(v * 3)}`, x, y, flip, shadow: false });
          continue;
        }
        if (this.dunes(x, y)) {
          // Only low on the dunes: the crests are bare.
          if (this.dp > 0.5) continue;
          if (r < 0.04) props.push({ sheet: 'dune_grass', frame: `g${Math.floor(v * 3)}`, x, y, flip, shadow: false });
          else if (r < 0.05) props.push({ sheet: 'dune_shrub', frame: `s${Math.floor(v * 2)}`, x, y, flip, block: { rx: 6, ry: 2.5 } });
        } else {
          if (r < 0.04) props.push(rock(x, y, v, flip));
          else if (r < 0.1) props.push({ sheet: 'dune_shrub', frame: `s${Math.floor(v * 2)}`, x, y, flip, block: { rx: 6, ry: 2.5 } });
          else if (r < 0.17) props.push({ sheet: 'dune_grass', frame: `g${Math.floor(v * 3)}`, x, y, flip, shadow: false });
          else if (r < 0.174) props.push(spire(x, y, v, flip));
        }
      }
    }

    // A fennec or two, out round the oases and the pans.
    for (let k = 0; k < 2; k++) {
      if (R() > 0.3) continue;
      const x = Math.round(x0 + 20 + R() * (CHUNK - 40));
      const y = Math.round(y0 + 20 + R() * (CHUNK - 40));
      if (this.open(x, y) && !this.crowds(x, y)) life.push({ kind: 'fennec', x, y });
    }
    return { props, lights, life };
  }

  /** A site's things, those standing in this chunk. */
  private site(s: Site, put: (p: LandProp) => void, lights: LandLight[], life: LifeSpot[], inChunk: (x: number, y: number) => boolean): void {
    const R = rng(s.seed + 7);
    const dir = s.flip ? -1 : 1;
    if (s.kind === 'camp') {
      put({ sheet: 'dune_tent', frame: 'tent', x: s.x, y: s.y, flip: s.flip, block: { rx: 34, ry: 9, oy: -6 } });
      if (inChunk(s.x, s.y)) lights.push({ x: s.x, y: s.y - 12, ...TENT_LIGHT });
      // The rug spread before it with tea set out, a lantern on its pole, jars, and the camels resting.
      put({ sheet: 'dune_rug', frame: 'rug', x: s.x - dir * 4, y: s.y + 24, flip: s.flip, shadow: false, sortY: -100000 });
      const lx = s.x + dir * 44;
      const ly = s.y + 22;
      put({ sheet: 'dune_lamp', frame: 'l1', x: lx, y: ly, block: { rx: 3, ry: 2 } });
      if (inChunk(lx, ly)) lights.push({ x: lx, y: ly - 32, ...CAMP_LIGHT });
      put({ sheet: 'dune_jar', frame: 'j0', x: s.x + dir * 40, y: s.y + 2, flip: s.flip, block: { rx: 6, ry: 3 } });
      put({ sheet: 'dune_jar', frame: 'j1', x: s.x - dir * 38, y: s.y - 2, flip: !s.flip, block: { rx: 5, ry: 2.5 } });
      const n = 2 + Math.floor(R() * 2);
      for (let k = 0; k < n; k++) {
        const x = Math.round(s.x - dir * (64 + k * 22 + R() * 6));
        const y = Math.round(s.y + 8 + k * 12 + R() * 6);
        if (inChunk(x, y)) life.push({ kind: 'camel', x, y });
      }
    } else if (s.kind === 'arch') {
      put({ sheet: 'dune_arch', frame: 'arch', x: s.x, y: s.y, block: { rx: 16, ry: 7, ox: -34, oy: -3 } });
      put({ sheet: 'dune_arch', frame: 'leg', x: s.x + 36, y: s.y - 2, shadow: false, block: { rx: 14, ry: 6 } });
      // Hoodoos and boulders gathered round it.
      const n = 3 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const a = R() * Math.PI * 2;
        const d = 90 + R() * 60;
        const x = Math.round(s.x + Math.cos(a) * d);
        const y = Math.round(s.y + Math.sin(a) * d * 0.55);
        put(R() < 0.55 ? spire(x, y, R(), R() < 0.5) : rock(x, y, 0.4 + R() * 0.6, R() < 0.5));
      }
    } else {
      // A colonnade along the court's back: some columns whole, some broken, some gone; a drum fallen in front.
      const n = 6;
      for (let k = 0; k < n; k++) {
        const x = Math.round(s.x + (k - (n - 1) / 2) * COLUMN_STEP);
        const y = s.y - 20;
        const v = R();
        if (v < 0.15) continue;
        const frame = v < 0.5 ? 'p0' : v < 0.8 ? 'p1' : 'p2';
        put({ sheet: 'dune_pillar', frame, x, y, block: { rx: 6, ry: 3 } });
      }
      for (let k = 0; k < 2; k++) {
        const x = Math.round(s.x + (R() - 0.5) * 120);
        const y = Math.round(s.y + 8 + R() * 22);
        put({ sheet: 'dune_pillar', frame: 'd0', x, y, flip: R() < 0.5, block: { rx: 9, ry: 3.5 } });
      }
      put({ sheet: 'dune_pillar', frame: 'p0', x: s.x + dir * 70, y: s.y + 26, block: { rx: 6, ry: 3 } });
    }
  }
}

/** Little shapes stamped into the ground: [dx, dy] and [dx, dy, tone]. */
const PAD: [number, number][] = [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1]];
const PAD_BIG: [number, number][] = [[0, 0], [1, 0], [-1, 0], [2, 0], [-2, 0], [0, -1], [1, -1], [-1, -1], [0, 1], [1, 1], [-1, 1]];
const LOTUS: [number, number, number][] = [[0, -1, 4], [-1, 0, 2], [1, 0, 2.5], [0, 0, 1]];
const PEBBLE: [number, number][] = [[0, 0], [1, 0]];
const PEBBLE_BIG: [number, number][] = [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [2, 0], [0, 1], [1, 1]];

const palm = (x: number, y: number, v: number, flip: boolean): LandProp => ({ sheet: 'dune_palm', frame: `p${Math.min(2, Math.floor(v * 3))}_0`, x, y, flip, anim: `sway${Math.min(2, Math.floor(v * 3))}`, block: { rx: 4, ry: 2.5 } });
const rock = (x: number, y: number, v: number, flip: boolean): LandProp => {
  const k = Math.min(2, Math.floor(v * 3));
  return { sheet: 'dune_rock', frame: `r${k}`, x, y, flip, block: k === 0 ? undefined : { rx: [0, 8, 12][k], ry: [0, 3, 4.5][k] } };
};
const spire = (x: number, y: number, v: number, flip: boolean): LandProp => ({ sheet: 'dune_spire', frame: `h${v < 0.5 ? 0 : 1}`, x, y, flip, block: { rx: 9, ry: 4 } });
