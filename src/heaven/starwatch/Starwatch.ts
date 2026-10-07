// Starwatch alive: a calm place to lie back and watch the sky. Stars twinkle
// over the backdrop and fall now and then, small and far behind the isle,
// or bright and near overhead with a chime; every few minutes, on the wall
// clock so friends in a room see the same one, a meteor shower comes and
// the sky streams with them for a while. Lanterns flicker warm, the
// moonflowers breathe and send up motes of light, fireflies drift over the
// grass, the islets nearby bob in the dark, and frogs sing in the pond.
// There is no day here: it's always the hour for stars.

import Phaser from 'phaser';
import type { CozyLand } from '../../game/cozy';
import type { WorldScene } from '../../scenes/WorldScene';
import type { Footing } from '../../audio';
import { sound } from '../../audio';
import { settings } from '../../game/settings';
import { snap } from '../../game/display';
import { ISLE_X, ISLE_Y, MOON, PROP_ART, STREAK_W } from './art';
import { warmStarwatch } from './index';
import { POND, PROPS, SW_CX, SW_CY, SW_H, SW_RX, SW_RY, SW_UNDER, SW_W, TERRACE, blanketAt, isleR, pathDist, PATH_HALF, pondR, terraceR } from './layout';

type Img = Phaser.GameObjects.Image;

/** A meteor shower every this long on the wall clock (ms), lasting this long. */
const SHOWER_EVERY = 3 * 60 * 1000;
const SHOWER_LEN = 45 * 1000;
/** Between bright near stars (ms): most of the time, and in a shower. */
const NEAR_GAP: [number, number] = [5000, 11000];
const SHOWER_GAP: [number, number] = [220, 850];
/** Between small far stars falling behind the isle (ms). */
const FAR_GAP: [number, number] = [1400, 4200];
/** How many bright stars can be falling at once. */
const MAX_NEAR = 8;
/** Twinkling stars over the backdrop. */
const TWINKLES = 44;
/** Odds a near star rings a soft bell as it falls (always the first of a shower). */
const CHIME_ODDS = 0.45;
/** A lantern's light: its reach (px) and strength. */
const LAMP_R = 92;
const LAMP_I = 1.7;
/** Within this far (px) of the pond the frogs are heard. */
const POND_HEARD = 260;

/** Islets drifting near the isle: where, and which drawing. */
const ISLETS: { x: number; y: number; v: number; s: number }[] = [
  { x: 150, y: 250, v: 0, s: 1 },
  { x: 818, y: 196, v: 2, s: 1 },
  { x: 846, y: 470, v: 1, s: 0.8 },
  { x: 122, y: 520, v: 2, s: 0.75 },
  { x: 610, y: 680, v: 0, s: 0.7 },
];

interface Fall {
  img: Img;
  vx: number;
  vy: number;
  life: number;
  max: number;
  near: boolean;
}

interface Twinkle {
  img: Img;
  seed: number;
  base: number;
  speed: number;
}

interface Glowing {
  glow: Phaser.GameObjects.Sprite;
  light: Phaser.GameObjects.Light | null;
  seed: number;
  kind: string;
}

