// The wanderer's toys, and the little things that fly from their hands:
//
// - Soap bubbles blown through a wand: they drift off on the air, shimmering
//   as their film turns, and pop when they touch anyone (or in their own time).
// - A kite let out on its line: it climbs over the wanderer's head and dances
//   on the wind, its tail of bows rippling behind, till it's reeled back in.
// - A sparkler: a fizzing star on a wire, throwing sparks and writing light
//   in the air as it's turned, till it burns down.
// - A high five's burst of stars where the palms meet.
// - A flat stone skimmed across water, skipping and leaving rings.
// - A marshmallow on a stick, toasting over a fire from cream to gold to
//   charcoal (and alight, if it's left too long).
//
// Every one is started by the wanderer's emote or pose (Wanderer.ts), so
// friends in a room see each other's toys with nothing more sent: a skimmed
// stone's whole path is worked out from its angle and its count of skips.

import Phaser from 'phaser';
import { sound } from '../audio';
import { snap } from '../game/display';
import type { Effect } from '../game/Slash';
import type { WorldScene } from '../scenes/WorldScene';
import { WAND_RING } from './art/rig';

/** What a toy needs of whoever plays with it. */
export interface Holder {
  readonly x: number;
  readonly y: number;
  readonly daylight: number;
  /** Where hand 0 (the left, or a side view's near one) or hand 1 is in the world now. */
  hand(i: 0 | 1): { x: number; y: number };
  readonly posing: string | null;
  /** Ask them to put the toy away (a sparkler burnt down). */
  release(): void;
  /** Played on this device. */
  readonly mine: boolean;
}

/** A toy that lasts while its pose does: `stop` lets it end in its own way (reeled in, burnt out). */
export interface Toy extends Effect {
  stop(): void;
}

/** Drawn over the world: kites and their lines are up in the air. */
const SKY = 14000;
/** Night greys a toy's colours toward this (they aren't lit by the world's lights). */
const NIGHT_TINT = 0x6c78a8;

const tintFor = (daylight: number, glow = 0): number => {
  const t = Math.min(1, Math.max(0, daylight * 0.85 + 0.15 + glow));
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(NIGHT_TINT), Phaser.Display.Color.ValueToColor(0xffffff), 1, t);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

/** Two colours multiplied, channel by channel (a colour seen in a light). */
const mul = (a: number, b: number): number => {
  const ch = (sh: number) => Math.round((((a >> sh) & 255) * ((b >> sh) & 255)) / 255) << sh;
  return ch(16) | ch(8) | ch(0);
};

/** A 1 px line of pixels from (x0, y0) to (x1, y1) on a Graphics, in the world's own pixels. */
function dots(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, color: number, alpha: number): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  g.fillStyle(color, alpha);
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
}

/** A ring of pixels on the water, its far side fainter, as Fishing draws them. */
function ring(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, alpha: number, color = 0xeaf8ff): void {
  const ry = rx * 0.42;
  const n = Math.max(8, Math.round(rx * 4));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const far = Math.sin(a) < 0;
    g.fillStyle(color, alpha * (far ? 0.5 : 1));
    g.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1);
  }
}

// ---------------------------------------------------------------- Art

const hexA = (c: string, a: number) => {
  const n = parseInt(c.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

/** The thin film's colours, round the rim and turning as the bubble drifts. */
const IRIS = ['#ffb0e4', '#d4b6ff', '#98e4ff', '#a8ffd8', '#fff2a0', '#ffc6a4'];
const BUBBLE_D = [4, 6, 8, 10, 12];
const FILM_PHASES = 4;

/**
 * Bubbles of five sizes, each in a few turns of its film (frames
 * `b<d>_<phase>`): a clear ball with a coloured rim brighter at the bottom,
 * a faint inner swirl in the big ones, a white glint up at the top left and
 * a soft one opposite; and two frames of a pop's spray (`pop0`, `pop1`).
 */
function bubbleArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('hl_bubble')) return;
  const w = BUBBLE_D.reduce((a, d) => a + (d + 1) * FILM_PHASES, 0) + 30;
  const tex = scene.textures.createCanvas('hl_bubble', w, 13)!;
  const g = tex.getContext();
  let ox = 0;
  for (const d of BUBBLE_D) {
    const R = d / 2;
    for (let ph = 0; ph < FILM_PHASES; ph++) {
      for (let y = 0; y < d; y++) {
        for (let x = 0; x < d; x++) {
          const dx = x + 0.5 - R;
          const dy = y + 0.5 - R;
          const r = Math.hypot(dx, dy);
          if (r > R) continue;
          const a = Math.atan2(dy, dx);
          const turn = (a / (Math.PI * 2) + 1 + ph / FILM_PHASES) % 1;
          const col = IRIS[Math.floor(turn * IRIS.length) % IRIS.length];
          // Light gathers in the film at the bottom right, as on a real bubble.
          const low = (dx + dy) / (2 * R);
          if (r > R - 1.15) g.fillStyle = hexA(col, 0.62 + 0.3 * Math.max(0, low));
          else if (d >= 8 && Math.abs(r - (R - 2.2)) < 0.5 && low > 0.1) g.fillStyle = hexA(IRIS[(Math.floor(turn * IRIS.length) + 2) % IRIS.length], 0.22);
          else g.fillStyle = 'rgba(240,250,255,0.07)';
          g.fillRect(ox + x, y, 1, 1);
        }
      }
      // The window's glint, and its faint twin.
      const gx = Math.floor(R - R * 0.5);
      const gy = Math.floor(R - R * 0.5);
      g.fillStyle = '#ffffff';
      g.fillRect(ox + gx, gy, 1, 1);
      if (d >= 8) {
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.fillRect(ox + gx + 1, gy - 1 < 1 ? gy : gy - 1, 1, 1);
        g.fillRect(ox + gx - 1 < 1 ? gx : gx - 1, gy + 1, 1, 1);
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.fillRect(ox + Math.floor(R + R * 0.45), Math.floor(R + R * 0.4), 1, 1);
      }
      tex.add(`b${d}_${ph}`, 0, ox, 0, d, d);
      ox += d + 1;
    }
  }
  // The pop: a ring of droplets thrown out, then a wider, fainter spray.
  for (const [i, size, rr, alpha] of [[0, 9, 3.4, 0.95], [1, 13, 5.4, 0.55]] as const) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + i * 0.4;
      g.fillStyle = hexA(IRIS[(k + i) % IRIS.length], alpha);
      g.fillRect(ox + Math.round(size / 2 - 0.5 + Math.cos(a) * rr), Math.round(size / 2 - 0.5 + Math.sin(a) * rr), 1, 1);
    }
    tex.add(`pop${i}`, 0, ox, 0, size, size);
    ox += size + 1;
  }
  tex.refresh();
}

