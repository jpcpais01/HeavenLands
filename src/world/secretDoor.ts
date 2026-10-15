import Phaser from 'phaser';
import { SECRET_SHELF, wallFrameName } from '../art/homeArt';
import { sound } from '../audio';
import { CELL, DOOR_HW, doorAcross, type Thing } from './homeLayout';
import { WALLS, wallMat } from './homeParts';

// Secret doors (see homeParts.ts): hung in a house's doorway like a door, but
// shut they look like anything but one. A hidden door is a stretch of the
// wall itself, the same stones or boards as the run it stands in; a secret
// bookcase is a tall case of books against the wall's face. Nothing gives
// them away but leaning on them: whoever walks into one and keeps pushing a
// moment finds the wall sinking into the floor with a grind of stone, or the
// bookcase rumbling aside, and the doorway behind. They stay open while
// anyone is near, then close up again behind them. Shut, they stop feet like
// the wall round them. Friends online lean on them too, so everyone sees the
// same. Used by the Home and by every other place built in alike.

/** Leaning this long (ms) on a shut one opens it; it stays open this long after the last one near has gone. */
const LEAN_MS = 260;
const HOLD_MS = 1500;
/** How long it takes to open, and to close (ms). */
const OPEN_MS = 560;
const CLOSE_MS = 760;
/** Where leaning on it counts, px from its doorway's middle: along its wall, and across it. */
const LEAN_ALONG = 6;
const LEAN_ACROSS = 14;
/** Anyone within this far keeps it open. */
const NEAR_ALONG = 12;
const NEAR_ACROSS = 26;
/** It stops feet until it's this far open. */
const PASSABLE = 0.8;
/** How far a bookcase slides aside, px. */
const SLIDE = 13;
/** Its sounds carry this far, px. */
const HEAR = 240;
/** Dust off a sinking wall: grey motes (they glow a little, as the world's debris does). */
const DUST = [0x8a8274, 0x6e675c, 0xa49c8c];

/** A secret door as built: its thing, what it is, and its doorway's wall (the packed value and the walls it joins). */
export interface SecretSpec {
  key: string;
  t: Thing;
  kind: 'wall' | 'shelf';
  wall: number;
  mask: number;
}

const sigOf = (s: SecretSpec): string => `${s.kind}|${s.wall}|${s.mask}|${s.t.flip ? 1 : 0}`;

/** Ease in and out. */
const ease = (u: number): number => u * u * (3 - 2 * u);

class Secret {
  readonly sig: string;
  /** How far open, 0..1, and where it's heading. */
  private open = 0;
  private want = 0;
  private lean = 0;
  private hold = 0;
  private sprite: Phaser.GameObjects.Image;
  private x0: number;
  private y0: number;
  private across: boolean;
  private h: number;
  /** The row its wall's face meets the floor, in its frame. */
  private foot: number;
  private shown = -1;
  private cutShown = -1;
  /** Rows cut off its top with its wall (a house's south wall, the hero inside). */
  cut = 0;

  constructor(
    private scene: Phaser.Scene,
    ox: number,
    oy: number,
    readonly spec: SecretSpec,
  ) {
    this.sig = sigOf(spec);
    const { t, kind } = spec;
    const mat = wallMat(spec.wall);
    this.h = WALLS[mat]?.height ?? 28;
    this.across = doorAcross(spec.mask);
    this.x0 = ox + t.x * CELL;
    this.y0 = oy + t.y * CELL;
    this.foot = this.across ? this.h + 11 : this.h + CELL;
    // The wall's own look, its stones or boards falling just as its neighbours' do; or the bookcase standing at the wall's foot.
    const frame = kind === 'wall' ? wallFrameName(mat, `w${spec.mask}_${(t.x * 7 + t.y * 13) % 2}`) : t.flip ? `${SECRET_SHELF}:m0` : `${SECRET_SHELF}:0`;
    this.sprite = scene.add
      .image(this.x0, this.y0 - this.h, 'home', frame)
      .setOrigin(0)
      .setPipeline('Lit')
      .setDepth(kind === 'wall' ? this.y0 + 11.05 : this.y0 + 14);
    this.draw();
  }

  /** Its doorway's middle, in the world. */
  private get mx(): number {
    return this.x0 + CELL / 2;
  }

  private get my(): number {
    return this.y0 + CELL / 2;
  }

  /** How far (x, y) is from its doorway, along its wall and across it. */
  private off(x: number, y: number): [number, number] {
    const a = Math.abs(x - this.mx);
    const b = Math.abs(y - this.my);
    return this.across ? [a, b] : [b, a];
  }

