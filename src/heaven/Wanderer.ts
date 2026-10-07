// The wanderer: Heaven Lands' one character, dressed however the player
// likes. It walks, stands, and makes little emotes (a wave, a cheer, a dance,
// sitting down, a heart, a hug, a bow, a clap, a sky lantern let go) that
// friends in the same room see too. A hug turns to the nearest friend close
// by and wraps its arms round them. No fighting: the world never hands it an
// attack.

import Phaser from 'phaser';
import { snap } from '../game/display';
import { dirOf, sunShadow, SUN_SHADOW_ALPHA } from '../game/Wizard';
import { Vitals } from '../game/combat';
import { sound } from '../audio';
import { stand } from '../game/rest';
import type { Aim, Hero } from '../game/characters';
import type { WorldScene } from '../scenes/WorldScene';
import { ensureWanderer, W_ORIGIN, type Dir } from './art/sheet';
import type { Appearance } from './look';
import { SkyLantern } from './skyLantern';

/** Walking pace, px a second. */
const SPEED = 66;
/** Walk frames where a foot lands. */
const FOOTFALLS = new Set([1, 4]);
/** A stop this long (ms) after the last footfall brings the other foot down too. */
const SETTLE_AFTER = 140;

export type Emote = 'wave' | 'cheer' | 'dance' | 'sit' | 'heart' | 'hug' | 'bow' | 'clap' | 'lantern';
export const EMOTES: Emote[] = ['wave', 'cheer', 'dance', 'sit', 'heart', 'hug', 'bow', 'clap', 'lantern'];
/** A friend this near (px) is hugged: the wanderer turns to face them. */
const HUG_REACH = 30;
/** Emotes that keep going until the wanderer walks off. */
const LASTING = new Set<Emote>(['dance', 'sit']);

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
  private emote: Emote | null = null;
  /** The emote's animation playing (a hug can face left or right). */
  private emoteAnim = '';
  private emotes = 0;
  /** This one is played by this device (the HUD's emotes reach it). */
  private mine: boolean;
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
      if (!moving) this.startEmote(e);
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

  netEmote(tag: string): void {
    const [e, , side] = tag.split(':') as [Emote, string, string?];
    if (EMOTES.includes(e)) this.startEmote(e, side === 'l' ? 'left' : side === 'r' ? 'right' : 'down');
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

  private startEmote(e: Emote, facing?: 'left' | 'right' | 'down'): void {
    this.emote = e;
    // Emotes face the viewer, but a hug faces whoever is being hugged.
    const dir = e === 'hug' ? (facing ?? (this.mine ? this.hugSide() : 'down')) : 'down';
    this.dir = dir;
    this.emoteAnim = `${this.key}_${e}_${dir}`;
    this.body.play(this.emoteAnim);
    if (this.mine) {
      this.emotes++;
      this.emoteTag = `${e}:${this.emotes}${dir === 'left' ? ':l' : dir === 'right' ? ':r' : ''}`;
      emoteHud.playing = e;
      this.world.petReact(e);
    }
    if (e === 'wave' || e === 'cheer') this.float(e === 'wave' ? 'star' : 'spark', 1);
    if (e === 'lantern') this.world.addEffect(new SkyLantern(this.world, this.x, this.y, () => ({ x: this.x, y: this.y })));
  }

  private endEmote(): void {
    this.emote = null;
    if (this.mine) emoteHud.playing = null;
    this.body.play(`${this.key}_idle_${this.dir}`);
  }

  /** A few little things floating up over the head. */
  private float(frame: string, n: number): void {
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
    this.body.setPosition(rx, ry).setDepth(ry).setAlpha(this.alpha);
    this.glowLayer.setPosition(rx, ry).setDepth(ry + 0.1).setFrame(frame).setAlpha(this.alpha);
    this.shadow.setPosition(rx, ry - 1).setAlpha(this.alpha);
    this.castShadow.setPosition(rx, ry - 1).setFrame(frame).setAlpha(SUN_SHADOW_ALPHA * this.daylight * this.alpha);
  }
}
