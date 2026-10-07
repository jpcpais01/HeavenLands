import { partById } from './homeParts';
import type { Thing } from './homeLayout';

// A change to what's built in a place, small enough to send a room as it's
// made: the cells set in each layer (floors, walls, roofs, tents; 0 takes
// one away), the things put down and taken up, and the forest's trees and
// undergrowth cleared or put back. Whoever builds (the room's host, or a
// friend allowed to) sends the change of each stroke to everyone, who all
// lay it on their own copy; laying one twice changes nothing more. Undo lays
// a stroke's change backwards. Plain data: no Phaser.

export interface BuildPatch {
  /** Cells: [layer, cell, value]. */
  c?: [string, number, number][];
  /** Things put down and taken up, as thing keys. */
  a?: string[];
  r?: string[];
  /** Cleared spots added and taken back (the Everwood's foot keys). */
  ca?: number[];
  cr?: number[];
}

/** What's built, flattened to compare: cells by `layer:cell`, things counted by key, the cleared spots. */
export interface BuildSnap {
  cells: Map<string, number>;
  things: Map<string, number>;
  cleared: Set<number>;
}

/** What a patch is laid on. */
export interface PatchTarget {
  setCell(layer: string, cell: number, v: number): void;
  addThing(t: Thing): void;
  /** Take up one thing like this; false if there was none. */
  removeThing(key: string): boolean;
  hasThing(key: string): boolean;
  clear?(foot: number, on: boolean): void;
}

/** A thing as one short string: `id.x.y`, `.f` mirrored, `.r<n>` turned, all base 36 (the edits' own saved form). */
export const thingKey = (t: Thing): string => `${t.id}.${t.x.toString(36)}.${t.y.toString(36)}${t.flip ? '.f' : ''}${t.turn ? `.r${t.turn}` : ''}`;

/** The thing a key names, or null for a part that doesn't exist. */
export function parseThing(key: string): Thing | null {
  const [id, xs, ys, ...rest] = key.split('.');
  const p = partById(id);
  const x = parseInt(xs, 36);
  const y = parseInt(ys, 36);
  if (!p || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const r = rest.find((k) => k[0] === 'r');
  return { id, x, y, flip: rest.includes('f') && !!p.flip, turn: p.turns && r ? parseInt(r.slice(1), 10) & 3 : 0 };
}

export function snapOf(layers: Record<string, Iterable<[number, number]>>, things: Thing[], cleared?: Iterable<number>): BuildSnap {
  const cells = new Map<string, number>();
  for (const [layer, list] of Object.entries(layers)) for (const [k, v] of list) if (v) cells.set(`${layer}:${k}`, v);
  const counted = new Map<string, number>();
  for (const t of things) {
    const k = thingKey(t);
    counted.set(k, (counted.get(k) ?? 0) + 1);
  }
  return { cells, things: counted, cleared: new Set(cleared ?? []) };
}

/** The change from `a` to `b`; null when there is none. */
export function diff(a: BuildSnap, b: BuildSnap): BuildPatch | null {
  const p: BuildPatch = {};
  const c: [string, number, number][] = [];
  for (const [k, v] of b.cells) if (a.cells.get(k) !== v) c.push(cellOf(k, v));
  for (const k of a.cells.keys()) if (!b.cells.has(k)) c.push(cellOf(k, 0));
  const add: string[] = [];
  const rem: string[] = [];
  for (const [k, n] of b.things) for (let i = a.things.get(k) ?? 0; i < n; i++) add.push(k);
  for (const [k, n] of a.things) for (let i = b.things.get(k) ?? 0; i < n; i++) rem.push(k);
  const ca = [...b.cleared].filter((k) => !a.cleared.has(k));
  const cr = [...a.cleared].filter((k) => !b.cleared.has(k));
  if (c.length) p.c = c;
  if (add.length) p.a = add;
  if (rem.length) p.r = rem;
  if (ca.length) p.ca = ca;
  if (cr.length) p.cr = cr;
  return c.length || add.length || rem.length || ca.length || cr.length ? p : null;
}

function cellOf(k: string, v: number): [string, number, number] {
  const i = k.indexOf(':');
  return [k.slice(0, i), Number(k.slice(i + 1)), v];
}

/** Lay `p` on `t`. Things already down aren't put down again, nor ones already gone taken up. */
export function applyPatch(t: PatchTarget, p: BuildPatch): void {
  for (const k of p.r ?? []) t.removeThing(k);
  for (const [layer, cell, v] of p.c ?? []) if (Number.isFinite(cell) && Number.isFinite(v)) t.setCell(String(layer), cell, v);
  for (const k of p.a ?? []) {
    if (t.hasThing(k)) continue;
    const th = parseThing(k);
    if (th) t.addThing(th);
  }
  for (const k of p.ca ?? []) t.clear?.(k, true);
  for (const k of p.cr ?? []) t.clear?.(k, false);
}

/** A patch as received: kept only if it has the right shape. */
export function readPatch(v: unknown): BuildPatch | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const strs = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : undefined);
  const nums = (x: unknown) => (Array.isArray(x) ? x.filter((n): n is number => typeof n === 'number') : undefined);
  const c = Array.isArray(o.c) ? (o.c.filter((e) => Array.isArray(e) && e.length === 3 && typeof e[0] === 'string' && typeof e[1] === 'number' && typeof e[2] === 'number') as [string, number, number][]) : undefined;
  return { c, a: strs(o.a), r: strs(o.r), ca: nums(o.ca), cr: nums(o.cr) };
}
