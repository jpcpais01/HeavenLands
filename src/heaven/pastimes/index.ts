// Heaven Lands' pastimes, plugged into the world through `cozy.pastimes`
// (game/cozy.ts): the little things to do besides building, farming, fishing
// and cooking. Every one is reached with E or the touch button, like the farm:
//
// - Sitting on any seat that's built (benches and sofas seat two), seen by
//   friends; E again or walking off stands up.
// - Lying in a bed, any time, tucked in and looking about; by night E (or the
//   touch button) from there sleeps: the world fades out and wakes at
//   morning, still in bed. E by day or walking off gets up.
// - Jamming: the lute anywhere from its button, or sat at the piano or the
//   harp; friends nearby hear every note (jam.ts, scenes/JamScene.ts).
// - Stargazing at the telescope by night: join the stars into the twelve
//   constellations and keep them in a star chart (stars.ts, scenes/StarScene.ts).
// - Beehives fill with honey (hives.ts), and good things lie about each
//   place to be foraged (forage.ts), both for the kitchen's new dishes.
// - Watching the television: E at it sits the wanderer on the best seat
//   facing it (or on the floor in front) and switches it on: real YouTube
//   (ui/screenPanel.ts); sat on a seat facing one, E switches it on from
//   there. Closing it leaves them sat. Friends see the screen lit and get
//   what's put on (screens.ts).
// - The tablet, taken out anywhere from its button (or T): videos, a
//   sketchbook and the sky, the wanderer looking down at it as they use it.
// - Skimming stones: by any open water (a pond laid, the Everwood's streams,
//   a land's sea), E throws a flat stone the longest way across it; it skips
//   as many times as luck and the water allow, and the best is remembered.
// - Toasting marshmallows: E at a campfire or a fireplace sits down with one
//   on a stick over the flames; E again takes it off and eats it, the
//   better for being golden (and not alight). Friends see theirs toasting.

import Phaser from 'phaser';
import { sound } from '../../audio';
import { build } from '../../game/build';
import { controls } from '../../game/controls';
import { pastimeHud, type CozyPastimes, type CozySpot } from '../../game/cozy';
import { daynight, PHASES } from '../../game/daynight';
import { homeAct } from '../../game/farm';
import { fishHud } from '../../game/fish';
import type { WorldScene } from '../../scenes/WorldScene';
import { Wanderer } from '../Wanderer';
import { starHud } from '../scenes/StarScene';
import { warmPastimes } from './art';
import { ForageField, type Find } from './forage';
import { Hives } from './hives';
import { Jam, jamHud, type Instrument } from './jam';
import { findSpots, reachOf, type Spot } from './spots';
import { Screens } from './screens';
import { openScreen, type Clip, type ScreenHandle } from '../ui/screenPanel';
import { CELL } from '../../world/homeLayout';
import { BANKED } from '../Wanderer';
import { ALIGHT, GOLDEN, SKIP_FIRST, skipPath } from '../toys';

/** How often the built things are looked over again for seats and the rest, ms. */
const SPOTS_MS = 500;
/** How near a thing the hero's feet must be to use it, px. */
const REACH = 14;
/** A seat counts as taken when a friend's feet are this near its place, px. */
const TAKEN = 4;
/** Too light to sleep, and dark enough for the stars (the day/night scale, 0 night .. 1 day). */
const SLEEPY = 0.6;
const STARRY = 0.3;
/** Sleeping: the fade out, the night going by in the dark, the fade in, ms. */
const DOZE_MS = 1100;
const DARK_MS = 1400;
const WAKE_MS = 1300;
/** Moved this far off a pastime's spot (travelled away: a campfire on the map), it ends there, nowhere else, px. */
const LEFT = 24;
/** A seat faces a television when it's turned toward it, this far either side of its width and this many cells in front, px. */
const TV_SIDE = 12;
const TV_FAR = 7 * CELL;
/** With no seat, the floor in front of the television this far below it, px. */
const TV_FLOOR = 12;
/** E's label over a television stands clear of its aerials, px above its footprint. */
const TV_LABEL = 38;
/** How often the water round the hero is looked over for a stone's throw (ms), the ways tried, and how far out a run of water is followed (px). */
const SKIM_MS = 300;
const SKIM_WAYS = 16;
const SKIM_FAR = 96;
const SKIM_STEP = 6;
/** The fewest steps of open water ahead worth a throw. */
const SKIM_RUN = 3;
/** Skips a throw is good for: 1 plus an exponential share this big, at most SKIP_MOST (the water may cut it short). */
const SKIP_LUCK = 3.2;
const SKIP_MOST = 15;
/** The best throw yet, kept on the device (and in the cloud save). */
const SKIPS_KEY = 'pixel-battle.skips';

