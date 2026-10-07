// A sky lantern: a paper lantern the wanderer lifts over their head and lets
// go. It drifts up and away on the warm air, swaying, shrinking as it climbs,
// glowing over everything below (a light of its own while there are lights
// to spare), until it's a spark and gone. Friends in the room see their
// friends' lanterns too, from the emote that reaches them.

import Phaser from 'phaser';
import { PixelCanvas, hex, sphere, type Material, type RGB } from '../art/pixel';
import { pixelCanvas } from '../art/canvas';
import { snap } from '../game/display';
import type { Effect } from '../game/Slash';
import type { WorldScene } from '../scenes/WorldScene';
import { bakeLit } from './art/creatorArt';

/** How long it's held up in the hands before it's let go (ms), and how high over the feet it goes. */
const HOLD_MS = 640;
const HELD_FROM = 16;
const HELD_TO = 30;
/** Its climb: px a second at first, gathering to this, and its sway. */
const RISE = 7;
const RISE_TOP = 15;
const SWAY_PX = 5;
const SWAY_MS = 2600;
/** Its life after letting go, and the fade at the end (ms). */
const LIFE = 15000;
const FADE = 3500;
/** How small it gets as it goes up and away. */
const FAR_SCALE = 0.45;
/** Lights it may take (the world has 16 to share): a few lanterns at once glow on the ground. */
const MAX_LIT = 3;
const LIGHT_R = 70;
const LIGHT_I = 0.9;
const WARM = 0xffb060;
/** Drawn over the world: lanterns are up in the air. */
const DEPTH = 14000;

const ramp = (...c: string[]): RGB[] => c.map(hex);
const PAPER: Material = { ramp: ramp('#b4522a', '#e4823e', '#ffb460', '#ffd894', '#fff0cc'), outline: hex('#5a1e0a'), outlineLit: hex('#7a2e10'), emissive: 0.75, noAO: true };
const RIM: Material = { ramp: ramp('#3a1e10', '#6a3a1e', '#8a5a30'), outline: hex('#1a0c04'), noAO: true };
const FLAME = hex('#fff4c8');

const W = 11;
const H = 14;

/** The lantern's picture: wider at the crown, narrowing to an open, burning mouth. */
function lanternTexture(scene: Phaser.Scene): string {
  const key = 'hl_skylantern';
  if (scene.textures.exists(key)) return key;
  const c = new PixelCanvas(W, H);
  const cx = W / 2;
  c.part();
  c.shape(1, 10, (y) => {
    const t = (y - 1) / 9;
    const hw = 4.6 - t * 1.6 + (y === 1 ? -1 : 0);
    return [cx - hw, cx + hw];
  }, PAPER, (_x, y, t) => sphere(t * 0.9, (y - 5) / 9, 1));
  // The paper's ribs, a shade darker.
  for (let y = 2; y <= 10; y++) {
    c.shade(Math.round(cx - 2.2 + (y - 2) * 0.12), y, -1);
    c.shade(Math.round(cx + 1.6 - (y - 2) * 0.12), y, -1);
  }
  c.part();
  c.shape(11, 11, () => [cx - 3, cx + 3], RIM);
  c.spark(cx - 0.5, 11, FLAME, 1);
  c.spark(cx - 0.5, 12, FLAME, 0.8);
  c.spark(cx - 0.5, 9, hex('#ffe8a0'), 0.6);
  const r = c.render();
  scene.textures.addCanvas(key, pixelCanvas(W, H, bakeLit({ w: W, h: H, diffuse: r.diffuse, normal: r.normal, emissive: r.emissive })));
  return key;
}

let lit = 0;

export class SkyLantern implements Effect {
  dead = false;
  private img: Phaser.GameObjects.Image;
  private halo: Phaser.GameObjects.Image;
  private light: Phaser.GameObjects.Light | null = null;
  private t = 0;
  private x: number;
  /** Height over the ground (px). */
  private z = HELD_FROM;
  private vz = RISE;
  private phase = Math.random() * Math.PI * 2;

  /** Held by whoever stands at `hand()` until it's let go; `y` is where they stand. */
  constructor(
    private world: WorldScene,
    x: number,
    private y: number,
    private hand: () => { x: number; y: number },
  ) {
    this.x = x;
    this.img = world.add.image(x, y, lanternTexture(world)).setOrigin(0.5, 1).setDepth(DEPTH);
    this.halo = world.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(WARM).setAlpha(0).setDepth(DEPTH - 1);
    if (lit < MAX_LIT) {
      lit++;
      this.light = world.lights.addLight(x, y, LIGHT_R, WARM, LIGHT_I);
    }
    this.sync(1, 0);
    world.events.once(Phaser.Scenes.Events.SHUTDOWN, this.gone, this);
  }

  /** The world closed with it still up: its things go with the scene, its light back to the count. */
  private gone(): void {
    if (this.dead) return;
    this.dead = true;
    if (this.light) lit--;
    this.light = null;
  }

  update(dt: number): void {
    this.t += dt;
    let fade = 1;
    let far = 0;
    if (this.t < HOLD_MS) {
      const h = this.hand();
      this.x = h.x;
      this.y = h.y;
      this.z = HELD_FROM + (HELD_TO - HELD_FROM) * Phaser.Math.Easing.Sine.InOut(this.t / HOLD_MS);
    } else {
      const free = this.t - HOLD_MS;
      this.vz = Math.min(RISE_TOP, this.vz + dt * 0.002);
      this.z += (this.vz * dt) / 1000;
      // It sways a little as it climbs, the sway growing as it leaves the hands.
      this.x += Math.sin((free / SWAY_MS) * Math.PI * 2 + this.phase) * SWAY_PX * (dt / SWAY_MS) * Math.min(1, free / 1500) * 2;
      far = Math.min(1, free / LIFE);
      fade = free > LIFE - FADE ? Math.max(0, (LIFE - free) / FADE) : 1;
      if (free >= LIFE) return this.destroy();
    }
    this.sync(fade, far);
  }

  private sync(fade: number, far: number): void {
    const s = 1 - (1 - FAR_SCALE) * far;
    const flicker = 0.85 + 0.15 * Math.sin(this.t / 90 + this.phase) * Math.sin(this.t / 37);
    const x = snap(this.x);
    const y = snap(this.y - this.z);
    this.img.setPosition(x, y).setScale(s).setAlpha(fade);
    this.halo.setPosition(x, y - 6 * s).setScale(0.9 * s).setAlpha(0.5 * fade * flicker);
    if (this.light) {
      // Its light stays on the ground under it, dimming as it climbs away.
      this.light.setPosition(x, this.y - this.z * 0.4);
      this.light.intensity = LIGHT_I * fade * flicker * (1 - far * 0.8);
    }
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.world.events.off(Phaser.Scenes.Events.SHUTDOWN, this.gone, this);
    this.img.destroy();
    this.halo.destroy();
    if (this.light) {
      this.world.lights.removeLight(this.light);
      this.light = null;
      lit--;
    }
  }
}
