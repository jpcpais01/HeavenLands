import Phaser from 'phaser';
import { thingLook, warmHome } from '../art/homeArt';
import { CRITTER_H, CRITTER_OX, CRITTER_OY, CRITTER_W } from '../art/critters';
import { sound } from '../audio';
import { TABS, build, stopBuilding } from '../game/build';
import { collection } from '../game/collection';
import { CRITTERS, critterById } from '../game/critters';
import { Pieces, sendPieces } from '../net/pieces';
import { session, type Msg } from '../net/session';
import type { WorldScene } from '../scenes/WorldScene';
import type { Clearable, Forest } from './Forest';
import { CHUNK } from './forestGen';
import { Deck } from './bridge';
import { footOn, type BuildLand } from './buildLand';
import { applyPatch, diff, readPatch, snapOf, thingKey, type BuildPatch, type BuildSnap, type PatchTarget } from './buildPatch';
import { BuiltView } from './BuiltView';
import { Farm } from './Farm';
import type { RodHost } from './Fishing';
import type { RodSpot } from './Home';
import { HomeCritters } from './HomeCritters';
import { ForestEdits, MAX_CLEARED, MAX_FLOORS, MAX_ROOFS, MAX_TENTS, MAX_THINGS, MAX_WALLS, cellKey, wardReach } from './forestEdits';
import { CELL, PLOT_X, PLOT_Y, type Thing } from './homeLayout';
import { FISH_REACH, FLOORS, MAX_CRITTERS, extent, partById, type PartDef } from './homeParts';
import { WorldLink, type LinkHost } from './worldLink';

// Building anywhere: in the Everwood, on every endless land and in every
// fixed place, with the Home's build tray (ui/buildHud.ts) and everything a
// Home is built of, set down on a 16 px grid over the place: floors, walls of
// every kind with their doors and windows, roofs joined into houses that are
// walked into, tents, wall hangings, every garden thing, furniture and light,
// bridges laid across the water (see bridge.ts), critters let out to live
// round their spot, seeds sown on garden beds, rods for fishing in the
// place's own water; and the eraser, which takes back what was built (and in
// the Everwood clears its own trees, rocks and bushes). What the place
// itself is, where things may stand, comes from its BuildGround.
//
// The builds (see forestEdits.ts) are the world's (see worldLink.ts): kept in
// its owner's save and, once shared, in the cloud. Online the room's host
// keeps them and sends them to whoever comes; anyone allowed to build sends
// each stroke's change to everyone (see buildPatch.ts).

/** How many strokes can be undone. */
const UNDO_MAX = 30;
/** How far round the hero the cursor must keep, px, so nothing goes down on them. */
const HERO_R = 6;
/** A change bigger than this goes in pieces. */
const PATCH_MAX = 11000;
/** A cleared thing's tint while the eraser is over it. */
const DOOMED = 0xff8a7a;
/** The ring a ward lantern shows while being placed: how far it keeps the creatures off. */
const WARD_RING = 0xa8e8ff;
/** Where builds in places other than the Home and the Everwood are kept: one key for them all, `{ arena: [builds, ms] }`. */
const BUILDS_KEY = 'pixel-battle.builds';

type Img = Phaser.GameObjects.Image;

/** The place under the builds: what each spot of it is, as far as building goes. */
export interface BuildGround {
  /** At (x, y): -1 nothing can go (a cliff's edge, the open sky, a thicket), 0 dry ground, 1 wet (shallows, a stream's edge), 2 deep water (bridged over and fished in). */
  cell(x: number, y: number): number;
  /** The level of the land there (things stand all on one). */
  level(x: number, y: number): number;
  /** Can feet stand there, trees, rocks and the like considered? */
  walkable(x: number, y: number): boolean;
  /** The ground's feet already count what's built (the Everwood's do). */
  readonly ownFeet?: boolean;
  /** The place's own tree or undergrowth a tap at (x, y) lands on, for the eraser (the Everwood's). */
  clearable?(x: number, y: number): Clearable | null;
  /** One of them was cleared or put back, by its foot key. */
  cleared?(foot: number): void;
}

/** This player's own builds in `arena`, and when they last changed (ms). */
function loadLocal(arena: string): { data: string; t: number } {
  if (arena === 'forest') return { data: collection.wood, t: collection.woodT };
  try {
    const all = JSON.parse(localStorage.getItem(BUILDS_KEY) ?? '{}') as Record<string, [string, number]>;
    const v = all[arena];
    return Array.isArray(v) ? { data: String(v[0] ?? ''), t: Number(v[1]) || 0 } : { data: '', t: 0 };
  } catch {
    return { data: '', t: 0 };
  }
}

