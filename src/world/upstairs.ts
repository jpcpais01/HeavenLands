// A house's upper floor, reached by a staircase built inside it. Upstairs is
// a storey of its own on the same grid: its own floors, inner walls and
// everything set down on it, kept beside the ground floor's (the Home's
// layout and the open grid's edits each hold one). It isn't drawn over the
// house from outside: whoever climbs the stairs sees the house's rooms
// swapped for the ones above, inside the same outer walls. The doorways out
// are windows up here, and the stairs come up through a railed well.
//
// This file works out which cells a staircase's upper floor covers, what is
// shown while someone is up there (the ground floor with the rooms above
// put in its place), and how changes made up there are kept. Plain data:
// no Phaser.

import { CELL, HomeLayout, cellIndex, doorAcross, inPlot, type Thing } from './homeLayout';
import { ForestEdits } from './forestEdits';
import { FLOORS, WALLS, extent, floorIndex, packWall, partById, wallKind, wallMat, type BuildTab } from './homeParts';
import type { House } from './houses';
import type { PaletteItem } from '../game/build';

/** A cell's name (as houses.ts and the open grid's edits name them). */
const key = (cx: number, cy: number): number => cx * 65536 + cy;
const cellOf = (k: number): [number, number] => [Math.floor(k / 65536), k % 65536];

/** How far into the stairs (px from their sides and ends) feet must come before they climb; and where they step off, below the stairs' foot. */
const STAIR_SIDE = 3;
const STAIR_TOP = 3;
const STAIR_FOOT = 6;
const LANDING = 7;

/** The tray's tabs upstairs: no roofs, tents, seeds or critters up there. */
export const UP_TABS: BuildTab[] = ['floor', 'wall', 'garden', 'furniture', 'light', 'decor'];

export interface Storey {
  /** The stairs that climb to it. */
  stairs: Thing;
  /** Its name, the same for everyone in the place (see `stairsId`). */
  id: number;
  /** The house it is the upper floor of. */
  house: number;
  /** Its cells: the rooms the stairs reach through the house's inner doorways. */
  cells: Set<number>;
  /** The doorways out of it, shut up here (a window in a house wall). */
  shut: Set<number>;
}

/** A staircase's name, the same on every player's copy of the place (never 0). */
export const stairsId = (t: Thing): number => t.x * 65536 + t.y + 1;

/** What a grid of walls says, enough to find a storey's rooms. */
interface Plan {
  wallAt(cx: number, cy: number): number;
  wallMask(cx: number, cy: number): number;
}

/**
 * The upper floor `stairs` climbs to in `house`: every cell of the house the
 * stairs reach without crossing a wall (through doorways, not out of the
 * house), less the doorways that lead out, which are shut up here.
 */
export function findStorey(plan: Plan, house: House, stairs: Thing): Storey {
  const cells = new Set<number>();
  const open = (cx: number, cy: number) => {
    if (!house.has(cx, cy)) return false;
    const v = plan.wallAt(cx, cy);
    return !v || wallKind(v) === 'door';
  };
  const stack: [number, number][] = [];
  for (let y = stairs.y; y < stairs.y + 2; y++) {
    if (!open(stairs.x, y)) continue;
    cells.add(key(stairs.x, y));
    stack.push([stairs.x, y]);
  }
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = key(nx, ny);
      if (cells.has(k) || !open(nx, ny)) continue;
      cells.add(k);
      stack.push([nx, ny]);
    }
  }
  // Doorways leading out: one in the house's own wall (a side of it isn't the house), or one beside the rooms but not under the roof.
  const shut = new Set<number>();
  const out = (cx: number, cy: number) => {
    const across = doorAcross(plan.wallMask(cx, cy));
    const sides = across ? [[cx, cy - 1], [cx, cy + 1]] : [[cx - 1, cy], [cx + 1, cy]];
    return sides.some(([x, y]) => !house.has(x, y));
  };
  for (const k of cells) {
    const [cx, cy] = cellOf(k);
    if (plan.wallAt(cx, cy) && out(cx, cy)) shut.add(k);
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      const v = plan.wallAt(nx, ny);
      if (v && wallKind(v) === 'door' && !cells.has(key(nx, ny))) shut.add(key(nx, ny));
    }
  }
  for (const k of shut) cells.delete(k);
  return { stairs, id: stairsId(stairs), house: house.id, cells, shut };
}

/** A storey's floor where nothing was laid up there: the boards below if they're laid boards or stone, else oak. */
export const upFloorValue = (up: number, ground: number): number => up || (ground && !FLOORS[ground - 1]?.soft && !FLOORS[ground - 1]?.water ? ground : floorIndex('oak'));

