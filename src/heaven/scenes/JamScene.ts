// The jam's overlay (see pastimes/jam.ts): eight round bell pads in a gentle
// arc along the bottom of the screen, rose to violet, low to high. Tapping
// one (or keys 1 to 8) plays its note: the pad sinks and flares, a note
// floats off it, and pads ring softly when a friend plays the same note.
// Above them the instrument's name, and a button to stop (or Esc, or walk off).

import Phaser from 'phaser';
import { menuZoom } from '../../game/display';
import { controls } from '../../game/controls';
import { BUTTON_PLAIN, PixelButton, pixelText } from '../../ui/widgets';
import { fpsBottom } from '../../scenes/FpsScene';
import { INSTRUMENTS, NOTES, NOTE_TINTS, jamHud } from '../pastimes/jam';

/** A pad's radius and the gap between pads, in art pixels. */
const PAD_R = 10;
const PAD_GAP = 3;
/** How high the arc rises in its middle. */
const ARC = 6;
/** How long a pad stays lit after it rings, ms. */
const LIT_MS = 420;
const TEXT = 0xfff4d8;
const DIM = 0xc8bce8;

const hexOf = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
const mix = (a: number, b: number, t: number): number => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/** One pad drawn in pixels: a dark rim, a domed face in the note's colour lit from the top left, a pale glint; lit, it's brighter all over. */
function padTexture(scene: Phaser.Scene, i: number, lit: boolean): string {
  const key = `hl_jampad${i}${lit ? 'l' : ''}`;
  if (scene.textures.exists(key)) return key;
  const size = PAD_R * 2 + 2;
  const tex = scene.textures.createCanvas(key, size, size)!;
  const g = tex.getContext();
  const c = NOTE_TINTS[i];
  const deep = mix(c, 0x140c2a, 0.62);
  const rim = mix(c, 0x1a1030, 0.45);
  const mid = lit ? mix(c, 0xffffff, 0.35) : c;
  const hi = mix(c, 0xffffff, lit ? 0.75 : 0.5);
  const lo = mix(c, 0x1a1030, lit ? 0.12 : 0.3);
  const cx = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cx;
      const d = Math.hypot(dx, dy);
      if (d > PAD_R + 0.5) continue;
      let col: number;
      if (d > PAD_R - 0.6) col = deep;
      else if (d > PAD_R - 1.8) col = dy > 2 ? deep : rim;
      else {
        // The face: lit from the top left, a little darker toward its lower edge.
        const shade = (-dx * 0.5 - dy * 0.8) / PAD_R;
        col = shade > 0.35 ? hi : shade < -0.35 ? lo : mid;
        if (Math.hypot(dx + 3.5, dy + 4) < 1.6) col = 0xffffff;
      }
      g.fillStyle = hexOf(col);
      g.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
  return key;
}

interface Pad {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  note: Phaser.GameObjects.Image;
  key: Phaser.GameObjects.BitmapText;
  x: number;
  y: number;
}

export class JamScene extends Phaser.Scene {
  private z = 2;
  private pads: Pad[] = [];
  private title!: Phaser.GameObjects.BitmapText;
  private hint!: Phaser.GameObjects.BitmapText;
  private stopBtn!: PixelButton;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Which pads this player is pressing, by pointer. */
  private held = new Map<number, number>();
  private pressedAt = new Array<number>(NOTES).fill(-1e9);

  constructor() {
    super('jam');
  }

