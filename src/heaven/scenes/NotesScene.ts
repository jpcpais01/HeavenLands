// The update card (key 'notes', launched by updates.ts over the title
// screen, the Atlas or the pause menu): a parchment card listing what an
// update brings, a little star by each line. Before the update ("coming")
// it offers Update now and Later; after one ("new") a single Lovely. A long
// list scrolls inside the card by dragging or the mouse wheel.

import Phaser from 'phaser';
import { sound } from '../../audio';
import { menuZoom } from '../../game/display';
import { C, CREAM_CARD, PARCHMENT, ROSE_CARD, ROSE_DOWN, drawCard, iconTexture, inkText, inkWidth, moteTexture, panelTexture, softText } from '../art/creatorArt';
import { buildCreatorFonts } from '../art/creatorFont';
import type { PatchNote } from '../patchNotes';
import { putOffUpdate, updateNow, type NotesCard } from '../updates';

const MAX_W = 250;
const PAD = 10;
const HEAD = 30;
const LINE = 10;
/** Space under a note's last line, and under a version's heading. */
const GAP = 4;
const BTN_H = 16;
const BTN_W = 70;
const FOOT = BTN_H + 14;
/** A drag this long (art px) scrolls instead of tapping. */
const DRAG = 4;
/** Sparkles twinkling round the title. */
const SPARKLES = 5;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Button extends Box {
  label: string;
  primary: boolean;
  act: () => void;
}

const inside = (b: Box, x: number, y: number) => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;

/** '2026-10-07' as '7 OCT'. */
const shortDate = (d: string): string => {
  const [, m, day] = d.split('-').map(Number);
  return m && day ? `${day} ${MONTHS[m - 1]}` : '';
};