/** A doorway out, shut upstairs: a window in a house wall, plain wall in any other. */
const shutWall = (v: number): number => packWall(wallMat(v), WALLS[wallMat(v)]?.house ? 'window' : 'wall');

/** Is this thing, kept upstairs, on this storey? All of it on its rooms; a hanging on a wall facing into them; a door in one of its doorways. */
export function onStorey(t: Thing, s: Storey): boolean {
  const p = partById(t.id);
  if (!p || p.stairs || p.critter || p.bridge || t.id === 'stairwell') return false;
  if (p.wall) return s.cells.has(key(t.x, t.y + 1));
  if (p.door) return s.cells.has(key(t.x, t.y));
  const e = extent(p, t.turn);
  for (let y = t.y; y < t.y + e.h; y++) for (let x = t.x; x < t.x + e.w; x++) if (!s.cells.has(key(x, y))) return false;
  return true;
}

/** Is this ground-floor thing out of sight from the storey: anywhere on its rooms, hung facing into them, or in a doorway shut up there? */
function below(t: Thing, s: Storey): boolean {
  const p = partById(t.id);
  if (!p) return true;
  if (p.wall) return s.cells.has(key(t.x, t.y + 1));
  if (p.door) return s.cells.has(key(t.x, t.y)) || s.shut.has(key(t.x, t.y));
  const e = extent(p, t.turn);
  for (let y = t.y; y < t.y + e.h; y++) for (let x = t.x; x < t.x + e.w; x++) if (s.cells.has(key(x, y))) return true;
  return false;
}

/** The well the stairs come up through, as a thing on the storey. */
const wellOf = (s: Storey): Thing => ({ id: 'stairwell', x: s.stairs.x, y: s.stairs.y, flip: false, turn: 0 });

/** The cells kept clear upstairs: the well and the step off it. */
export function keptClear(s: Storey, cx: number, cy: number): boolean {
  return cx === s.stairs.x && cy >= s.stairs.y && cy <= s.stairs.y + 2;
}

/** Is cell (cx, cy) on the storey's rooms or beside them (its walls)? Further off, the hero has left the house some other way. */
export function nearStorey(s: Storey, cx: number, cy: number): boolean {
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) if (s.cells.has(key(x, y))) return true;
  return false;
}

/** May an upstairs part go on cell (cx, cy)? (Its footprint's every cell asks.) */
export const upstairsCell = (s: Storey, cx: number, cy: number): boolean => s.cells.has(key(cx, cy)) && !keptClear(s, cx, cy);

// ---------------------------------------------------------------- The Home's layout

/** The Home as seen from storey `s`: the ground floor, with its rooms swapped for the ones above. */
export function composeHome(l: HomeLayout, s: Storey): HomeLayout {
  const c = new HomeLayout();
  c.floor.set(l.floor);
  c.wall.set(l.wall);
  c.roof.set(l.roof);
  c.tent.set(l.tent);
  for (const k of s.cells) {
    const [cx, cy] = cellOf(k);
    if (!inPlot(cx, cy)) continue;
    const i = cellIndex(cx, cy);
    c.floor[i] = upFloorValue(l.upFloor[i], l.floor[i]);
    if (!l.wall[i] && l.upWall[i]) c.wall[i] = l.upWall[i];
  }
  for (const k of s.shut) {
    const [cx, cy] = cellOf(k);
    if (inPlot(cx, cy)) c.wall[cellIndex(cx, cy)] = shutWall(l.wall[cellIndex(cx, cy)]);
  }
  c.things = [...l.things.filter((t) => !below(t, s)), ...l.upThings.filter((t) => onStorey(t, s)), wellOf(s)];
  return c;
}

/** Keep what was built on storey `s` (in `c`, as composed) in the layout's upper floor. */
export function liftHome(c: HomeLayout, l: HomeLayout, s: Storey): void {
  for (const k of s.cells) {
    const [cx, cy] = cellOf(k);
    if (!inPlot(cx, cy)) continue;
    const i = cellIndex(cx, cy);
    if (c.floor[i] !== upFloorValue(l.upFloor[i], l.floor[i])) l.upFloor[i] = c.floor[i];
    // The ground floor's walls (its doorways) stand up here too; only walls of the storey's own are its.
    if (!l.wall[i]) l.upWall[i] = c.wall[i];
  }
  l.upThings = [...l.upThings.filter((t) => !onStorey(t, s)), ...c.things.filter((t) => onStorey(t, s))];
}

// ---------------------------------------------------------------- The open grid's edits

