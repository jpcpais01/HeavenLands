// The Everwood's explorer's map as canvases: each walked chunk painted once
// (art/mapArt.ts), then laid under its fog as far as it's known, ready to be
// drawn into the minimap or the full map. Chunks near the hero are painted
// here from the forest the world is walking (its fields are already made,
// so it's a few ms); chunks far away (a map remembered from an earlier
// visit) are painted by workers with a forest of their own, never on this
// thread, as each costs tens of ms. Painted chunks are kept for the rest of
// the game and on the device (trekCache.ts), so the map opens whole at once
// next time.

import { PAPER_REPEAT, blankTile, fogTile, trekTile, TREK_T } from '../art/mapArt';
import { trek } from '../game/trek';
import { CHUNK, ForestGen, type Poi } from './forestGen';
import { keepTile, loadKept, type KeptTile } from './trekCache';
import type { TrekAsk, TrekCleared, TrekDone } from './trekWorker';

/** Most painted chunks kept in memory, and fogged tiles. */
const KEEP_TERRAIN = 4000;
const KEEP_TILES = 1600;
/** Chunks asked of each worker at once, so the nearest still go first as the view moves. */
const IN_FLIGHT = 2;

const key = (cx: number, cy: number): number => cx * 4096 + cy;

/** A Map trimmed to its newest `max` entries. */
function trim<V>(m: Map<number, V>, max: number): void {
  if (m.size <= max) return;
  let n = m.size - max;
  for (const k of m.keys()) {
    m.delete(k);
    if (--n <= 0) break;
  }
}

function canvasOf(px: Uint8ClampedArray): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = TREK_T;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px), TREK_T, TREK_T), 0, 0);
  return c;
}

// Kept for the whole game, whichever visit to the forest painted them.
const terrain = new Map<number, KeptTile>();
/** Blank paper, by its place in the paper's repeat (see PAPER_REPEAT). */
const blanks = new Map<number, { px: Uint8ClampedArray; canvas: HTMLCanvasElement }>();
/** The tiles kept on the device, read in the first time the Everwood's map is made (not at every launch: it can be megabytes). */
let kept: Map<number, KeptTile> | null = null;

interface Painter {
  worker: Worker;
  busy: number;
  /** The cleared trees' note it was last sent. */
  ver: number;
}
/** What's cleared, as the workers are told it, and its version. */
let clearedNote: TrekCleared = { cleared: [] };
let clearedVer = 0;
let painters: Painter[] | null = null;
let noWorkers = false;
/** Chunks out with a worker. */
const asked = new Set<number>();
/** Whoever is showing the map, told when a worker's chunk comes back. */
let listener: TrekMap | null = null;

function startPainters(): Painter[] {
  if (painters || noWorkers) return painters ?? [];
  painters = [];
  const n = (navigator.hardwareConcurrency ?? 2) >= 4 ? 2 : 1;
  try {
    for (let i = 0; i < n; i++) {
      const worker = new Worker(new URL('./trekWorker.ts', import.meta.url), { type: 'module' });
      const p: Painter = { worker, busy: 0, ver: -1 };
      worker.onmessage = (e: MessageEvent<TrekDone>) => {
        p.busy--;
        const k = key(e.data.cx, e.data.cy);
        asked.delete(k);
        listener?.landed(k, e.data.px);
      };
      // A worker that fails leaves every chunk to this thread, as before.
      worker.onerror = (e) => {
        e.preventDefault();
        for (const q of painters ?? []) q.worker.terminate();
        painters = [];
        noWorkers = true;
        asked.clear();
      };
      painters.push(p);
    }
  } catch {
    noWorkers = true;
    painters = [];
  }
  return painters;
}

export class TrekMap {
  private tiles = new Map<number, HTMLCanvasElement>();
  /** Walked chunks waiting to be painted (as last drawn). */
  private wanted = new Set<number>();
  /** The chunk in the middle of what was last drawn: the nearest are painted first. */
  private fx = 0;
  private fy = 0;
  private own: ForestGen | null = null;
  /** Cleared trees by chunk, for each tile's signature; rebuilt when the cleared set changes. */
  private clearedBy = new Map<number, number>();
  private clearedSeen: Set<number> | null = null;
  private clearedSize = -1;
  /** Raised when a tile changes, so whatever shows them draws again. */
  version = 0;