function saveLocal(arena: string, data: string): void {
  if (arena === 'forest') return collection.saveWood(data);
  try {
    const all = JSON.parse(localStorage.getItem(BUILDS_KEY) ?? '{}') as Record<string, [string, number]>;
    if (all[arena]?.[0] === data) return;
    all[arena] = [data, Date.now()];
    localStorage.setItem(BUILDS_KEY, JSON.stringify(all));
  } catch {
    // Storage full: kept for this visit only.
  }
}

/** The Everwood as ground to build on: its streams and ponds, cliffs, terraces, trees and undergrowth. */
export function forestGround(forest: Forest): BuildGround {
  const gen = forest.gen;
  return {
    cell: (x, y) => {
      if (gen.edgeAt(x, y, 4)) return -1;
      const s = gen.sample(x, y);
      const w = Math.max(s.stream, s.pond);
      return w > 1.5 ? 2 : w > -1 ? 1 : 0;
    },
    level: (x, y) => gen.levelAt(x, y),
    walkable: (x, y) => gen.walkable(x, y),
    ownFeet: true,
    clearable: (x, y) => forest.clearableAt(x, y),
    cleared: (k) => forest.clearedAt(Math.floor(k / 1048576), k % 1048576, true),
  };
}

export class PlaceBuild implements RodHost, LinkHost {
  readonly edits: ForestEdits;
  /** The place as the critters, the farm and fishing see it (see buildLand.ts). */
  readonly land: BuildLand;
  /** What's built, as it stands in the world. */
  readonly view: BuiltView;
  /** Whose world this is, who may build, and the cloud's copy (see worldLink.ts). */
  readonly link: WorldLink;
  /** The critters let out here, the crops on the garden beds, and the critters the owner has caught (for the jar shelves). */
  private critters: HomeCritters;
  private farm: Farm;
  caught: string[] = [];
  private shownVer = -1;
  private rodSpots: RodSpot[] | null = null;
  private cursor: Phaser.GameObjects.Graphics;
  private ghost: Img;
  /** The place's own thing the eraser is over, tinted to show it'll go. */
  private marked: Img | Phaser.GameObjects.Sprite | null = null;
  /** Each stroke's change backwards, to undo it. */
  private undoStack: BuildPatch[] = [];
  private before: BuildSnap | null = null;
  private lastCell: { x: number; y: number } | null = null;
  private hero = { x: 0, y: 0 };
  private pieces = new Pieces();
  private netOff: () => void;
  /** A guest has been sent the builds. */
  private arrived = false;

  constructor(
    private world: WorldScene,
    readonly arena: string,
    private ground: BuildGround,
    adopt: (img: Img) => Img,
    /** The place is out in the open air (see BuiltView). */
    open: boolean,
    private forest: Forest | null = null,
  ) {
    // The Home's art: its parts, walls and the tray's pictures.
    warmHome(world);
    this.link = new WorldLink(world, arena, this);
    const keeper = this.link.keeper;
    const initial = this.link.initial;
    this.edits = keeper ? ForestEdits.decode(initial ? initial.data : loadLocal(arena).data) : new ForestEdits();
    if (forest) {
      const gen = forest.gen;
      gen.cleared = this.edits.cleared;
      gen.built = (x, y) => this.edits.blocks(x, y);
      gen.bridged = (x, y) => this.edits.bridges.at(x, y) === Deck.Walk;
      forest.edits = this.edits;
    }
    if (this.link.mine) this.caught = CRITTERS.filter((c) => collection.critterCount(c.id) > 0).map((c) => c.id);
    else if (initial) this.caught = initial.caught.split(',').filter((id) => critterById(id));
    this.arrived = keeper;
    this.view = new BuiltView(world, adopt, () => this.edits, () => this.caught, open);

    const e = this.edits;
    const g = ground;
    this.land = {
      ox: 0,
      oy: 0,
      get things() {
        return e.things;
      },
      floorAt: (cx, cy) => e.floorAt(cx, cy),
      wallAt: (cx, cy) => e.wallAt(cx, cy),
      // A pond laid, or the place's own deep water.
      isWater: (cx, cy) => e.isPond(cx, cy) || g.cell((cx + 0.5) * CELL, (cy + 0.5) * CELL) === 2,
      thingsAt: (cx, cy) => e.thingsAt(cx, cy),
      houseAt: (cx, cy) => e.houseAt(cx, cy),
      walkable: (x, y) => this.feet(x, y),
      waterCells: () => [...e.floors.keys()].filter((k) => FLOORS[e.floors.get(k)! - 1]?.water).map((k) => ({ x: Math.floor(k / 65536), y: k % 65536 })),
    };
    this.critters = new HomeCritters(world);
    // The farm's plots are kept by place: the Everwood's as 'w', any other place by its own id.
    this.farm = new Farm(world, this.link.mine, () => this.farmChanged(), this.land, arena === 'forest' ? 'w' : arena);
    if (initial) this.farm.adopt(initial.farm);

    // Everything a Home has, the same here.
    build.available = false;
    build.tabs = TABS.map((t) => t.id);
    build.allow = null;
    build.tab = 'garden';
    build.canUndo = false;
    stopBuilding();

    this.cursor = world.add.graphics().setDepth(9000).setVisible(false);
    this.ghost = world.add.image(0, 0, 'home', 'chimney').setAlpha(0.6).setDepth(9001).setVisible(false);

    this.netOff = session.on((m) => this.receive(m));
    if (!keeper) session.send({ t: 'wq' });
  }