/** A place's builds as seen from storey `s` (see composeHome). */
export function composeEdits(e: ForestEdits, s: Storey): ForestEdits {
  const c = new ForestEdits();
  c.walls = new Map(e.walls);
  c.floors = new Map(e.floors);
  // Nothing upstairs changes these: the same ones serve.
  c.roofs = e.roofs;
  c.tents = e.tents;
  c.cleared = e.cleared;
  for (const k of s.cells) {
    c.floors.set(k, upFloorValue(e.upFloors.get(k) ?? 0, e.floors.get(k) ?? 0));
    const w = e.upWalls.get(k);
    if (!e.walls.has(k) && w) c.walls.set(k, w);
  }
  for (const k of s.shut) c.walls.set(k, shutWall(e.walls.get(k) ?? 0));
  c.things = [...e.things.filter((t) => !below(t, s)), ...e.upThings.filter((t) => onStorey(t, s)), wellOf(s)];
  c.index();
  return c;
}

/** Keep what was built on storey `s` (in `c`) in the edits' upper floors. */
export function liftEdits(c: ForestEdits, e: ForestEdits, s: Storey): void {
  for (const k of s.cells) {
    const f = c.floors.get(k) ?? 0;
    if (f !== upFloorValue(e.upFloors.get(k) ?? 0, e.floors.get(k) ?? 0)) {
      if (f) e.upFloors.set(k, f);
      else e.upFloors.delete(k);
    }
    if (e.walls.has(k)) continue;
    const w = c.walls.get(k) ?? 0;
    if (w) e.upWalls.set(k, w);
    else e.upWalls.delete(k);
  }
  e.upThings = [...e.upThings.filter((t) => !onStorey(t, s)), ...c.things.filter((t) => onStorey(t, s))];
}

// ---------------------------------------------------------------- Climbing

/** Are feet at (x, y) far enough onto these stairs (or into their well) to climb? `ox`, `oy`: the grid's corner in the world. */
export function onStairs(t: Thing, x: number, y: number, ox: number, oy: number): boolean {
  const x0 = ox + t.x * CELL;
  const y0 = oy + t.y * CELL;
  return x > x0 + STAIR_SIDE && x < x0 + CELL - STAIR_SIDE && y > y0 + STAIR_TOP && y < y0 + CELL * 2 - STAIR_FOOT;
}

/** Where feet step off the stairs, upstairs or down: just below their foot. */
export const landingOf = (t: Thing, ox: number, oy: number): { x: number; y: number } => ({ x: ox + (t.x + 0.5) * CELL, y: oy + (t.y + 2) * CELL + LANDING });

/** The nearest spot round (x, y) feet can stand on, out of the stairs' own footprint. */
export function standNear(t: Thing, x: number, y: number, ox: number, oy: number, walkable: (x: number, y: number) => boolean): { x: number; y: number } {
  for (let r = 0; r <= 48; r += 3) {
    for (let a = 0; a < 16; a++) {
      const px = x + Math.cos((a / 16) * Math.PI * 2 + Math.PI / 2) * r;
      const py = y + Math.sin((a / 16) * Math.PI * 2 + Math.PI / 2) * r;
      if (walkable(px, py) && !onStairs(t, px, py, ox, oy)) return { x: px, y: py };
      if (r === 0) break;
    }
  }
  return { x, y };
}

/** What may be built upstairs: laid floors, house walls, and the things that belong indoors. */
export function upstairsAllows(item: PaletteItem): boolean {
  if (item.layer === 'floor') return !FLOORS[item.value - 1]?.soft;
  if (item.layer === 'wall') return !!WALLS[wallMat(item.value)]?.house;
  if (item.layer !== 'thing') return false;
  const p = partById(item.id);
  if (!p || p.stairs || p.bridge || p.critter || p.fishing || p.water === 'only') return false;
  if (p.tab === 'garden') return p.shelf === 'flowers' || p.shelf === 'ornaments';
  if (p.tab === 'light') return p.shelf === 'lamps';
  return true;
}

// ---------------------------------------------------------------- Who sees whom

/**
 * The storey this player is on, for drawing the others online: someone
 * upstairs is seen only by those up the same stairs, and someone on the
 * ground floor isn't seen from upstairs where the storey's rooms cover them.
 */
export const storeyView = {
  /** The stairs climbed (see `stairsId`), 0 on the ground. */
  up: 0,
  /** Is world point (x, y) under the storey's rooms? */
  covers: (_x: number, _y: number): boolean => false,
};

/** Is a friend at (x, y), up stairs `up` (0 on the ground), seen from where this player is? */
export const seesStorey = (x: number, y: number, up = 0): boolean => (up ? storeyView.up === up : !(storeyView.up && storeyView.covers(x, y)));

/** Back on the ground (left the place, or the stairs went). */
export function groundView(): void {
  storeyView.up = 0;
  storeyView.covers = () => false;
}
