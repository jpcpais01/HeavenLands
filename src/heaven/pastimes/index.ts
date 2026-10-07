// Heaven Lands' pastimes, plugged into the world through `cozy.pastimes`
// (game/cozy.ts): the little things to do besides building, farming, fishing
// and cooking. Every one is reached with E or the touch button, like the farm:
//
// - Sitting on any seat that's built (benches and sofas seat two), seen by
//   friends; E again or walking off stands up.
// - Sleeping in a bed by night: the world fades out and wakes at morning.
// - Jamming: the lute anywhere from its button, or sat at the piano or the
//   harp; friends nearby hear every note (jam.ts, scenes/JamScene.ts).
// - Stargazing at the telescope by night: join the stars into the twelve
//   constellations and keep them in a star chart (stars.ts, scenes/StarScene.ts).
// - Beehives fill with honey (hives.ts), and good things lie about each
//   place to be foraged (forage.ts), both for the kitchen's new dishes.

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

type Doing =
  | { kind: 'seat'; spot: Spot; from: { x: number; y: number } }
  | { kind: 'play'; spot: Spot; from: { x: number; y: number } }
  | { kind: 'gaze'; spot: Spot; from: { x: number; y: number } }
  | { kind: 'jam' }
  | { kind: 'sleep'; spot: Spot; t: number; zT: number; woke: boolean };

type Near = { spot: Spot } | { find: Find } | { honey: string; spot: Spot } | null;

