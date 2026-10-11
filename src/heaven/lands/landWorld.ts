// A land's gen with its chunk layouts kept, and feet: the ground's own
// `open` plus whatever stands in the way. The arena asks `walkable` for
// every step, so layouts are cached (a few hundred chunks) rather than grown
// again. Pure: no Phaser.

import { CHUNK, type ChunkLayout, type LandGen, type LandProp } from './types';

/** Chunk layouts kept before the oldest are forgotten. */
const KEEP_LAYOUTS = 400;

/** A chunk's blocks, and the box they all lie in (a big prop's block can reach well into the next chunk). */
interface Blocks {
  props: LandProp[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export class LandWorld {
  private layouts = new Map<number, ChunkLayout>();
  private blocks = new Map<number, Blocks>();

  constructor(readonly gen: LandGen) {}

  static key(cx: number, cy: number): number {
    return cx * 8192 + cy;
  }

  layout(cx: number, cy: number): ChunkLayout {
    const k = LandWorld.key(cx, cy);
    let l = this.layouts.get(k);
    if (l) {
      // Most recently used goes to the back, so the oldest is first to go.
      this.layouts.delete(k);
      this.layouts.set(k, l);
      return l;
    }
    l = this.gen.layout(cx, cy);
    this.layouts.set(k, l);
    const props = l.props.filter((p) => p.block);
    const box: Blocks = { props, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const p of props) {
      const b = p.block!;
      const bx = p.x + (p.flip ? -(b.ox ?? 0) : (b.ox ?? 0));
      const by = p.y + (b.oy ?? 0);
      box.x0 = Math.min(box.x0, bx - b.rx);
      box.x1 = Math.max(box.x1, bx + b.rx);
      box.y0 = Math.min(box.y0, by - b.ry);
      box.y1 = Math.max(box.y1, by + b.ry);
    }
    this.blocks.set(k, box);
    if (this.layouts.size > KEEP_LAYOUTS) {
      const old = this.layouts.keys().next().value!;
      this.layouts.delete(old);
      this.blocks.delete(old);
    }
    return l;
  }

  walkable(x: number, y: number): boolean {
    if (!this.gen.open(x, y)) return false;
    const cx = Math.floor(x / CHUNK);
    const cy = Math.floor(y / CHUNK);
    // This chunk and the eight round it: each one's box says at once whether any of its blocks reach here.
    for (let j = cy - 1; j <= cy + 1; j++) {
      for (let i = cx - 1; i <= cx + 1; i++) {
        const k = LandWorld.key(i, j);
        if (!this.layouts.has(k)) this.layout(i, j);
        const box = this.blocks.get(k)!;
        if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) continue;
        for (const p of box.props) {
          const b = p.block!;
          const dx = (x - p.x - (p.flip ? -(b.ox ?? 0) : (b.ox ?? 0))) / b.rx;
          const dy = (y - p.y - (b.oy ?? 0)) / b.ry;
          if (dx * dx + dy * dy < 1) return false;
        }
      }
    }
    return true;
  }
}
