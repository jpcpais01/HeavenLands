// The emote buttons on Heaven Lands' play HUD, where Myths has its ability
// buttons: wave, cheer, dance, sit and a heart, then hug, bow, clap, a high
// five and the lute for a jam (see pastimes/jam.ts), the tablet (see
// ui/screenPanel.ts), and the toys: a sky lantern, bubbles, a kite and a
// sparkler (see toys.ts). On a touch screen they fan round the bottom-right
// corner under the thumb, the first five in an outer arc and the next five in
// a smaller inner one, the tablet over the outer arc's top and the toy box
// (a pinwheel) beyond its left end, which opens the toys in a column over it;
// with a mouse they're three small rows in that corner, toys on top, with
// their keys (4 to 9, 0, -, =, H, L, T, O, U, Y) on them.

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
/** Each button's key, in BUTTONS' order (the toy box has none: with a keyboard the toys have their own row). */
const KEYS = ['4', '5', '6', '7', '8', '9', '0', '-', 'h', 'l', 't', '', '=', 'o', 'u', 'y'];
/** ms a pressed button stays sunk. */
const PRESS_MS = 160;
const FILL = 0x2a1f33;
const RING = 0xffe2b0;
const LIT = 0xffc861;

/** The buttons: the emotes of the two arcs, the tablet, the toy box, then the toys in it. */
type Button = Emote | 'jam' | 'pad' | 'toys';
const BUTTONS: Button[] = ['wave', 'cheer', 'dance', 'sit', 'heart', 'hug', 'bow', 'clap', 'highfive', 'jam', 'pad', 'toys', 'lantern', 'bubbles', 'kite', 'sparkler'];
const INNER: Button[] = ['hug', 'bow', 'clap', 'highfive', 'jam'];
const TOY_BOX: Button[] = ['lantern', 'bubbles', 'kite', 'sparkler'];
const ROWS: Button[][] = [['wave', 'cheer', 'dance', 'sit', 'heart'], ['hug', 'bow', 'clap', 'highfive', 'jam', 'pad'], TOY_BOX];
if (EMOTES.some((e) => !BUTTONS.includes(e))) throw new Error('an emote without a button');

/** A pinwheel, the toy box's button: four blades swirling round a pin, on a stick. */
function pinwheel(): string[] {
  const out: string[] = [];
  const blades = ['r', 'y', 'c', 'p'];
  for (let y = 0; y < 12; y++) {
    let row = '';
    for (let x = 0; x < 12; x++) {
      const dx = x + 0.5 - 6;
      const dy = y + 0.5 - 5;
      const r = Math.hypot(dx, dy);
      const a = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
      const q = Math.floor(a / (Math.PI / 2));
      const into = (a % (Math.PI / 2)) / (Math.PI / 2);
      if (r < 1) row += 'G';
      else if (r <= 4.9 && into < 0.25 + (r / 4.9) * 0.6) row += blades[q];
      else if (x === 6 && y >= 6) row += 'b';
      else row += '.';
    }
    out.push(row);
  }
  return out;
}

