import Phaser from 'phaser';
import { sound } from '../audio';
import { DOOR_OX, DOOR_OY, glows, thingLook, wallFrameName } from '../art/homeArt';
import { DOOR_FH, DOOR_FW, doorFrame } from '../art/homeDoor';
import { GATE_MATS } from '../art/homeGate';
import { JAR_SPOTS } from '../art/homeProps';
import { TREE_H } from '../art/trees';
import { critterById } from '../game/critters';
import { sway, treeSwayReady } from '../game/treeSway';
import { SUN_SHADOW_ALPHA, sunShadow } from '../game/Wizard';
import type { WorldScene } from '../scenes/WorldScene';
import { BridgeView } from './BridgeView';
import type { ForestEdits } from './forestEdits';
import { ForestFloors } from './ForestFloors';
import { CELL, PLOT_X, PLOT_Y, doorAcross, type Thing } from './homeLayout';
import { WALLS, extent, partById, wallKind, wallMat, type PartDef } from './homeParts';
import { RoofView } from './RoofView';
import { Swing, hangGate } from './swing';

// What the player has built in a place on the open grid (the Everwood, an
// endless land, any fixed place; see forestEdits.ts and PlaceBuild.ts), as
// it stands in the world: drawn with the Home's own art a chunk at a time
// round the view and given back once the view is far away. Floors are
// painted over the ground in patches (ForestFloors), bridges and roofs are
// stood up whole (BridgeView, RoofView). Each frame: walls drop to stubs
// along a house's south side while the hero is in it, doors and gates swing,
// lamps flicker and the day washes them out, planted trees sway, and no sun
// shadows fall indoors.

type Img = Phaser.GameObjects.Image;
type Sprite = Phaser.GameObjects.Sprite;

/** A chunk of the grid, px (16 cells; the edits keep their things by these). */
const CHUNK = 256;
/** How far past the view (px) a chunk's builds are stood up, and past which they are taken down. */
const STAND = 96;
const FORGET = 2 * CHUNK;
/** Chunks stood up per frame ahead of the view (those already in it come at once). */
const CHUNKS_PER_FRAME = 2;
/** Walls along a house's south side, seen from inside, are cut down to this many px of face (as in a Home). */
const STUB = 6;
/** Planted trees' shadows beside a lone thing's (they overlap in a grove). */
const TREE_SHADOW = 0.62;
/** Tall things reach this far up out of their chunk. */
const TALL = 140;

interface Placed {
  obj: Img | Sprite;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Wall {
  cx: number;
  cy: number;
  img: Img;
  glow: Img | null;
  shadow: Img;
  h: number;
  /** Rows cut off its top (0: whole). */
  cut: number;
}

interface Door {
  t: Thing;
  sprite: Sprite;
  glow: Sprite;
  swing: Swing;
  cut: number;
  /** The edits' version its way was worked out for. */
  ver: number;
}

interface Tree {
  obj: Sprite;
  x: number;
  y: number;
  anim: string;
  swaying: boolean;
  alpha: number;
}

interface Chunk {
  placed: Placed[];
  lights: Phaser.GameObjects.Light[];
  lamps: { light: Phaser.GameObjects.Light; halo: Img; part: PartDef; seed: number; cx: number; cy: number }[];
  gates: Swing[];
  walls: Wall[];
  doors: Door[];
  hangings: { objs: (Img | Sprite)[]; light: Phaser.GameObjects.Light | null; cx: number; cy: number }[];
  /** Sun shadows: none under a roof or a tent's cloth. Trees' are laid lighter. */
  shadows: { img: Img; cx: number; cy: number }[];
  treeShadows: Img[];
  trees: Tree[];
  jars: { jar: Sprite; glow: Sprite }[];
}

export class BuiltView {
  private chunks = new Map<number, Chunk>();
  private dirty = new Set<number>();
  private floors: ForestFloors;
  private bridges: BridgeView;
  private roofs: RoofView;
  private shownVer = -1;
  private daylight = -1;
  /** Fishing rods built here, by their key (see PlaceBuild.rods), to take out of their pails. */
  private rodSprites = new Map<string, { sprite: Sprite; shadow: Img | null; frame: string; flip: boolean }>();
  /** The house or tent the hero stands in (-1 for none). */
  inside = -1;

