// Heaven Lands' weather: now and then a soft shower passes over the open
// places. The light greys a little and the shafts of sun go, fine rain slants
// down with tiny splashes where it lands, and its hush rises round the
// wanderer (quieter under a roof). When a shower passes by day, a rainbow
// stands over the land for a while.
//
// The showers come from the wall clock, not from chance on this device: every
// slot of SLOT_MS has its own draw, so friends in a room see the same rain at
// the same moment with nothing sent. All of it a hundred or so tiny sprites
// round the view, and the light through the existing grade: no full-screen layers.

import Phaser from 'phaser';
import { sound } from '../audio';
import type { CozyWeather } from '../game/cozy';
import type { WorldScene } from '../scenes/WorldScene';

/** The places under open sky where showers pass (arena ids). Caves, the stars, the snow and the desert keep their own skies. */
const SHOWER_PLACES = new Set(['home', 'forest', 'island', 'shore', 'lumen', 'saltflats']);
/** The clock is cut into slots this long (ms); a slot has a shower at these odds, lasting this long (ms), easing in and out over FADE_MS. */
const SLOT_MS = 14 * 60 * 1000;
const SHOWER_ODDS = 0.3;
const SHOWER_MS: [number, number] = [3 * 60 * 1000, 6 * 60 * 1000];
const FADE_MS = 50 * 1000;
/** Drops at most at full rain, how fast they fall (px a second), how far the wind slants them (px across per px down), and the heights they start from. */
const DROPS = 170;
const FALL = 330;
const SLANT = 0.28;
const START_Z: [number, number] = [90, 200];
const DROP_TINT = 0xe4eeff;
const DROP_ALPHA_DAY = 0.85;
const DROP_ALPHA_NIGHT = 0.5;
/** A splash's frames and how long it shows (ms). */
const SPLASH_FRAMES = 3;
const SPLASH_MS = 200;
/** Under a roof: how much of the rain is still seen and heard. */
const INDOORS = 0.35;
/** The rainbow: shown when a shower that got this heavy passes by day, for this long (ms) with these fades, at most this strong. */
const RAINBOW_AFTER = 0.5;
const RAINBOW_MS = 40 * 1000;
const RAINBOW_IN = 5000;
const RAINBOW_OUT = 9000;
const RAINBOW_ALPHA = 0.5;
/** Over everything in the world (the rain is between the wanderer and the sky). */
const DEPTH = 9500;

/** How hard it's raining over the open places now (0..1), shared with the light (glow.ts). */
export const weather = { rain: 0 };

