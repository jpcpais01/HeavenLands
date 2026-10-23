// The wanderer: Heaven Lands' one character, dressed however the player
// likes. It walks, stands, and makes little emotes (a wave, a cheer, a dance,
// sitting down, a heart, a hug, a bow, a clap, a sky lantern let go, a high
// five) and plays with toys (bubbles, a kite, a sparkler; see toys.ts) that
// friends in the same room see too. A hug or a high five turns to the
// nearest friend close by. No fighting: the world never hands it an attack.

import Phaser from 'phaser';
import { snap } from '../game/display';
import { dirOf, sunShadow, SUN_SHADOW_ALPHA } from '../game/Wizard';
import { Vitals } from '../game/combat';
import { sound } from '../audio';
import { stand } from '../game/rest';
import type { Aim, Hero } from '../game/characters';
import type { WorldScene } from '../scenes/WorldScene';
import { ensureWanderer, W_ORIGIN, WFH, WFW, type Dir } from './art/sheet';
import { ANIMS, BX, BY, HIGHFIVE_MEET, pose, SPARKLER_TIP, TOSS_RELEASE, type AnimName } from './art/rig';
import { makeKit, type Kit, type View } from './art/kit';
import { Bubbles, highFive, Kite, kitePalette, Roast, SkipStone, Sparkler, type Toy } from './toys';

export type { Dir } from './art/sheet';
import type { Appearance } from './look';
import { SkyLantern } from './skyLantern';

/** Walking pace, px a second. */
const SPEED = 66;
/** Walk frames where a foot lands. */
const FOOTFALLS = new Set([1, 4]);
/** A stop this long (ms) after the last footfall brings the other foot down too. */
const SETTLE_AFTER = 140;

export type Emote = 'wave' | 'cheer' | 'dance' | 'sit' | 'heart' | 'hug' | 'bow' | 'clap' | 'lantern' | 'highfive' | 'bubbles' | 'kite' | 'sparkler';
export const EMOTES: Emote[] = ['wave', 'cheer', 'dance', 'sit', 'heart', 'hug', 'bow', 'clap', 'lantern', 'highfive', 'bubbles', 'kite', 'sparkler'];
/** The emotes that are toys, played with till walked off (or pressed again). */
export const TOYS: Emote[] = ['bubbles', 'kite', 'sparkler'];
/** A friend this near (px) is hugged or high-fived: the wanderer turns to face them. */
const HUG_REACH = 30;
/** The poses a pastime holds the wanderer in (see pastimes/): sat on a seat, strumming the lute, at an instrument, at a telescope, in bed, on the tablet, skimming a stone, toasting a marshmallow. */
export type Pose = 'seat' | 'strum' | 'play' | 'gaze' | 'lie' | 'doze' | 'tablet' | 'toss' | 'roast';
const POSES = new Set<string>(['seat', 'strum', 'play', 'gaze', 'lie', 'doze', 'tablet', 'toss', 'roast']);
/** Emotes and poses that keep going until the wanderer walks off. */
const LASTING = new Set<string>(['dance', 'sit', 'seat', 'strum', 'play', 'gaze', 'lie', 'doze', 'tablet', 'bubbles', 'kite', 'sparkler', 'roast']);
/** A skimmed stone's tag carries its throw: the angle in degrees as the lift, the skips (plus BANKED if it lands on the shore) as the depth. */
export const BANKED = 100;

/** A skimmed stone leaves the hand TOSS_RELEASE frames in, at the throw's frame rate. */
const TOSS_FPS = ANIMS.find((a) => a.name === 'toss')!.fps;

/** What the HUD and the keyboard ask for: the emote to make next. */
export const emoteHud = { want: null as Emote | null, playing: null as Emote | null };

/** Little hearts, notes and sparkles floating up from an emote. */
function emoteArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('hl_emote')) return;
  const tex = scene.textures.createCanvas('hl_emote', 32, 8)!;
  const g = tex.getContext();
  const put = (ox: number, rows: string[], pal: Record<string, string>) =>
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (pal[ch]) {
        g.fillStyle = pal[ch];
        g.fillRect(ox + x, y, 1, 1);
      }
    }));
  put(0, ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff6f9c', w: '#ffd0e0' });
  put(8, ['..kkk', '..k.k', '..k.k', 'kkk.k', 'kkkkk', '.k.kk'], { k: '#fff3c4' });
  put(16, ['...w...', '...w...', '.wwyww.', '...w...', '...w...'], { w: '#ffffff', y: '#ffe27a' });
  put(24, ['.y.y.', 'yyyyy', '.yyy.', 'yy.yy'], { y: '#ffe27a' });
  tex.add('heart', 0, 0, 0, 8, 7);
  tex.add('note', 0, 8, 0, 6, 6);
  tex.add('spark', 0, 16, 0, 7, 5);
  tex.add('star', 0, 24, 0, 5, 4);
  tex.refresh();
}

