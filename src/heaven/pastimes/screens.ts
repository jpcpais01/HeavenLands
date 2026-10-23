// The televisions in the world while they're watched: the screen's moving
// light laid over the drawn glass (art/homeGadgets.ts TV_SCREEN) and a soft
// glow on the floor in front, for this player's and friends' alike; and what
// friends put on, so a friend sat at the same television (or coming to watch
// later) sees the same video. Each watcher tells the room which television
// they're at every little while ('tv', with what's on and how far in), and
// when they get up ('tvx').

import Phaser from 'phaser';
import { session, type Msg } from '../../net/session';
import type { WorldScene } from '../../scenes/WorldScene';
import { TV_SCREEN } from '../../art/homeGadgets';
import { depthOn } from '../../world/buildLand';
import type { BuildLand } from '../../world/buildLand';
import type { Clip } from '../ui/screenPanel';
import type { Spot } from './spots';

/** A friend's choice is followed by watchers this near them, px. */
const NEAR = 360;
/** How often a watcher tells the room, and how long without word before their screen goes dark, ms. */
const BEAT_MS = 12000;
const STALE_MS = 35000;
/** A friend's video is still "on" for those who come to watch this long after, ms. */
const SHARE_MS = 30 * 60 * 1000;
/** The screen's light drifts to a new colour this often, ms, and this fast. */
const TINT_MS = 1100;
const TINT_EASE = 0.004;
const TINTS = [0x8cbcff, 0xffc896, 0xaaffc8, 0xffaad2, 0xc8b4ff, 0xfff0c0, 0x9ae0ff];
const SCREEN_ALPHA = 0.42;
const HALO_ALPHA = 0.3;

interface Lit {
  rect: Phaser.GameObjects.Rectangle;
  halo: Phaser.GameObjects.Image;
  rgb: [number, number, number];
  to: [number, number, number];
  next: number;
}

const rgbOf = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

export class Screens {
  private lit = new Map<string, Lit>();
  /** Which television each friend is at, and when they last said so. */
  private remote = new Map<number, { key: string; t: number }>();
  /** The television this player watches, what's on and since when (wall clock, ms). */
  private mine: string | null = null;
  private clip: Clip | null = null;
  private since = 0;
  private beatT = 0;
  /** The last thing a friend put on, where, and since when. */
  private shared: { clip: Clip; since: number; x: number; y: number } | null = null;
  private off: () => void;
  /** Called with what a friend nearby puts on while this player watches. */
  onFollow: ((clip: Clip, at: number) => void) | null = null;

  constructor(private world: WorldScene) {
    this.off = session.on((m) => this.receive(m));
  }

  /** This player sits down at `tv` (or gets up: null). */
  watch(tv: Spot | null): void {
    if (this.mine && !tv && session.active) session.send({ t: 'tvx' });
    this.mine = tv?.key ?? null;
    this.clip = null;
    this.beatT = 0;
  }

  /** This player put something on (or it stopped: null). */
  playing(clip: Clip | null): void {
    this.clip = clip;
    this.since = Date.now();
    this.beatT = 0;
  }

  /** What a friend near (x, y) has on, and how many seconds in, if anything. */
  sharedNear(x: number, y: number): { clip: Clip; at: number } | null {
    const s = this.shared;
    if (!s || Date.now() - s.since > SHARE_MS || Math.hypot(s.x - x, s.y - y) > NEAR) return null;
    return { clip: s.clip, at: (Date.now() - s.since) / 1000 };
  }

