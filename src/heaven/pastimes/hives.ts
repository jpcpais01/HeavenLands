// Beehives (the Garden tab's Beehive): bees drift round them by day, and in
// time they fill with honey, a jar every few minutes and up to three, sooner
// with flowers planted near. A hive with honey glints; E (or the touch button)
// beside it takes the honey to the pantry, for the kitchen's sweet things.
// Only the plot's owner takes it (a visitor just watches the bees). When each
// hive was last emptied is kept on this device, by place and cell.

import Phaser from 'phaser';
import { sound } from '../../audio';
import { collection } from '../../game/collection';
import { findById, findKey } from '../../game/finds';
import { snap } from '../../game/display';
import type { WorldScene } from '../../scenes/WorldScene';
import type { BuildLand } from '../../world/buildLand';
import { CELL, type Thing } from '../../world/homeLayout';

/** How long a jar of honey takes with no flowers about, ms, and how many a hive holds. */
const HONEY_MS = 8 * 60_000;
const MAX_JARS = 3;
/** Each flowering thing within FLOWER_CELLS cells hurries the bees by this much, up to FLOWER_MAX. */
const FLOWER_CELLS = 4;
const FLOWER_EACH = 0.15;
const FLOWER_MAX = 1;
const FLOWERS = new Set(['roses', 'tulips', 'lavender', 'sunflowers', 'planter', 'arbor', 'blossom', 'bush', 'cacti', 'hydrangea', 'foxgloves', 'daisies', 'poppies', 'lotus', 'trellis', 'urn', 'herbbed', 'flowercart', 'windowbox', 'lemontree']);
/** Bees round each hive, and how far they roam from it, px. */
const BEES = 3;
const ROAM = 22;
const STORE = 'pixel-battle.hives';

type Saved = Record<string, number>;

function load(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function save(v: Saved): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(v));
  } catch {
    // Not kept; the honey still comes this visit.
  }
}

interface Bee {
  img: Phaser.GameObjects.Image;
  /** Its own loop round the hive: speeds, phases and reach. */
  a: number;
  b: number;
  p: number;
  r: number;
}

interface Hive {
  key: string;
  thing: Thing;
  x: number;
  y: number;
  bees: Bee[];
  glint: Phaser.GameObjects.Image;
  speed: number;
}

export class Hives {
  private saved = load();
  private hives = new Map<string, Hive>();
  private t = 0;

  constructor(
    private world: WorldScene,
    private arena: string,
    private owner: boolean,
  ) {}

  /** Match the hives to what's built (called when the spots are worked out again). */
  sync(land: BuildLand): void {
    const seen = new Set<string>();
    for (const t of land.things) {
      if (t.id !== 'beehive') continue;
      const key = `${this.arena}:${t.x},${t.y}`;
      seen.add(key);
      let h = this.hives.get(key);
      if (!h) {
        h = this.make(key, t, land.ox + (t.x + 0.5) * CELL, land.oy + (t.y + 1) * CELL);
        this.hives.set(key, h);
        if (this.saved[key] === undefined) {
          this.saved[key] = Date.now();
          save(this.saved);
        }
      }
      h.thing = t;
      h.speed = 1 + Math.min(FLOWER_MAX, FLOWER_EACH * land.things.filter((o) => FLOWERS.has(o.id) && Math.abs(o.x - t.x) <= FLOWER_CELLS && Math.abs(o.y - t.y) <= FLOWER_CELLS).length);
    }
    for (const [key, h] of this.hives) {
      if (seen.has(key)) continue;
      this.drop(h);
      this.hives.delete(key);
    }
  }