  constructor(
    private world: WorldScene,
    adopt: (img: Img) => Img,
    private edits: () => ForestEdits,
    /** The critters this place's owner has caught, for the jar shelves. */
    private caught: () => string[],
    /** The place is out in the open air (walking out of a house brings the wind and birds back). */
    private open: boolean,
  ) {
    this.floors = new ForestFloors(world, adopt);
    this.bridges = new BridgeView(world);
    this.roofs = new RoofView(world);
  }

  /** Stand chunk (cx, cy) up again on the next frame: something was built or taken down in it. */
  touch(cx: number, cy: number): void {
    this.dirty.add(cx * 4096 + cy);
  }

  /** Stand every chunk up again: a whole new set of builds came in. */
  touchAll(): void {
    for (const key of this.chunks.keys()) this.dirty.add(key);
  }

  /** Take a fishing rod built here out of its pail, or stand it back in. */
  holdRod(key: string, out: boolean): void {
    const r = this.rodSprites.get(key);
    if (!r?.sprite.active) return;
    const frame = out ? (r.flip ? 'rodbucket_m' : 'rodbucket') : r.frame;
    r.sprite.setFrame(frame);
    r.shadow?.setFrame(frame);
  }

  /** How far the nearest fire built here burns from (x, y), for its crackle (not the candles). */
  fireDistance(x: number, y: number): number {
    let near = Infinity;
    for (const c of this.chunks.values()) for (const l of c.lamps) if (l.part.light?.flicker && l.part.id !== 'candelabra') near = Math.min(near, Math.hypot(l.light.x - x, l.light.y - y));
    return near;
  }

  // ---------------------------------------------------------------- standing

  private chunksIn(view: Phaser.Geom.Rectangle, pad: number): number[] {
    const out: number[] = [];
    const c0 = Math.floor((view.left - pad) / CHUNK);
    const c1 = Math.floor((view.right + pad) / CHUNK);
    const r0 = Math.floor((view.top - pad) / CHUNK);
    const r1 = Math.floor((view.bottom + pad + TALL) / CHUNK);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (c >= 0 && r >= 0) out.push(c * 4096 + r);
    return out;
  }

  /** The sun's shadow of `obj`, laid from its foot (see sunShadow). */
  private cast(ch: Chunk, obj: Img | Sprite, reach: number): Img {
    const sh = sunShadow(this.world.add.image(obj.x, obj.y, `${obj.texture.key}_s`, obj.frame.name).setOrigin(obj.originX, obj.originY).setFlipX(obj.flipX));
    ch.placed.push({ obj: sh, x0: obj.x - reach, x1: obj.x + reach, y0: obj.y - reach, y1: obj.y + reach });
    return sh;
  }