/** Kites: two cloths, a trim and the emblem in the middle. Each wanderer's is their own, from their look. */
const KITES = [
  { a: ['#7a1a22', '#c8343c', '#ee6058', '#ff9a86'], b: ['#8a5a10', '#e2a42a', '#fcd25a', '#fff0a6'], dot: '#fff6e0' },
  { a: ['#0e4a52', '#1e8a8c', '#46c4ba', '#9cf0e0'], b: ['#7a6a52', '#e6dcc4', '#fff8e8', '#ffffff'], dot: '#ff8a6a' },
  { a: ['#3a1e6a', '#6a3cb4', '#9a6ae6', '#ccacff'], b: ['#7a2a52', '#d05c96', '#f48cbc', '#ffc8e2'], dot: '#fff2a0' },
  { a: ['#7a3204', '#d0661a', '#f89a3e', '#ffcc88'], b: ['#1a3a7a', '#3a6ad0', '#6aa2f4', '#b2d6ff'], dot: '#ffffff' },
  { a: ['#1e4a14', '#3e8a2a', '#6ac44a', '#b2ec8a'], b: ['#7a5c0a', '#e8c23a', '#ffe274', '#fff6c4'], dot: '#ff6a8a' },
];
const KW = 17;
const KH = 21;
const TILTS = [-0.32, -0.16, 0, 0.16, 0.32];
const SPAR = '#4a2e16';

/**
 * A diamond kite drawn at five tilts (frames `k<palette>_<tilt>`), so it
 * banks on the wind without a rotated sprite's ragged pixels: two cloths in
 * opposite quarters, each lit from the top left, a dark hem, the wooden
 * spars crossing, a round emblem at the cross; and its tail's bows (`bow<p>`).
 */
function kiteArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('hl_kite')) return;
  const tex = scene.textures.createCanvas('hl_kite', (KW + 1) * TILTS.length * KITES.length + 8 * KITES.length, KH)!;
  const g = tex.getContext();
  let ox = 0;
  KITES.forEach((pal, pi) => {
    TILTS.forEach((tilt, ti) => {
      const cx = KW / 2;
      const cy = 8;
      const rot = (x: number, y: number) => ({ x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt) });
      const top = rot(0, -7.6);
      const left = rot(-7.4, 0);
      const right = rot(7.4, 0);
      const bottom = rot(0, 11.8);
      const quad = [top, right, bottom, left];
      const inside = (px: number, py: number) => {
        for (let i = 0; i < 4; i++) {
          const a = quad[i];
          const b = quad[(i + 1) % 4];
          if ((b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x) < 0) return false;
        }
        return true;
      };
      // Distance to the line through two points (the spars).
      const off = (px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }) => ((b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x)) / Math.hypot(b.x - a.x, b.y - a.y);
      for (let y = 0; y < KH; y++) {
        for (let x = 0; x < KW; x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          if (!inside(px, py)) continue;
          const edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
          const v = off(px, py, top, bottom);
          const h = off(px, py, left, right);
          const cloth = v < 0 !== h < 0 ? pal.a : pal.b;
          // Lit from the top left: the far quarters a step darker, a soft bloom toward the light.
          const lit = -(px - cx) * 0.06 - (py - cy) * 0.05 + (v > 0 ? 0.35 : -0.15);
          let step = lit > 0.55 ? 3 : lit > -0.1 ? 2 : 1;
          if (edge) step = 0;
          let col = cloth[step];
          if (!edge && (Math.abs(v) < 0.55 || Math.abs(h) < 0.55)) col = SPAR;
          const dc = Math.hypot(px - cx, py - cy);
          if (dc < 1.9) col = dc < 1 ? '#ffffff' : pal.dot;
          g.fillStyle = col;
          g.fillRect(ox + x, y, 1, 1);
        }
      }
      tex.add(`k${pi}_${ti}`, 0, ox, 0, KW, KH);
      ox += KW + 1;
    });
  });
  // The tail's bows: a knot with two little wings.
  KITES.forEach((pal, pi) => {
    const rows = ['m.....m', 'mm.k.mm', 'mmlklmm', 'mm.k.mm', 'm.....m'];
    rows.forEach((r, y) =>
      [...r].forEach((ch, x) => {
        const c = ch === 'm' ? pal.b[2] : ch === 'l' ? pal.b[3] : ch === 'k' ? pal.a[1] : null;
        if (!c) return;
        g.fillStyle = c;
        g.fillRect(ox + x, y, 1, 1);
      }),
    );
    tex.add(`bow${pi}`, 0, ox, 0, 7, 5);
    ox += 8;
  });
  tex.refresh();
}

