// The build cursor, shared by the Home (world/Home.ts) and every other place
// (world/PlaceBuild.ts): the footprint under the pointer, the see-through
// ghost of the thing about to go down, and on a touch screen the thing held
// back as a ghost until the player says where (see `held` in game/build.ts).
//
// With a mouse the ghost follows the pointer and a click places it. A finger
// covers what it points at, so there a lift only sets the ghost down: it
// waits there, breathing softly, green-footed where it fits and red where it
// doesn't, while the player drags it about (grabbing it keeps it where it
// was under the finger), turns it with the tray's Turn, or walks round it;
// the tick over it (or a tap on the ghost itself) builds it, the cross lets
// it go.

import Phaser from 'phaser';
import { build } from '../game/build';

/** The footprint's colours: where it fits and where it doesn't. */
export const FITS = 0x9cff8a;
export const BLOCKED = 0xff6a6a;
/** The ghost's tints: a pale, cool light where it fits, a warm red where it doesn't. */
const GHOST_FITS = 0xe8f6ff;
const GHOST_BLOCKED = 0xff7a7a;
/** The ghost breathes: its alpha swings round this, this far, this fast (radians a second). */
const GHOST_ALPHA = 0.62;
const GHOST_SWING = 0.13;
const BREATH = 3.2;
/** The corner marks' length, px, at most. */
const BRACKET = 4;
/** Cells above a held thing's footprint that still grab it (its picture stands up there). */
const GRAB_UP = 2;

/** The footprint: a soft wash, a faint rim and crisp corner marks, so the cells read through it. */
export function footprint(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, col: number, held = false): void {
  g.fillStyle(col, held ? 0.2 : 0.15);
  g.fillRect(x, y, w, h);
  g.lineStyle(1, col, 0.4);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const a = Math.max(2, Math.min(BRACKET, Math.floor(Math.min(w, h) / 3)));
  g.fillStyle(col, 0.95);
  for (const [cx, sx] of [[x, 1], [x + w, -1]] as const) {
    for (const [cy, sy] of [[y, 1], [y + h, -1]] as const) {
      g.fillRect(sx > 0 ? cx : cx - a, sy > 0 ? cy : cy - 1, a, 1);
      g.fillRect(sx > 0 ? cx : cx - 1, sy > 0 ? cy : cy - a, 1, a);
    }
  }
}

/** Tint the ghost for whether it fits, and let it breathe. */
export function lookGhost(img: Phaser.GameObjects.Image, ok: boolean, now: number): void {
  img.setTint(ok ? GHOST_FITS : GHOST_BLOCKED).setAlpha(GHOST_ALPHA + GHOST_SWING * Math.sin((now / 1000) * BREATH));
}

/** Tell the HUD where the held thing's tick and cross go: over its picture, or under its feet (`footY`, world px) when the top is off the screen. */
export function markHeld(cam: Phaser.Cameras.Scene2D.Camera, img: Phaser.GameObjects.Image, footY: number, ok: boolean, shown: boolean): void {
  const at = build.heldAt;
  at.shown = shown;
  if (!shown) return;
  const v = cam.worldView;
  const top = img.visible ? img.getTopCenter() : { x: img.x, y: footY };
  at.x = (top.x! - v.x) * cam.zoom;
  at.y = (top.y! - v.y) * cam.zoom;
  at.low = (footY - v.y) * cam.zoom;
  at.ok = ok;
}

/** Where the thing hangs this frame and whether to build it now. */
export interface HoldAt {
  /** The cell the footprint hangs from (its foot, by the middle). */
  x: number;
  y: number;
  /** Build the held thing now (its tick, or a tap on it). */
  place: boolean;
  /** A thing is held (or being dragged) on a touch screen. */
  holding: boolean;
}

/** The touch screen's held thing: reads the presses before the world takes them. */
export class Hold {
  private grab: { dx: number; dy: number; from: { x: number; y: number }; on: boolean; moved: boolean } | null = null;

  /** With the picked thing (null for strokes and the eraser), its footprint's size and the cell under the pointer. */
  step(thing: { id: string } | null, size: { w: number; h: number }, cx: number, cy: number): HoldAt {
    const p = build.pointer;
    // A thing held is let go when the pick moves on.
    if (build.held && build.held.id !== thing?.id) build.held = null;
    const place = build.place;
    build.place = false;
    if (!thing || !p.touch) {
      this.grab = null;
      build.held = null;
      return { x: cx, y: cy, place: false, holding: false };
    }
    if (build.pressed) {
      // A press on the held thing (its footprint, or its picture above) picks it up where it is; anywhere else, it comes to the finger.
      const h = build.held;
      const on = !!h && Math.abs(cx - h.x) <= Math.ceil(size.w / 2) && cy <= h.y && cy >= h.y - (size.h - 1) - GRAB_UP;
      this.grab = { dx: on ? h!.x - cx : 0, dy: on ? h!.y - cy : 0, from: { x: cx, y: cy }, on, moved: false };
    }
    const g = this.grab;
    if (g && (p.down || build.released)) {
      if (cx !== g.from.x || cy !== g.from.y) g.moved = true;
      const x = cx + g.dx;
      const y = cy + g.dy;
      if (!build.released) return { x, y, place: false, holding: true };
      this.grab = null;
      // A tap on the held thing, without moving it, builds it; any other lift sets it down to wait.
      if (g.on && !g.moved) return { x, y, place: true, holding: true };
      build.held = { id: thing.id, x, y };
      return { x, y, place: false, holding: true };
    }
    const h = build.held;
    return h ? { x: h.x, y: h.y, place, holding: true } : { x: cx, y: cy, place: false, holding: false };
  }
}