export class Wanderer implements Hero {
  x: number;
  y: number;
  daylight = 0;
  readonly vitals = new Vitals(100);
  alpha = 1;
  emoteTag?: string;
  private dir: Dir = 'down';
  private world: WorldScene;
  private key: string;
  private body: Phaser.GameObjects.Sprite;
  private glowLayer: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private castShadow: Phaser.GameObjects.Sprite;
  private emote: string | null = null;
  /** The emote's animation playing (a hug can face left or right). */
  private emoteAnim = '';
  /** Sat on a seat: drawn this much higher than the feet, and this far in front of them (behind, below 0). */
  private lift = 0;
  private depthOff = 0;
  private emotes = 0;
  /** This one is played by this device (the HUD's emotes reach it). */
  readonly mine: boolean;
  private kit: Kit;
  /** The toy in hand (see toys.ts), while its emote lasts. */
  private toy: Toy | null = null;
  /** Hears how many times this player's skimmed stone skipped, once it's done. */
  onStone: ((skips: number, bank: boolean) => void) | null = null;
  /** The marshmallow on the stick, while toasting one. */
  get roast(): Roast | null {
    return this.toy instanceof Roast ? this.toy : null;
  }
  /** How hard the stick is pushed (0..1): a slow walk treads softer. */
  private pace = 0;
  private moving = false;
  /** ms since a foot last landed. */
  private sinceStep = 0;

  get sprite(): Phaser.GameObjects.Sprite {
    return this.body;
  }

