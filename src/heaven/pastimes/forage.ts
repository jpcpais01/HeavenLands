// Foraging: out in the places (not the Home), a few good things lie about
// for whoever wanders by: chanterelles and wild mint in the Everwood, clams
// and kelp on Glowtide Shore, snowberries in Hushfall, glowpetals in Lumen
// Meadow, a lotus root by the Sunken Garden's ponds... (game/finds.ts). They
// come up a little way off where the wanderer is heading, glint now and then
// so they're seen, and E (or the touch button) beside one picks it: it hops
// up to the hero and goes in the pantry for the kitchen. They're each
// player's own, so friends in a room each find their own.

import Phaser from 'phaser';
import { sound } from '../../audio';
import { collection } from '../../game/collection';
import { findKey, findsIn, type FindDef } from '../../game/finds';
import type { WorldScene } from '../../scenes/WorldScene';

/** How many lie about at once, and how far from the hero they come up and go, px. */
const MAX_FINDS = 4;
const NEAR = 120;
const FAR = 260;
const GONE = 460;
/** How often a new one may come up, ms. */
const EVERY_MS = 2600;
/** How near the hero's feet must be to pick one, px. */
export const PICK_R = 18;
/** How long one takes to fade in, ms. */
const FADE_MS = 700;

export interface Find {
  def: FindDef;
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image | null;
  glint: Phaser.GameObjects.Image;
  age: number;
  seed: number;
}

export class ForageField {
  private finds: Find[] = [];
  private wait = EVERY_MS / 2;

  constructor(
    private world: WorldScene,
    private arena: string,
  ) {}

  /** Whether anything grows here at all. */
  get any(): boolean {
    return findsIn(this.arena, false).length + findsIn(this.arena, true).length > 0;
  }

  /** The nearest find within picking reach of (x, y). */
  nearest(x: number, y: number): Find | null {
    let best: Find | null = null;
    let bd = PICK_R;
    for (const f of this.finds) {
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < bd && f.age > FADE_MS * 0.5) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  /** Pick it: into the pantry, hopping up to the hero on the way. */
  pick(f: Find): void {
    const i = this.finds.indexOf(f);
    if (i < 0) return;
    this.finds.splice(i, 1);
    collection.addStock(findKey(f.def.id), 1);
    const w = this.world;
    const hero = w.player;
    w.popNumber(Math.round(hero.x), Math.round(hero.y) - 40, `+1 ${f.def.one.toUpperCase()}`, f.def.tint);
    w.debris([f.def.tint, 0xffffff], Math.round(f.x), Math.round(f.y) - 4, 8, f.y + 10, 'spores');
    sound.forage(f.def.glow ? 2 : Object.values(f.def.places).some((n) => n <= 1) ? 1 : 0, w.pan(f.x));
    f.shadow.destroy();
    f.glow?.destroy();
    f.glint.destroy();
    const x0 = f.x;
    const y0 = f.y - 6;
    w.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 420,
      ease: 'Sine.In',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const tx = hero.x;
        const ty = hero.y - 22;
        // An arc up and over into the hero's hands.
        f.img
          .setPosition(Math.round(x0 + (tx - x0) * t), Math.round(y0 + (ty - y0) * t - Math.sin(t * Math.PI) * 16))
          .setScale(1 - t * 0.4)
          .setDepth(hero.y + 50);
      },
      onComplete: () => f.img.destroy(),
    });
  }

  update(dt: number, daylight: number): void {
    const w = this.world;
    const hero = w.player;
    const night = daylight < 0.35;
    for (let i = this.finds.length - 1; i >= 0; i--) {
      const f = this.finds[i];
      if (Math.hypot(f.x - hero.x, f.y - hero.y) > GONE) {
        this.drop(f);
        this.finds.splice(i, 1);
      }
    }
    if (this.finds.length < MAX_FINDS && (this.wait -= dt) <= 0) {
      this.wait = EVERY_MS * Phaser.Math.FloatBetween(0.7, 1.3);
      this.grow(hero.x, hero.y, night);
    }
    const now = w.time.now;
    for (const f of this.finds) {
      f.age += dt;
      const a = Math.min(1, f.age / FADE_MS);
      // By night only the glowing ones are bright; the rest are dim shapes in the dark.
      const dim = f.def.glow ? 1 : 0.55 + 0.45 * Phaser.Math.Clamp(daylight * 1.6, 0, 1);
      const bob = f.def.glow ? Math.round(Math.sin(now * 0.003 + f.seed) * 1) : 0;
      f.img.setAlpha(a).setY(Math.round(f.y) + bob);
      const c = Math.round(255 * dim);
      f.img.setTint((c << 16) | (c << 8) | c);
      f.shadow.setAlpha(a * 0.35 * (0.4 + 0.6 * daylight));
      if (f.glow) f.glow.setAlpha(a * (0.25 + 0.35 * (1 - daylight)) * (0.8 + 0.2 * Math.sin(now * 0.002 + f.seed)));
      // A glint now and then, so a find catches the eye from a little way off.
      const g = (now * 0.001 + f.seed) % 3.2;
      const k = g < 0.5 ? Math.sin((g / 0.5) * Math.PI) : 0;
      f.glint.setAlpha(a * k).setScale(0.6 + k * 0.5);
    }
  }

  /** One new find a little way off, ahead of the hero more often than behind, on open ground. */
  private grow(hx: number, hy: number, night: boolean): void {
    const pool = findsIn(this.arena, night);
    if (!pool.length) return;
    const w = this.world;
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    const def = (pool.find((p) => (r -= p.weight) < 0) ?? pool[0]).def;
    for (let tries = 0; tries < 12; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const d = Phaser.Math.FloatBetween(NEAR, FAR);
      const x = Math.round(hx + Math.cos(ang) * d);
      const y = Math.round(hy + Math.sin(ang) * d);
      // Room round it to stand and pick it, and not on top of another.
      if (!w.walkable(x, y) || !w.walkable(x + 6, y) || !w.walkable(x - 6, y) || !w.walkable(x, y + 6)) continue;
      if (this.finds.some((f) => Math.hypot(f.x - x, f.y - y) < 48)) continue;
      const shadow = w.add.image(x, y + 1, 'shadow').setDepth(1).setScale(0.6, 0.5).setAlpha(0);
      const img = w.add.image(x, y, `find_${def.id}`).setOrigin(0.5, 0.85).setDepth(y).setAlpha(0);
      const glow = def.glow ? w.add.image(x, y - 4, 'glow').setTint(def.tint).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setDepth(y - 0.1).setAlpha(0) : null;
      const glint = w.add.image(x + 4, y - 10, 'hl_pastime', 'glint').setBlendMode(Phaser.BlendModes.ADD).setDepth(y + 0.2).setAlpha(0);
      this.finds.push({ def, x, y, img, shadow, glow, glint, age: 0, seed: Math.random() * 10 });
      return;
    }
  }

  private drop(f: Find): void {
    f.img.destroy();
    f.shadow.destroy();
    f.glow?.destroy();
    f.glint.destroy();
  }

  destroy(): void {
    for (const f of this.finds) this.drop(f);
    this.finds.length = 0;
  }
}