  constructor(private live: ForestGen) {
    listener = this;
    if (!kept) void loadKept().then((m) => (kept = m));
  }

  /** Done with: chunks still out with the workers are kept, not shown. */
  destroy(): void {
    if (listener === this) listener = null;
  }

  /** The map's own forest, for chunks the world's doesn't have to hand when there are no workers. */
  private gen(cx: number, cy: number): ForestGen {
    if (this.live.hasFields(cx, cy)) return this.live;
    this.own ??= new ForestGen(this.live.seed);
    this.own.cleared = this.live.cleared;
    return this.own;
  }

  /** The trees cleared in a chunk, as one number: a tile painted with another is painted again. */
  private sig(cx: number, cy: number): number {
    const c = this.live.cleared;
    if (c !== this.clearedSeen || (c?.size ?? 0) !== this.clearedSize) {
      this.clearedSeen = c;
      this.clearedSize = c?.size ?? 0;
      this.clearedBy.clear();
      for (const f of c ?? []) {
        // A foot key is x * 2^20 + y (forestGen.ts footKey).
        const x = Math.floor(f / 1048576);
        const y = f - x * 1048576;
        const k = key(Math.floor(x / CHUNK), Math.floor(y / CHUNK));
        this.clearedBy.set(k, ((this.clearedBy.get(k) ?? 0) * 31 + (f % 1000003)) % 2147483647);
      }
      // The workers learn what's cleared before they paint any chunk it changes (see work).
      clearedNote = { cleared: [...(c ?? [])] };
      clearedVer++;
    }
    return this.clearedBy.get(key(cx, cy)) ?? 0;
  }

  /** A chunk back from a worker. */
  landed(k: number, px: Uint8ClampedArray): void {
    const cx = Math.floor(k / 4096);
    const cy = k % 4096;
    this.store(k, { sig: this.sig(cx, cy), px });
  }

  private store(k: number, t: KeptTile): void {
    terrain.delete(k);
    terrain.set(k, t);
    trim(terrain, KEEP_TERRAIN);
    keepTile(k, t);
    this.tiles.delete(k);
    this.version++;
  }