  constructor(world: WorldScene, x: number, y: number, look: Appearance, mine = true) {
    this.world = world;
    this.mine = mine;
    this.x = x;
    this.y = y;
    const k = (this.key = ensureWanderer(world, look));
    this.kit = makeKit(look);
    emoteArt(world);
    const { x: ox, y: oy } = W_ORIGIN;
    this.shadow = world.add.image(x, y, 'shadow').setDepth(1);
    this.castShadow = sunShadow(world.add.sprite(x, y, `${k}_s`, 'idle_down_0').setOrigin(ox, oy));
    this.body = world.add.sprite(x, y, k, 'idle_down_0').setOrigin(ox, oy).setPipeline('Lit');
    this.glowLayer = world.add.sprite(x, y, `${k}_e`, 'idle_down_0').setOrigin(ox, oy).setBlendMode(Phaser.BlendModes.ADD);
    this.body.play(`${k}_idle_down`);
    this.body.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      if (anim.key.startsWith(`${k}_walk`) && FOOTFALLS.has(frame.index - 1) && this.mine) this.footfall(0.6 + 0.4 * this.pace);
      if (anim.key === `${k}_heart_down` && frame.index === 3) this.float('heart', 3);
      if (anim.key === `${k}_dance_down` && frame.index % 4 === 1) this.float('note', 1);
      if (anim.key === `${k}_cheer_down` && frame.index === 3) this.float('spark', 4);
      if (anim.key.startsWith(`${k}_hug_`) && frame.index === 4) {
        this.float('heart', 2);
        sound.hug(this.world.pan(this.x));
      }
      if (anim.key === `${k}_clap_down` && frame.index % 2 === 0) {
        this.float('spark', 1);
        sound.clap(this.world.pan(this.x));
      }
      if (anim.key === `${k}_lantern_down` && frame.index === 5) sound.lanternRise(this.world.pan(this.x));
      if (anim.key.startsWith(`${k}_highfive_`) && frame.index === HIGHFIVE_MEET + 1) {
        // Side on, it's met a friend's palm; facing us, it's thrown up to the sky.
        const side = this.dir !== 'down';
        const h = this.hand(side ? 0 : 1);
        highFive(this.world, h.x, h.y - 1, this.y, side);
        if (side) this.float('star', 2);
      }
    });
    this.body.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (this.emote && anim.key === this.emoteAnim && !LASTING.has(this.emote)) this.endEmote();
    });
    if (mine) world.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      emoteHud.want = null;
      emoteHud.playing = null;
    });
  }

  update(dt: number, mx: number, my: number, _attack: boolean, _special: boolean, bounds: Phaser.Geom.Rectangle, _aim?: Aim | null): void {
    const len = Math.hypot(mx, my);
    const moving = len > 0.18;
    if (this.mine && emoteHud.want) {
      const e = emoteHud.want;
      emoteHud.want = null;
      // A toy pressed again is put away.
      if (!moving) {
        if (e === this.emote && LASTING.has(e)) this.endEmote();
        else this.startEmote(e);
      }
    }
    if (moving && this.emote) this.endEmote();
    this.sinceStep += dt;
    if (moving) this.pace = Math.min(1, len);
    // Coming to a stop, the trailing foot comes down beside the other: a last, softer step.
    else if (this.moving && this.mine && this.sinceStep > SETTLE_AFTER) this.footfall(0.45);
    this.moving = moving;
    if (!this.emote) {
      const speed = SPEED * Math.min(1, len);
      if (moving) {
        this.x = Phaser.Math.Clamp(this.x + (mx / len) * speed * (dt / 1000), bounds.left, bounds.right);
        this.y = Phaser.Math.Clamp(this.y + (my / len) * speed * (dt / 1000), bounds.top, bounds.bottom);
        this.dir = dirOf(mx, my);
      }
      const key = moving ? `${this.key}_walk_${this.dir}` : stand(this.body, `${this.key}_idle_${this.dir}`);
      if (this.body.anims.currentAnim?.key !== key) this.body.play(key, true);
    }
    this.sync();
  }

  private footfall(level: number): void {
    this.sinceStep = 0;
    sound.step(this.world.footing(this.x, this.y), level);
  }

  /** What the wanderer is doing now (an emote or a pastime's pose), or null. */
  get posing(): string | null {
    return this.emote;
  }

  /**
   * Hold a pastime's pose facing `dir` until walked off (or let go):
   * on a seat it's drawn `lift` px up, `depth` px in front of its feet.
   */
  hold(p: Pose | 'sit', dir: Dir = 'down', lift = 0, depth = 0): void {
    this.startEmote(p, dir, lift, depth);
  }

  /** Stand up from a pastime's pose. */
  release(): void {
    if (this.emote) this.endEmote();
  }

  /** Where a hand is in the world now, from the pose of the frame showing: 0 the left (a side view's near one), 1 the right. */
  hand(i: 0 | 1): { x: number; y: number } {
    const anim = this.body.anims.currentAnim;
    const name = anim?.key.slice(this.key.length + 1, anim.key.lastIndexOf('_')) as AnimName | undefined;
    const dir = (anim?.key.slice(anim.key.lastIndexOf('_') + 1) ?? 'down') as Dir;
    const view: View = dir === 'left' || dir === 'right' ? 'side' : dir;
    const p = pose(this.kit, name ?? 'idle', view, Math.max(0, (this.body.anims.currentFrame?.index ?? 1) - 1));
    const fx = BX + p.hands[i].x;
    const fy = BY + p.hands[i].y;
    // Facing right is the left-facing frame mirrored.
    const x = dir === 'right' ? WFW - fx : fx;
    return { x: this.body.x + x - W_ORIGIN.x * WFW, y: this.body.y + fy - W_ORIGIN.y * WFH };
  }

  /** The frame of the animation showing, from 0. */
  private frameIndex(): number {
    return (this.body.anims.currentFrame?.index ?? 1) - 1;
  }

  /** Another player's emote or pose, as their tag says: `<what>.<facing>.<lift>.<depth>:<count>`. */
  netEmote(tag: string): void {
    const [what, d, l, dp] = tag.split(':')[0].split('.');
    const dir = (['down', 'up', 'left', 'right'] as Dir[]).find((x) => x === d) ?? 'down';
    if (what === 'idle') {
      if (this.emote) this.endEmote();
      return;
    }
    if (!EMOTES.includes(what as Emote) && !POSES.has(what)) return;
    if (!this.world.anims.exists(`${this.key}_${what}_${dir}`)) return;
    this.startEmote(what, dir, Number(l) || 0, Number(dp) || 0);
  }

  /** The friend nearest this wanderer within a hug's reach, if any: which side they stand. */
  private hugSide(): 'left' | 'right' | 'down' {
    let best = HUG_REACH;
    let side: 'left' | 'right' | 'down' = 'down';
    for (const m of this.world.mates) {
      const d = Math.hypot(m.x - this.x, (m.y - this.y) * 1.5);
      if (d < best) {
        best = d;
        side = m.x < this.x ? 'left' : 'right';
      }
    }
    return side;
  }

  /** Start an emote (facing the viewer, or a hug facing whoever is hugged) or a pastime's pose facing `facing`. */
  private startEmote(e: string, facing?: Dir, lift = 0, depth = 0): void {
    this.emote = e;
    const emote = EMOTES.includes(e as Emote);
    const faces = e === 'hug' || e === 'highfive';
    const dir: Dir = faces ? (facing ?? (this.mine ? this.hugSide() : 'down')) : emote && e !== 'sit' ? 'down' : (facing ?? 'down');
    this.dir = dir;
    // A skimmed stone's lift and depth are its throw, not where it's drawn.
    const toss = e === 'toss';
    this.lift = toss ? 0 : lift;
    this.depthOff = toss ? 0 : depth;
    this.emoteAnim = `${this.key}_${e}_${dir}`;
    this.body.play(this.emoteAnim);
    if (this.mine) {
      this.emotes++;
      this.emoteTag = `${e}.${dir}.${Math.round(lift)}.${Math.round(depth)}:${this.emotes}`;
      emoteHud.playing = emote ? (e as Emote) : null;
      if (emote) this.world.petReact(e as Emote);
    }
    if (e === 'wave' || e === 'cheer') this.float(e === 'wave' ? 'star' : 'spark', 1);
    if (e === 'lantern') this.world.addEffect(new SkyLantern(this.world, this.x, this.y, () => ({ x: this.x, y: this.y })));
    this.toy?.stop();
    this.toy = this.makeToy(e);
    if (this.toy) this.world.addEffect(this.toy);
    if (toss) {
      const bank = depth >= BANKED;
      const skips = Math.round(depth) % BANKED;
      const done = this.mine ? (n: number) => this.onStone?.(n, bank) : undefined;
      this.world.addEffect(new SkipStone(this.world, this.x, this.y, (lift * Math.PI) / 180, skips, bank, (TOSS_RELEASE / TOSS_FPS) * 1000, done));
    }
  }

  /** The toy an emote or pose takes up, if it's one. */
  private makeToy(e: string): Toy | null {
    const w = this.world;
    if (e === 'bubbles') return new Bubbles(w, this, () => this.frameIndex());
    if (e === 'kite') return new Kite(w, this, kitePalette(this.key));
    if (e === 'roast') return new Roast(w, this);
    if (e === 'sparkler')
      return new Sparkler(w, this, () => {
        const h = this.hand(1);
        return { x: h.x + SPARKLER_TIP.x, y: h.y + SPARKLER_TIP.y };
      });
    return null;
  }

  private endEmote(): void {
    this.emote = null;
    this.toy?.stop();
    this.toy = null;
    this.lift = this.depthOff = 0;
    if (this.mine) {
      emoteHud.playing = null;
      // Friends see them stand up too.
      this.emotes++;
      this.emoteTag = `idle.${this.dir}.0.0:${this.emotes}`;
    }
    this.body.play(`${this.key}_idle_${this.dir}`);
  }

  /** A few little things floating up over the head. */
  float(frame: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const img = this.world.add
        .image(snap(this.x) + Phaser.Math.Between(-7, 7), snap(this.y) - 30 + Phaser.Math.Between(-3, 2), 'hl_emote', frame)
        .setDepth(this.y + 40)
        .setAlpha(0);
      this.world.tweens.add({
        targets: img,
        y: img.y - 14 - Phaser.Math.Between(0, 6),
        x: img.x + Phaser.Math.Between(-4, 4),
        alpha: { from: 1, to: 0 },
        delay: i * 140,
        duration: 1100,
        ease: 'Sine.easeOut',
        onComplete: () => img.destroy(),
      });
    }
  }

  private sync(): void {
    const rx = snap(this.x);
    const ry = snap(this.y);
    const frame = this.body.frame.name;
    const by = ry - this.lift;
    const depth = ry + this.depthOff;
    this.body.setPosition(rx, by).setDepth(depth).setAlpha(this.alpha);
    this.glowLayer.setPosition(rx, by).setDepth(depth + 0.1).setFrame(frame).setAlpha(this.alpha);
    // Up on a seat the seat's own shadow is theirs.
    const ground = this.lift > 0 ? 0 : this.alpha;
    this.shadow.setPosition(rx, ry - 1).setAlpha(ground);
    this.castShadow.setPosition(rx, ry - 1).setFrame(frame).setAlpha(SUN_SHADOW_ALPHA * this.daylight * ground);
  }
}
