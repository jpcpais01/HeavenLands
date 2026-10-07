// A long string sent to the room in pieces small enough for the server (it
// passes on nothing over 16 KB), and put back together on the other side.
// What's built in a place goes this way, and big changes to it.

import { session, type Msg } from './session';

/** The most of the string one message carries. */
const PIECE = 12000;

let seq = 0;

/** Send `s` as messages of type `t`; the first piece also carries `extra`. To everyone else, or to one player. */
export function sendPieces(t: string, s: string, extra: Record<string, unknown> = {}, to?: number): void {
  if (!session.active) return;
  const n = Math.max(1, Math.ceil(s.length / PIECE));
  const k = ++seq;
  for (let i = 0; i < n; i++) {
    const m: Msg = { t, k, i, n, d: s.slice(i * PIECE, (i + 1) * PIECE) };
    if (i === 0) Object.assign(m, extra);
    session.send(m, to);
  }
}

/** Gathers one sender's pieces; `take` gives the whole string and the first piece once the last one is in. */
export class Pieces {
  private got = new Map<string, { parts: string[]; left: number; first: Msg | null }>();

  take(m: Msg): { s: string; first: Msg } | null {
    const id = `${m.f ?? 0}:${m.k}`;
    const n = Math.max(1, Math.min(200, Number(m.n) || 1));
    let g = this.got.get(id);
    if (!g) {
      // A newer string from the same sender replaces any it left unfinished.
      for (const key of this.got.keys()) if (key.startsWith(`${m.f ?? 0}:`)) this.got.delete(key);
      g = { parts: new Array(n).fill(null), left: n, first: null };
      this.got.set(id, g);
    }
    const i = Number(m.i) || 0;
    if (i < 0 || i >= g.parts.length || g.parts[i] !== null) return null;
    g.parts[i] = String(m.d ?? '');
    if (i === 0) g.first = m;
    if (--g.left > 0) return null;
    this.got.delete(id);
    return { s: g.parts.join(''), first: g.first ?? m };
  }
}