/** A flat pebble, skimmed (two frames: face and edge on as it spins). */
function stoneArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('hl_stone')) return;
  const tex = scene.textures.createCanvas('hl_stone', 8, 3)!;
  const g = tex.getContext();
  const put = (ox: number, rows: string[]) =>
    rows.forEach((r, y) =>
      [...r].forEach((ch, x) => {
        const c = ({ d: '#4a4e58', m: '#7c828e', l: '#b2b8c2', w: '#e2e6ec' } as Record<string, string>)[ch];
        if (!c) return;
        g.fillStyle = c;
        g.fillRect(ox + x, y, 1, 1);
      }),
    );
  put(0, ['.wl.', 'lmmd', '.dd.']);
  put(4, ['....', 'lmmd', '....']);
  tex.add('s0', 0, 0, 0, 4, 3);
  tex.add('s1', 0, 4, 0, 4, 3);
  tex.refresh();
}

export function warmToys(scene: Phaser.Scene): void {
  bubbleArt(scene);
  kiteArt(scene);
  stoneArt(scene);
}

/** A look's kite, the same for them on every screen. */
export function kitePalette(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % KITES.length;
}

// ---------------------------------------------------------------- Bubbles

/** How a bubble rides the air: out from the wand (px/s), the climb, the sway, its life (ms). */
const BUBBLE_OUT = [10, 26];
const BUBBLE_TOWARD = [-3, 9];
const BUBBLE_RISE = [3, 9];
const BUBBLE_LIFE = [3500, 8000];
/** No more than this many at once from one wand. */
const BUBBLES_MAX = 26;
/** A bubble pops on someone whose feet are this near (px) while it's this low over the ground. */
const POP_REACH = 7;
const POP_LOW = 34;
/** It won't pop on its own blower straight away. */
const POP_GRACE = 900;

interface Bubble {
  x: number;
  /** The ground under it, and how high over it. */
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  d: number;
  t: number;
  life: number;
  phase: number;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  popT: number;
}

/** A bubble wand at play: blows a few bubbles on each breath, and they drift on after it's put away. */
export class Bubbles implements Toy {
  dead = false;
  private bubbles: Bubble[] = [];
  private stopped = false;
  private lastFrame = -1;
  private wind = Math.random() * 10;

  constructor(
    private world: WorldScene,
    private h: Holder,
    private frame: () => number,
  ) {
    bubbleArt(world);
  }

  stop(): void {
    this.stopped = true;
  }

  update(dt: number): void {
    const f = this.frame();
    if (!this.stopped && f !== this.lastFrame) {
      this.lastFrame = f;
      // A breath through the ring (frames 2-4), and a last few shaken off the wave (frame 6).
      if (f === 2) sound.bubbleBlow(this.world.pan(this.h.x));
      if (f >= 2 && f <= 4) for (let i = 0; i < (f === 3 ? 3 : 2); i++) this.blow(1);
      if (f === 6) for (let i = 0; i < 2; i++) this.blow(0.5);
    }
    this.wind += dt / 1000;
    const breeze = Math.sin(this.wind * 0.4) * 4 + Math.sin(this.wind * 1.3) * 1.5;
    // Whoever stands about: the blower, this player (if it's a friend's wand) and every friend but the blower.
    const people = [{ x: this.h.x, y: this.h.y, own: true }];
    if (!this.h.mine) people.push({ x: this.world.player.x, y: this.world.player.y, own: false });
    for (const m of this.world.mates) if (Math.abs(m.x - this.h.x) + Math.abs(m.y - this.h.y) > 1) people.push({ x: m.x, y: m.y, own: false });
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.t += dt;
      const s = dt / 1000;
      if (b.popT >= 0) {
        b.popT += dt;
        b.img.setFrame(b.popT < 70 ? 'pop0' : 'pop1').setAlpha(b.popT < 70 ? 1 : 0.7);
        b.shadow.setAlpha(0);
        if (b.popT > 150) {
          b.img.destroy();
          b.shadow.destroy();
          this.bubbles.splice(i, 1);
        }
        continue;
      }
      // Slowing as it leaves the wand, rising on the warm air, swaying as it goes.
      b.vx *= Math.pow(0.55, s);
      b.vy *= Math.pow(0.55, s);
      b.vz = Phaser.Math.Linear(b.vz, 4 + b.d * 0.3, s * 0.6);
      b.x += (b.vx + breeze + Math.sin(b.t / 600 + b.phase) * 3) * s;
      b.y += b.vy * s;
      b.z = Math.max(3, b.z + (b.vz + Math.sin(b.t / 450 + b.phase) * 4) * s);
      const touched = people.some((p) => (!p.own || b.t > POP_GRACE) && b.z < POP_LOW && Math.hypot(p.x - b.x, (p.y - b.y) * 1.6) < POP_REACH + b.d / 2);
      if (b.t >= b.life || touched) {
        b.popT = 0;
        b.img.setAlpha(1);
        if (this.world.cameras.main.worldView.contains(b.x, b.y - b.z)) sound.bubblePop(this.world.pan(b.x));
        continue;
      }
      const film = Math.floor(b.t / 260 + b.phase) % FILM_PHASES;
      const fade = Math.min(1, b.t / 120) * Math.min(1, (b.life - b.t) / 500 + 0.6);
      b.img
        .setFrame(`b${b.d}_${film}`)
        .setPosition(snap(b.x), snap(b.y - b.z))
        .setDepth(b.y + 30)
        .setAlpha(fade)
        .setTint(tintFor(this.h.daylight, 0.25));
      b.shadow
        .setPosition(snap(b.x), snap(b.y))
        .setDepth(b.y - 0.5)
        .setAlpha(0.16 * this.h.daylight * Math.max(0, 1 - b.z / 60));
    }
    if (this.stopped && !this.bubbles.length) this.destroy();
  }

  /** One bubble out of the ring, `force` how hard it's blown. */
  private blow(force: number): void {
    if (this.bubbles.length >= BUBBLES_MAX) return;
    const hand = this.h.hand(1);
    const ring = { x: hand.x + WAND_RING.x, y: hand.y + WAND_RING.y };
    const d = Phaser.Utils.Array.GetRandom(force < 1 ? [4, 6, 6, 8] : [4, 6, 8, 8, 10, 12]);
    const feet = this.h.y + 2;
    const b: Bubble = {
      x: ring.x + 1,
      y: feet,
      z: feet - ring.y,
      vx: Phaser.Math.FloatBetween(BUBBLE_OUT[0], BUBBLE_OUT[1]) * force,
      vy: Phaser.Math.FloatBetween(BUBBLE_TOWARD[0], BUBBLE_TOWARD[1]),
      vz: Phaser.Math.FloatBetween(BUBBLE_RISE[0], BUBBLE_RISE[1]),
      d,
      t: 0,
      life: Phaser.Math.Between(BUBBLE_LIFE[0], BUBBLE_LIFE[1]),
      phase: Math.random() * FILM_PHASES,
      img: this.world.add.image(0, 0, 'hl_bubble', `b${d}_0`).setAlpha(0),
      shadow: this.world.add.image(0, 0, 'shadow').setScale(d / 16, 0.5).setAlpha(0),
      popT: -1,
    };
    this.bubbles.push(b);
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    for (const b of this.bubbles) {
      b.img.destroy();
      b.shadow.destroy();
    }
    this.bubbles.length = 0;
  }
}