  private make(key: string, thing: Thing, x: number, y: number): Hive {
    const w = this.world;
    const bees: Bee[] = Array.from({ length: BEES }, () => ({
      img: w.add.image(x, y, 'hl_pastime', 'bee0').setVisible(false),
      a: Phaser.Math.FloatBetween(0.0011, 0.0019) * (Math.random() < 0.5 ? -1 : 1),
      b: Phaser.Math.FloatBetween(0.0023, 0.0036),
      p: Math.random() * Math.PI * 2,
      r: Phaser.Math.FloatBetween(0.55, 1) * ROAM,
    }));
    const glint = w.add.image(x, y - 22, 'hl_pastime', 'glint').setTint(0xffd860).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    return { key, thing, x, y, bees, glint, speed: 1 };
  }

  private drop(h: Hive): void {
    for (const b of h.bees) b.img.destroy();
    h.glint.destroy();
  }

  /** How many jars this hive holds now. */
  jars(key: string): number {
    const h = this.hives.get(key);
    const since = this.saved[key];
    if (!h || since === undefined) return 0;
    return Math.min(MAX_JARS, Math.floor(((Date.now() - since) * h.speed) / HONEY_MS));
  }

  /** The key of the hive on `thing`, if it has honey for this player. */
  ready(thing: Thing): string | null {
    if (!this.owner) return null;
    const key = `${this.arena}:${thing.x},${thing.y}`;
    return this.jars(key) > 0 ? key : null;
  }

  /** Take the honey: into the pantry, with a pop over the hero and the bees' hum. */
  collect(key: string): boolean {
    const n = this.jars(key);
    const h = this.hives.get(key);
    if (!n || !h || !this.owner) return false;
    // Whatever was on its way to the next jar is kept toward it.
    const since = this.saved[key];
    this.saved[key] = since + (n * HONEY_MS) / h.speed;
    if (n >= MAX_JARS) this.saved[key] = Math.max(this.saved[key], Date.now() - HONEY_MS / h.speed / 2);
    save(this.saved);
    collection.addStock(findKey('honey'), n);
    const d = findById('honey')!;
    const hero = this.world.player;
    this.world.popNumber(Math.round(hero.x), Math.round(hero.y) - 40, `+${n} ${d.one.toUpperCase()}`, d.tint);
    this.world.debris([0xffd23a, 0xffe890, 0xffffff], snap(h.x), snap(h.y) - 12, 12, h.y + 20, 'spores');
    sound.honey();
    return true;
  }

  update(dt: number, daylight: number, view: Phaser.Geom.Rectangle): void {
    this.t += dt;
    const now = this.t;
    const out = view.width * 0.25;
    for (const h of this.hives.values()) {
      const shown = h.x > view.left - out && h.x < view.right + out && h.y > view.top - out && h.y < view.bottom + out + 40;
      // Bees keep to the daytime; at dusk only one or two still about.
      const awake = shown ? Math.round(BEES * Phaser.Math.Clamp((daylight - 0.25) / 0.5, 0, 1)) : 0;
      h.bees.forEach((b, i) => {
        const on = i < awake;
        b.img.setVisible(on);
        if (!on) return;
        const ang = b.p + now * b.a;
        const bx = h.x + Math.cos(ang) * b.r + Math.sin(now * b.b + b.p) * 4;
        const by = h.y - 12 + Math.sin(ang) * b.r * 0.55 + Math.cos(now * b.b * 1.3) * 3;
        const right = Math.cos(ang + Math.PI / 2) * Math.sign(b.a) > 0;
        b.img
          .setPosition(Math.round(bx), Math.round(by))
          .setFrame(Math.floor(now / 60 + i) % 2 ? 'bee1' : 'bee0')
          .setFlipX(!right)
          .setDepth(by + 22);
      });
      const full = this.owner && shown && this.jars(h.key) > 0;
      h.glint.setVisible(full);
      if (full) {
        const k = (Math.sin(now * 0.004) + 1) / 2;
        h.glint.setAlpha(0.35 + k * 0.65).setScale(0.8 + k * 0.4).setDepth(h.y + 30);
      }
    }
  }

  destroy(): void {
    for (const h of this.hives.values()) this.drop(h);
    this.hives.clear();
  }
}