/** A well-mixed 0..1 draw for slot n. */
function draw(n: number, salt: number): number {
  let h = Math.imul(n ^ 0x5bd1e995, 0x27d4eb2d) ^ Math.imul(salt, 0x9e3779b9);
  h ^= h >>> 15;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 13;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The shower over the open places at wall-clock time `now` (0 dry .. 1 full). */
export function showerAt(now: number): number {
  const n = Math.floor(now / SLOT_MS);
  if (draw(n, 1) > SHOWER_ODDS) return 0;
  const len = SHOWER_MS[0] + draw(n, 2) * (SHOWER_MS[1] - SHOWER_MS[0]);
  const start = n * SLOT_MS + draw(n, 3) * (SLOT_MS - len);
  const t = now - start;
  if (t <= 0 || t >= len) return 0;
  const k = Math.min(1, t / FADE_MS, (len - t) / FADE_MS);
  // Some showers are only a sprinkle.
  return k * k * (3 - 2 * k) * (0.55 + draw(n, 4) * 0.45);
}

interface Drop {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  z: number;
  /** ms into its splash, or -1 while falling. */
  splash: number;
}

export class Showers implements CozyWeather {
  private drops: Drop[] = [];
  private rain = 0;
  private peak = 0;
  private bow: Phaser.GameObjects.Image;
  private bowT = -1;

  /** Showers over `arena`, or null where none pass. */
  static at(world: WorldScene, arena: string): Showers | null {
    return SHOWER_PLACES.has(arena) ? new Showers(world) : null;
  }

  private constructor(world: WorldScene) {
    textures(world);
    for (let k = 0; k < DROPS; k++) this.drops.push({ img: world.add.image(0, 0, 'hl_rain', 'drop').setOrigin(0.5, 1).setDepth(DEPTH).setTint(DROP_TINT).setVisible(false), x: 0, y: 0, z: 0, splash: -1 });
    this.bow = world.add.image(0, 0, 'hl_rainbow').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH - 1).setVisible(false);
    this.rain = showerAt(Date.now());
  }

  update(dt: number, daylight: number, view: Phaser.Geom.Rectangle, indoors: boolean): void {
    const target = showerAt(Date.now());
    // Eases toward the clock's rain, so arriving mid-shower doesn't snap it on.
    this.rain += (target - this.rain) * Math.min(1, dt / 1500);
    if (this.rain < 0.002 && target === 0) this.rain = 0;
    weather.rain = this.rain;
    this.peak = Math.max(this.peak, this.rain);
    const seen = indoors ? INDOORS : 1;
    sound.setRain(this.rain * seen);
    this.updateDrops(dt, daylight, view, seen);
    this.updateBow(dt, daylight, view);
  }

  private updateDrops(dt: number, daylight: number, view: Phaser.Geom.Rectangle, seen: number): void {
    const want = Math.round(DROPS * this.rain);
    const alpha = (DROP_ALPHA_NIGHT + (DROP_ALPHA_DAY - DROP_ALPHA_NIGHT) * daylight) * seen;
    const s = dt / 1000;
    this.drops.forEach((d, k) => {
      const live = d.img.visible;
      if (!live) {
        if (k >= want) return;
        this.respawn(d, view, true);
      }
      if (d.splash >= 0) {
        d.splash += dt;
        if (d.splash >= SPLASH_MS) {
          if (k >= want) {
            d.img.setVisible(false);
            return;
          }
          this.respawn(d, view, false);
        } else {
          d.img.setFrame(`s${Math.min(SPLASH_FRAMES - 1, Math.floor((d.splash / SPLASH_MS) * SPLASH_FRAMES))}`).setAlpha(alpha * (1 - d.splash / SPLASH_MS) * 1.2);
          return;
        }
      }
      d.z -= FALL * s;
      if (d.z <= 0) {
        d.splash = 0;
        d.img.setFrame('s0').setPosition(Math.round(d.x), Math.round(d.y)).setDepth(d.y).setAlpha(alpha);
        return;
      }
      // Drops out of view (the view moved) start again inside it.
      if (d.x < view.left - 40 || d.x > view.right + 40 || d.y < view.top - 20 || d.y > view.bottom + 200) return this.respawn(d, view, true);
      d.img.setPosition(Math.round(d.x + d.z * SLANT), Math.round(d.y - d.z)).setAlpha(alpha);
    });
  }

  /** Back up into the sky over a spot in view; `anyHeight` when it should not all start from the top at once. */
  private respawn(d: Drop, view: Phaser.Geom.Rectangle, anyHeight: boolean): void {
    d.z = anyHeight ? Math.random() * START_Z[1] : START_Z[0] + Math.random() * (START_Z[1] - START_Z[0]);
    // Its spot on the ground: the drop shows z px above it, so spots reach below the view's bottom by a little.
    d.x = view.left - 20 + Math.random() * (view.width + 20) - d.z * SLANT * 0.5;
    d.y = view.top + Math.random() * (view.height + 30);
    d.splash = -1;
    d.img.setFrame('drop').setDepth(DEPTH).setVisible(true);
  }

  private updateBow(dt: number, daylight: number, view: Phaser.Geom.Rectangle): void {
    // A shower that got going has passed, and the sun is out: a rainbow.
    if (this.bowT < 0 && this.peak > RAINBOW_AFTER && this.rain < 0.04 && daylight > 0.5) {
      this.bowT = 0;
      this.peak = 0;
    } else if (this.rain < 0.04 && this.bowT < 0) this.peak = 0;
    if (this.bowT < 0) return;
    this.bowT += dt;
    if (this.bowT >= RAINBOW_MS) {
      this.bowT = -1;
      this.bow.setVisible(false);
      return;
    }
    const k = Math.min(1, this.bowT / RAINBOW_IN, (RAINBOW_MS - this.bowT) / RAINBOW_OUT);
    const w = Math.min(view.width * 0.9, 420);
    this.bow
      .setDisplaySize(w, w / 2)
      .setPosition(Math.round(view.centerX), Math.round(view.top + view.height * 0.55))
      .setAlpha(k * RAINBOW_ALPHA * Math.min(1, (daylight - 0.3) * 2))
      .setVisible(true);
  }

  destroy(): void {
    for (const d of this.drops) d.img.destroy();
    this.drops = [];
    this.bow.destroy();
    weather.rain = 0;
    sound.setRain(0);
  }
}

/** The rain's frames ('hl_rain': a slanted streak and a splash's three frames) and the rainbow ('hl_rainbow'). */
function textures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('hl_rain')) {
    const W = 2 + 7 * SPLASH_FRAMES;
    const H = 11;
    const t = scene.textures.createCanvas('hl_rain', W, H)!;
    const c = t.getContext();
    const px = (x: number, y: number, a: number) => {
      c.fillStyle = `rgba(255,255,255,${a})`;
      c.fillRect(x, y, 1, 1);
    };
    // The streak: brightest at its foot, slanting with the wind.
    for (let y = 0; y < H; y++) px(y < 5 ? 1 : 0, y, 0.3 + (y / H) * 0.7);
    t.add('drop', 0, 0, 0, 2, H);
    // The splash: a bright fleck, then a crown of two drops thrown out, then a faint ring.
    const sp: [number, number, number][][] = [
      [[3, 9, 1], [2, 10, 0.6], [4, 10, 0.6]],
      [[1, 8, 0.8], [5, 8, 0.8], [2, 10, 0.5], [3, 10, 0.4], [4, 10, 0.5]],
      [[0, 9, 0.5], [6, 9, 0.5], [1, 10, 0.4], [5, 10, 0.4]],
    ];
    sp.forEach((pts, f) => {
      for (const [x, y, a] of pts) px(2 + f * 7 + x, y, a);
      t.add(`s${f}`, 0, 2 + f * 7, 0, 7, H);
    });
    t.refresh();
  }
  if (!scene.textures.exists('hl_rainbow')) {
    const W = 200;
    const H = 100;
    const t = scene.textures.createCanvas('hl_rainbow', W, H)!;
    const c = t.getContext();
    const img = c.createImageData(W, H);
    const bands = [[255, 80, 80], [255, 160, 70], [255, 230, 90], [110, 220, 110], [90, 170, 255], [120, 110, 240], [190, 110, 230]];
    const r0 = 80;
    const bw = 2.2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.hypot(x + 0.5 - W / 2, H - y - 0.5);
        const b = Math.floor((r0 + bands.length * bw - d) / bw);
        if (b < 0 || b >= bands.length) continue;
        // Softer toward its feet, where it meets the land.
        const foot = Math.min(1, (H - y) / (H * 0.45));
        const i = (y * W + x) * 4;
        img.data.set([...bands[b], Math.round(255 * foot * foot)], i);
      }
    }
    c.putImageData(img, 0, 0);
    t.refresh();
  }
}