  private receive(m: Msg): void {
    if (m.f === undefined || (m.t !== 'tv' && m.t !== 'tvx')) return;
    const f = Number(m.f);
    if (m.t === 'tvx') {
      this.remote.delete(f);
      return;
    }
    const at = this.world.netPlay?.peerAt(f);
    if (!at || typeof m.k !== 'string') return;
    this.remote.set(f, { key: m.k, t: Date.now() });
    const v = typeof m.v === 'string' ? m.v : undefined;
    const list = typeof m.l === 'string' ? m.l : undefined;
    if (!v && !list) return;
    const clip: Clip = { v, list, title: typeof m.n === 'string' ? m.n.slice(0, 80) : 'Video' };
    const into = Math.max(0, Number(m.s) || 0);
    const fresh = !this.shared || (this.shared.clip.v ?? this.shared.clip.list) !== (v ?? list);
    this.shared = { clip, since: Date.now() - into * 1000, x: at.x, y: at.y };
    // Something new put on by a friend nearby, while this player watches too: it comes on here.
    const me = this.world.player;
    if (fresh && this.mine && into < 5 && Math.hypot(at.x - me.x, at.y - me.y) < NEAR) this.onFollow?.(clip, into);
  }

  /** Tell the room where this player watches and what's on. */
  private beat(): void {
    if (!this.mine || !session.active) return;
    const c = this.clip;
    session.send({ t: 'tv', k: this.mine, ...(c ? { v: c.v, l: c.list, n: c.title, s: Math.round((Date.now() - this.since) / 1000) } : {}) });
  }

  /** Light the televisions being watched among `spots`. */
  update(dt: number, spots: Spot[], land: BuildLand | null | undefined): void {
    const now = Date.now();
    if (this.mine && (this.beatT -= dt) <= 0) {
      this.beatT = BEAT_MS;
      this.beat();
    }
    const on = new Set<string>();
    if (this.mine) on.add(this.mine);
    for (const [f, r] of this.remote) {
      if (now - r.t > STALE_MS) this.remote.delete(f);
      else on.add(r.key);
    }
    for (const [k, l] of this.lit) {
      if (on.has(k)) continue;
      l.rect.destroy();
      l.halo.destroy();
      this.lit.delete(k);
    }
    if (!on.size || !land) return;
    const t = this.world.time.now;
    for (const s of spots) {
      if (s.kind !== 'tv' || !on.has(s.key)) continue;
      let l = this.lit.get(s.key);
      if (!l) l = this.light(s, land);
      if (t >= l.next) {
        l.next = t + TINT_MS * (0.6 + Math.random() * 0.8);
        l.to = rgbOf(TINTS[Math.floor(Math.random() * TINTS.length)]);
      }
      const k = 1 - Math.exp(-dt * TINT_EASE);
      for (let i = 0; i < 3; i++) l.rgb[i] += (l.to[i] - l.rgb[i]) * k;
      const c = (Math.round(l.rgb[0]) << 16) | (Math.round(l.rgb[1]) << 8) | Math.round(l.rgb[2]);
      // A little flicker, as a picture moves.
      const a = 0.9 + Math.random() * 0.1;
      l.rect.setFillStyle(c, SCREEN_ALPHA * a);
      l.halo.setTint(c).setAlpha(HALO_ALPHA * a);
    }
  }

  private light(s: Spot, land: BuildLand): Lit {
    const w = this.world;
    const foot = depthOn(land, s.thing);
    const x = s.x0 + TV_SCREEN.x;
    const y = s.y0 + TV_SCREEN.y;
    const rect = w.add.rectangle(x, y, TV_SCREEN.w, TV_SCREEN.h, 0xffffff, SCREEN_ALPHA).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(foot + 0.3);
    const halo = w.add.image(x + TV_SCREEN.w / 2, y + TV_SCREEN.h + 10, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(1.2, 0.8).setAlpha(HALO_ALPHA).setDepth(foot + 0.25);
    const rgb = rgbOf(TINTS[0]);
    const l: Lit = { rect, halo, rgb, to: [...rgb], next: 0 };
    this.lit.set(s.key, l);
    return l;
  }

  destroy(): void {
    if (this.mine && session.active) session.send({ t: 'tvx' });
    this.off();
    for (const l of this.lit.values()) {
      l.rect.destroy();
      l.halo.destroy();
    }
    this.lit.clear();
  }
}