  /** Can feet stand at (x, y), what's built considered? (In the Everwood its ground already counts them.) */
  feet(x: number, y: number): boolean {
    if (this.ground.ownFeet) return this.ground.walkable(x, y);
    const e = this.edits;
    if (e.bridges.at(x, y) === Deck.Walk) return !e.blocks(x, y);
    return this.ground.walkable(x, y) && !e.blocks(x, y);
  }

  update(time: number, dt: number, heroX: number, heroY: number, daylight: number, others: readonly { x: number; y: number }[] = []): void {
    this.hero.x = heroX;
    this.hero.y = heroY;
    this.link.update(dt);
    build.available = this.link.canBuild && this.arrived;
    this.farm.tend = this.link.canBuild;
    this.step();
    // After a change: the critters find their spots again, the farm its beds and stoves, the rods their water.
    if (this.edits.version !== this.shownVer) {
      this.shownVer = this.edits.version;
      this.rodSpots = null;
      this.critters.sync(this.land, build.on);
      this.farm.sync();
    }
    this.view.update(time, dt, daylight, { x: heroX, y: heroY, alive: true }, this.world.cameras.main.worldView, others);
    this.critters.update(dt, heroX, heroY, daylight, this.world.cameras.main.worldView);
    this.farm.update(dt, heroX, heroY, daylight);
  }

  /** E or the touch button: pick the ripe crops in reach, or open the kitchen at a stove or pot. True when it did. */
  act(): boolean {
    return this.farm.act();
  }

  /** The fishing rods built here, each with the water within FISH_REACH cells of it: ponds laid and the place's own (see world/Fishing.ts). */
  rods(): RodSpot[] {
    if (this.rodSpots) return this.rodSpots;
    const l = this.land;
    this.rodSpots = [];
    for (const t of this.edits.things) {
      if (!partById(t.id)?.fishing) continue;
      const water: RodSpot['water'] = [];
      for (let y = t.y - FISH_REACH; y <= t.y + FISH_REACH; y++) {
        for (let x = t.x - FISH_REACH; x <= t.x + FISH_REACH; x++) {
          if (!l.isWater(x, y)) continue;
          const open = l.isWater(x - 1, y) && l.isWater(x + 1, y) && l.isWater(x, y - 1) && l.isWater(x, y + 1);
          water.push({ x: (x + 0.5) * CELL, y: (y + 0.5) * CELL, open });
        }
      }
      const foot = footOn(l, t);
      this.rodSpots.push({ key: `${t.id}@${t.x},${t.y}`, x: foot.x, y: foot.y, flip: t.flip, water });
    }
    return this.rodSpots;
  }

  holdRod(key: string, out: boolean): void {
    this.view.holdRod(key, out);
  }

  // ---------------------------------------------------------------- The world (see worldLink.ts)

  state(): { data: string; farm: string; caught: string } {
    return { data: this.edits.encode(), farm: this.farm.encoded(), caught: this.caught.join(',') };
  }

  localT(): number {
    return loadLocal(this.arena).t;
  }

  /** Friends built here while this player was away: the cloud's copy, taken whole. */
  adopt(data: string, farm: string): void {
    this.apply(ForestEdits.decode(data));
    this.farm.adopt(farm, true);
    if (this.link.mine) saveLocal(this.arena, this.edits.encode());
  }

  // ---------------------------------------------------------------- Building