  update(dt: number, heroes: readonly { x: number; y: number }[], ear: { x: number; y: number }): void {
    let leaning = false;
    let near = false;
    for (const h of heroes) {
      const [along, across] = this.off(h.x, h.y);
      if (along < LEAN_ALONG && across < LEAN_ACROSS) leaning = true;
      if (along < NEAR_ALONG && across < NEAR_ACROSS) near = true;
    }
    this.lean = leaning ? this.lean + dt : 0;
    const pan = Math.max(-1, Math.min(1, (this.mx - ear.x) / 160));
    const heard = Math.hypot(this.mx - ear.x, this.my - ear.y) < HEAR;
    if (this.want === 0 && this.lean >= LEAN_MS) {
      this.want = 1;
      this.hold = HOLD_MS;
      if (heard) sound.secretDoor(pan, this.spec.kind === 'wall', true);
      if (this.spec.kind === 'wall') this.dust();
    } else if (this.want === 1) {
      if (near) this.hold = HOLD_MS;
      else if ((this.hold -= dt) <= 0) {
        this.want = 0;
        if (heard) sound.secretDoor(pan, this.spec.kind === 'wall', false);
      }
    }
    const rate = dt / (this.want ? OPEN_MS : CLOSE_MS);
    this.open = this.want ? Math.min(1, this.open + rate) : Math.max(0, this.open - rate);
    this.draw();
  }

  /** A little dust off the wall's foot as it starts to sink. */
  private dust(): void {
    const w = this.scene as Phaser.Scene & { debris?: (tints: number[], x: number, y: number, count: number, depth: number, style?: 'burst' | 'spores' | 'trail' | 'gather') => void };
    const y = this.across ? this.y0 + 11 : this.y0 + CELL;
    w.debris?.(DUST, this.mx, y - 2, 7, y + 1, 'spores');
  }

  private draw(): void {
    const e = ease(this.open);
    const step = Math.round(e * 48);
    if (step === this.shown && this.cut === this.cutShown) return;
    this.shown = step;
    this.cutShown = this.cut;
    const s = this.sprite;
    if (this.spec.kind === 'wall') {
      // Sinking into the floor: drawn lower and lower, cut off at the line its face stands on.
      const sink = Math.round(e * this.foot);
      const top = Math.max(0, this.cut - sink);
      const rows = this.foot - sink - top;
      s.setY(this.y0 - this.h + sink).setVisible(rows > 0);
      if (rows > 0) s.setCrop(0, top, CELL, rows);
    } else {
      // Rumbling aside along the wall (west if it was hung mirrored).
      s.setX(this.x0 + Math.round(e * SLIDE) * (this.spec.t.flip ? -1 : 1));
      if (this.cut) s.setCrop(0, this.cut, CELL, this.h + CELL - this.cut);
      else s.setCrop();
    }
  }

  /** Does it stop feet at (x, y)? Shut (or not yet far enough open), across its doorway as its wall does, and a bookcase's depth before it. */
  blocks(x: number, y: number): boolean {
    if (this.open >= PASSABLE) return false;
    const [along] = this.off(x, y);
    if (along >= DOOR_HW + 1) return false;
    const u = this.across ? y - this.y0 : x - this.x0;
    return u >= 3 && u < (this.spec.kind === 'shelf' && this.across ? 17 : 13);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

/** The secret doors hung on one build grid; `ox`, `oy` place the grid's corner in the world. */
export class SecretSet {
  private doors = new Map<string, Secret>();
  private byCell = new Map<number, Secret>();

  constructor(
    private scene: Phaser.Scene,
    private ox = 0,
    private oy = 0,
  ) {}

  /** Exactly these doors (the Home's, after a change): new and changed ones hung, gone ones taken away. */
  sync(list: SecretSpec[]): void {
    const want = new Map(list.map((s) => [s.key, s]));
    for (const k of [...this.doors.keys()]) {
      const d = this.doors.get(k)!;
      const w = want.get(k);
      if (!w || sigOf(w) !== d.sig) this.remove(k);
    }
    for (const s of list) if (!this.doors.has(s.key)) this.add(s);
  }

  /** One more (a chunk of the open grid stood up). */
  add(s: SecretSpec): void {
    this.remove(s.key);
    const d = new Secret(this.scene, this.ox, this.oy, s);
    this.doors.set(s.key, d);
    this.byCell.set(s.t.x * 65536 + s.t.y, d);
  }

  remove(key: string): void {
    const d = this.doors.get(key);
    if (!d) return;
    d.destroy();
    this.doors.delete(key);
    const c = d.spec.t.x * 65536 + d.spec.t.y;
    if (this.byCell.get(c) === d) this.byCell.delete(c);
  }

  /** `heroes` lean on them (this player's and their friends'); `ear` hears them; `cutAt` says how far each doorway's wall is cut down. */
  update(dt: number, heroes: readonly { x: number; y: number }[], ear: { x: number; y: number }, cutAt?: (cx: number, cy: number) => number): void {
    for (const d of this.doors.values()) {
      if (cutAt) d.cut = cutAt(d.spec.t.x, d.spec.t.y);
      d.update(dt, heroes, ear);
    }
  }

  /** Does a shut one stop feet at world point (x, y)? */
  blocks(x: number, y: number): boolean {
    if (!this.byCell.size) return false;
    const d = this.byCell.get(Math.floor((x - this.ox) / CELL) * 65536 + Math.floor((y - this.oy) / CELL));
    return !!d && d.blocks(x, y);
  }

  destroy(): void {
    for (const d of this.doors.values()) d.destroy();
    this.doors.clear();
    this.byCell.clear();
  }
}
