// Sunsong Dunes' own living parts (see ../types.ts LandExtra): the wind that
// never stops. It comes in long breaths from the west, and on each one fine
// sand streams off the high crests in thin plumes, skipping east and settling
// again; between breaths the crests are still. On the oasis pools the sun
// glints by day and the stars twinkle by night. All of it a few dozen tiny
// sprites round the view: no full-screen layers.

import Phaser from 'phaser';
import type { WorldScene } from '../../../scenes/WorldScene';
import type { LandExtra } from '../types';
import type { DuneGen } from './gen';

/** The grains at most in the air at once, and how long one flies (ms). */
const GRAINS = 70;
const FLIGHT: [number, number] = [700, 1600];
/** Their speed east (px a second), the lift they're given and how fast they fall back (px a second, px a second²). */
const BLOW: [number, number] = [28, 58];
const LIFT: [number, number] = [6, 16];
const FALL = 22;
/** The wind's breaths: how long one cycle is (ms), and how many grains a second leave the crests at the height of one. */
const BREATH_MS = 9000;
const GRAINS_PER_S = 70;
/** Crest spots kept to blow from, looked for a few at a time each frame. */
const SPOTS = 12;
const SEEK_PER_FRAME = 6;
const SPOT_LIFE = 5000;
/** The grains' colour by day and by night. */
const DAY_TINT = 0xf8deaa;
const NIGHT_TINT = 0x8a94b0;
/** Sparkles on the pools: sun glints by day, stars by night. */
const SPARKS = 16;
const GLINT_TINTS = [0xfff6d8, 0xffffff, 0xd8fff4];
const STAR_TINTS = [0xdce8ff, 0xffffff, 0xffe6c0];

interface Grain {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  t: number;
  life: number;
}

interface Spark {
  img: Phaser.GameObjects.Image;
  t: number;
  life: number;
}

export class DuneWind implements LandExtra {
  private grains: Grain[] = [];
  private sparks: Spark[] = [];
  private spots: { x: number; y: number; t: number }[] = [];
  private owed = 0;

  constructor(
    world: WorldScene,
    private gen: DuneGen,
  ) {
    if (!world.textures.exists('dune_grain')) {
      const g = world.make.graphics({}, false);
      g.fillStyle(0xffffff).fillRect(0, 0, 1, 1);
      g.generateTexture('dune_grain', 1, 1);
      g.destroy();
    }
    for (let k = 0; k < GRAINS; k++) this.grains.push({ img: world.add.image(0, 0, 'dune_grain').setVisible(false), x: 0, y: 0, z: 0, vx: 0, vz: 0, t: 1, life: 0 });
    if (world.textures.exists('spark')) {
      for (let k = 0; k < SPARKS; k++) this.sparks.push({ img: world.add.image(0, 0, 'spark').setBlendMode(Phaser.BlendModes.ADD).setDepth(2.2).setVisible(false), t: 0, life: 0 });
    }
  }

  update(time: number, dt: number, d: number, _hero: { x: number; y: number }, view: Phaser.Geom.Rectangle): void {
    this.seek(dt, view);
    // A breath of wind: rising and falling, quiet for a while between.
    const breath = Math.max(0, Math.sin((time / BREATH_MS) * Math.PI * 2)) ** 2;
    this.owed += (breath * GRAINS_PER_S * dt) / 1000;
    const tint = lerpColor(NIGHT_TINT, DAY_TINT, d);
    for (const g of this.grains) {
      if (g.t < g.life) {
        g.t += dt;
        const s = dt / 1000;
        g.x += g.vx * s;
        g.vz -= FALL * s;
        g.z = Math.max(0, g.z + g.vz * s);
        const k = g.t / g.life;
        g.img.setPosition(Math.round(g.x), Math.round(g.y - g.z)).setAlpha(Math.sin(k * Math.PI) * 0.85).setDepth(g.y + 2).setTint(tint);
        if (g.t >= g.life || g.z <= 0) {
          g.t = g.life;
          g.img.setVisible(false);
        }
        continue;
      }
      if (this.owed < 1 || this.spots.length === 0) continue;
      this.owed -= 1;
      const at = this.spots[Math.floor(Math.random() * this.spots.length)];
      g.x = at.x + (Math.random() - 0.5) * 3;
      g.y = at.y + (Math.random() - 0.5) * 18;
      g.z = 1;
      g.vx = BLOW[0] + Math.random() * (BLOW[1] - BLOW[0]) * (0.5 + breath * 0.5);
      g.vz = LIFT[0] + Math.random() * (LIFT[1] - LIFT[0]);
      g.t = 0;
      g.life = FLIGHT[0] + Math.random() * (FLIGHT[1] - FLIGHT[0]);
      g.img.setVisible(true).setAlpha(0);
    }
    this.owed = Math.min(this.owed, 8);
    this.updateSparks(dt, d, view);
  }

  /** Find crest spots in view to blow sand from, forgetting old ones and those left behind. */
  private seek(dt: number, view: Phaser.Geom.Rectangle): void {
    for (const s of this.spots) s.t -= dt;
    this.spots = this.spots.filter((s) => s.t > 0 && view.contains(s.x, s.y));
    if (this.spots.length >= SPOTS) return;
    for (let k = 0; k < SEEK_PER_FRAME; k++) {
      const x = Math.round(view.left + Math.random() * view.width);
      const y = Math.round(view.top + Math.random() * view.height);
      if (this.gen.crest(x, y)) {
        this.spots.push({ x, y, t: SPOT_LIFE * (0.5 + Math.random()) });
        if (this.spots.length >= SPOTS) return;
      }
    }
  }

  private updateSparks(dt: number, d: number, view: Phaser.Geom.Rectangle): void {
    const night = Math.max(0, Math.min(1, 1.15 - d * 1.5));
    for (const s of this.sparks) {
      const glint = d > 0.45;
      const strength = glint ? Math.max(0, d - 0.3) : night;
      s.t += dt;
      if (s.t >= s.life) {
        s.img.setVisible(false);
        if (strength < 0.03) continue;
        const x = Math.round(view.left + Math.random() * view.width);
        const y = Math.round(view.top + Math.random() * view.height);
        if (!this.gen.water(x, y)) continue;
        s.t = 0;
        s.life = glint ? 300 + Math.random() * 450 : 1200 + Math.random() * 2400;
        const tints = glint ? GLINT_TINTS : STAR_TINTS;
        s.img.setPosition(x, y).setTint(tints[Math.floor(Math.random() * tints.length)]).setScale(glint ? 0.45 + Math.random() * 0.5 : 0.3 + Math.random() * 0.35).setVisible(true);
      }
      s.img.setAlpha(Math.sin((s.t / Math.max(1, s.life)) * Math.PI) * strength);
    }
  }

  destroy(): void {
    for (const g of this.grains) g.img.destroy();
    for (const s of this.sparks) s.img.destroy();
    this.grains = [];
    this.sparks = [];
    this.spots = [];
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