type Doing =
  | { kind: 'seat'; spot: Spot; from: { x: number; y: number } }
  | { kind: 'play'; spot: Spot; from: { x: number; y: number } }
  | { kind: 'gaze'; spot: Spot; from: { x: number; y: number } }
  | { kind: 'lie'; spot: Spot; from: { x: number; y: number } }
  | { kind: 'jam' }
  // `tucked`: seen asleep in the bed (else, a bed turned away, hidden in it).
  | { kind: 'sleep'; spot: Spot; from: { x: number; y: number }; t: number; zT: number; woke: boolean; tucked: boolean }
  | { kind: 'watch'; spot: Spot; tv: Spot; from: { x: number; y: number }; pose: 'seat' | 'sit' }
  | { kind: 'pad' }
  | { kind: 'roast'; spot: Spot; from: { x: number; y: number } };

type Near = { spot: Spot } | { find: Find } | { honey: string; spot: Spot } | { skim: number } | null;

const PHASE_NAMES: Record<string, string> = { morning: 'Morning', day: 'Daytime', sunset: 'Sunset', night: 'Night' };
const ICONS: Record<string, string> = { seat: 'icon_sit', bed: 'icon_sleep', piano: 'icon_music', harp: 'icon_music', telescope: 'icon_stars', tv: 'icon_tv', fire: 'icon_mallow' };
const LABELS: Record<string, string> = { seat: 'E: SIT', bed: 'E: SLEEP', piano: 'E: PLAY', harp: 'E: PLAY', telescope: 'E: STARGAZE', tv: 'E: WATCH TV', fire: 'E: TOAST A MARSHMALLOW' };

export class Pastimes implements CozyPastimes {
  private spots: Spot[] = [];
  private spotsT = 0;
  private doing: Doing | null = null;
  private near: Near = null;
  private jam: Jam;
  private hives: Hives | null;
  private forage: ForageField | null;
  private label: Phaser.GameObjects.BitmapText;
  private labelFor = '';
  private daylight = 1;
  private screens: Screens;
  /** The television or the tablet open over the game. */
  private screen: ScreenHandle | null = null;
  /** Sat on a seat facing a television: E switches it on. */
  private seatTv: Spot | null = null;
  /** The way a stone would be skimmed from here (radians), or null with no open water near; looked over now and then. */
  private skim: number | null = null;
  private skimT = 0;

  constructor(
    private world: WorldScene,
    private at: CozySpot,
  ) {
    warmPastimes(world);
    this.jam = new Jam(world);
    this.hives = at.land ? new Hives(world, at.arena, at.owner) : null;
    const field = at.arena === 'home' ? null : new ForageField(world, at.arena);
    this.forage = field?.any ? field : null;
    this.screens = new Screens(world);
    this.screens.onFollow = (clip, at) => this.screen?.follow(clip, at);
    this.label = world.add.bitmapText(0, 0, 'pixel', '').setLetterSpacing(-1).setOrigin(0.5, 1).setDepth(10002).setVisible(false);
  }

  private get hero(): Wanderer | null {
    const h = this.world.player;
    return h instanceof Wanderer ? h : null;
  }