/** A tiny repeatable hash of a whole number (for the shower's direction, the same for everyone). */
const hashN = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export class Starwatch implements CozyLand {
  private falls: Fall[] = [];
  private twinkles: Twinkle[] = [];
  private glows: Glowing[] = [];
  private islets: { img: Img; glow: Img; x: number; y: number; seed: number }[] = [];
  private isleGlow: Img;
  private terraceLight: Phaser.GameObjects.Light;
  private nearT = 3000;
  private farT = 800;
  private showerSlot = -1;
  private trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private flies: Phaser.GameObjects.Particles.ParticleEmitter;
  private motes: Phaser.GameObjects.Particles.ParticleEmitter;
  private offQuality: () => void;
  private soundT = 0;

  constructor(
    private world: WorldScene,
    private ground: (img: Img) => Img,
    private view: Phaser.Geom.Rectangle,
  ) {
    warmStarwatch(world, Infinity);
    const add = world.add;
    ground(add.image(0, 0, 'sw_sky').setOrigin(0).setDepth(-2));
    ground(add.image(ISLE_X, ISLE_Y, 'sw_isle').setOrigin(0).setPipeline('Lit').setDepth(0));
    this.isleGlow = ground(add.image(ISLE_X, ISLE_Y, 'sw_isle_e').setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(0.5));

    // Twinkling stars, clear of the isle, the moon and the clouds' thick.
    const R = new Phaser.Math.RandomDataGenerator(['starwatch']);
    for (let tries = 0; this.twinkles.length < TWINKLES && tries < 2000; tries++) {
      const x = R.between(4, SW_W - 4);
      const y = R.between(4, Math.floor(SW_H * 0.78));
      if (this.overIsle(x, y, 1.06) || Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 30) continue;
      const seed = R.frac() * 100;
      const big = seed > 78;
      const img = ground(
        add
          .image(x, y, big ? 'glow' : 'spark')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(big ? 0.2 : 0.5)
          .setTint([0xffffff, 0xd8e4ff, 0xfff0c8, 0xe8d8ff][Math.floor(seed) % 4])
          .setDepth(-1.6),
      );
      this.twinkles.push({ img, seed, base: big ? 0.85 : 0.65, speed: 0.0009 + (seed % 7) * 0.0004 });
    }

    // The islets drifting near, behind the isle.
    for (const [k, s] of ISLETS.entries()) {
      const img = ground(add.image(s.x, s.y, 'sw_islet', `v${s.v}`).setScale(s.s).setPipeline('Lit').setDepth(-1));
      const glow = ground(add.image(s.x, s.y, 'sw_islet_e', `v${s.v}`).setScale(s.s).setBlendMode(Phaser.BlendModes.ADD).setDepth(-0.9));
      this.islets.push({ img, glow, x: s.x, y: s.y, seed: k * 1.9 });
    }

    // What stands on the isle: lit sprites sorted by their feet, a soft shadow under each, glows and lights.
    for (const p of PROPS()) {
      const art = PROP_ART[p.kind];
      const oy = art.foot / art.h;
      const frame = `v${p.v}`;
      add.sprite(p.x, p.y, art.key, frame).setOrigin(0.5, oy).setPipeline('Lit').setDepth(p.y).setFlipX(!!p.flip);
      if (p.kind !== 'bloom') {
        const w = p.kind === 'tree' ? 2.2 : p.kind === 'bench' ? 1.8 : 0.9;
        add.image(p.x + 1, p.y, 'shadow').setScale(w, w * 0.8).setAlpha(0.55).setDepth(1);
      }
      const glow = add.sprite(p.x, p.y, `${art.key}_e`, frame).setOrigin(0.5, oy).setBlendMode(Phaser.BlendModes.ADD).setDepth(p.y + 0.1).setFlipX(!!p.flip);
      let light: Phaser.GameObjects.Light | null = null;
      if (p.kind === 'lantern') {
        const ly = p.y - (p.v === 0 ? 18 : 19);
        const lx = p.x + (p.v === 1 ? (p.flip ? -3 : 3) : 0);
        light = world.lights.addLight(lx, ly, LAMP_R, 0xffb860, LAMP_I);
        add.image(lx, ly, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb050).setScale(0.9).setAlpha(0.35).setDepth(p.y + 0.2);
      }
      this.glows.push({ glow, light, seed: (p.x * 7 + p.y * 13) % 100, kind: p.kind });
    }
    // The sky's map in the terrace floor gives off a little cold light.
    this.terraceLight = world.lights.addLight(TERRACE.x, TERRACE.y, 120, 0x7aa0ff, 0.55);

    // A shooting star's glitter, shed behind its head.
    this.trail = add.particles(0, 0, 'spark', {
      lifespan: { min: 300, max: 700 },
      speed: { min: 2, max: 10 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xffffff, 0xd8e8ff, 0xfff0c8],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).setDepth(9501);

    // Fireflies low over the grass.
    const onIsle = {
      getRandomPoint: (p: Phaser.Types.Math.Vector2Like) => {
        const v = this.view;
        for (let k = 0; k < 6; k++) {
          const x = v.x + Math.random() * v.width;
          const y = v.y + Math.random() * v.height;
          if (isleR(x, y) < 0.92 && pondR(x, y) > 1.2 && terraceR(x, y) > 1.05) {
            p.x = x;
            p.y = y;
            return p;
          }
        }
        p.x = -999;
        p.y = -999;
        return p;
      },
    };
    this.flies = add.particles(0, 0, 'spark', {
      emitZone: { type: 'random', source: onIsle } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData,
      lifespan: { min: 3000, max: 5200 },
      speedX: { min: -6, max: 6 },
      speedY: { min: -6, max: 3 },
      scale: 0.5,
      alpha: { onUpdate: (_p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => Math.sin(t * Math.PI) * (0.5 + Math.sin(t * 22) * 0.5) },
      tint: [0xd8ff8a, 0xf0ffb8, 0xa8ffc8],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 260,
    }).setDepth(9000);

    // Motes of light rising off the moonflowers.
    const blooms = PROPS().filter((p) => p.kind === 'bloom');
    const onBloom = {
      getRandomPoint: (p: Phaser.Types.Math.Vector2Like) => {
        const b = blooms[Math.floor(Math.random() * blooms.length)];
        p.x = b.x + (Math.random() - 0.5) * 8;
        p.y = b.y - 8 - Math.random() * 4;
        return p;
      },
    };
    this.motes = add.particles(0, 0, 'spark', {
      emitZone: { type: 'random', source: onBloom } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData,
      lifespan: { min: 2200, max: 3600 },
      speedX: { min: -2, max: 2 },
      speedY: { min: -9, max: -4 },
      scale: 0.5,
      alpha: { onUpdate: (_p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => Math.sin(t * Math.PI) * 0.75 },
      tint: [0xd8e8ff, 0xc8b8ff, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 240,
    }).setDepth(9001);

    this.offQuality = settings.watch((s) => {
      const k = s.quality !== 'full' ? 2 : 1;
      this.flies.frequency = 260 * k;
      this.motes.frequency = 240 * k;
    });
  }

  /** Is (x, y) over the isle or the rock hanging under it (`pad` widens it)? */
  private overIsle(x: number, y: number, pad: number): boolean {
    if (isleR(x, y) < pad) return true;
    const u = (x - SW_CX) / (SW_RX * pad);
    return Math.abs(u) < 1 && y > SW_CY && y < SW_CY + SW_RY * pad + SW_UNDER * (1 - u * u);
  }

  footing(x: number, y: number): Footing {
    if (terraceR(x, y) < 1.02 || pathDist(x, y) < PATH_HALF) return 'stone';
    if (pondR(x, y) < 1.2) return 'gravel';
    if (blanketAt(x, y) >= 0) return 'leaves';
    return 'grass';
  }

  update(time: number, dt: number, _daylight: number, hero: { x: number; y: number }, view: Phaser.Geom.Rectangle): void {
    for (const t of this.twinkles) {
      const w = Math.sin(time * t.speed + t.seed) * 0.5 + 0.5;
      t.img.setAlpha(t.base * (0.2 + w * w * 0.8));
    }
    for (const s of this.islets) {
      const y = snap(s.y + Math.sin(time * 0.0007 + s.seed) * 3);
      s.img.setY(y);
      s.glow.setY(y);
    }
    this.isleGlow.setAlpha(0.85 + Math.sin(time * 0.0011) * 0.15);
    this.terraceLight.intensity = 0.5 + Math.sin(time * 0.0013) * 0.1;
    for (const g of this.glows) {
      if (g.kind === 'lantern') {
        const f = 0.88 + Math.sin(time * 0.011 + g.seed) * 0.06 + Math.sin(time * 0.027 + g.seed * 3) * 0.05;
        g.glow.setAlpha(f);
        if (g.light) g.light.intensity = LAMP_I * f;
      } else if (g.kind === 'bloom') {
        g.glow.setAlpha(0.6 + Math.sin(time * 0.0016 + g.seed) * 0.4);
      } else if (g.kind === 'stone') {
        g.glow.setAlpha(0.65 + Math.sin(time * 0.0012 + g.seed) * 0.35);
      }
    }
    this.updateFalls(dt, view);
    this.updateSound(dt, hero);
  }

  /** Stars falling: far ones behind the isle, near ones overhead, and in a shower many. */
  private updateFalls(dt: number, view: Phaser.Geom.Rectangle): void {
    const now = Date.now();
    const slot = Math.floor(now / SHOWER_EVERY);
    const into = now - slot * SHOWER_EVERY;
    const shower = into < SHOWER_LEN;
    if (shower && this.showerSlot !== slot) {
      this.showerSlot = slot;
      // Only greeted if there's a good part of it left to watch.
      if (SHOWER_LEN - into > 8000) {
        this.world.announce('A meteor shower');
        sound.constellation();
        this.nearT = 600;
      }
    }
    // Where this shower's stars come from: the same for everyone, a different quarter each time.
    const radiant = (hashN(slot) * 2 - 1) * 0.5 + (hashN(slot) > 0.5 ? 0.35 : Math.PI - 0.35);

    this.farT -= dt;
    if (this.farT <= 0) {
      this.farT = Phaser.Math.Between(FAR_GAP[0], FAR_GAP[1]) * (shower ? 0.4 : 1);
      this.launch(false, view, Math.random() < 0.5 ? 0.35 : Math.PI - 0.35);
    }
    this.nearT -= dt;
    if (this.nearT <= 0) {
      const gap = shower ? SHOWER_GAP : NEAR_GAP;
      this.nearT = Phaser.Math.Between(gap[0], gap[1]);
      if (this.falls.filter((f) => f.near).length < MAX_NEAR) {
        const first = shower && !this.falls.some((f) => f.near);
        this.launch(true, view, shower ? radiant + (Math.random() - 0.5) * 0.25 : Math.random() < 0.5 ? 0.4 : Math.PI - 0.4, first);
      }
    }

    for (const f of this.falls) {
      f.life -= dt;
      f.img.x += (f.vx * dt) / 1000;
      f.img.y += (f.vy * dt) / 1000;
      const t = 1 - f.life / f.max;
      // In fast, a long bright moment, then gone.
      const a = t < 0.12 ? t / 0.12 : f.life < 260 ? f.life / 260 : 1;
      f.img.setAlpha(a * (f.near ? 0.95 : 0.7));
      if (f.near && Math.random() < 0.6) {
        const r = f.img.rotation;
        const head = (STREAK_W * f.img.scaleX) / 2;
        this.trail.emitParticleAt(f.img.x + Math.cos(r) * head, f.img.y + Math.sin(r) * head, 1);
      }
    }
    for (let i = this.falls.length - 1; i >= 0; i--) {
      if (this.falls[i].life > 0) continue;
      this.falls[i].img.destroy();
      this.falls.splice(i, 1);
    }
  }

  /** A star falls along `angle` (radians, 0 east): near ones across the view overhead, far ones small in the sky behind the isle. */
  private launch(near: boolean, view: Phaser.Geom.Rectangle, angle: number, chime = false): void {
    const add = this.world.add;
    const speed = near ? Phaser.Math.Between(300, 460) : Phaser.Math.Between(150, 240);
    const life = near ? Phaser.Math.Between(700, 1300) : Phaser.Math.Between(600, 1100);
    // It starts upwind of the view's middle, so it crosses where the player is looking.
    const travel = (speed * life) / 1000;
    let x: number;
    let y: number;
    if (near) {
      x = view.centerX - Math.cos(angle) * travel * 0.5 + (Math.random() - 0.5) * view.width * 0.7;
      y = view.y + view.height * (0.15 + Math.random() * 0.45) - Math.sin(angle) * travel * 0.5;
    } else {
      // Somewhere in the open sky in or near the view, not over the isle.
      let tries = 0;
      do {
        x = view.x + Math.random() * view.width;
        y = view.y + Math.random() * view.height * 0.8;
      } while (this.overIsle(x, y, 1.1) && ++tries < 12);
      if (tries >= 12) return;
    }
    const tint = near ? [0xffffff, 0xe0ecff, 0xfff0d0, 0xe8dcff][Math.floor(Math.random() * 4)] : 0xc8d4ff;
    const img = add
      .image(x, y, 'sw_streak')
      .setRotation(angle)
      .setScale(near ? 0.8 + Math.random() * 0.5 : 0.35 + Math.random() * 0.2, near ? 1 : 0.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(tint)
      .setAlpha(0)
      .setDepth(near ? 9500 : -1.5);
    if (!near) this.ground(img);
    this.falls.push({ img, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, max: life, near });
    if (near && (chime || Math.random() < CHIME_ODDS)) sound.starLink(Math.floor(Math.random() * 8));
  }

  /** The frogs in the pond, heard as the wanderer comes near it. */
  private updateSound(dt: number, hero: { x: number; y: number }): void {
    this.soundT -= dt;
    if (this.soundT > 0) return;
    this.soundT = 400;
    const d = Math.hypot(hero.x - POND.x, (hero.y - POND.y) * 1.3);
    const pond = Math.max(0, 1 - d / POND_HEARD);
    sound.setWild(pond > 0 ? { stream: 0, streamPan: 0, pond, pondPan: Phaser.Math.Clamp((POND.x - hero.x) / 200, -1, 1) } : null);
  }

  destroy(): void {
    this.offQuality();
    sound.setWild(null);
    for (const g of this.glows) if (g.light) this.world.lights.removeLight(g.light);
    this.world.lights.removeLight(this.terraceLight);
    this.glows = [];
    this.falls = [];
  }
}