  /** What was built in chunk `key`: its things and walls, drawn as in the Home. */
  private stand(key: number): void {
    if (this.chunks.has(key)) return;
    const ccx = Math.floor(key / 4096);
    const ccy = key % 4096;
    const ch: Chunk = { placed: [], lights: [], lamps: [], gates: [], walls: [], doors: [], hangings: [], shadows: [], treeShadows: [], trees: [], jars: [] };
    this.chunks.set(key, ch);
    const e = this.edits();
    const add = this.world.add;
    for (const t of e.thingsInChunk(ccx, ccy)) {
      const part = partById(t.id);
      // Bridges and roofs are stood up whole (see `update`); critters live their own lives (HomeCritters).
      if (!part || part.bridge || part.critter) continue;
      if (part.door) {
        this.standDoor(ch, t);
        continue;
      }
      // The Home's own drawing, moved from its plot onto the open grid.
      const look = thingLook(t);
      const x = look.x - PLOT_X;
      const y = look.y - PLOT_Y;
      // A hanging sorts just in front of its wall.
      const depth = part.wall ? t.y * CELL + 11.2 : part.flat ? 1.5 : y;
      const sprite = add.sprite(x, y, look.key, look.frame).setOrigin(look.ox, look.oy).setFlipX(look.flipX).setPipeline('Lit').setDepth(depth);
      const tall = look.key === 'tree' || t.id === 'blossom';
      ch.placed.push({ obj: sprite, x0: x - 56, x1: x + 56, y0: y - (tall ? 130 : 70), y1: y + 8 });
      const footCx = t.x;
      const footCy = t.y + extent(part, t.turn).h - 1;
      // Planted trees sway with the wind (see `update`).
      if (look.sway) ch.trees.push({ obj: sprite, x, y, anim: look.sway, swaying: false, alpha: 1 });
      let glow: Sprite | null = null;
      if (look.glow) {
        glow = add.sprite(x, y, look.glow, look.frame).setOrigin(look.ox, look.oy).setFlipX(look.flipX).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.1);
        // Flames flicker in the glow alone (the animation's frames are the glow's); the body's lit frame stays put, as in the Home.
        if (look.anim) glow.play({ key: look.anim, startFrame: Math.floor(Math.random() * 4) });
        ch.placed.push({ obj: glow, x0: x - 40, x1: x + 40, y0: y - 70, y1: y + 8 });
      }
      let shadow: Img | null = null;
      if (!part.flat && !part.wall) {
        shadow = this.cast(ch, sprite, tall ? TREE_H : 60);
        if (tall) ch.treeShadows.push(shadow);
        else ch.shadows.push({ img: shadow, cx: footCx, cy: footCy });
      }
      if (part.fishing) this.rodSprites.set(`${t.id}@${t.x},${t.y}`, { sprite, shadow, frame: look.frame, flip: t.flip });
      const L = part.light;
      if (L) {
        // A sconce's flame stands out from the wall, over its cell.
        const lx = part.wall ? x + 2 : x;
        const ly = part.wall ? t.y * CELL - 9 : y - L.y;
        const light = this.world.lights.addLight(lx, ly, L.radius, L.color, L.intensity);
        ch.lights.push(light);
        const halo = add.image(lx, ly, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(L.color).setScale(Math.max(0.8, L.radius / 70)).setDepth(depth + 0.2).setAlpha(0.4);
        ch.placed.push({ obj: halo, x0: lx - 60, x1: lx + 60, y0: ly - 60, y1: ly + 60 });
        ch.lamps.push({ light, halo, part, seed: Math.random() * 100, cx: footCx, cy: part.wall ? t.y + 1 : footCy });
        if (part.wall) ch.hangings.push({ objs: [halo], light, cx: t.x, cy: t.y });
      }
      if (part.wall) ch.hangings.push({ objs: glow ? [sprite, glow] : [sprite], light: null, cx: t.x, cy: t.y });
      if (part.jars) this.fillShelf(ch, t, part, sprite);
    }
    for (const [cx, cy, v] of e.wallsInChunk(ccx, ccy)) {
      const mat = wallMat(v);
      const def = WALLS[mat];
      if (!def) continue;
      const mask = e.wallMask(cx, cy);
      const kind = wallKind(v);
      // A garden wall's gate is its own sprite, swinging over the bare gap; so is a door hung in a house's doorway.
      const gate = !def.house && kind === 'door' && GATE_MATS.includes(mat);
      const bare = def.house ? e.thingsAt(cx, cy).some((t) => partById(t.id)?.door) : gate;
      const frame = kind === 'door' ? `${bare ? 'o' : 'd'}${mask}` : kind === 'window' && def.house ? `n${mask}` : `w${mask}_${(cx * 7 + cy * 13) % 2}`;
      const fk = wallFrameName(mat, frame);
      const x = cx * CELL;
      const y = cy * CELL - def.height;
      const depth = cy * CELL + 11;
      const img = add.image(x, y, 'home', fk).setOrigin(0).setPipeline('Lit').setDepth(depth);
      ch.placed.push({ obj: img, x0: x, x1: x + CELL, y0: y, y1: (cy + 1) * CELL });
      let glow: Img | null = null;
      if (glows(fk)) {
        glow = add.image(x, y, 'home_e', fk).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.1);
        ch.placed.push({ obj: glow, x0: x, x1: x + CELL, y0: y, y1: (cy + 1) * CELL });
      }
      const shadow = sunShadow(add.image(x + CELL / 2, (cy + 1) * CELL, 'home_s', fk).setOrigin(0.5, 1));
      ch.placed.push({ obj: shadow, x0: x - 40, x1: x + CELL + 40, y0: y - 40, y1: (cy + 1) * CELL + 40 });
      ch.walls.push({ cx, cy, img, glow, shadow, h: def.height, cut: 0 });
      if (gate) {
        const g = hangGate(this.world, mat, x, cy * CELL, doorAcross(mask));
        ch.gates.push(g.swing);
        ch.placed.push({ obj: g.sprite, x0: x - CELL, x1: x + CELL * 2, y0: y - CELL, y1: (cy + 2) * CELL });
      }
    }
  }