  private step(): void {
    const on = build.on && build.available;
    if (!on) {
      this.cursor.setVisible(false);
      this.ghost.setVisible(false);
      this.mark(null);
      build.pressed = build.released = false;
      this.lastCell = null;
      return;
    }
    if (build.undo) {
      build.undo = false;
      this.undo();
    }
    const p = build.pointer;
    const w = this.world.cameras.main.getWorldPoint(p.x, p.y);
    const cx = Math.floor(w.x / CELL);
    const cy = Math.floor(w.y / CELL);
    const pick = build.pick;
    const erase = p.erase || !pick;
    const picked = !erase && pick?.layer === 'thing' ? (partById(pick.id) ?? null) : null;
    // A bridge is laid in strokes, cell by cell, like a wall: only the other things go down one at a time.
    const thing = picked?.bridge ? null : picked;
    const turn = thing?.turns ? build.turn : 0;
    const size = thing ? extent(thing, turn) : { w: 1, h: 1 };
    // A thing's footprint hangs from the cell under the pointer by its middle, so the pointer is at its foot.
    const fx = cx - Math.floor((size.w - 1) / 2);
    const fy = cy - (size.h - 1);

    if (build.pressed) {
      build.pressed = false;
      this.before = this.snap();
      this.lastCell = null;
    }
    if (p.down && !thing) this.stroke(cx, cy, erase);
    if (build.released) {
      build.released = false;
      if (thing) this.placeThing(thing, fx, fy, turn);
      else this.stroke(cx, cy, erase);
      this.lastCell = null;
      this.endStroke();
    }

    // The cursor: the footprint, green where it can go and red where it can't, and a ghost of the thing; or what the eraser would take.
    const show = p.over || p.down;
    this.cursor.setVisible(show);
    this.ghost.setVisible(show && !!thing);
    if (!show) {
      this.mark(null);
      return;
    }
    const g = this.cursor.clear();
    if (erase) {
      const target = this.eraseTarget(cx, cy, w.x, w.y);
      const clear = typeof target === 'object' && target && 'of' in target ? target : null;
      this.mark(clear ? clear.obj : null);
      if (clear) return;
      const col = target ? 0xff9a6a : 0xff6a6a;
      let bx = cx;
      let by = cy;
      let bw = 1;
      let bh = 1;
      if (typeof target === 'object' && target && 'id' in target) {
        const e = extent(partById(target.id)!, target.turn);
        [bx, by, bw, bh] = [target.x, target.y, e.w, e.h];
      }
      g.fillStyle(col, target ? 0.18 : 0.08);
      g.fillRect(bx * CELL, by * CELL, bw * CELL, bh * CELL);
      g.lineStyle(1, col, target ? 0.85 : 0.4);
      g.strokeRect(bx * CELL + 0.5, by * CELL + 0.5, bw * CELL - 1, bh * CELL - 1);
      return;
    }
    this.mark(null);
    const ok = thing ? this.canPlace(thing, fx, fy, turn) : this.canPaint(cx, cy);
    const col = ok ? 0x9cff8a : 0xff6a6a;
    g.fillStyle(col, 0.16);
    g.fillRect(fx * CELL, fy * CELL, size.w * CELL, size.h * CELL);
    g.lineStyle(1, col, 0.85);
    g.strokeRect(fx * CELL + 0.5, fy * CELL + 0.5, size.w * CELL - 1, size.h * CELL - 1);
    const part = thing ? partById(thing.id) : null;
    if (part?.ward) {
      // A ward shows how far it keeps the creatures off: a soft moonlit ring.
      const r = wardReach(part, size.w, size.h);
      const mx = (fx + size.w / 2) * CELL;
      const my = (fy + size.h / 2) * CELL;
      g.fillStyle(WARD_RING, 0.07);
      g.fillCircle(mx, my, r);
      g.lineStyle(1, WARD_RING, 0.55);
      g.strokeCircle(mx, my, r);
      g.lineStyle(1, WARD_RING, 0.18);
      g.strokeCircle(mx, my, r - 3);
    }
    if (thing?.critter) {
      this.ghost.setTexture('critters', `${thing.critter}_0`).setOrigin(CRITTER_OX / CRITTER_W, CRITTER_OY / CRITTER_H).setFlipX(false);
      this.ghost.setPosition((fx + 0.5) * CELL, (fy + 1) * CELL - 5).setTint(ok ? 0xffffff : 0xff8080);
    } else if (thing) {
      const look = thingLook({ id: thing.id, x: fx, y: fy, flip: build.flip && !!thing.flip, turn });
      this.ghost
        .setTexture(look.key, look.frame)
        .setOrigin(look.ox, look.oy)
        .setFlipX(look.flipX)
        .setPosition(look.x - PLOT_X, look.y - PLOT_Y)
        .setTint(ok ? 0xffffff : 0xff8080);
    }
  }

  /** Tint the place's own thing the eraser is over (and let the last one go). */
  private mark(obj: Img | Phaser.GameObjects.Sprite | null): void {
    if (obj === this.marked) return;
    if (this.marked?.active) this.marked.clearTint();
    this.marked = obj;
    obj?.setTint(DOOMED);
  }