// ---------------------------------------------------------------- Kite

/** How long the kite takes to climb out, and to be reeled back in (ms). */
const KITE_UP_MS = 2400;
const KITE_DOWN_MS = 1200;
/** Where it flies, over the holder's feet: out to the side and up (px). */
const KITE_DX = 14;
const KITE_HIGH = 92;
/** How far the wind throws it about. */
const KITE_WANDER_X = 16;
const KITE_WANDER_Y = 8;
const TAIL = 14;
const TAIL_STEP = 3;

/** A kite on its line over its holder's head, banking on the wind, its tail of bows rippling. */
export class Kite implements Toy {
  dead = false;
  private img: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private line: Phaser.GameObjects.Graphics;
  private bows: Phaser.GameObjects.Image[] = [];
  private tail: { x: number; y: number }[] = [];
  private t = 0;
  private up = 0;
  private stopped = false;
  private x = 0;
  private y = 0;
  private vx = 0;
  private seed = Math.random() * 100;

  constructor(
    world: WorldScene,
    private h: Holder,
    private pal: number,
  ) {
    kiteArt(world);
    this.img = world.add.image(0, 0, 'hl_kite', `k${pal}_2`).setOrigin(0.5, 8 / KH).setDepth(SKY + 1);
    this.shadow = world.add.image(0, 0, 'shadow').setScale(0.9, 0.7).setAlpha(0).setDepth(1.6);
    this.line = world.add.graphics().setDepth(SKY);
    for (let i = 0; i < 3; i++) this.bows.push(world.add.image(0, 0, 'hl_kite', `bow${pal}`).setDepth(SKY + 0.5));
    const hand = h.hand(0);
    this.x = hand.x;
    this.y = hand.y;
    for (let i = 0; i < TAIL; i++) this.tail.push({ x: hand.x, y: hand.y });
    sound.kiteUp(world.pan(h.x));
  }

  stop(): void {
    this.stopped = true;
  }