  update(dt: number, daylight: number): void {
    const hero = this.hero;
    if (!hero) return;
    this.daylight = daylight;
    if (this.at.land && (this.spotsT -= dt) <= 0) {
      this.spotsT = SPOTS_MS;
      this.spots = findSpots(this.at.land);
      this.hives?.sync(this.at.land);
    }
    this.hives?.update(dt, daylight, this.world.viewRect);
    this.forage?.update(dt, daylight);
    this.screens.update(dt, this.spots, this.at.land);

    if (pastimeHud.jam) {
      pastimeHud.jam = false;
      if (this.doing?.kind === 'jam') this.stop();
      // (The farm's E nearby doesn't stop the lute: it has its own button.)
      else if (!this.doing && !build.on && !fishHud.active) this.startJam();
    }
    if (pastimeHud.pad) {
      pastimeHud.pad = false;
      if (this.doing?.kind === 'pad') this.stop();
      else if (!this.doing && !build.on && !fishHud.active) this.startPad(hero);
    }
    this.follow(hero, dt, daylight);

    pastimeHud.busy = !!this.doing && this.doing.kind !== 'seat' && this.doing.kind !== 'lie' && this.doing.kind !== 'roast';
    pastimeHud.asleep = this.doing?.kind === 'sleep' && !this.doing.woke;
    pastimeHud.jamming = this.doing?.kind === 'jam' || this.doing?.kind === 'play';
    pastimeHud.tablet = this.doing?.kind === 'pad';
    if ((this.skimT -= dt) <= 0) {
      this.skimT = SKIM_MS;
      this.skim = this.at.land ? this.throwFrom(hero.x, hero.y) : null;
    }
    this.near = this.doing || !this.free() ? null : this.lookAround(hero.x, hero.y);
    this.seatTv = this.doing?.kind === 'seat' ? this.tvFacing(this.doing.spot) : null;
    const n = this.near;
    pastimeHud.near = this.seatTv ? ICONS.tv : !n ? '' : 'find' in n ? `find_${n.find.def.id}` : 'honey' in n ? 'find_honey' : 'skim' in n ? 'icon_stone' : ICONS[n.spot.kind];
    // Lying in bed by night, the touch button sleeps (by day, walking off gets up); at the fire, it eats the marshmallow.
    if (this.lying() === 'sleep') pastimeHud.near = 'icon_sleep';
    if (this.doing?.kind === 'roast') pastimeHud.near = 'icon_mallow';
    this.showLabel();
  }

  get engaged(): boolean {
    return !!this.doing;
  }

  /** Lying awake in bed: what E does from there now (sleep by night, get up by day). */
  private lying(): 'sleep' | 'up' | null {
    if (this.doing?.kind !== 'lie') return null;
    return this.daylight <= SLEEPY && this.free() ? 'sleep' : 'up';
  }

  /** Nothing else has the hero: no build mode, no rod out, nothing the farm would do here. */
  private free(): boolean {
    return !build.on && !fishHud.active && !homeAct.near;
  }

  /** Keep up whatever is going on: the pose held, the overlay's notes played, the night slept through. */
  private follow(hero: Wanderer, dt: number, daylight: number): void {
    const d = this.doing;
    if (!d) return;
    // Taken far off the spot (travelled from the map): the pastime ends where they are now.
    if ('spot' in d && Math.hypot(hero.x - d.spot.x, hero.y - d.spot.y) > LEFT) {
      this.drop(hero, d);
      return;
    }
    if (d.kind === 'sleep') {
      this.sleeping(hero, d, dt);
      return;
    }
    // Building started on a seat (the tray's B): up first.
    if (build.on) {
      this.stop();
      return;
    }
    const pose = poseOf(d);
    // Walked off (or anything else took the pose): the pastime ends with it.
    if (hero.posing !== pose) {
      this.stop();
      return;
    }
    if (d.kind === 'jam' || d.kind === 'play') {
      const inst = jamHud.inst;
      for (const n of jamHud.queue.splice(0)) this.jam.play(inst, n, hero.x, hero.y);
      if (jamHud.stop) this.stop();
    } else if (d.kind === 'gaze') {
      if (starHud.close || daylight > STARRY + 0.2) this.stop();
    }
  }