  /** Draw (or erase) along every cell from the last one the pointer was on to this one. */
  private stroke(cx: number, cy: number, erase: boolean): void {
    const from = this.lastCell ?? { x: cx, y: cy };
    if (this.lastCell && from.x === cx && from.y === cy) return;
    this.lastCell = { x: cx, y: cy };
    const n = Math.max(Math.abs(cx - from.x), Math.abs(cy - from.y));
    let changed = false;
    for (let s = 0; s <= n; s++) {
      const x = Math.round(from.x + ((cx - from.x) * s) / Math.max(1, n));
      const y = Math.round(from.y + ((cy - from.y) * s) / Math.max(1, n));
      // Along a stroke the eraser reaches each cell's middle; where the pointer is, exactly there.
      const px = s === n ? this.world.cameras.main.getWorldPoint(build.pointer.x, build.pointer.y) : { x: (x + 0.5) * CELL, y: (y + 0.5) * CELL };
      if (erase ? this.eraseAt(x, y, px.x, px.y) : this.paintAt(x, y)) changed = true;
    }
    if (changed) this.edits.index();
  }

  /** Is the open ground at the middle of cell (cx, cy)? Not in water (the place's, or a pond laid) unless `water` allows it. */
  private open(cx: number, cy: number, water?: PartDef['water']): boolean {
    const c = this.ground.cell((cx + 0.5) * CELL, (cy + 0.5) * CELL);
    // Not on a cliff, its lip or its foot, nor out over the sky: things there would hang in the air or stand in the rock.
    if (c < 0) return false;
    const pond = this.edits.isPond(cx, cy);
    const wet = pond || c > 0;
    return water === 'only' ? pond || c === 2 : water === 'too' || !wet;
  }

  private canPlace(p: PartDef, fx: number, fy: number, turn: number): boolean {
    if (this.edits.things.length >= MAX_THINGS) return false;
    // A door hangs in a house's doorway, a hanging on a house wall's face.
    if (p.door || p.wall) return this.edits.fitsWall(p, fx, fy);
    if (p.critter && this.edits.critterCount() >= MAX_CRITTERS) return false;
    if (this.onHero(p, fx, fy, turn)) return false;
    const { w, h } = extent(p, turn);
    if (this.edits.occupied(p, fx, fy, w, h)) return false;
    // Not over a crop growing (a critter can wander among them).
    if (!p.critter && this.farm.covers(fx, fy, w, h)) return false;
    const g = this.ground;
    // All on one level.
    const level = g.level((fx + 0.5) * CELL, (fy + 0.5) * CELL);
    for (let y = fy; y < fy + h; y++) {
      for (let x = fx; x < fx + w; x++) {
        if (!this.open(x, y, p.water) || g.level((x + 0.5) * CELL, (y + 0.5) * CELL) !== level) return false;
        // Standing things keep off the place's trunks, rocks and the like (cleared first, in the Everwood); a bridge goes over water or open ground.
        const wx = (x + 0.5) * CELL;
        const wy = (y + 0.5) * CELL;
        if (!p.flat && (p.water !== 'too' || (p.bridge && this.open(x, y))) && !g.walkable(wx, wy)) return false;
      }
    }
    return true;
  }

  private placeThing(p: PartDef, fx: number, fy: number, turn: number): void {
    if (!this.canPlace(p, fx, fy, turn)) return;
    this.edits.things.push({ id: p.id, x: fx, y: fy, flip: build.flip && !!p.flip, turn });
    this.edits.index();
    this.touchCells(fx, fy, 1);
    // A critter is let out with its own sparkle and chirp (HomeCritters).
    if (!p.critter) sound.thud(0);
  }

  /** Can the stroke's pick go on cell (cx, cy): a wall, a floor or a bridge's cell? */
  private canPaint(cx: number, cy: number): boolean {
    const pick = build.pick;
    if (!pick) return false;
    if (pick.layer === 'floor') return this.canFloor(cx, cy);
    if (pick.layer === 'seed') return this.farm.canSow(cx, cy, pick.id);
    // A roof goes over anything; it's walked under.
    if (pick.layer === 'roof') return this.edits.roofAt(cx, cy) > 0 || this.edits.roofs.size < MAX_ROOFS;
    // A tent is its own walls: on open ground, not over walls or water, nor on the hero (its hem would hold them).
    if (pick.layer === 'tent') {
      const e = this.edits;
      if (!e.tentAt(cx, cy) && (e.tents.size >= MAX_TENTS || this.heroIn(cx, cy))) return false;
      return !e.wallAt(cx, cy) && !e.isPond(cx, cy) && this.open(cx, cy);
    }
    if (pick.layer === 'thing') {
      const p = partById(pick.id);
      return !!p?.bridge && this.canPlace(p, cx, cy, 0);
    }
    return this.canWall(cx, cy);
  }