  update(dt: number): void {
    this.t += dt;
    const s = this.t / 1000 + this.seed;
    if (this.stopped) this.up = Math.max(0, this.up - dt / KITE_DOWN_MS);
    else this.up = Math.min(1, this.up + dt / KITE_UP_MS);
    if (this.stopped && this.up <= 0) return this.destroy();
    const lift = Phaser.Math.Easing.Sine.InOut(this.up);
    const hand = this.h.hand(0);
    // The wind: slow loops and a gust now and then that throws it over and back.
    const gust = Math.max(0, Math.sin(s * 0.23)) ** 6;
    const wx = Math.sin(s * 0.41) * KITE_WANDER_X + Math.sin(s * 1.07) * 4 + gust * 10;
    const wy = Math.sin(s * 0.67) * KITE_WANDER_Y + Math.cos(s * 1.31) * 2;
    const tx = this.h.x - KITE_DX * 0.3 + wx * lift + (hand.x - this.h.x) * (1 - lift);
    const ty = Phaser.Math.Linear(hand.y, this.h.y - KITE_HIGH, lift) + wy * lift;
    const k = 1 - Math.pow(0.02, dt / 1000);
    const nx = Phaser.Math.Linear(this.x, tx, k);
    this.vx = Phaser.Math.Linear(this.vx, (nx - this.x) / Math.max(1, dt) * 1000, 0.2);
    this.x = nx;
    this.y = Phaser.Math.Linear(this.y, ty, k);
    // It banks into the way it's going.
    const tilt = Phaser.Math.Clamp(Math.round(this.vx / 6), -2, 2) + 2;
    const tint = tintFor(this.h.daylight);
    const kx = snap(this.x);
    const ky = snap(this.y);
    this.img.setFrame(`k${this.pal}_${tilt}`).setPosition(kx, ky).setTint(tint).setAlpha(Math.min(1, lift * 3 + 0.3));
    // The tail trails from the bottom point, each link following the one before, waving.
    const tipX = kx - (tilt - 2) * 2.4;
    const tipY = ky + 12;
    let px = tipX;
    let py = tipY;
    for (let i = 0; i < TAIL; i++) {
      const link = this.tail[i];
      const wave = Math.sin(s * 5 - i * 0.7) * (0.6 + i * 0.12);
      const gx = px + wave - this.vx * 0.012 * i;
      const gy = py + TAIL_STEP;
      link.x = Phaser.Math.Linear(link.x, gx, 0.5);
      link.y = Phaser.Math.Linear(link.y, gy, 0.5);
      const d = Math.hypot(link.x - px, link.y - py) || 1;
      link.x = px + ((link.x - px) / d) * TAIL_STEP;
      link.y = py + ((link.y - py) / d) * TAIL_STEP;
      px = link.x;
      py = link.y;
    }
    const g = this.line.clear();
    const pal = KITES[this.pal];
    const ribbon = Phaser.Display.Color.HexStringToColor(pal.a[2]).color;
    let ax = tipX;
    let ay = tipY;
    for (let i = 0; i < TAIL; i++) {
      const l = this.tail[i];
      dots(g, ax, ay, l.x, l.y, ribbon, 0.9 * Math.min(1, lift * 3));
      ax = l.x;
      ay = l.y;
    }
    this.bows.forEach((b, i) => {
      const l = this.tail[3 + i * 4];
      b.setPosition(snap(l.x), snap(l.y)).setTint(tint).setAlpha(Math.min(1, lift * 3));
    });
    // The line: from the raised hand up to the bridle, sagging in the middle, a little slack when the wind drops.
    const bx = kx;
    const by = ky + 2;
    const sag = 10 + Math.sin(s * 0.67) * 3 + (1 - lift) * 2;
    const steps = Math.max(8, Math.ceil(Math.hypot(bx - hand.x, by - hand.y)));
    const lineCol = mul(tintFor(this.h.daylight, 0.1), 0xf4ecdc);
    g.fillStyle(lineCol, 0.8);
    let lx = -1e9;
    let ly = -1e9;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(Phaser.Math.Linear(hand.x, bx, t) - Math.sin(t * Math.PI) * sag * 0.25);
      const y = Math.round(Phaser.Math.Linear(hand.y, by, t) + Math.sin(t * Math.PI) * sag);
      if (x === lx && y === ly) continue;
      lx = x;
      ly = y;
      g.fillRect(x, y, 1, 1);
    }
    // Its shadow, far below on the ground, by day.
    this.shadow.setPosition(snap(this.x + 18), snap(this.h.y - 26 + (this.y - ty) * 0.2)).setAlpha(0.14 * this.h.daylight * lift);
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.img.destroy();
    this.shadow.destroy();
    this.line.destroy();
    for (const b of this.bows) b.destroy();
  }
}

// ---------------------------------------------------------------- Sparkler

/** How long a sparkler burns (ms), and its last moments, thinning out. */
const SPARKLER_MS = 26000;
const SPARKLER_DYING = 3500;
/** Sparks thrown a second while it's burning well, how fast (px/s), how far they fall, how long they last (ms). */
const SPARK_RATE = 90;
const SPARK_SPEED = [18, 58];
const SPARK_FALL = 70;
const SPARK_LIFE = [110, 380];
/** The light written in the air: how long the trail of the tip lingers (ms). */
const TRAIL_MS = 520;
/** Lights a sparkler may take, of the world's 16. */
const MAX_LIT = 2;
let sparklersLit = 0;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  burst: boolean;
}

/** A sparkler fizzing in the hand: sparks, a little light of its own, and a trail of light as it's waved. */
export class Sparkler implements Toy {
  dead = false;
  private g: Phaser.GameObjects.Graphics;
  private halo: Phaser.GameObjects.Image;
  private light: Phaser.GameObjects.Light | null = null;
  private sparks: Spark[] = [];
  private trail: { x: number; y: number; t: number }[] = [];
  private t = 0;
  private due = 0;
  private crackleT = 0;
  private stopped = false;
  private outT = 0;