  /** What E would do here: a find to pick first, else the nearest thing in reach. */
  private lookAround(x: number, y: number): Near {
    const f = this.forage?.nearest(x, y);
    if (f) return { find: f };
    let best: Spot | null = null;
    let bd = REACH;
    const friends = this.world.netPlay?.targets() ?? [];
    for (const s of this.spots) {
      const d = reachOf(s, x, y);
      if (d >= bd) continue;
      if (s.kind === 'hive' && !this.hives?.ready(s.thing)) continue;
      if (friends.some((t) => Math.hypot(t.x - s.x, t.y - s.y) < TAKEN)) continue;
      // Of a seat's two places, the nearer one.
      if (best && best.kind === 'seat' && s.kind === 'seat' && best.thing === s.thing && Math.hypot(best.x - x, best.y - y) < Math.hypot(s.x - x, s.y - y)) continue;
      bd = d;
      best = s;
    }
    if (!best) return this.skim !== null ? { skim: this.skim } : null;
    if (best.kind === 'hive') return { honey: this.hives!.ready(best.thing)!, spot: best };
    return { spot: best };
  }

  act(): boolean {
    const hero = this.hero;
    if (!hero) return false;
    if (this.doing) {
      const d = this.doing;
      // Sat facing a television: E switches it on from the seat.
      if (d.kind === 'seat' && this.seatTv) {
        this.watch(hero, this.seatTv, d.spot, d.from);
        return true;
      }
      // At the fire, E takes the marshmallow off the stick and eats it (walking off gets up).
      if (d.kind === 'roast') {
        this.eat(hero);
        return true;
      }
      // E again: stand up, get out of bed, put the lute away, step away from the telescope. Asleep, nothing stirs.
      if (d.kind === 'lie' && this.lying() === 'sleep') this.doze(hero, d.spot, d.from);
      else if (d.kind !== 'sleep') this.stop();
      return true;
    }
    const n = this.near;
    if (!n) return false;
    if ('find' in n) {
      this.forage?.pick(n.find);
      return true;
    }
    if ('honey' in n) return this.hives?.collect(n.honey) ?? false;
    if ('skim' in n) {
      this.throwStone(hero, n.skim);
      return true;
    }
    const s = n.spot;
    const from = { x: hero.x, y: hero.y };
    const daylight = this.daylight;
    switch (s.kind) {
      case 'seat':
        this.place(hero, s);
        hero.hold('seat', s.dir, s.lift, s.depth);
        sound.sitDown(this.world.pan(s.x));
        this.doing = { kind: 'seat', spot: s, from };
        return true;
      case 'piano':
      case 'harp':
        this.place(hero, s);
        hero.hold('play', s.dir);
        this.doing = { kind: 'play', spot: s, from };
        this.openJam(s.kind === 'piano' ? 2 : 1);
        return true;
      case 'telescope':
        if (daylight > STARRY) {
          this.say('THE STARS COME OUT AT NIGHT', 0xc8d0ff);
          return true;
        }
        this.place(hero, s);
        hero.hold('gaze', 'up');
        sound.telescope();
        this.doing = { kind: 'gaze', spot: s, from };
        starHud.close = false;
        this.world.scene.launch('stars');
        return true;
      case 'tv':
        this.watch(hero, s, this.bestSeat(s), from);
        return true;
      case 'fire':
        this.place(hero, s);
        hero.hold('roast', 'up');
        sound.sitDown(this.world.pan(s.x));
        this.doing = { kind: 'roast', spot: s, from };
        return true;
      case 'bed':
        // A bed facing us: in and tucked up, any time of day (sleep is a second E, by night).
        if (s.rest) {
          this.place(hero, s);
          hero.hold('lie', 'down', s.lift, s.depth);
          sound.sitDown(this.world.pan(s.x));
          this.doing = { kind: 'lie', spot: s, from };
          return true;
        }
        if (daylight > SLEEPY) {
          this.say('NOT SLEEPY YET', 0xffe8b0);
          return true;
        }
        this.doze(hero, s, from);
        return true;
    }
    return false;
  }

  /** The lute, from its button: strummed where the hero stands. */
  private startJam(): void {
    const hero = this.hero;
    if (!hero) return;
    hero.hold('strum', 'down');
    this.doing = { kind: 'jam' };
    this.openJam(0);
  }