  /** Squares the hero just walked: their tiles and their neighbours' (whose fog frays into them) are laid again. */
  sync(): void {
    if (!trek.fresh.size) return;
    for (const k of trek.fresh) {
      const cx = Math.floor(k / 4096);
      const cy = k % 4096;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) this.tiles.delete(key(cx + i, cy + j));
    }
    trek.fresh.clear();
    this.version++;
  }

  /** A fresh draw of the box (x0, y0, w, h) in map px begins: what it wants replaces what the last one did. */
  begin(x0: number, y0: number, w: number, h: number): void {
    this.wanted.clear();
    this.fx = (x0 + w / 2) / TREK_T;
    this.fy = (y0 + h / 2) / TREK_T;
  }

  /** The painted chunk (cx, cy), if it's painted with today's clearing (from memory, or the device's keep). */
  private painted(cx: number, cy: number): KeptTile | null {
    const k = key(cx, cy);
    const sig = this.sig(cx, cy);
    const t = terrain.get(k);
    if (t && t.sig === sig) return t;
    const d = kept?.get(k);
    if (d) {
      kept!.delete(k);
      if (d.sig === sig) {
        terrain.set(k, d);
        trim(terrain, KEEP_TERRAIN);
        return d;
      }
    }
    return null;
  }

  /** The finished tile for chunk (cx, cy): its map under the fog, blank paper if never walked, null while it waits to be painted. */
  tile(cx: number, cy: number): HTMLCanvasElement | null {
    const k = key(cx, cy);
    const done = this.tiles.get(k);
    if (done) return done;
    // A neighbour walked may fray into a chunk never walked: it needs its map too.
    let near = false;
    for (let j = -1; j <= 1 && !near; j++) for (let i = -1; i <= 1 && !near; i++) near = trek.seen(cx + i, cy + j);
    if (!near) return this.blank(cx, cy).canvas;
    const t = this.painted(cx, cy);
    if (!t) {
      if (!asked.has(k)) this.wanted.add(k);
      return null;
    }
    const c = canvasOf(fogTile(t.px, this.blank(cx, cy).px, cx, cy, (fx, fy) => trek.known(fx, fy)));
    this.tiles.set(k, c);
    trim(this.tiles, KEEP_TILES);
    return c;
  }

  /** Chunk (cx, cy)'s blank paper: one of the paper's repeat. */
  private blank(cx: number, cy: number): { px: Uint8ClampedArray; canvas: HTMLCanvasElement } {
    const r = PAPER_REPEAT;
    const bx = ((cx % r) + r) % r;
    const by = ((cy % r) + r) % r;
    const k = by * r + bx;
    let b = blanks.get(k);
    if (!b) {
      const px = blankTile(bx, by);
      b = { px, canvas: canvasOf(px) };
      blanks.set(k, b);
    }
    return b;
  }

  /**
   * Paint waiting chunks, the nearest the middle of the view first: those
   * the world's forest has fields for here, for up to `budget` ms (always
   * one, if any wait); the rest go to the workers. Without workers, the
   * others are painted here too, but only when `cold` allows.
   */
  work(budget: number, cold: boolean): void {
    if (!this.wanted.size) return;
    const t0 = performance.now();
    const order = [...this.wanted].sort((a, b) => this.far(a) - this.far(b));
    const pool = startPainters();
    let made = 0;
    for (const k of order) {
      const cx = Math.floor(k / 4096);
      const cy = k % 4096;
      if (this.live.hasFields(cx, cy)) {
        if (made && performance.now() - t0 > budget) continue;
        this.wanted.delete(k);
        this.store(k, { sig: this.sig(cx, cy), px: trekTile(this.live, cx, cy, (x, y) => this.live.isCleared(x, y)) });
        made++;
        continue;
      }
      if (pool.length) {
        const p = pool.reduce((a, b) => (b.busy < a.busy ? b : a));
        if (p.busy >= IN_FLIGHT) continue;
        this.sig(cx, cy);
        if (p.ver !== clearedVer) {
          p.worker.postMessage(clearedNote);
          p.ver = clearedVer;
        }
        this.wanted.delete(k);
        asked.add(k);
        p.busy++;
        const ask: TrekAsk = { cx, cy };
        p.worker.postMessage(ask);
        continue;
      }
      if (!cold || (made && performance.now() - t0 > budget)) continue;
      this.wanted.delete(k);
      this.store(k, { sig: this.sig(cx, cy), px: trekTile(this.gen(cx, cy), cx, cy, (x, y) => this.live.isCleared(x, y)) });
      made++;
    }
  }

  /** How far chunk key `k` lies from the middle of the view, in chunks squared. */
  private far(k: number): number {
    const cx = Math.floor(k / 4096) + 0.5;
    const cy = (k % 4096) + 0.5;
    return (cx - this.fx) ** 2 + (cy - this.fy) ** 2;
  }

  /**
   * The forest's places in a box. A wide one (the whole map open) is asked
   * a chunk at a time, only where the hero has walked (no other place is
   * shown), and of the map's own forest, to spare the world's caches.
   */
  places(x0: number, y0: number, x1: number, y1: number): Poi[] {
    if (x1 - x0 <= 2000 && y1 - y0 <= 2000) return this.live.poisIn(x0, y0, x1, y1);
    const own = (this.own ??= new ForestGen(this.live.seed));
    const out = new Map<number, Poi>();
    for (let cy = Math.floor(y0 / CHUNK); cy < Math.ceil(y1 / CHUNK); cy++) {
      for (let cx = Math.floor(x0 / CHUNK); cx < Math.ceil(x1 / CHUNK); cx++) {
        if (!trek.seen(cx, cy)) continue;
        for (const p of own.poisIn(cx * CHUNK, cy * CHUNK, (cx + 1) * CHUNK, (cy + 1) * CHUNK)) out.set(p.id, p);
      }
    }
    return [...out.values()];
  }
}