  private canWall(cx: number, cy: number): boolean {
    const pick = build.pick;
    if (!pick || pick.layer !== 'wall' || this.edits.walls.size >= MAX_WALLS) return false;
    // Hangings, doors and critters don't hold a wall up; anything else in the cell does.
    if (this.edits.thingsAt(cx, cy).some((t) => !partById(t.id)?.wall && !partById(t.id)?.door && !partById(t.id)?.critter)) return false;
    if (this.heroIn(cx, cy) || this.edits.isPond(cx, cy) || this.edits.tentAt(cx, cy)) return false;
    return this.open(cx, cy) && (this.edits.wallAt(cx, cy) !== 0 || this.ground.walkable((cx + 0.5) * CELL, (cy + 0.5) * CELL));
  }

  /** A floor goes on open dry ground; a pond only where nothing stands that would end up in it, and not round the hero. */
  private canFloor(cx: number, cy: number): boolean {
    const v = build.pick!.value;
    const e = this.edits;
    if (!e.floorAt(cx, cy) && e.floors.size >= MAX_FLOORS) return false;
    if (this.ground.cell((cx + 0.5) * CELL, (cy + 0.5) * CELL) !== 0) return false;
    if (!FLOORS[v - 1]?.water) return true;
    return !e.wallAt(cx, cy) && !this.heroIn(cx, cy) && !e.thingsAt(cx, cy).some((t) => !partById(t.id)?.water);
  }

  /** Lay the stroke's pick on cell (cx, cy). */
  private paintAt(cx: number, cy: number): boolean {
    const pick = build.pick!;
    const e = this.edits;
    if (!this.canPaint(cx, cy)) return false;
    if (pick.layer === 'floor') {
      if (e.floorAt(cx, cy) === pick.value) return false;
      e.floors.set(cellKey(cx, cy), pick.value);
      // Off the water, lily pads go with it.
      if (!FLOORS[pick.value - 1]?.water) e.things = e.things.filter((t) => !(partById(t.id)?.water === 'only' && t.x === cx && t.y === cy));
      return true;
    }
    // Sowing changes the farm, not what's built: nothing to redraw or undo.
    if (pick.layer === 'seed') {
      this.farm.sow(cx, cy, pick.id);
      return false;
    }
    if (pick.layer === 'roof' || pick.layer === 'tent') {
      const [mine, other] = pick.layer === 'roof' ? [e.roofs, e.tents] : [e.tents, e.roofs];
      if (mine.get(cellKey(cx, cy)) === pick.value) return false;
      mine.set(cellKey(cx, cy), pick.value);
      other.delete(cellKey(cx, cy));
      return true;
    }
    if (pick.layer === 'thing') {
      e.things.push({ id: pick.id, x: cx, y: cy, flip: false, turn: 0 });
      sound.thud(0);
      return true;
    }
    if (e.wallAt(cx, cy) === pick.value) return false;
    e.walls.set(cellKey(cx, cy), pick.value);
    this.checkDecor();
    // A wall joins up with its neighbours, which may stand in the next chunk.
    this.touchCells(cx, cy, 1);
    return true;
  }

  /** What the eraser takes at cell (cx, cy), pointer at (x, y): something built there, else the place's own tree or undergrowth under the pointer. */
  private eraseTarget(cx: number, cy: number, x: number, y: number): 'floor' | 'roof' | 'tent' | 'crop' | 'wall' | Thing | Clearable | null {
    const e = this.edits;
    const tab = build.tab;
    // The layers' tabs take only their own: floors, roofs, tents, crops.
    if (tab === 'floor') return e.floorAt(cx, cy) ? 'floor' : null;
    if (tab === 'roof') return e.roofAt(cx, cy) ? 'roof' : null;
    if (tab === 'tent') return e.tentAt(cx, cy) ? 'tent' : null;
    if (tab === 'seeds') return this.farm.plotAt(cx, cy) ? 'crop' : null;
    // A door comes out of its doorway before the doorway goes.
    if (tab === 'wall') return e.thingsAt(cx, cy).find((t) => partById(t.id)?.door) ?? (e.wallAt(cx, cy) ? 'wall' : null);
    // Critters roam off their spots, so the eraser takes the one it touches, wherever it has got to.
    if (tab === 'critters') return this.critters.at(x, y, CELL * 0.75) ?? e.thingsAt(cx, cy).find((t) => partById(t.id)?.critter) ?? null;
    // Not a bridge from under the hero's feet, out over the water.
    const here = e.thingsAt(cx, cy).filter((t) => !partById(t.id)?.critter && !(partById(t.id)?.bridge && this.heroIn(cx, cy)));
    if (tab === 'decor') return here.find((t) => partById(t.id)?.wall) ?? null;
    const built = here.find((t) => partById(t.id)?.tab === tab) ?? here.find((t) => !partById(t.id)?.wall && !partById(t.id)?.door);
    if (built) return built;
    if (e.thingsAt(cx, cy).some((t) => partById(t.id)?.bridge)) return null;
    if (e.wallAt(cx, cy)) return 'wall';
    return e.cleared.size < MAX_CLEARED ? (this.ground.clearable?.(x, y) ?? null) : null;
  }