  private openJam(inst: Instrument): void {
    jamHud.inst = inst;
    jamHud.queue.length = 0;
    jamHud.stop = false;
    jamHud.open = true;
    this.world.scene.launch('jam');
  }

  // ---------------------------------------------------------------- Stones and marshmallows

  /** Is there water at a world point here? */
  private water(x: number, y: number): boolean {
    const l = this.at.land!;
    return l.isWater(Math.floor((x - l.ox) / CELL), Math.floor((y - l.oy) / CELL));
  }

  /** The way across the most open water from where the hero stands (its first touch must land on water), or null. */
  private throwFrom(x: number, y: number): number | null {
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) near = this.water(x + dx * CELL, y + dy * CELL);
    if (!near) return null;
    let best: number | null = null;
    let run = SKIM_RUN - 1;
    for (let k = 0; k < SKIM_WAYS; k++) {
      const a = (k / SKIM_WAYS) * Math.PI * 2;
      const first = skipPath(x, y, a, 0)[0];
      if (!this.water(first.x, first.y)) continue;
      const cx = Math.cos(a);
      const cy = Math.sin(a) * 0.75;
      let n = 0;
      for (let d = SKIP_FIRST + 6 + SKIM_STEP; d <= SKIM_FAR && this.water(x + cx * d, y + cy * d); d += SKIM_STEP) n++;
      if (n > run) {
        run = n;
        best = a;
      }
    }
    return best;
  }

  /** Skim a stone `angle` across the water: luck says how many skips it's good for, the water how many it gets. */
  private throwStone(hero: Wanderer, angle: number): void {
    if (hero.posing === 'toss') return;
    let skips = Math.min(SKIP_MOST, 1 + Math.floor(-Math.log(1 - Math.random()) * SKIP_LUCK));
    let bank = false;
    const path = skipPath(hero.x, hero.y, angle, skips);
    for (let i = 0; i < path.length; i++) {
      if (this.water(path[i].x, path[i].y)) continue;
      // It meets the shore there: every touch before it was a skip.
      skips = i;
      bank = true;
      break;
    }
    const c = Math.cos(angle);
    const dir = c > 0.6 ? 'right' : c < -0.6 ? 'left' : Math.sin(angle) < 0 ? 'up' : 'down';
    const deg = Math.round(((angle * 180) / Math.PI + 360) % 360);
    hero.onStone = (n, banked) => this.skimmed(n, banked);
    hero.hold('toss', dir, deg, skips + (bank ? BANKED : 0));
  }

  /** The stone's done: how it went, and a new best remembered. */
  private skimmed(n: number, bank: boolean): void {
    let best = 0;
    try {
      best = Number(localStorage.getItem(SKIPS_KEY)) || 0;
    } catch {
      /* no storage: no best kept */
    }
    this.say(n === 0 ? (bank ? 'CLONK!' : 'PLOP!') : `${n} SKIP${n > 1 ? 'S' : ''}!`, n >= 7 ? 0xffd860 : 0xd8f4ff);
    if (n > best && n > 1) {
      try {
        localStorage.setItem(SKIPS_KEY, String(n));
      } catch {
        /* no storage */
      }
      this.world.time.delayedCall(420, () => this.say('NEW BEST!', 0xffe08a));
    }
  }

  /** The marshmallow off the stick and eaten, as toasted as it got; a fresh one goes on. */
  private eat(hero: Wanderer): void {
    const t = hero.roast?.toast ?? 0;
    const [text, tint, tier] =
      t < 0.2 ? ['STILL GOOEY', 0xfff4e0, 0] : t < GOLDEN[0] ? ['LIGHTLY TOASTED', 0xffe8b8, 1] : t <= GOLDEN[1] ? ['PERFECTLY GOLDEN!', 0xffc850, 2] : t < ALIGHT ? ['NICE AND TOASTY', 0xe8b070, 1] : ['A BIT CHARCOAL...', 0xb09484, 0];
    sound.mallowEat(tier);
    this.say(text, tint);
    if (tier === 2) hero.float('heart', 3);
    // A fresh one on the stick (friends see it start again, too).
    hero.hold('roast', 'up');
  }

  // ---------------------------------------------------------------- Screens

  /** A free seat turned toward the television, the nearest its middle and closest in front. */
  private bestSeat(tv: Spot): Spot | null {
    const friends = this.world.netPlay?.targets() ?? [];
    const cx = (tv.x0 + tv.x1) / 2;
    let best: Spot | null = null;
    let score = Infinity;
    for (const s of this.spots) {
      if (s.kind !== 'seat' || this.tvFacing(s) !== tv) continue;
      if (friends.some((t) => Math.hypot(t.x - s.x, t.y - s.y) < TAKEN)) continue;
      const sc = Math.abs(s.x - cx) * 1.5 + (s.y - tv.y1);
      if (sc < score) {
        score = sc;
        best = s;
      }
    }
    return best;
  }

  /** The television a seat looks at: one in front of it, the way it faces (sat with their back to us). */
  private tvFacing(seat: Spot): Spot | null {
    if (seat.dir !== 'up') return null;
    let best: Spot | null = null;
    for (const s of this.spots) {
      if (s.kind !== 'tv') continue;
      if (seat.x < s.x0 - TV_SIDE || seat.x > s.x1 + TV_SIDE) continue;
      const d = seat.y - s.y1;
      if (d < 4 || d > TV_FAR) continue;
      if (!best || d < seat.y - best.y1) best = s;
    }
    return best;
  }

  /** Sit down before the television (on `seat`, else on the floor in front) and switch it on. */
  private watch(hero: Wanderer, tv: Spot, seat: Spot | null, from: { x: number; y: number }): void {
    let spot: Spot;
    if (seat) {
      if (this.doing?.kind !== 'seat' || this.doing.spot !== seat) {
        this.place(hero, seat);
        hero.hold('seat', seat.dir, seat.lift, seat.depth);
        sound.sitDown(this.world.pan(seat.x));
      }
      spot = seat;
    } else {
      // Cross-legged on the floor where they stand, if that's in front of it; else just in front.
      const x = Phaser.Math.Clamp(hero.x, tv.x0 + 2, tv.x1 - 2);
      const y = hero.y > tv.y1 + 4 ? hero.y : tv.y1 + TV_FLOOR;
      spot = { ...tv, kind: 'seat', key: `${tv.key}:floor`, x, y, dir: 'up', lift: 0, depth: 0 };
      this.place(hero, spot);
      hero.hold('sit', 'up');
    }
    this.doing = { kind: 'watch', spot, tv, from, pose: seat ? 'seat' : 'sit' };
    this.screens.watch(tv);
    const shared = this.screens.sharedNear(hero.x, hero.y);
    this.openScreen('tv', shared);
  }

  /** The tablet out of the bag: held up at the chest, its screen over the game. */
  private startPad(hero: Wanderer): void {
    hero.hold('tablet', 'down');
    this.doing = { kind: 'pad' };
    this.openScreen('pad', null);
  }

  private openScreen(kind: 'tv' | 'pad', shared: { clip: Clip; at: number } | null): void {
    const handle: ScreenHandle = openScreen({
      kind,
      shared,
      onPlay: (clip) => kind === 'tv' && this.screens.playing(clip),
      onPlaying: (on) => {
        sound.setHush(on);
        if (!on && kind === 'tv') this.screens.playing(null);
      },
      phase: () => PHASE_NAMES[daynight.enabled ? daynight.phase : 'night'],
      onClose: () => {
        if (this.screen !== handle) return;
        this.screen = null;
        this.screenClosed();
      },
    });
    this.screen = handle;
  }

  /** The screen was closed from itself: off the television they stay sat; the tablet goes away. */
  private screenClosed(): void {
    const d = this.doing;
    if (d?.kind === 'watch') {
      this.screens.watch(null);
      if (d.pose === 'seat') this.doing = { kind: 'seat', spot: d.spot, from: d.from };
      else this.stop();
    } else if (d?.kind === 'pad') this.stop();
  }

  /** Feet onto the seat (or the stool at the keys). */
  private place(hero: Wanderer, s: Spot): void {
    hero.x = s.x;
    hero.y = s.y;
  }

  // ---------------------------------------------------------------- Sleep

  private doze(hero: Wanderer, s: Spot, from: { x: number; y: number }): void {
    const tucked = !!s.rest;
    this.doing = { kind: 'sleep', spot: s, from, t: 0, zT: 0, woke: false, tucked };
    hero.x = s.x;
    hero.y = s.y;
    if (tucked) hero.hold('doze', 'down', s.lift, s.depth);
    sound.sleep();
    this.world.cameras.main.fadeOut(DOZE_MS, 8, 8, 24);
  }

  private sleeping(hero: Wanderer, d: Extract<Doing, { kind: 'sleep' }>, dt: number): void {
    const w = this.world;
    const s = d.spot;
    d.t += dt;
    // Tucked in (eyes shut, or hidden in a bed turned away), and staying there whatever's pressed.
    hero.x = s.x;
    hero.y = s.y;
    hero.alpha = d.woke || d.tucked ? 1 : 0;
    if (d.tucked && !d.woke && hero.posing !== 'doze') hero.hold('doze', 'down', s.lift, s.depth);
    if ((d.zT -= dt) <= 0 && !d.woke) {
      d.zT = 520;
      // Off the pillow: over the sleeper's head, or the middle of the bed's head.
      if (d.tucked) this.zee(s.x + 3, s.y - s.lift - 14);
      else this.zee((s.x0 + s.x1) / 2, s.y0 + 4);
    }
    if (!d.woke && d.t >= DOZE_MS + DARK_MS) {
      d.woke = true;
      // Morning, unless it's a friend's home: their clock keeps the time, so it was only a nap.
      if (!daynight.follower && daynight.enabled) {
        // set() keeps it, so a reload doesn't bring the night back; the clock runs on as it did.
        const auto = daynight.auto;
        daynight.set('morning');
        if (auto) daynight.setAuto(true);
        PHASES.forEach((p, i) => (daynight.mix[i] = p === 'morning' ? 1 : 0));
      }
      const cam = w.cameras.main;
      // Waking still in bed, eyes open, to get up when they like.
      if (d.tucked) hero.hold('lie', 'down', s.lift, s.depth);
      cam.fadeIn(WAKE_MS, 8, 8, 24);
      // A finished fade still draws over the screen every frame till it's cleared.
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => cam.fadeEffect.reset());
      sound.wake();
    }
    if (d.woke && d.t >= DOZE_MS + DARK_MS + WAKE_MS * 0.6) {
      this.doing = d.tucked ? { kind: 'lie', spot: s, from: d.from } : null;
      // A friend's home keeps their clock, and a place of endless night (Starwatch) has no morning: it was a nap.
      this.say(daynight.follower || !daynight.enabled ? 'WHAT A LOVELY NAP' : 'GOOD MORNING', 0xffe0a0);
    }
  }

  /** A sleepy "z" drifting up off the pillow. */
  private zee(x: number, y: number): void {
    const w = this.world;
    const img = w.add.image(Math.round(x) + Phaser.Math.Between(-3, 3), Math.round(y) - 8, 'hl_pastime', 'z').setTint(0xe0e8ff).setDepth(y + 80).setAlpha(0);
    w.tweens.add({
      targets: img,
      y: img.y - 16,
      x: img.x + Phaser.Math.Between(3, 8),
      alpha: { from: 1, to: 0 },
      scale: { from: 0.8, to: 1.3 },
      duration: 1500,
      ease: 'Sine.easeOut',
      onComplete: () => img.destroy(),
    });
  }

  // ---------------------------------------------------------------- Ending

  /** End whatever's going on: up off the seat, the overlay closed, back where they stood. */
  private stop(): void {
    const d = this.doing;
    this.doing = null;
    const hero = this.hero;
    if (!d || !hero) return;
    if (d.kind === 'sleep') {
      hero.alpha = 1;
      this.world.cameras.main.resetFX();
    }
    // Only the pastime's own pose: an emote that took over (a wave from the bench) plays on.
    if (hero.posing === poseOf(d)) hero.release();
    if ('from' in d) {
      hero.x = d.from.x;
      hero.y = d.from.y;
    }
    this.closeOverlays();
  }

  /** Ended by being taken away from it: no going back to where they stood. */
  private drop(hero: Wanderer, d: Doing): void {
    this.doing = null;
    if (d.kind === 'sleep') {
      hero.alpha = 1;
      this.world.cameras.main.resetFX();
    }
    if (hero.posing === poseOf(d)) hero.release();
    this.closeOverlays();
  }

  private closeOverlays(): void {
    const screen = this.screen;
    this.screen = null;
    screen?.close();
    this.screens.watch(null);
    sound.setHush(false);
    const sc = this.world.scene;
    if (sc.isActive('jam')) sc.stop('jam');
    if (sc.isActive('stars')) sc.stop('stars');
    jamHud.open = false;
    jamHud.stop = false;
    jamHud.queue.length = 0;
    starHud.close = false;
  }

  private say(text: string, tint: number): void {
    const h = this.world.player;
    this.world.popNumber(Math.round(h.x), Math.round(h.y) - 40, text, tint);
  }

  /** Over what E would do, with a keyboard (as the farm's). */
  private showLabel(): void {
    const tv = this.seatTv;
    if (tv) {
      const text = controls.mouse ? LABELS.tv : '';
      if (text !== this.labelFor) {
        this.labelFor = text;
        this.label.setText(text).setTint(0xffe8c0);
      }
      this.label.setVisible(!!text);
      this.label.setPosition(Math.round((tv.x0 + tv.x1) / 2), Math.round(tv.y0 - TV_LABEL + Math.sin(this.world.time.now * 0.004) * 1.5));
      return;
    }
    const n = this.near;
    const d = this.doing;
    const lying = this.lying();
    const roasting = d?.kind === 'roast';
    const text = !controls.mouse ? '' : lying ? (lying === 'sleep' ? 'E: SLEEP' : 'E: GET UP') : roasting ? 'E: EAT IT' : !n ? '' : 'find' in n ? 'E: PICK UP' : 'honey' in n ? 'E: HONEY' : 'skim' in n ? 'E: SKIM A STONE' : n.spot.rest ? 'E: LIE DOWN' : LABELS[n.spot.kind];
    if (text !== this.labelFor) {
      this.labelFor = text;
      this.label.setText(text).setTint(n && 'find' in n ? 0xc8ff8a : n && 'honey' in n ? 0xffd860 : n && 'skim' in n ? 0xd8f4ff : 0xffe8c0);
    }
    this.label.setVisible(!!text);
    const spot = d?.kind === 'lie' || d?.kind === 'roast' ? d.spot : n && 'spot' in n ? n.spot : null;
    const skim = n && 'skim' in n;
    if (!text || (!spot && !(n && 'find' in n) && !skim)) return;
    const hero = this.world.player;
    const x = skim ? hero.x : n && 'find' in n ? n.find.x : (spot!.x0 + spot!.x1) / 2;
    const y = skim ? hero.y - 36 : n && 'find' in n ? n.find.y - 16 : spot!.y0 - (spot!.kind === 'tv' ? TV_LABEL : 22);
    this.label.setPosition(Math.round(x), Math.round(y + Math.sin(this.world.time.now * 0.004) * 1.5));
  }

  destroy(): void {
    this.doing = null;
    this.closeOverlays();
    this.jam.destroy();
    this.hives?.destroy();
    this.forage?.destroy();
    this.screens.destroy();
    this.label.destroy();
    pastimeHud.near = '';
    pastimeHud.busy = false;
    pastimeHud.jamming = false;
    pastimeHud.jam = false;
    pastimeHud.asleep = false;
    pastimeHud.tablet = false;
    pastimeHud.pad = false;
  }
}

/** The pose a pastime holds the hero in. */
const POSE_OF: Record<Exclude<Doing['kind'], 'watch'>, string> = { seat: 'seat', play: 'play', gaze: 'gaze', jam: 'strum', lie: 'lie', sleep: 'doze', pad: 'tablet', roast: 'roast' };
const poseOf = (d: Doing): string => (d.kind === 'watch' ? d.pose : POSE_OF[d.kind]);