  create(): void {
    this.held.clear();
    this.cameras.main.setOrigin(0, 0);
    this.pads = NOTE_TINTS.map((tint, i) => {
      const glow = this.add.image(0, 0, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(0.6);
      const img = this.add.image(0, 0, padTexture(this, i, false));
      padTexture(this, i, true);
      const note = this.add.image(0, 0, 'hl_pastime', `note${i % 3}`).setTint(mix(tint, 0xffffff, 0.85)).setAlpha(0.9);
      const key = pixelText(this, 0, 0, `${i + 1}`, DIM).setOrigin(0.5, 0);
      img.setInteractive(new Phaser.Geom.Circle(PAD_R + 1, PAD_R + 1, PAD_R + 2), Phaser.Geom.Circle.Contains);
      img.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
        this.held.set(p.id, i);
        this.press(i);
      });
      // Sliding a finger along the pads plays each it reaches, like running a hand along a harp.
      img.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, (p: Phaser.Input.Pointer) => {
        if (p.isDown && this.held.has(p.id) && this.held.get(p.id) !== i) {
          this.held.set(p.id, i);
          this.press(i);
        }
      });
      return { img, glow, note, key, x: 0, y: 0 };
    });
    const up = (p: Phaser.Input.Pointer) => this.held.delete(p.id);
    this.input.on(Phaser.Input.Events.POINTER_UP, up);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, up);
    this.title = pixelText(this, 0, 0, '', TEXT).setOrigin(0.5, 0);
    this.hint = pixelText(this, 0, 0, '', DIM).setOrigin(0.5, 0);
    this.stopBtn = new PixelButton(this, 'Stop playing', 70, 16, BUTTON_PLAIN, 'jam_stop', () => (jamHud.stop = true));
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 12, max: 40 },
      angle: { min: 200, max: 340 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 0.6, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });

    const kb = this.input.keyboard!;
    const onKey = (ev: KeyboardEvent) => {
      if (this.scene.isPaused('world')) return;
      if (ev.key === 'Escape' || ev.key.toLowerCase() === 'l') {
        jamHud.stop = true;
        return;
      }
      const n = Number(ev.key) - 1;
      if (!ev.repeat && n >= 0 && n < NOTES) this.press(n);
    };
    kb.on('keydown', onKey);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown', onKey);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  private press(i: number): void {
    if (this.scene.isPaused('world')) return;
    jamHud.queue.push(i);
    this.pressedAt[i] = this.time.now;
    const p = this.pads[i];
    this.sparks.setParticleTint(NOTE_TINTS[i]);
    this.sparks.explode(5, p.x, p.y - PAD_R + 2);
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.z = menuZoom(width, height);
    this.cameras.main.setZoom(this.z);
    const vw = width / this.z;
    const vh = height / this.z;
    const step = PAD_R * 2 + PAD_GAP;
    const cx = vw / 2;
    // Clear of the joystick's corner on a touch screen: the arc's foot stands a little higher there.
    const base = vh - PAD_R - (controls.mouse ? 12 : 8);
    this.pads.forEach((p, i) => {
      const u = (i + 0.5) / NOTES;
      p.x = Math.round(cx + (i - (NOTES - 1) / 2) * step);
      p.y = Math.round(base - Math.sin(u * Math.PI) * ARC);
      p.img.setPosition(p.x, p.y);
      p.glow.setPosition(p.x, p.y);
      p.note.setPosition(p.x, p.y);
      p.key.setPosition(p.x, p.y + PAD_R + 1).setVisible(controls.mouse);
    });
    const top = Math.min(...this.pads.map((p) => p.y)) - PAD_R;
    this.title.setPosition(Math.round(cx), top - 20);
    this.hint.setPosition(Math.round(cx), top - 11);
    this.stopBtn.place(Math.round((vw - this.stopBtn.boxW) / 2), Math.ceil(fpsBottom() / this.z) + 4);
  }

  update(): void {
    const now = this.time.now;
    this.title.setText(INSTRUMENTS[jamHud.inst].toUpperCase());
    this.hint.setText(controls.mouse ? 'KEYS 1 TO 8' : 'TAP OR SLIDE ALONG THE NOTES');
    this.pads.forEach((p, i) => {
      const since = now - Math.max(this.pressedAt[i], jamHud.rang[i]);
      const lit = since < LIT_MS;
      const k = lit ? 1 - since / LIT_MS : 0;
      p.img.setTexture(padTexture(this, i, k > 0.4));
      const sunk = now - this.pressedAt[i] < 110;
      p.img.setY(p.y + (sunk ? 1 : 0));
      p.note.setY(p.y + (sunk ? 1 : 0) - Math.round(k * 2));
      p.glow.setAlpha(0.15 + k * 0.6).setScale(0.55 + k * 0.25);
    });
  }
}