  constructor(
    private world: WorldScene,
    private h: Holder,
    private tip: () => { x: number; y: number },
  ) {
    this.g = world.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.halo = world.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc860).setScale(0.55).setAlpha(0);
    if (sparklersLit < MAX_LIT) {
      sparklersLit++;
      this.light = world.lights.addLight(h.x, h.y, 80, 0xffc070, 0);
    }
    world.events.once(Phaser.Scenes.Events.SHUTDOWN, this.gone, this);
    sound.sparklerLight(world.pan(h.x));
  }

  private gone(): void {
    if (this.dead) return;
    this.dead = true;
    if (this.light) sparklersLit--;
    this.light = null;
  }

  stop(): void {
    this.stopped = true;
  }

  update(dt: number): void {
    this.t += dt;
    // Burnt down: put away by its holder (friends see that from their emote).
    if (this.t >= SPARKLER_MS && !this.stopped) {
      this.stopped = true;
      if (this.h.mine && this.h.posing === 'sparkler') this.h.release();
    }
    if (this.stopped) this.outT += dt;
    const left = SPARKLER_MS - this.t;
    const strength = this.stopped ? Math.max(0, 1 - this.outT / 500) : left < SPARKLER_DYING ? 0.25 + 0.75 * (left / SPARKLER_DYING) : Math.min(1, this.t / 250);
    const tip = this.tip();
    const tx = tip.x;
    const ty = tip.y;
    const s = dt / 1000;
    if (!this.stopped) {
      this.due += SPARK_RATE * strength * s;
      while (this.due >= 1) {
        this.due--;
        const a = Math.random() * Math.PI * 2;
        const v = Phaser.Math.FloatBetween(SPARK_SPEED[0], SPARK_SPEED[1]);
        this.sparks.push({ x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 8, t: 0, life: Phaser.Math.Between(SPARK_LIFE[0], SPARK_LIFE[1]), burst: Math.random() < 0.12 });
      }
      this.trail.push({ x: tx, y: ty, t: this.t });
      if ((this.crackleT -= dt) <= 0) {
        this.crackleT = Phaser.Math.Between(180, 340);
        sound.sparklerCrackle(this.world.pan(tx), strength);
      }
    }
    while (this.trail.length && this.t - this.trail[0].t > TRAIL_MS) this.trail.shift();
    const g = this.g.clear().setDepth(this.h.y + 2);
    // The light written in the air: gold fading to ember along where the tip has been.
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      const age = (this.t - b.t) / TRAIL_MS;
      dots(g, a.x, a.y, b.x, b.y, age < 0.4 ? 0xffe8a0 : 0xff9a40, (1 - age) * 0.55 * strength);
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.t += dt;
      if (p.t >= p.life) {
        this.sparks.splice(i, 1);
        continue;
      }
      p.vy += SPARK_FALL * s;
      p.vx *= Math.pow(0.2, s);
      p.x += p.vx * s;
      p.y += p.vy * s;
      const age = p.t / p.life;
      const col = age < 0.3 ? 0xffffff : age < 0.65 ? 0xffe070 : 0xff8a30;
      g.fillStyle(col, 1 - age * 0.6);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      g.fillRect(x, y, 1, 1);
      // Now and then a spark bursts into a little star at the end of its flight.
      if (p.burst && age > 0.55) {
        g.fillStyle(0xfff4c0, (1 - age) * 1.6);
        g.fillRect(x - 1, y, 1, 1);
        g.fillRect(x + 1, y, 1, 1);
        g.fillRect(x, y - 1, 1, 1);
        g.fillRect(x, y + 1, 1, 1);
      }
    }
    // The fizzing heart of it, a white-gold star that flickers.
    if (strength > 0) {
      const flick = 0.75 + Math.random() * 0.25;
      g.fillStyle(0xffffff, strength * flick);
      g.fillRect(Math.round(tx), Math.round(ty), 1, 1);
      g.fillStyle(0xffd870, strength * 0.7 * flick);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillRect(Math.round(tx) + dx, Math.round(ty) + dy, 1, 1);
    }
    this.halo.setPosition(snap(tx), snap(ty)).setDepth(this.h.y + 1.9).setAlpha(0.45 * strength * (0.85 + Math.random() * 0.15));
    if (this.light) {
      this.light.setPosition(tx, this.h.y - 4);
      this.light.intensity = 1.3 * strength * (0.85 + Math.random() * 0.15);
    }
    if (this.stopped && this.outT > 500 && !this.sparks.length && !this.trail.length) this.destroy();
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.world.events.off(Phaser.Scenes.Events.SHUTDOWN, this.gone, this);
    this.g.destroy();
    this.halo.destroy();
    if (this.light) {
      this.world.lights.removeLight(this.light);
      this.light = null;
      sparklersLit--;
    }
  }
}

// ---------------------------------------------------------------- High five