  private eraseAt(cx: number, cy: number, x: number, y: number): boolean {
    const what = this.eraseTarget(cx, cy, x, y);
    if (!what) return false;
    if (what === 'floor') {
      this.edits.floors.delete(cellKey(cx, cy));
    } else if (what === 'roof') {
      this.edits.roofs.delete(cellKey(cx, cy));
    } else if (what === 'tent') {
      this.edits.tents.delete(cellKey(cx, cy));
    } else if (what === 'crop') {
      this.farm.uproot(cx, cy);
      return false;
    } else if (what === 'wall') {
      this.edits.walls.delete(cellKey(cx, cy));
      this.checkDecor();
      this.touchCells(cx, cy, 1);
    } else if ('of' in what) {
      this.edits.cleared.add(what.of);
      if (this.marked === what.obj) this.marked = null;
      this.ground.cleared?.(what.of);
      // A puff of leaves (or grit) where it stood.
      this.world.debris(what.tree ? [0x5f9a4b, 0x8fbf5a, 0x6b4a2a] : [0x8a7a5a, 0x6f8f4a], what.x, what.y - (what.tree ? 30 : 6), what.tree ? 14 : 6, what.y + 20, what.tree ? 'spores' : 'burst');
      sound.puff(0);
    } else {
      this.edits.things = this.edits.things.filter((t) => t !== what);
      this.touchCells(what.x, what.y, 3);
      sound.puff(0);
    }
    return true;
  }

  /** Hangings stay only on house walls whose face shows, and doors in house doorways (as in a Home). */
  private checkDecor(): void {
    const e = this.edits;
    const gone = e.things.filter((t) => {
      const p = partById(t.id);
      return (p?.wall || p?.door) && !e.fitsWall(p, t.x, t.y, t);
    });
    if (!gone.length) return;
    e.things = e.things.filter((t) => !gone.includes(t));
    for (const t of gone) this.touchCells(t.x, t.y, 1);
  }

  /** Stand again the chunks round cells (cx, cy) .. (cx + r, cy + r), reached `r` cells either way. */
  private touchCells(cx: number, cy: number, r: number): void {
    const per = CHUNK / CELL;
    for (let j = Math.floor((cy - r) / per); j <= Math.floor((cy + r) / per); j++) {
      for (let i = Math.floor((cx - r) / per); i <= Math.floor((cx + r) / per); i++) this.view.touch(i, j);
    }
  }

  private heroIn(cx: number, cy: number): boolean {
    const x = cx * CELL;
    const y = cy * CELL;
    return this.hero.x > x - HERO_R && this.hero.x < x + CELL + HERO_R && this.hero.y > y - HERO_R && this.hero.y < y + CELL + HERO_R;
  }

  private onHero(p: PartDef, fx: number, fy: number, turn: number): boolean {
    if (p.block === 'none') return false;
    const { w, h } = extent(p, turn);
    for (let y = fy; y < fy + h; y++) for (let x = fx; x < fx + w; x++) if (this.heroIn(x, y)) return true;
    return false;
  }

  // ---------------------------------------------------------------- Changes

  private snap(): BuildSnap {
    const e = this.edits;
    return snapOf({ w: e.walls, f: e.floors, r: e.roofs, t: e.tents }, e.things, e.cleared);
  }

  /** A stroke is over: keep its change backwards for undo, then save it and send it. */
  private endStroke(): void {
    const before = this.before;
    this.before = null;
    if (!before) return;
    const after = this.snap();
    const change = diff(before, after);
    if (!change) return;
    this.undoStack.push(diff(after, before)!);
    if (this.undoStack.length > UNDO_MAX) this.undoStack.shift();
    build.canUndo = true;
    this.committed(change);
  }

  private undo(): void {
    const back = this.undoStack.pop();
    build.canUndo = this.undoStack.length > 0;
    if (!back) return;
    this.lay(back);
    this.committed(back);
  }