/** Split text into lines no wider than `w` px of ink. */
function wrap(text: string, w: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && inkWidth(next) > w) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export class NotesScene extends Phaser.Scene {
  private card!: NotesCard;
  private z = 2;
  private vw = 0;
  private vh = 0;
  private shade!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Image;
  private g!: Phaser.GameObjects.Graphics;
  private head: Phaser.GameObjects.GameObject[] = [];
  private body!: Phaser.GameObjects.Container;
  private maskShape!: Phaser.GameObjects.Graphics;
  private sparkles: Phaser.GameObjects.Image[] = [];
  private box: Box = { x: 0, y: 0, w: 0, h: 0 };
  private view: Box = { x: 0, y: 0, w: 0, h: 0 };
  private buttons: Button[] = [];
  private buttonTexts: Phaser.GameObjects.BitmapText[] = [];
  private pressed: Button | null = null;
  private scroll = 0;
  private bodyH = 0;
  private drag: { y: number; scroll: number; moved: boolean } | null = null;
  private busy = false;

  constructor() {
    super('notes');
  }

  create(card: NotesCard): void {
    this.card = card;
    this.busy = false;
    this.scroll = 0;
    this.pressed = null;
    this.drag = null;
    this.head = [];
    this.buttonTexts = [];
    buildCreatorFonts(this);
    this.shade = this.add.rectangle(0, 0, 8, 8, 0x3a2236, 0.45).setOrigin(0).setInteractive();
    this.panel = this.add.image(0, 0, '__DEFAULT').setOrigin(0);
    this.g = this.add.graphics();
    this.body = this.add.container(0, 0);
    this.maskShape = this.make.graphics({}, false);
    this.body.setMask(this.maskShape.createGeometryMask());
    this.sparkles = Array.from({ length: SPARKLES }, (_, i) =>
      this.add.image(0, 0, moteTexture(this), i % 2 ? 'dot' : 'plus').setAlpha(0),
    );

    this.shade.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.scrollTo(this.scroll + dy / this.z / 2));
    const kb = this.input.keyboard;
    kb?.on('keydown-ENTER', () => this.buttons.find((b) => b.primary)?.act());
    kb?.on('keydown-ESC', () => this.buttons[this.buttons.length - 1]?.act());
    // The card has the keys: none reach the scenes beneath (Enter would also set off the title, Esc resume the world).
    kb?.on('keydown', (e: KeyboardEvent) => e.stopPropagation());

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    // Fade the card in over whatever is beneath (a camera fade would cover that too).
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 220, ease: 'Sine.easeOut' });
    this.scene.bringToTop();
    sound.pickup();
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.z = menuZoom(width, height);
    this.vw = Math.ceil(width / this.z);
    this.vh = Math.ceil(height / this.z);
    this.cameras.main.setZoom(this.z).setOrigin(0, 0).setScroll(0, 0);
    this.shade.setSize(this.vw, this.vh);

    const w = Math.min(MAX_W, this.vw - 12);
    const textW = w - 2 * PAD - 8;
    this.fillBody(textW);
    const viewH = Math.max(LINE * 2, Math.min(this.bodyH, this.vh - 12 - HEAD - FOOT));
    const h = HEAD + viewH + FOOT;
    const x = Math.round((this.vw - w) / 2);
    const y = Math.max(4, Math.round((this.vh - h) / 2));
    this.box = { x, y, w, h };
    this.view = { x: x + PAD, y: y + HEAD, w: w - 2 * PAD, h: viewH };
    this.panel.setTexture(panelTexture(this, `notes`, w, h, PARCHMENT)).setPosition(x, y);
    this.maskShape.clear().fillStyle(0xffffff).fillRect(this.view.x, this.view.y, this.view.w, this.view.h);

    // The buttons, centred along the foot.
    const labels: [string, boolean, () => void][] =
      this.card.mode === 'coming'
        ? [
            ['Update now', true, () => this.takeUpdate()],
            ['Later', false, () => this.close()],
          ]
        : [['Lovely', true, () => this.close()]];
    const span = labels.length * BTN_W + (labels.length - 1) * 8;
    const by = y + h - BTN_H - 8;
    this.buttons = labels.map(([label, primary, act], i) => ({ x: Math.round(x + (w - span) / 2) + i * (BTN_W + 8), y: by, w: BTN_W, h: BTN_H, label, primary, act }));

    this.drawHead();
    this.scrollTo(this.scroll);
    this.drawButtons();
  }

  /** The list: each version's heading when there are several, then a star and its wrapped lines per note. */
  private fillBody(textW: number): void {
    this.body.removeAll(true);
    const notes = this.card.notes;
    let y = 0;
    const heading = (n: PatchNote) => {
      const t = inkText(this, 0, y, n.title, C.roseDeep);
      const d = inkText(this, inkWidth(n.title) + 6, y, shortDate(n.date), C.inkFaint);
      this.body.add([t, d]);
      y += LINE + GAP;
    };
    notes.forEach((n, ni) => {
      if (notes.length > 1) heading(n);
      for (const line of n.notes) {
        this.body.add(this.add.image(1, y + 1, iconTexture(this), 'star').setOrigin(0).setScale(0.6));
        for (const part of wrap(line, textW)) {
          this.body.add(inkText(this, 8, y, part));
          y += LINE;
        }
        y += GAP;
      }
      if (ni < notes.length - 1) y += GAP;
    });
    this.bodyH = y - GAP;
  }

  private drawHead(): void {
    for (const o of this.head) o.destroy();
    const { x, y, w } = this.box;
    const title = this.card.mode === 'coming' ? 'A new update is here' : "What's new";
    const first = this.card.notes[0];
    const sub = this.card.notes.length > 1 ? `${this.card.notes.length} updates` : `${first.title}  ${shortDate(first.date)}`;
    const tx = Math.round(x + (w - inkWidth(title)) / 2);
    const sx = Math.round(x + (w - inkWidth(sub)) / 2);
    this.head = [
      inkText(this, tx, y + 7, title, C.plum),
      inkText(this, sx, y + 17, sub, C.inkSoft),
      this.add.image(tx - 9, y + 6, iconTexture(this), 'star').setOrigin(0),
      this.add.image(tx + inkWidth(title) + 2, y + 6, iconTexture(this), 'star').setOrigin(0),
    ];
    this.sparkles.forEach((s, i) => {
      this.tweens.killTweensOf(s);
      const sx = x + 14 + ((i * 53) % (w - 28));
      s.setPosition(sx, y + 4 + ((i * 7) % 20)).setAlpha(0);
      this.tweens.add({ targets: s, alpha: { from: 0, to: 0.9 }, duration: 700, yoyo: true, repeat: -1, delay: i * 430, repeatDelay: 1200 + i * 170, ease: 'Sine.easeInOut' });
    });
  }

  private drawButtons(): void {
    const g = this.g.clear();
    // A thin gold rule under the title, and a faint one over the foot.
    const { x, y, w, h } = this.box;
    g.fillStyle(C.gold, 0.8).fillRect(x + PAD + 6, y + HEAD - 4, w - 2 * PAD - 12, 1);
    g.fillStyle(C.goldLit, 1).fillRect(Math.round(x + w / 2) - 1, y + HEAD - 5, 3, 3);
    g.fillStyle(C.gold, 0.5).fillRect(x + PAD + 6, y + h - FOOT + 2, w - 2 * PAD - 12, 1);
    // A slim scroll bar when the list runs on past the card.
    const max = this.maxScroll();
    if (max > 0) {
      const bar = Math.max(8, Math.round((this.view.h * this.view.h) / this.bodyH));
      const by = this.view.y + Math.round(((this.view.h - bar) * this.scroll) / max);
      g.fillStyle(C.fieldEdge, 1).fillRect(x + w - PAD + 3, this.view.y, 2, this.view.h);
      g.fillStyle(C.roseDeep, 0.8).fillRect(x + w - PAD + 3, by, 2, bar);
    }
    for (const t of this.buttonTexts) t.destroy();
    this.buttonTexts = [];
    for (const b of this.buttons) {
      const down = this.pressed === b;
      drawCard(g, b.x, b.y, b.w, b.h, b.primary ? (down ? ROSE_DOWN : ROSE_CARD) : CREAM_CARD, this.busy && !b.primary ? 0.5 : 1);
      const label = this.busy && b.primary ? 'Updating...' : b.label;
      const lx = Math.round(b.x + (b.w - inkWidth(label)) / 2);
      const ly = b.y + 4 + (down ? 1 : 0);
      this.buttonTexts.push(b.primary ? softText(this, lx, ly, label) : inkText(this, lx, ly, label, C.ink));
    }
  }

  private maxScroll(): number {
    return Math.max(0, this.bodyH - this.view.h);
  }

  private scrollTo(s: number): void {
    this.scroll = Phaser.Math.Clamp(s, 0, this.maxScroll());
    this.body.setPosition(this.view.x, Math.round(this.view.y - this.scroll));
    this.drawButtons();
  }

  private at(p: Phaser.Input.Pointer): { x: number; y: number } {
    return this.cameras.main.getWorldPoint(p.x, p.y);
  }

  private down(p: Phaser.Input.Pointer): void {
    if (this.busy) return;
    const { x, y } = this.at(p);
    this.pressed = this.buttons.find((b) => inside(b, x, y)) ?? null;
    if (this.pressed) return this.drawButtons();
    if (inside(this.view, x, y)) this.drag = { y, scroll: this.scroll, moved: false };
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.drag || !p.isDown) return;
    const { y } = this.at(p);
    if (Math.abs(y - this.drag.y) > DRAG) this.drag.moved = true;
    if (this.drag.moved) this.scrollTo(this.drag.scroll + this.drag.y - y);
  }

  private up(p: Phaser.Input.Pointer): void {
    this.drag = null;
    const b = this.pressed;
    this.pressed = null;
    if (!b) return;
    const { x, y } = this.at(p);
    this.drawButtons();
    if (inside(b, x, y)) b.act();
  }

  private takeUpdate(): void {
    if (this.busy) return;
    this.busy = true;
    this.drawButtons();
    void updateNow(this.card);
  }

  private close(): void {
    if (this.busy) return;
    this.busy = true;
    putOffUpdate(this.card);
    this.tweens.add({ targets: this.cameras.main, alpha: 0, duration: 180, ease: 'Sine.easeIn', onComplete: () => this.scene.stop() });
  }
}