const ICONS: Record<string, string> = { seat: 'icon_sit', bed: 'icon_sleep', piano: 'icon_music', harp: 'icon_music', telescope: 'icon_stars' };
const LABELS: Record<string, string> = { seat: 'E: SIT', bed: 'E: SLEEP', piano: 'E: PLAY', harp: 'E: PLAY', telescope: 'E: STARGAZE' };

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

  constructor(
    private world: WorldScene,
    private at: CozySpot,
  ) {
    warmPastimes(world);
    this.jam = new Jam(world);
    this.hives = at.land ? new Hives(world, at.arena, at.owner) : null;
    const field = at.arena === 'home' ? null : new ForageField(world, at.arena);
    this.forage = field?.any ? field : null;
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

    if (pastimeHud.jam) {
      pastimeHud.jam = false;
      if (this.doing?.kind === 'jam') this.stop();
      else if (!this.doing && this.free()) this.startJam();
    }
    this.follow(hero, dt, daylight);

    pastimeHud.busy = !!this.doing && this.doing.kind !== 'seat';
    pastimeHud.jamming = this.doing?.kind === 'jam' || this.doing?.kind === 'play';
    this.near = this.doing || !this.free() ? null : this.lookAround(hero.x, hero.y);
    const n = this.near;
    pastimeHud.near = !n ? '' : 'find' in n ? `find_${n.find.def.id}` : 'honey' in n ? 'find_honey' : ICONS[n.spot.kind];
    this.showLabel();
  }

  /** Nothing else has the hero: no build mode, no rod out, nothing the farm would do here. */
  private free(): boolean {
    return !build.on && !fishHud.active && !homeAct.near;
  }

  /** Keep up whatever is going on: the pose held, the overlay's notes played, the night slept through. */
  private follow(hero: Wanderer, dt: number, daylight: number): void {
    const d = this.doing;
    if (!d) return;
    if (d.kind === 'sleep') {
      this.sleeping(hero, d, dt);
      return;
    }
    const pose = d.kind === 'seat' ? 'seat' : d.kind === 'play' ? 'play' : d.kind === 'gaze' ? 'gaze' : 'strum';
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
    if (!best) return null;
    if (best.kind === 'hive') return { honey: this.hives!.ready(best.thing)!, spot: best };
    return { spot: best };
  }

  act(): boolean {
    const hero = this.hero;
    if (!hero) return false;
    if (this.doing) {
      // E again: stand up, put the lute away, step away from the telescope. Asleep, nothing stirs.
      if (this.doing.kind !== 'sleep') this.stop();
      return true;
    }
    const n = this.near;
    if (!n) return false;
    if ('find' in n) {
      this.forage?.pick(n.find);
      return true;
    }
    if ('honey' in n) return this.hives?.collect(n.honey) ?? false;
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
      case 'bed':
        if (daylight > SLEEPY) {
          this.say('NOT SLEEPY YET', 0xffe8b0);
          return true;
        }
        this.doze(hero, s);
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

  /** Feet onto the seat (or the stool at the keys). */
  private place(hero: Wanderer, s: Spot): void {
    hero.x = s.x;
    hero.y = s.y;
  }

  // ---------------------------------------------------------------- Sleep

  private doze(hero: Wanderer, s: Spot): void {
    this.doing = { kind: 'sleep', spot: s, t: 0, zT: 0, woke: false };
    hero.x = s.x;
    hero.y = s.y;
    sound.sleep();
    this.world.cameras.main.fadeOut(DOZE_MS, 8, 8, 24);
  }

  private sleeping(hero: Wanderer, d: Extract<Doing, { kind: 'sleep' }>, dt: number): void {
    const w = this.world;
    const s = d.spot;
    d.t += dt;
    // Tucked in: hidden in the bed, and staying there whatever's pressed.
    hero.x = s.x;
    hero.y = s.y;
    hero.alpha = d.woke ? 1 : 0;
    if ((d.zT -= dt) <= 0 && !d.woke) {
      d.zT = 520;
      this.zee((s.x0 + s.x1) / 2, s.y0 + 4);
    }
    if (!d.woke && d.t >= DOZE_MS + DARK_MS) {
      d.woke = true;
      // Morning, unless it's a friend's home: their clock keeps the time, so it was only a nap.
      if (!daynight.follower && daynight.enabled) {
        if (daynight.auto) daynight.adopt('morning', true, 120_000);
        else daynight.set('morning');
        PHASES.forEach((p, i) => (daynight.mix[i] = p === 'morning' ? 1 : 0));
      }
      w.cameras.main.fadeIn(WAKE_MS, 8, 8, 24);
      sound.wake();
    }
    if (d.woke && d.t >= DOZE_MS + DARK_MS + WAKE_MS * 0.6) {
      this.doing = null;
      this.say(daynight.follower ? 'WHAT A LOVELY NAP' : 'GOOD MORNING', 0xffe0a0);
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
      return;
    }
    if (hero.posing) hero.release();
    if ('from' in d) {
      hero.x = d.from.x;
      hero.y = d.from.y;
    }
    this.closeOverlays();
  }

  private closeOverlays(): void {
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
    const n = this.near;
    const text = !controls.mouse || !n ? '' : 'find' in n ? 'E: PICK UP' : 'honey' in n ? 'E: HONEY' : LABELS[n.spot.kind];
    if (text !== this.labelFor) {
      this.labelFor = text;
      this.label.setText(text).setTint(n && 'find' in n ? 0xc8ff8a : n && 'honey' in n ? 0xffd860 : 0xffe8c0);
    }
    this.label.setVisible(!!text);
    if (!text || !n) return;
    const x = 'find' in n ? n.find.x : (n.spot.x0 + n.spot.x1) / 2;
    const y = 'find' in n ? n.find.y - 16 : n.spot.y0 - 22;
    this.label.setPosition(Math.round(x), Math.round(y + Math.sin(this.world.time.now * 0.004) * 1.5));
  }

  destroy(): void {
    this.doing = null;
    this.closeOverlays();
    this.jam.destroy();
    this.hives?.destroy();
    this.forage?.destroy();
    this.label.destroy();
    pastimeHud.near = '';
    pastimeHud.busy = false;
    pastimeHud.jamming = false;
    pastimeHud.jam = false;
  }
}