  /** A door in its doorway: each frame of its swing a whole picture of the doorway (see art/homeDoor.ts), as in a Home. */
  private standDoor(ch: Chunk, t: Thing): void {
    const x = t.x * CELL - DOOR_OX;
    const y = t.y * CELL - DOOR_OY;
    const frame = doorFrame('n', t.flip ? 1 : 0, 0);
    const sprite = this.world.add.sprite(x, y, 'home', frame).setOrigin(0).setPipeline('Lit');
    // Its little window shows the lamplight inside, like the house's windows.
    const glow = this.world.add.sprite(x, y, 'home_e', frame).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    const swing = new Swing((t.x + 0.5) * CELL, (t.y + 0.5) * CELL, true, 'n', 'door', false, (way, step) => {
      const f = doorFrame(way, t.flip ? 1 : 0, step);
      sprite.setFrame(f);
      glow.setFrame(f);
    });
    ch.doors.push({ t, sprite, glow, swing, cut: 0, ver: -1 });
    for (const obj of [sprite, glow]) ch.placed.push({ obj, x0: x - CELL, x1: x + DOOR_FW + CELL, y0: y - CELL, y1: y + DOOR_FH + CELL });
  }

  /** A critter shelf shows the owner's caught critters in turn, three to a shelf, in the order the shelves went up (as in a Home). */
  private fillShelf(ch: Chunk, t: Thing, part: PartDef, body: Sprite): void {
    let n = 0;
    for (const o of this.edits().things) {
      if (o === t) break;
      n += partById(o.id)?.jars ?? 0;
    }
    const caught = this.caught();
    const x0 = t.x * CELL;
    const y = t.y * CELL + JAR_SPOTS.y;
    let lit: number | null = null;
    for (let k = 0; k < part.jars!; k++) {
      const id = caught[n + k];
      const x = x0 + JAR_SPOTS.xs[k];
      const jar = this.world.add.sprite(x, y, 'jars', id ? `${id}_0` : 'empty').setOrigin(0.5, 1).setPipeline('Lit').setDepth(body.depth + 0.2);
      const glow = this.world.add.sprite(x, y, 'jars_e', id ? `${id}_0` : 'empty').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(body.depth + 0.3).setVisible(!!id);
      if (id) {
        jar.play({ key: `jar_${id}`, startFrame: k });
        ch.jars.push({ jar, glow });
      }
      for (const obj of [jar, glow]) ch.placed.push({ obj, x0: x - 12, x1: x + 12, y0: y - 30, y1: y + 4 });
      const d = critterById(id ?? '');
      if (lit === null && d?.glow) lit = (d.glow[0] << 16) | (d.glow[1] << 8) | d.glow[2];
    }
    // The shelf glows in the colour of its brightest critter.
    if (lit !== null) ch.lights.push(this.world.lights.addLight(x0 + 24, y - 10, 70, lit, 0.9));
  }

  private unstand(key: number): void {
    const ch = this.chunks.get(key);
    if (!ch) return;
    this.chunks.delete(key);
    for (const p of ch.placed) p.obj.destroy();
    for (const l of ch.lights) this.world.lights.removeLight(l);
  }

  // ---------------------------------------------------------------- each frame