/** The burst where palms meet: stars flying out and a white flash; bigger when there's a friend's palm there. */
export function highFive(world: WorldScene, x: number, y: number, depth: number, friend: boolean): void {
  sound.highFive(world.pan(x));
  const n = friend ? 9 : 5;
  const flash = world.add.image(snap(x), snap(y), 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0c0).setScale(friend ? 0.7 : 0.45).setDepth(depth + 1);
  world.tweens.add({ targets: flash, alpha: { from: 0.9, to: 0 }, scale: flash.scale * 1.6, duration: 320, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + ((i / (n - 1)) - 0.5) * Math.PI * 1.5;
    const r = (friend ? 14 : 9) + Math.random() * 5;
    const img = world.add.image(snap(x), snap(y), 'hl_emote', i % 3 ? 'star' : 'spark').setDepth(depth + 1.1);
    world.tweens.add({
      targets: img,
      x: snap(x + Math.cos(a) * r),
      y: snap(y + Math.sin(a) * r * 0.9),
      alpha: { from: 1, to: 0 },
      duration: 520 + Math.random() * 200,
      ease: 'Quad.easeOut',
      onComplete: () => img.destroy(),
    });
  }
}

// ---------------------------------------------------------------- Skipping stones

/** The first touch down from the hand, each hop after a share of the last (px), and the ground speed (px/s). */
export const SKIP_FIRST = 22;
const SKIP_SHRINK = 0.8;
const SKIP_MIN = 5;
const SKIP_SPEED = 130;
/** How high each hop rises, for its length. */
const HOP_HIGH = 0.2;
/** The hand's height when it lets go. */
const RELEASE_Z = 9;

/** Where a stone thrown from (x, y) at `angle` touches the water: every skip's point, then the last (where it sinks or lands). */
export function skipPath(x: number, y: number, angle: number, skips: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const cx = Math.cos(angle);
  // The ground is seen at a slant: going up or down the screen, distances look shorter.
  const cy = Math.sin(angle) * 0.75;
  let d = 6;
  let hop = SKIP_FIRST;
  for (let i = 0; i <= skips; i++) {
    d += hop;
    out.push({ x: x + cx * d, y: y + cy * d });
    hop = Math.max(SKIP_MIN, hop * SKIP_SHRINK);
  }
  return out;
}

/** The start: the hand, a little out from the feet the way it's thrown. */
const skipStart = (x: number, y: number, angle: number) => ({ x: x + Math.cos(angle) * 6, y: y + Math.sin(angle) * 0.75 * 6 });

interface Ripple {
  x: number;
  y: number;
  t: number;
  big: boolean;
}

/**
 * A skimmed stone: after `delay` ms (the arm coming round) it leaves the
 * hand low and fast, kisses the water at each point of its path and leaps on,
 * a ring and a spray at every touch, each hop shorter, till it goes under
 * (or, `bank`, clatters out onto the shore). `done` hears how many skips.
 */
export class SkipStone implements Effect {
  dead = false;
  private img: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private g: Phaser.GameObjects.Graphics;
  private path: { x: number; y: number }[];
  private ripples: Ripple[] = [];
  private drops: { x: number; y: number; z: number; vx: number; vy: number; vz: number }[] = [];
  private leg = 0;
  private legT = 0;
  private t = 0;
  private landed = -1;
  private from: { x: number; y: number };

  constructor(
    private world: WorldScene,
    x: number,
    y: number,
    private angle: number,
    private skips: number,
    private bank: boolean,
    private delay: number,
    private done?: (skips: number) => void,
  ) {
    stoneArt(world);
    this.from = skipStart(x, y, angle);
    this.path = skipPath(x, y, angle, skips);
    this.img = world.add.image(0, 0, 'hl_stone', 's0').setVisible(false);
    this.shadow = world.add.image(0, 0, 'shadow').setScale(0.3, 0.4).setVisible(false);
    this.g = world.add.graphics().setDepth(1.7);
  }

  private legLength(i: number): number {
    const a = i === 0 ? this.from : this.path[i - 1];
    const b = this.path[i];
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.t < this.delay) return;
    if (this.t - dt < this.delay) {
      sound.stoneThrow(this.world.pan(this.from.x));
      this.img.setVisible(true);
      this.shadow.setVisible(true);
    }
    const s = dt / 1000;
    if (this.leg <= this.skips) {
      // Slowing a little with each skip.
      const speed = SKIP_SPEED * Math.pow(0.9, this.leg);
      const len = this.legLength(this.leg);
      this.legT += (speed * s) / Math.max(1, len);
      const a = this.leg === 0 ? this.from : this.path[this.leg - 1];
      const b = this.path[this.leg];
      if (this.legT >= 1) {
        this.touch(b.x, b.y, this.leg === this.skips);
        this.leg++;
        this.legT = 0;
      } else {
        const u = this.legT;
        const x = Phaser.Math.Linear(a.x, b.x, u);
        const y = Phaser.Math.Linear(a.y, b.y, u);
        // Out of the hand it falls from the release height; after, each hop is an arc.
        const z = this.leg === 0 ? RELEASE_Z * (1 - u) + Math.sin(u * Math.PI) * 3 : Math.sin(u * Math.PI) * len * HOP_HIGH;
        this.img.setPosition(snap(x), snap(y - z)).setDepth(y + 1).setFrame(Math.floor(this.t / 60) % 2 ? 's1' : 's0');
        this.shadow.setPosition(snap(x), snap(y)).setDepth(1.75).setAlpha(0.35);
      }
    } else if (this.landed >= 0) {
      // On the bank: it lies a moment, then fades.
      this.landed += dt;
      this.img.setAlpha(Math.max(0, 1 - (this.landed - 1200) / 600));
      this.shadow.setAlpha(0);
    }
    const g = this.g.clear();
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.t += dt;
      const life = r.big ? 1700 : 1100;
      if (r.t >= life) {
        this.ripples.splice(i, 1);
        continue;
      }
      const u = r.t / life;
      ring(g, r.x, r.y, 1.5 + u * (r.big ? 11 : 7), (1 - u) * 0.8);
      if (r.big && u > 0.2) ring(g, r.x, r.y, 1 + (u - 0.2) * 7, (1 - u) * 0.6);
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.vz -= 160 * s;
      d.x += d.vx * s;
      d.y += d.vy * s;
      d.z += d.vz * s;
      if (d.z <= 0) {
        this.drops.splice(i, 1);
        continue;
      }
      g.fillStyle(0xf4fcff, 0.9);
      g.fillRect(Math.round(d.x), Math.round(d.y - d.z), 1, 1);
    }
    const flying = this.leg <= this.skips;
    const lying = this.landed >= 0 && this.landed < 1800;
    if (!flying && !lying && !this.ripples.length && !this.drops.length) this.destroy();
  }

  /** The stone meets the water (or, last of all, the bank). */
  private touch(x: number, y: number, last: boolean): void {
    const pan = this.world.pan(x);
    if (last && this.bank) {
      sound.stoneClack(pan);
      this.landed = 0;
      this.img.setPosition(snap(x), snap(y)).setFrame('s0').setDepth(y);
      this.done?.(this.skips);
      return;
    }
    this.ripples.push({ x, y, t: 0, big: last });
    const n = last ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = last ? 14 : 9;
      this.drops.push({ x, y, z: 1, vx: Math.cos(a) * v * Math.random() + Math.cos(this.angle) * (last ? 0 : 10), vy: Math.sin(a) * v * 0.5 * Math.random(), vz: (last ? 50 : 34) + Math.random() * 20 });
    }
    if (last) {
      sound.stoneSink(pan);
      this.img.setVisible(false);
      this.shadow.setVisible(false);
      this.done?.(this.skips);
    } else sound.stoneSkip(this.leg, pan);
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.img.destroy();
    this.shadow.destroy();
    this.g.destroy();
  }
}

// ---------------------------------------------------------------- Marshmallows

