// Jamming: the lute, played anywhere from the lute button (or key 9), and the
// Home's piano and harp, sat at with E. Its overlay (JamScene) is a row of
// eight bell pads, keys 1 to 8, all on one pentatonic scale (audio/sfx.ts
// JAM_SCALE) so anything played sounds sweet, and anything played together
// does too. Each note rings out, floats up as a little coloured note over the
// player, and goes to the room, where friends hear it and see it rise over
// them: a jam round the campfire.

import Phaser from 'phaser';
import { sound } from '../../audio';
import { session, type Msg } from '../../net/session';
import type { WorldScene } from '../../scenes/WorldScene';

export type Instrument = 0 | 1 | 2;
export const INSTRUMENTS = ['Lute', 'Harp', 'Piano'] as const;

/** Each note's colour, low to high: a rainbow from rose to violet. */
export const NOTE_TINTS = [0xff7a9a, 0xff9a6a, 0xffc84a, 0xb8e85a, 0x6ae0a8, 0x6ac8ff, 0x8a9aff, 0xc88aff];
export const NOTES = NOTE_TINTS.length;

/** How far off a friend's note is still heard, px. */
const HEAR = 520;
/** How long a note floats up, ms, and how high. */
const FLOAT_MS = 1500;
const FLOAT_UP = 26;

/** The overlay and the world share this: what's open, and the notes pressed since the world last looked. */
export const jamHud = {
  open: false,
  inst: 0 as Instrument,
  /** Notes pressed on the pads or keys, waiting to be played. */
  queue: [] as number[],
  /** The Stop button or Esc. */
  stop: false,
  /** When each pad last rang (scene time, ms), for its glow: this player's notes and friends' alike. */
  rang: new Array<number>(NOTES).fill(-1e9),
};

export class Jam {
  private off: (() => void) | null = null;

  constructor(private world: WorldScene) {
    if (session.active) this.off = session.on((m) => this.receive(m));
  }

  /** Play this player's note at (x, y): heard, seen and sent. */
  play(inst: Instrument, n: number, x: number, y: number): void {
    if (n < 0 || n >= NOTES) return;
    sound.jamNote(inst, n, this.world.pan(x));
    this.float(n, x, y);
    jamHud.rang[n] = this.world.time.now;
    if (session.active) session.send({ t: 'jn', i: inst, n });
  }

  private receive(m: Msg): void {
    if (m.t !== 'jn' || m.f === undefined) return;
    const at = this.world.netPlay?.peerAt(m.f);
    const n = Number(m.n);
    const inst = Number(m.i);
    if (!at || !(n >= 0 && n < NOTES) || !(inst >= 0 && inst < INSTRUMENTS.length)) return;
    const me = this.world.player;
    if (Math.hypot(at.x - me.x, at.y - me.y) > HEAR) return;
    sound.jamNote(inst, n, this.world.pan(at.x));
    this.float(n, at.x, at.y);
    if (jamHud.open) jamHud.rang[n] = this.world.time.now;
  }

  /** A little note in the note's colour, floating up from over the player's head and swaying as it fades. */
  private float(n: number, x: number, y: number): void {
    const w = this.world;
    const img = w.add
      .image(Math.round(x) + Phaser.Math.Between(-6, 6), Math.round(y) - 36, 'hl_pastime', `note${n % 3}`)
      .setTint(NOTE_TINTS[n])
      .setDepth(y + 60)
      .setBlendMode(Phaser.BlendModes.NORMAL);
    const glow = w.add.image(img.x, img.y, 'glow').setTint(NOTE_TINTS[n]).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35).setDepth(y + 59.9);
    const x0 = img.x;
    const y0 = img.y;
    const sway = Phaser.Math.FloatBetween(0.6, 1.2) * (Math.random() < 0.5 ? -1 : 1);
    w.tweens.addCounter({
      from: 0,
      to: 1,
      duration: FLOAT_MS,
      ease: 'Sine.Out',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const px = Math.round(x0 + Math.sin(t * Math.PI * 2) * 3 * sway);
        const py = Math.round(y0 - t * (FLOAT_UP + n * 1.5));
        const a = t < 0.12 ? t / 0.12 : 1 - Math.max(0, (t - 0.5) / 0.5);
        img.setPosition(px, py).setAlpha(a);
        glow.setPosition(px, py).setAlpha(a * 0.5);
      },
      onComplete: () => {
        img.destroy();
        glow.destroy();
      },
    });
  }

  destroy(): void {
    this.off?.();
    this.off = null;
    jamHud.open = false;
    jamHud.queue.length = 0;
  }
}