  /** `d` is the eased daylight (0 night .. 1 day); `others` the other wanderers here, whom doors and gates open for too. */
  update(time: number, dt: number, d: number, hero: { x: number; y: number; alive: boolean }, view: Phaser.Geom.Rectangle, others: readonly { x: number; y: number }[] = []): void {
    const e = this.edits();
    if (e.version !== this.shownVer) {
      this.shownVer = e.version;
      this.floors.sync(e);
      this.bridges.sync(e.bridges);
      // Roofs over the houses, chimneys over their hearths, and the tents' cloth.
      const chimneys = [];
      for (const t of e.things) {
        const p = partById(t.id);
        if (p?.chimney) chimneys.push({ house: e.houseAt(t.x, t.y), x: (t.x + p.w / 2) * CELL, y: t.y * CELL + 5 });
      }
      this.roofs.sync(e.houses, (cx, cy) => e.roofAt(cx, cy), (cx, cy) => e.tentAt(cx, cy), chimneys);
    }
    if (Math.abs(d - this.daylight) > 0.004) {
      this.daylight = d;
      this.floors.setLight(d);
    }
    this.floors.update(e, view);

    // Chunks: those in view at once, the ones just beyond a few a frame; far ones taken down; changed ones stood up again.
    for (const key of this.dirty) {
      if (!this.chunks.has(key)) continue;
      this.unstand(key);
      this.stand(key);
    }
    this.dirty.clear();
    for (const key of this.chunksIn(view, 0)) this.stand(key);
    let made = 0;
    for (const key of this.chunksIn(view, STAND)) {
      if (this.chunks.has(key)) continue;
      if (made++ >= CHUNKS_PER_FRAME) break;
      this.stand(key);
    }
    for (const key of this.chunks.keys()) {
      const cx = Math.floor(key / 4096) * CHUNK;
      const cy = (key % 4096) * CHUNK;
      if (cx + CHUNK < view.left - FORGET || cx > view.right + FORGET || cy + CHUNK < view.top - FORGET || cy > view.bottom + FORGET + TALL) this.unstand(key);
    }

    // The house or tent the hero stands in: its roof or cloth fades, its south walls drop to stubs, and it's quiet indoors.
    const inside = e.houseAt(Math.floor(hero.x / CELL), Math.floor(hero.y / CELL));
    if (inside !== this.inside) {
      this.inside = inside;
      if (this.open) sound.setOutdoors(inside < 0);
    }
    this.roofs.update(dt, hero.x, hero.y, inside, d);

    const vx0 = view.x - 16;
    const vx1 = view.right + 16;
    const vy0 = view.y - 16;
    const vy1 = view.bottom + 16;
    const shadowAlpha = SUN_SHADOW_ALPHA * d;
    const windows = 0.15 + (1 - d) * 0.85;
    const walkers = hero.alive ? [hero, ...others] : others;
    const swayReady = treeSwayReady(this.world);
    const k = Math.min(1, dt / 120);
    for (const ch of this.chunks.values()) {
      for (const p of ch.placed) p.obj.setVisible(p.x1 > vx0 && p.x0 < vx1 && p.y1 > vy0 && p.y0 < vy1);
      for (const g of ch.gates) g.update(dt, walkers, hero);
      for (const s of ch.treeShadows) s.setAlpha(shadowAlpha * TREE_SHADOW);
      this.updateChunk(ch, e, dt, walkers, hero, shadowAlpha, windows);
      // Lamps: fire flickers, the day washes them out; under a roof or a tent's cloth they show little until the hero is inside.
      for (const l of ch.lamps) {
        const L = l.part.light!;
        const house = e.houseAt(l.cx, l.cy);
        const lk = (1 + (L.day - 1) * d) * (house >= 0 ? 0.3 + 0.7 * this.roofs.reveal(house) : 1);
        const n = L.flicker ? Math.sin(time * 0.011 + l.seed) * 0.5 + Math.sin(time * 0.027 + l.seed * 3) * 0.3 + Math.sin(time * 0.061 + l.seed * 7) * 0.2 : Math.sin(time * 0.002 + l.seed) * 0.6;
        l.light.intensity = L.intensity * (0.87 + n * 0.13) * lk;
        l.halo.setAlpha((0.32 + n * 0.06) * lk);
      }
      for (const t of ch.trees) {
        if (!t.obj.visible) continue;
        if (!t.swaying && swayReady) {
          t.swaying = true;
          sway(t.obj, t.anim);
        }
        // A wanderer behind a tree sees through its crown.
        const behind = hero.y < t.y - 2 && hero.y > t.y - 100 && Math.abs(hero.x - t.x) < 38;
        const goal = behind ? 0.45 : 1;
        if (t.alpha !== goal) {
          t.alpha += (goal - t.alpha) * k;
          if (Math.abs(goal - t.alpha) < 0.01) t.alpha = goal;
          t.obj.setAlpha(t.alpha);
        }
      }
    }
  }