/** 12 x 12 icons: a waving hand, a burst, a note, a cushion, a heart, arms round a heart, a bowing figure, palms meeting, two palms meeting high, a lantern, a lute, a tablet, a pinwheel, bubbles, a kite, a sparkler. */
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
  pad: ['............', '............', '.wwwwwwwwww.', '.wssssssssw.', '.wsssssyssw.', '.wssssyyysw.', '.wsggsssssw.', '.wgggggsggw.', '.wggggggggw.', '.wwwwwwwwww.', '............', '............'],
  highfive: ['.....yy.....', '.y...yy...y.', '..y......y..', '...ww..ww...', '..wwww.www..', '.wwwww.wwww.', '.wwwwwwwwww.', '..wwwwwwww..', '..wwww.www..', '..www...ww..', '..ww....ww..', '.ww......ww.'],
  bubbles: ['.......cc...', '......c..c..', '......cw.c..', '.......cc...', '.cccc.......', 'c....c......', 'cww..c..cc..', 'cw...c.cw.c.', 'c....c.c..c.', '.cccc...cc..', '............', '............'],
  kite: ['.....r......', '....rry.....', '...rrryy....', '..rrrryyy...', '.rrrrbyyyy..', '..yyyyrrr...', '...yyyrr....', '....yyr.....', '.....b......', '......p.....', '.....p......', '......p.....'],
  sparkler: ['y...w...y...', '..y.w.y.....', '...www......', 'wwwwGwwww...', '...www......', '..y.w.y.....', 'y...ee..y...', '.....e......', '......e.....', '.......e....', '........e...', '.........e..'],
  toys: pinwheel(),
  lantern: ['....oooo....', '...oyyyyo...', '..oyyyyyyo..', '..oyyGyyyo..', '..oyyGGyyo..', '...oyyyyo...', '...oyyyyo...', '....oooo....', '.....GG.....', '.....y......', '............', '............'],
};
const PAL: Record<string, string> = { c: '#a6ecff', e: '#a8aeb8',  s: '#8ab4f0', g: '#9ad870', w: '#fff6e4', y: '#ffd66b', p: '#f2a8c4', r: '#ff7aa2', o: '#f0884a', G: '#fff4c8', b: '#b8703a', l: '#f2b86c', h: '#4a2a18', n: '#d89a58' };

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
  /** The toy box is open (touch only). */
  private open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    iconArt(scene);
    this.g = scene.add.graphics();
    this.icons = BUTTONS.map((e) => scene.add.image(0, 0, 'hl_emoteicons', e));
    this.keys = BUTTONS.map((_e, i) => scene.add.bitmapText(0, 0, 'pixel', KEYS[i].toUpperCase()).setOrigin(0.5, 0).setTint(0xffe9c8));
    const kb = scene.input.keyboard;
    if (kb) {
      const onKey = (ev: KeyboardEvent) => {
        // A held key presses once.
        if (ev.repeat) return;
        const i = ev.key ? KEYS.indexOf(ev.key.toLowerCase()) : -1;
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

  /** Each button's centre and radius, or null where it isn't shown (the toys while their box is shut, the box itself with a mouse). */
  private spots(): ({ x: number; y: number; r: number } | null)[] {
    const { width, height } = this.scene.scale;
    const R = this.R;
    if (controls.mouse) {
      const r = Math.round(R * 0.3);
      const gap = Math.round(r * 0.6);
      // Three rows in the corner, clear of the hotbar, each ending at the right edge: the emotes along the foot, the toys on top.
      const step = r * 2 + gap;
      const rowGap = r * 2 + gap + 8 * D;
      return BUTTONS.map((e) => {
        const row = ROWS.findIndex((list) => list.includes(e));
        if (row < 0) return null;
        const list = ROWS[row];
        const j = list.indexOf(e);
        return { x: width - 14 * D - r - (list.length - 1 - j) * step, y: height - 16 * D - r - row * rowGap, r };
      });
    }
    const cx = width - R * 0.55;
    const cy = height - R * 0.55;
    const r = Math.round(R * 0.4);
    const small = Math.round(r * INNER_SIZE);
    const top = { x: Math.round(cx), y: Math.round(cy - R * FAN) };
    // The toy box beyond the outer arc's left end; open, its toys stand in a column over it.
    const box = { x: Math.round(cx - R * FAN - r - small - 6 * D), y: Math.round(cy) };
    return BUTTONS.map((e, i) => {
      if (e === 'pad') return { x: top.x, y: Math.round(top.y - r - small - 6 * D), r: small };
      if (e === 'toys') return { ...box, r: small };
      const t = TOY_BOX.indexOf(e);
      if (t >= 0) return this.open ? { x: box.x, y: Math.round(box.y - (t + 1) * (small * 2 + 5 * D)), r: small } : null;
      const k = INNER.indexOf(e);
      const outer = k < 0;
      const a = Math.PI + (outer ? i / (OUTER - 1) : k / (INNER.length - 1)) * (Math.PI / 2);
      const reach = R * (outer ? FAN : FAN_IN);
      return { x: Math.round(cx + Math.cos(a) * reach), y: Math.round(cy + Math.sin(a) * reach), r: outer ? r : small };
    });
  }

  private press(e: Button): void {
    // The lute starts (or ends) a jam; the rest are emotes.
    if (e === 'toys') {
      this.open = !this.open;
      this.pressed.set(e, this.scene.time.now);
      return;
    }
    if (e === 'jam') pastimeHud.jam = true;
    else if (e === 'pad') pastimeHud.pad = true;
    else emoteHud.want = e;
    // A toy picked: the box shuts behind it.
    if (TOY_BOX.includes(e)) this.open = false;
    this.pressed.set(e, this.scene.time.now);
  }

  pointerDown(p: Phaser.Input.Pointer): boolean {
    if (this.hidden) return false;
    const spots = this.spots();
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      if (!s) continue;
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
    const state = `${hidden} ${controls.mouse} ${emoteHud.playing} ${pastimeHud.jamming} ${pastimeHud.tablet} ${this.open} ${sunk.join()} ${spots.map((s) => (s ? `${s.x},${s.y},${s.r}` : '-')).join(' ')}`;
    this.icons.forEach((o, i) => o.setVisible(!hidden && !!spots[i]));
    // The keys only mean something with a keyboard.
    this.keys.forEach((k, i) => k.setVisible(!hidden && controls.mouse && !!spots[i]));
    this.g.setVisible(!hidden);
    if (hidden || state === this.drawn) return;
    this.drawn = state;
    const g = this.g.clear();
    spots.forEach((s, i) => {
      if (!s) return;
      const e = BUTTONS[i];
      const toy = emoteHud.playing !== null && TOY_BOX.includes(emoteHud.playing);
      const on = e === 'jam' ? pastimeHud.jamming : e === 'pad' ? pastimeHud.tablet : e === 'toys' ? this.open || toy : emoteHud.playing === e;
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
