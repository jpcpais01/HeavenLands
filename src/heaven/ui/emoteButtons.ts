// The emote buttons on Heaven Lands' play HUD, where Myths has its ability
// buttons: wave, cheer, dance, sit and a heart, then hug, bow, clap and a sky
// lantern, and the lute for a jam (see pastimes/jam.ts). On a touch screen
// they fan round the bottom-right corner under the thumb, the first five in
// an outer arc and the rest in a smaller inner one; with a mouse they're a
// small row in that corner, with their keys (4 to 9, 0, -, = and L) on them.

import Phaser from 'phaser';
import { DPR as D } from '../../game/display';
import { controls } from '../../game/controls';
import type { CozyHud } from '../../game/cozy';
import { EMOTES, emoteHud, type Emote } from '../Wanderer';
import { pastimeHud } from '../../game/cozy';

/** The fans' reach from the corner, in button radii of the old ability buttons: the outer arc (the first OUTER emotes) and the inner. */
const FAN = 2.05;
const FAN_IN = 1.3;
const OUTER = 5;
/** The inner arc's buttons are this much of the outer's size. */
const INNER_SIZE = 0.75;
/** Each emote's key, in order. */
const KEYS = ['4', '5', '6', '7', '8', '9', '0', '-', '=', 'l'];
/** ms a pressed button stays sunk. */
const PRESS_MS = 160;
const FILL = 0x2a1f33;
const RING = 0xffe2b0;
const LIT = 0xffc861;

/** The buttons: the emotes, then the lute. */
type Button = Emote | 'jam';
const BUTTONS: Button[] = [...EMOTES, 'jam'];

/** 12 x 12 icons: a waving hand, a burst, a note, a cushion, a heart, arms round a heart, a bowing figure, palms meeting, a lantern, a lute. */
const ICONS: Record<Button, string[]> = {
  wave: ['.....w.w....', '....w.ww.w..', '...ww.ww.ww.', '...ww.ww.ww.', '.w.wwwwwwww.', '.wwwwwwwwww.', '..wwwwwwwww.', '..wwwwwwww..', '...wwwwwww..', '....wwwww...', '....wwwww...', '............'],
  cheer: ['.....y......', '.y...y...y..', '..y..y..y...', '...y.w.y....', '....www.....', 'yyywwwwwyyy.', '....www.....', '...y.w.y....', '..y..y..y...', '.y...y...y..', '.....y......', '............'],
  dance: ['......wwwww.', '......wwwww.', '......w...w.', '......w...w.', '......w...w.', '......w...w.', '...www..www.', '..wwwww.www.', '..wwwww.....', '...www......', '............', '............'],
  sit: ['............', '............', '...pppppp...', '..pppppppp..', '.pppwppwppp.', '.pppppppppp.', '.pppwppwppp.', '..pppppppp..', '...pppppp...', '..y......y..', '............', '............'],
  jam: ['.........nn.', '........nnn.', '.......nn...', '......n.....', '..bb.n......', '.blllb......', 'blllllb.....', 'bllhllb.....', 'blllllb.....', '.blllb......', '..bbb.......', '............'],
  heart: ['............', '..rr...rr...', '.rrrr.rrrr..', 'rrwrrrrrrrr.', 'rwrrrrrrrrr.', 'rrrrrrrrrrr.', '.rrrrrrrrr..', '..rrrrrrr...', '...rrrrr....', '....rrr.....', '.....r......', '............'],
  hug: ['............', '...rr..rr...', '..rrrrrrrr..', '..rwrrrrrr..', 'w.rrrrrrrr.w', 'ww.rrrrrr.ww', '.ww.rrrr.ww.', '..ww.rr.ww..', '...wwwwww...', '....wwww....', '............', '............'],
  bow: ['............', '............', '............', '..www.......', '..wwwwwww...', '..wwwwwwwww.', '..ww....www.', '..ww.....w..', '..ww........', '..ww........', '.wwww.......', '............'],
  clap: ['.y........y.', '..y..ww..y..', '....wwww....', 'y..wwwwww..y', '...wwwwww...', '...wwwwww...', '...wwwwww...', '....wwww....', '....wwww....', '.....ww.....', '............', '............'],
  lantern: ['....oooo....', '...oyyyyo...', '..oyyyyyyo..', '..oyyGyyyo..', '..oyyGGyyo..', '...oyyyyo...', '...oyyyyo...', '....oooo....', '.....GG.....', '.....y......', '............', '............'],
};
const PAL: Record<string, string> = { w: '#fff6e4', y: '#ffd66b', p: '#f2a8c4', r: '#ff7aa2', o: '#f0884a', G: '#fff4c8', b: '#b8703a', l: '#f2b86c', h: '#4a2a18', n: '#d89a58' };

function iconArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('hl_emoteicons')) return;
  const tex = scene.textures.createCanvas('hl_emoteicons', 12 * BUTTONS.length, 12)!;
  const g = tex.getContext();
  BUTTONS.forEach((e, i) => {
    ICONS[e].forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (!PAL[ch]) return;
        g.fillStyle = PAL[ch];
        g.fillRect(i * 12 + x, y, 1, 1);
      }),
    );
    tex.add(e, 0, i * 12, 0, 12, 12);
  });
  tex.refresh();
}