  /** A chunk's builds each frame: walls cut to stubs in a house the hero is in, doors swinging, hangings with their walls, no sun shadows indoors, windows lit by night. */
  private updateChunk(ch: Chunk, e: ForestEdits, dt: number, walkers: readonly { x: number; y: number }[], hero: { x: number; y: number }, shadowAlpha: number, windows: number): void {
    for (const s of ch.shadows) s.img.setAlpha(e.houseAt(s.cx, s.cy) >= 0 ? 0 : shadowAlpha);
    for (const w of ch.walls) {
      const house = e.houseAt(w.cx, w.cy);
      w.shadow.setAlpha(house >= 0 ? 0 : shadowAlpha);
      w.glow?.setAlpha(windows);
      // On the house's south side and not a corner the side wall runs into: a stub while the hero is in.
      const south = house >= 0 && e.houseAt(w.cx, w.cy + 1) !== house && !(e.wallMask(w.cx, w.cy) & 1);
      const top = south && this.roofs.reveal(house) > 0.5 ? w.h + 11 - STUB : 0;
      if (w.cut === top) continue;
      w.cut = top;
      for (const o of [w.img, w.glow]) {
        if (top) o?.setCrop(0, top, CELL, CELL + w.h - top);
        else o?.setCrop();
      }
    }
    const cutAt = (cx: number, cy: number) => ch.walls.find((w) => w.cx === cx && w.cy === cy)?.cut ?? 0;
    for (const dr of ch.doors) {
      const { x: cx, y: cy } = dr.t;
      if (dr.ver !== e.version) {
        // Opening into the house, drawn just in front of its wall (or, in a north-south wall, at its leaf) so wanderers pass it the right side.
        dr.ver = e.version;
        const home = (x: number, y: number) => e.houseAt(x, y) >= 0;
        const across = doorAcross(e.wallMask(cx, cy));
        dr.swing.across = across;
        dr.swing.setWay(across ? (home(cx, cy + 1) && !home(cx, cy - 1) ? 's' : 'n') : home(cx - 1, cy) && !home(cx + 1, cy) ? 'w' : 'e');
        const base = cy * CELL;
        dr.sprite.setDepth(across ? base + 11.05 : base + (dr.t.flip ? 13.5 : 2.5));
        dr.glow.setDepth(dr.sprite.depth + 0.01);
      }
      dr.swing.update(dt, walkers, hero);
      dr.glow.setAlpha(windows);
      const cut = cutAt(cx, cy);
      if (cut !== dr.cut) {
        dr.cut = cut;
        for (const o of [dr.sprite, dr.glow]) {
          if (cut) o.setCrop(0, cut, DOOR_FW, DOOR_FH - cut);
          else o.setCrop();
        }
      }
    }
    for (const h of ch.hangings) {
      if (!cutAt(h.cx, h.cy)) continue;
      for (const o of h.objs) o.setVisible(false);
      if (h.light) h.light.visible = false;
    }
    for (const h of ch.hangings) if (h.light && !cutAt(h.cx, h.cy)) h.light.visible = true;
    for (const j of ch.jars) if (j.glow.visible) j.glow.setFrame(j.jar.frame.name);
  }

  destroy(): void {
    for (const key of [...this.chunks.keys()]) this.unstand(key);
    this.floors.destroy();
    this.bridges.destroy();
    this.roofs.destroy();
    this.rodSprites.clear();
  }
}