  /** Lay a change on what's built here, and stand up again what it touched. */
  private lay(p: BuildPatch): void {
    const e = this.edits;
    const layers: Record<string, Map<number, number>> = { w: e.walls, f: e.floors, r: e.roofs, t: e.tents };
    const target: PatchTarget = {
      setCell: (layer, k, v) => {
        const m = layers[layer];
        if (!m) return;
        if (v) m.set(k, v);
        else m.delete(k);
        this.touchCells(Math.floor(k / 65536), k % 65536, 1);
      },
      addThing: (t) => {
        e.things.push(t);
        this.touchCells(t.x, t.y, 3);
      },
      removeThing: (key) => {
        const i = e.things.findIndex((t) => thingKey(t) === key);
        if (i < 0) return false;
        const [t] = e.things.splice(i, 1);
        this.touchCells(t.x, t.y, 3);
        return true;
      },
      hasThing: (key) => e.things.some((t) => thingKey(t) === key),
      clear: (k, on) => {
        if (on === e.cleared.has(k)) return;
        if (on) e.cleared.add(k);
        else e.cleared.delete(k);
        this.ground.cleared?.(k);
      },
    };
    applyPatch(target, p);
    e.index();
  }

  /** A change made here (a stroke, or an undo): saved if the world is this player's, to the cloud if it's shared, and to the room. */
  private committed(p: BuildPatch): void {
    this.keep();
    if (!session.active) return;
    const json = JSON.stringify(p);
    if (json.length <= PATCH_MAX) session.send({ t: 'bp', p });
    else sendPieces('bpl', json);
  }

  /** What's built changed: into this player's save if it's their world, and to the cloud a little later if it's shared. */
  private keep(): void {
    if (this.link.mine) saveLocal(this.arena, this.edits.encode());
    this.link.changed();
  }

  /** Make what's built here these: stood up again whole, and whatever was cleared or put back goes or returns. */
  private apply(n: ForestEdits): void {
    const e = this.edits;
    const was = new Set(e.cleared);
    e.things = n.things;
    e.walls = n.walls;
    e.floors = n.floors;
    e.roofs = n.roofs;
    e.tents = n.tents;
    e.cleared.clear();
    for (const k of n.cleared) e.cleared.add(k);
    e.index();
    for (const k of was) if (!e.cleared.has(k)) this.ground.cleared?.(k);
    for (const k of e.cleared) if (!was.has(k)) this.ground.cleared?.(k);
    this.view.touchAll();
  }

  /** The farm changed (sown, picked, pulled up): to the room, and kept like the builds. */
  private farmChanged(): void {
    this.link.changed();
    if (session.active) session.send({ t: 'fs', s: this.farm.encoded() });
  }

  // ---------------------------------------------------------------- Online

  private receive(m: Msg): void {
    switch (m.t) {
      case 'wq':
        // Someone just came: the builds, the farm and the critters for the jar shelves.
        if (session.isHost) sendPieces('wl', this.edits.encode(), { c: this.caught.join(','), fm: this.farm.encoded() }, m.f);
        return;
      case 'wl': {
        if (session.isHost) return;
        const got = this.pieces.take(m);
        if (!got) return;
        if (typeof got.first.c === 'string') this.caught = got.first.c ? got.first.c.split(',').filter((id) => critterById(id)) : [];
        this.apply(ForestEdits.decode(got.s));
        if (typeof got.first.fm === 'string') this.farm.adopt(got.first.fm, this.link.mine);
        this.arrived = true;
        if (this.link.mine) saveLocal(this.arena, this.edits.encode());
        return;
      }
      case 'bp': {
        const p = readPatch(m.p);
        if (p) this.received(p);
        return;
      }
      case 'bpl': {
        const got = this.pieces.take(m);
        if (!got) return;
        try {
          const p = readPatch(JSON.parse(got.s));
          if (p) this.received(p);
        } catch {
          // Garbled: the next full send puts it right.
        }
        return;
      }
      case 'fs':
        if (typeof m.s === 'string') {
          this.farm.adopt(m.s, this.link.mine);
          this.link.changed();
        }
        return;
    }
  }

  /** A friend's stroke: laid here too, and kept like one of this player's own. */
  private received(p: BuildPatch): void {
    this.lay(p);
    this.keep();
  }

  destroy(): void {
    this.link.destroy();
    this.view.destroy();
    this.critters.destroy();
    this.farm.destroy();
    this.netOff();
    build.available = false;
    build.tabs = TABS.map((t) => t.id);
    build.allow = null;
    stopBuilding();
    if (this.forest) {
      this.forest.gen.cleared = null;
      this.forest.gen.built = null;
      this.forest.gen.bridged = null;
    }
  }
}