/** How fast a marshmallow toasts (a share a second), and its colours from cream to charcoal. */
const TOAST_RATE = 1 / 10;
/** The golden moment (a share of the toasting), when it's at its best. */
export const GOLDEN = [0.42, 0.64];
/** Past this it catches light. */
export const ALIGHT = 0.86;
/** Where the marshmallow is held from the sitter's feet (px): up and a little across, out over the fire (see FIRE_SIDE in pastimes/spots.ts). */
const MALLOW_UP = 28;
const MALLOW_DX = 5;
const TOASTS = [
  [0, 0xfff8ec, 0xe8dcc8],
  [0.3, 0xffecc0, 0xe6c890],
  [0.5, 0xf6c66a, 0xd49440],
  [0.7, 0xc8823a, 0x96561e],
  [0.86, 0x6a3c1c, 0x3e2210],
  [1, 0x2a1a12, 0x1a100a],
] as const;

const toastColour = (t: number, i: 1 | 2): number => {
  let k = 0;
  while (k < TOASTS.length - 2 && t > TOASTS[k + 1][0]) k++;
  const [a, b] = [TOASTS[k], TOASTS[k + 1]];
  const u = Phaser.Math.Clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a[i]), Phaser.Display.Color.ValueToColor(b[i]), 1, u);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

/**
 * A marshmallow on a stick, held out over a fire from where its holder sits:
 * it browns as it's held, steams a little at its golden best, and past that
 * smokes and catches alight. `toast` is how far along it is.
 */
export class Roast implements Toy {
  dead = false;
  toast = 0;
  private g: Phaser.GameObjects.Graphics;
  private fire: Phaser.GameObjects.Graphics;
  private t = 0;
  private stopped = false;
  private alight = false;
  private wisps: { x: number; y: number; t: number; smoke: boolean }[] = [];
  private wispT = 0;

  constructor(
    private world: WorldScene,
    private h: Holder,
  ) {
    this.g = world.add.graphics();
    this.fire = world.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  }

  stop(): void {
    this.stopped = true;
  }

  update(dt: number): void {
    if (this.stopped) return this.destroy();
    this.t += dt;
    this.toast = Math.min(1, this.toast + (TOAST_RATE * dt) / 1000 * (0.85 + 0.3 * Math.sin(this.t / 700) ** 2));
    const hand = this.h.hand(1);
    const bob = Math.sin(this.t / 900) * 0.6;
    const mx = Math.round(this.h.x + MALLOW_DX);
    const my = Math.round(this.h.y - MALLOW_UP + bob);
    const g = this.g.clear().setDepth(this.h.y - 0.5);
    const f = this.fire.clear().setDepth(this.h.y - 0.4);
    const dim = tintFor(this.h.daylight, 0.45);
    // The stick: green wood, a pale stripe where the bark's peeled, from the hands out to the marshmallow.
    dots(g, hand.x, hand.y, mx, my + 2, mul(0x6a4626, dim), 1);
    dots(g, hand.x + 1, hand.y, mx + 1, my + 2, mul(0xa07a4a, dim), 1);
    // The marshmallow: a soft pillow, its top lit, its underside toasted darker (the fire's below).
    const top = toastColour(Math.max(0, this.toast - 0.08), 1);
    const low = toastColour(Math.min(1, this.toast + 0.06), 2);
    g.fillStyle(top, 1);
    g.fillRect(mx - 2, my - 1, 4, 1);
    g.fillRect(mx - 1, my - 2, 2, 1);
    g.fillStyle(toastColour(this.toast, 1), 1);
    g.fillRect(mx - 2, my, 4, 1);
    g.fillStyle(low, 1);
    g.fillRect(mx - 2, my + 1, 4, 1);
    g.fillRect(mx - 1, my + 2, 2, 1);
    // The fire's glow on its underside.
    f.fillStyle(0xff8a30, 0.25 + 0.1 * Math.random());
    f.fillRect(mx - 2, my + 1, 4, 2);
    if (this.toast >= ALIGHT && !this.alight) {
      this.alight = true;
      sound.mallowFlare(this.world.pan(mx));
    }
    if (this.alight) {
      // Little flames licking up off it.
      for (let i = 0; i < 4; i++) {
        const fx = mx - 2 + ((i + Math.floor(this.t / 90)) % 4);
        const hgt = 1 + Math.floor(Math.random() * 3);
        f.fillStyle(0xff7a20, 0.9);
        f.fillRect(fx, my - 2 - hgt + 1, 1, hgt);
        f.fillStyle(0xffe070, 0.8);
        f.fillRect(fx, my - 2, 1, 1);
      }
    }
    // Steam at its golden best; smoke once it's past it.
    const golden = this.toast >= GOLDEN[0] && this.toast <= GOLDEN[1];
    const smoky = this.toast > GOLDEN[1] + 0.08;
    if ((golden || smoky) && (this.wispT -= dt) <= 0) {
      this.wispT = smoky ? 160 : 420;
      this.wisps.push({ x: mx - 1 + Math.random() * 2, y: my - 3, t: 0, smoke: smoky });
    }
    for (let i = this.wisps.length - 1; i >= 0; i--) {
      const w = this.wisps[i];
      w.t += dt;
      const life = w.smoke ? 1400 : 900;
      if (w.t > life) {
        this.wisps.splice(i, 1);
        continue;
      }
      const u = w.t / life;
      g.fillStyle(w.smoke ? 0x4a4440 : 0xfff8f0, (1 - u) * (w.smoke ? 0.6 : 0.4));
      g.fillRect(Math.round(w.x + Math.sin(w.t / 200) * 1.2), Math.round(w.y - u * 12), 1, 1);
    }
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.g.destroy();
    this.fire.destroy();
  }
}