export class EmoteButtons implements CozyHud {
  private scene: Phaser.Scene;
  private g: Phaser.GameObjects.Graphics;
  private icons: Phaser.GameObjects.Image[];
  private keys: Phaser.GameObjects.BitmapText[];
  private pressed = new Map<Button, number>();
  private drawn = '';
  private hidden = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    iconArt(scene);
    this.g = scene.add.graphics();
    this.icons = BUTTONS.map((e) => scene.add.image(0, 0, 'hl_emoteicons', e));
    this.keys = BUTTONS.map((_e, i) => scene.add.bitmapText(0, 0, 'pixel', KEYS[i].toUpperCase()).setOrigin(0.5, 0).setTint(0xffe9c8));
    const kb = scene.input.keyboard;
    if (kb) {
      const onKey = (ev: KeyboardEvent) => {
        const i = KEYS.indexOf(ev.key.toLowerCase());
        if (i >= 0 && i < BUTTONS.length && !this.hidden && !pastimeHud.busy) this.press(BUTTONS[i]);
      };
      kb.on('keydown', onKey);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off('keydown', onKey));
    }
  }

  private get R(): number {
    const { width, height } = this.scene.scale;
    return Math.max(42 * D, Math.min(width, height) * 0.13);
  }

  /** Each button's centre and radius. */
  private spots(): { x: number; y: number; r: number }[] {
    const { width, height } = this.scene.scale;
    const R = this.R;
    if (controls.mouse) {
      const r = Math.round(R * 0.3);
      const gap = Math.round(r * 0.6);
      // Two rows in the corner, clear of the hotbar: the first five along the foot, the rest over their right end.
      const step = r * 2 + gap;
      const rowGap = r * 2 + gap + 8 * D;
      return BUTTONS.map((_e, i) => {
        const top = i >= OUTER;
        const n = top ? BUTTONS.length - OUTER : OUTER;
        const j = top ? i - OUTER : i;
        return { x: width - 14 * D - r - (n - 1 - j) * step, y: height - 16 * D - r - (top ? rowGap : 0), r };
      });
    }
    const cx = width - R * 0.55;
    const cy = height - R * 0.55;
    const r = Math.round(R * 0.4);
    const inner = BUTTONS.length - OUTER;
    return BUTTONS.map((_e, i) => {
      const outer = i < OUTER;
      const a = Math.PI + (outer ? i / (OUTER - 1) : (i - OUTER) / (inner - 1)) * (Math.PI / 2);
      const reach = R * (outer ? FAN : FAN_IN);
      return { x: Math.round(cx + Math.cos(a) * reach), y: Math.round(cy + Math.sin(a) * reach), r: outer ? r : Math.round(r * INNER_SIZE) };
    });
  }

  private press(e: Button): void {
    // The lute starts (or ends) a jam; the rest are emotes.
    if (e === 'jam') pastimeHud.jam = true;
    else emoteHud.want = e;
    this.pressed.set(e, this.scene.time.now);
  }

  pointerDown(p: Phaser.Input.Pointer): boolean {
    if (this.hidden) return false;
    const spots = this.spots();
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      if (Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) <= s.r * 1.15) {
        this.press(BUTTONS[i]);
        return true;
      }
    }
    return false;
  }

  update(_dt: number, hidden: boolean): void {
    this.hidden = hidden;
    const now = this.scene.time.now;
    const spots = this.spots();
    const sunk = BUTTONS.map((e) => now - (this.pressed.get(e) ?? -1e9) < PRESS_MS);
    const state = `${hidden} ${controls.mouse} ${emoteHud.playing} ${pastimeHud.jamming} ${sunk.join()} ${spots.map((s) => `${s.x},${s.y},${s.r}`).join(' ')}`;
    for (const o of this.icons) o.setVisible(!hidden);
    // The keys only mean something with a keyboard.
    for (const k of this.keys) k.setVisible(!hidden && controls.mouse);
    this.g.setVisible(!hidden);
    if (hidden || state === this.drawn) return;
    this.drawn = state;
    const g = this.g.clear();
    spots.forEach((s, i) => {
      const e = BUTTONS[i];
      const on = e === 'jam' ? pastimeHud.jamming : emoteHud.playing === e;
      const r = sunk[i] ? s.r * 0.9 : s.r;
      g.fillStyle(FILL, on ? 0.7 : 0.45);
      g.fillCircle(s.x, s.y, r);
      g.lineStyle(2 * D, on ? LIT : RING, on ? 0.95 : 0.6);
      g.strokeCircle(s.x, s.y, r);
      const scale = Math.max(1, Math.floor((r * 1.25) / 12));
      this.icons[i].setPosition(s.x, s.y).setScale(sunk[i] ? Math.max(1, scale - 1) || scale : scale);
      const k = this.keys[i];
      k.setScale(Math.max(1, Math.floor(r / 14))).setPosition(s.x, s.y + r + 2 * D);
    });
  }
}
