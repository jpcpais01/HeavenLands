// Stargazing (see pastimes/stars.ts): the view through the telescope, a round
// window of night sky in a dark brass eyepiece. Among the faint stars, a
// constellation's are brighter and breathe; tapping one and then another
// draws a line between them if they belong together (a chime a step higher
// with each), and when every line is drawn the picture lights up gold and
// its name is written under it. Next swings the telescope to another; the
// Star chart shows every one found. Step away (or Esc, or walking off)
// closes it. Everything is drawn in art pixels, so it stays crisp.

import Phaser from 'phaser';
import { menuZoom } from '../../game/display';
import { sound } from '../../audio';
import { BUTTON_PLAIN, PixelButton, pixelText } from '../../ui/widgets';
import { fpsBottom } from '../../scenes/FpsScene';
import { CONSTELLATIONS, findStar, starFound, starsFound, type Constellation } from '../pastimes/stars';

/** The world and the overlay share this: open, and asked to close. */
export const starHud = { open: false, close: false };

const SKY_TOP = 0x0a0c26;
const SKY_LOW = 0x1c1640;
const BRASS = 0x8a6a2c;
const BRASS_LIT = 0xd8b060;
const BRASS_DARK = 0x3a2a12;
const LINK = 0xffe6a0;
const LINK_DONE = 0xffd060;
const TEXT = 0xfff4d8;
const DIM = 0xa8a0d8;
/** How near a tap must be to a star to pick it, art px. */
const PICK = 8;
/** The faint stars in the eyepiece. */
const FAINT = 70;

/** A seeded random for a constellation's own field of faint stars, the same each time it's looked at. */
function seeded(id: string): () => number {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const mix = (a: number, b: number, t: number): number => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

interface Star {
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Image;
  seed: number;
}

export class StarScene extends Phaser.Scene {
  private z = 2;
  private vw = 0;
  private vh = 0;
  /** The eyepiece's middle and radius. */
  private cx = 0;
  private cy = 0;
  private R = 0;
  private sky!: Phaser.GameObjects.Graphics;
  private lines!: Phaser.GameObjects.Graphics;
  private stars: Star[] = [];
  private faint: { img: Phaser.GameObjects.Image; seed: number; a: number }[] = [];
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private title!: Phaser.GameObjects.BitmapText;
  private sub!: Phaser.GameObjects.BitmapText;
  private count!: Phaser.GameObjects.BitmapText;
  private closeBtn!: PixelButton;
  private nextBtn!: PixelButton;
  private chartBtn!: PixelButton;
  private chart: Phaser.GameObjects.Container | null = null;
  private con!: Constellation;
  private drawn = new Set<string>();
  private picked = -1;
  private done = false;
  private doneT = 0;
  private steps = 0;
  private drag: { x: number; y: number } | null = null;

  constructor() {
    super('stars');
  }

  create(): void {
    starHud.open = true;
    starHud.close = false;
    this.cameras.main.setOrigin(0, 0);
    // Everything under the eyepiece is the sky's: the world's joystick and buttons underneath don't get these presses.
    const shield = this.add.zone(0, 0, 4000, 4000).setOrigin(0).setInteractive();
    shield.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => this.up(p));
    this.sky = this.add.graphics();
    this.lines = this.add.graphics();
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 8, max: 30 },
      lifespan: { min: 400, max: 900 },
      scale: { start: 0.7, end: 0 },
      tint: [0xffffff, 0xffe6a0, 0xa8c8ff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.title = pixelText(this, 0, 0, '', TEXT, 2).setOrigin(0.5, 0).setDepth(10);
    this.sub = pixelText(this, 0, 0, '', DIM).setOrigin(0.5, 0).setDepth(10);
    this.count = pixelText(this, 0, 0, '', DIM).setOrigin(0.5, 0).setDepth(10);
    this.closeBtn = new PixelButton(this, 'Step away', 62, 16, BUTTON_PLAIN, 'star_close', () => (starHud.close = true)).setDepth(20);
    this.nextBtn = new PixelButton(this, 'Next', 44, 16, BUTTON_PLAIN, 'star_next', () => this.next()).setDepth(20);
    this.chartBtn = new PixelButton(this, 'Star chart', 62, 16, BUTTON_PLAIN, 'star_chart', () => this.toggleChart()).setDepth(20);
    const kb = this.input.keyboard!;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (this.chart) this.toggleChart();
        else starHud.close = true;
      }
    };
    kb.on('keydown', onKey);
    this.pickConstellation(CONSTELLATIONS.find((c) => !starFound(c.id)) ?? CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)]);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.cameras.main.fadeIn(500, 0, 0, 0);
    sound.telescope();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown', onKey);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      starHud.open = false;
      this.chart = null;
    });
  }

  // ---------------------------------------------------------------- What's looked at

  private pickConstellation(c: Constellation): void {
    this.con = c;
    this.drawn.clear();
    this.picked = -1;
    this.steps = 0;
    this.done = starFound(c.id);
    // One already found shows whole, to be admired.
    if (this.done) for (const [a, b] of c.links) this.drawn.add(this.edge(a, b));
    this.doneT = this.done ? 1e9 : 0;
  }

  private next(): void {
    if (this.chart) this.toggleChart();
    const left = CONSTELLATIONS.filter((c) => !starFound(c.id) && c !== this.con);
    const pool = left.length ? left : CONSTELLATIONS.filter((c) => c !== this.con);
    this.pickConstellation(pool[Math.floor(Math.random() * pool.length)]);
    sound.telescope();
    this.cameras.main.flash(260, 20, 20, 40);
    this.layout();
  }

  private edge(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  /** A constellation's star in the eyepiece, art px. */
  private at(i: number, c = this.con): { x: number; y: number } {
    const s = (this.R * 1.4) / 100;
    const [x, y] = c.stars[i];
    return { x: Math.round(this.cx + (x - 50) * s), y: Math.round(this.cy + (y - 35) * s) };
  }

  // ---------------------------------------------------------------- Drawing

  private layout(): void {
    const { width, height } = this.scale;
    this.z = menuZoom(width, height);
    this.cameras.main.setZoom(this.z);
    this.vw = width / this.z;
    this.vh = height / this.z;
    const top = Math.ceil(fpsBottom() / this.z) + 4;
    this.cx = Math.round(this.vw / 2);
    this.R = Math.round(Math.max(40, Math.min(this.vw * 0.42, (this.vh - top - 46) / 2)));
    this.cy = Math.round(top + 20 + this.R);
    const bw = this.closeBtn.boxW + this.nextBtn.boxW + this.chartBtn.boxW + 8;
    const bx = Math.round((this.vw - bw) / 2);
    this.closeBtn.place(bx, top);
    this.nextBtn.place(bx + this.closeBtn.boxW + 4, top);
    this.chartBtn.place(bx + this.closeBtn.boxW + this.nextBtn.boxW + 8, top);
    this.drawSky();
    this.makeStars();
    this.drawLines();
    this.title.setPosition(this.cx, this.cy + this.R + 5);
    this.sub.setPosition(this.cx, this.cy + this.R + 20);
    this.count.setPosition(this.cx, this.cy - this.R - 12);
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
      this.toggleChart();
    }
  }

  /** The eyepiece: dark all round, a ring of brass, and inside it the night sky, a faint band of the galaxy across it. */
  private drawSky(): void {
    const g = this.sky.clear();
    const { cx, cy, R } = this;
    g.fillStyle(0x05040c, 1);
    g.fillRect(0, 0, this.vw + 2, this.vh + 2);
    const rnd = seeded(this.con.id);
    const tilt = rnd() * 0.8 - 0.4;
    for (let y = -R - 4; y <= R + 4; y++) {
      for (let x = -R - 4; x <= R + 4; x++) {
        const d = Math.hypot(x + 0.5, y + 0.5);
        if (d > R + 3.5) continue;
        let col: number;
        if (d > R + 1.5) col = BRASS_DARK;
        else if (d > R) col = (x + y) / (R * 1.4) < -0.2 ? BRASS_LIT : BRASS;
        else {
          const u = (y + R) / (2 * R);
          col = mix(SKY_TOP, SKY_LOW, u);
          // The galaxy's faint band.
          const band = Math.abs(y - x * tilt) / R;
          if (band < 0.22) col = mix(col, 0x4a3e78, (0.22 - band) * 1.6 * (0.7 + 0.3 * Math.sin(x * 0.3)));
          // The lens darkens toward its edge.
          if (d > R * 0.8) col = mix(col, 0x020208, ((d - R * 0.8) / (R * 0.2)) * 0.6);
        }
        g.fillStyle(col, 1);
        g.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }

  private makeStars(): void {
    for (const s of this.stars) {
      s.img.destroy();
      s.halo.destroy();
    }
    for (const f of this.faint) f.img.destroy();
    this.stars = [];
    this.faint = [];
    const rnd = seeded(`${this.con.id}*`);
    for (let k = 0; k < FAINT; k++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * (this.R - 3);
      const tone = rnd();
      const tint = tone < 0.15 ? 0xa8c8ff : tone < 0.25 ? 0xffe0b0 : 0xffffff;
      const big = rnd() < 0.12;
      const img = this.add
        .image(Math.round(this.cx + Math.cos(a) * d), Math.round(this.cy + Math.sin(a) * d), big ? 'hl_pastime' : '__WHITE', big ? 'glint' : undefined)
        .setTint(tint)
        .setDisplaySize(big ? 5 : 1, big ? 5 : 1);
      if (big) img.setScale(0.6);
      this.faint.push({ img, seed: rnd() * 1000, a: 0.25 + rnd() * 0.5 });
    }
    this.con.stars.forEach((_s, i) => {
      const p = this.at(i);
      const halo = this.add.image(p.x, p.y, 'glow').setTint(0xa8c8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3).setDepth(2);
      const img = this.add.image(p.x, p.y, 'hl_pastime', 'glint').setDepth(3);
      this.stars.push({ x: p.x, y: p.y, img, halo, seed: i * 1.7 });
    });
  }

  /** A line of whole pixels between two points. */
  private pixLine(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, skip = 0): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = skip; k <= n - skip; k++) g.fillRect(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1);
  }

  private drawLines(): void {
    const g = this.lines.clear();
    const glow = this.done ? Math.min(1, this.doneT / 600) : 0;
    for (const [a, b] of this.con.links) {
      if (!this.drawn.has(this.edge(a, b))) continue;
      const p = this.at(a);
      const q = this.at(b);
      g.fillStyle(mix(LINK, LINK_DONE, glow), 0.55 + glow * 0.4);
      this.pixLine(g, p.x, p.y, q.x, q.y, 3);
    }
    // The line being drawn from the picked star to the finger.
    if (this.picked >= 0 && this.drag && !this.done) {
      const p = this.at(this.picked);
      g.fillStyle(0xffffff, 0.35);
      this.pixLine(g, p.x, p.y, Math.round(this.drag.x), Math.round(this.drag.y), 3);
    }
    if (this.picked >= 0) {
      const p = this.at(this.picked);
      g.fillStyle(0xffffff, 0.8);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        g.fillRect(Math.round(p.x + Math.cos(a) * 5), Math.round(p.y + Math.sin(a) * 5), 1, 1);
      }
    }
  }

  // ---------------------------------------------------------------- Joining the stars

  private toArt(p: Phaser.Input.Pointer): { x: number; y: number } {
    return { x: p.x / this.z, y: p.y / this.z };
  }

  private starAt(x: number, y: number): number {
    let best = -1;
    let bestD = PICK;
    this.stars.forEach((s, i) => {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  private down(p: Phaser.Input.Pointer): void {
    if (this.chart || this.done) return;
    const a = this.toArt(p);
    const i = this.starAt(a.x, a.y);
    if (i < 0) {
      this.picked = -1;
      this.drawLines();
      return;
    }
    if (this.picked >= 0 && this.picked !== i) this.join(this.picked, i);
    else this.picked = this.picked === i ? -1 : i;
    this.drag = this.picked >= 0 ? a : null;
    this.drawLines();
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!p.isDown || this.picked < 0 || this.done) return;
    this.drag = this.toArt(p);
    // Dragged onto another star: joined on the way, and the line carries on from it.
    const i = this.starAt(this.drag.x, this.drag.y);
    if (i >= 0 && i !== this.picked) this.join(this.picked, i);
    this.drawLines();
  }

  private up(_p: Phaser.Input.Pointer): void {
    this.drag = null;
    this.drawLines();
  }

  private join(a: number, b: number): void {
    const key = this.edge(a, b);
    const real = this.con.links.some(([x, y]) => this.edge(x, y) === key);
    this.picked = b;
    if (!real || this.drawn.has(key)) {
      if (!real) sound.starMiss();
      return;
    }
    this.drawn.add(key);
    sound.starLink(this.steps++);
    const s = this.stars[b];
    this.sparks.explode(6, s.x, s.y);
    if (this.drawn.size === new Set(this.con.links.map(([x, y]) => this.edge(x, y))).size) this.complete();
  }

  private complete(): void {
    this.done = true;
    this.doneT = 0;
    this.picked = -1;
    this.drag = null;
    const first = !starFound(this.con.id);
    findStar(this.con.id);
    sound.constellation();
    for (const s of this.stars) this.sparks.explode(8, s.x, s.y);
    this.cameras.main.flash(400, 60, 50, 20);
    if (first) this.title.setAlpha(0);
  }

  // ---------------------------------------------------------------- The star chart

  /** Every constellation in a grid: those found drawn small in gold with their names, the rest a few faint dots and a "?". */
  private toggleChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
      this.chartBtn.setText('Star chart');
      return;
    }
    this.chartBtn.setText('Back');
    const c = this.add.container(0, 0).setDepth(30);
    const g = this.add.graphics();
    c.add(g);
    const cols = 4;
    const rows = Math.ceil(CONSTELLATIONS.length / cols);
    const top = this.closeBtn.y + 22;
    const cw = Math.floor(Math.min(90, (this.vw - 16) / cols));
    const ch = Math.floor(Math.min(64, (this.vh - top - 8) / rows));
    const x0 = Math.round((this.vw - cw * cols) / 2);
    g.fillStyle(0x07061a, 0.94);
    g.fillRect(x0 - 4, top - 4, cw * cols + 8, ch * rows + 8);
    g.fillStyle(BRASS, 1);
    g.fillRect(x0 - 4, top - 4, cw * cols + 8, 1);
    g.fillRect(x0 - 4, top + ch * rows + 3, cw * cols + 8, 1);
    CONSTELLATIONS.forEach((con, k) => {
      const bx = x0 + (k % cols) * cw;
      const by = top + Math.floor(k / cols) * ch;
      const found = starFound(con.id);
      const s = Math.min((cw - 10) / 100, (ch - 16) / 70);
      const pt = (i: number) => ({ x: Math.round(bx + 5 + con.stars[i][0] * s), y: Math.round(by + 3 + con.stars[i][1] * s) });
      g.fillStyle(0x141236, 1);
      g.fillRect(bx + 1, by + 1, cw - 2, ch - 2);
      if (found) {
        g.fillStyle(LINK_DONE, 0.75);
        for (const [a, b] of con.links) {
          const p = pt(a);
          const q = pt(b);
          this.pixLine(g, p.x, p.y, q.x, q.y);
        }
      }
      g.fillStyle(found ? 0xffffff : 0x6a6aa0, 1);
      con.stars.forEach((_s, i) => {
        const p = pt(i);
        g.fillRect(p.x, p.y, 1, 1);
        if (found) {
          g.fillRect(p.x - 1, p.y, 3, 1);
          g.fillRect(p.x, p.y - 1, 1, 3);
        }
      });
      const label = pixelText(this, bx + cw / 2, by + ch - 10, found ? con.name.replace(/^The /, '') : '?', found ? TEXT : DIM).setOrigin(0.5, 0);
      if (label.width > cw - 2) label.setText(found ? con.name.replace(/^The /, '').split(' ').pop()! : '?');
      c.add(label);
    });
  }

  // ---------------------------------------------------------------- Each frame

  update(_t: number, dt: number): void {
    const now = this.time.now;
    for (const f of this.faint) f.img.setAlpha(f.a * (0.7 + 0.3 * Math.sin(now * 0.002 + f.seed)));
    this.stars.forEach((s, i) => {
      const breathe = 0.85 + 0.15 * Math.sin(now * 0.003 + s.seed);
      const lit = this.done || this.picked === i;
      s.img.setAlpha(breathe).setScale(lit ? 1.2 : 1);
      s.halo.setAlpha((this.done ? 0.7 : 0.35) * breathe).setTint(this.done ? 0xffd890 : 0xa8c8ff);
    });
    if (this.done && this.doneT < 1e8) {
      this.doneT += dt;
      if (this.doneT < 700) this.drawLines();
    }
    const found = starsFound();
    this.count.setText(`${found} OF ${CONSTELLATIONS.length} FOUND`);
    if (this.done) {
      this.title.setText(this.con.name.toUpperCase()).setAlpha(Math.min(1, Math.max(this.title.alpha, this.doneT / 600)));
      this.sub.setText(this.con.line.toUpperCase());
    } else {
      this.title.setText('').setAlpha(1);
      this.sub.setText(this.picked >= 0 ? 'NOW TAP THE STAR IT JOINS' : 'TAP THE BRIGHT STARS TO JOIN THEM');
    }
    // A long line wraps to fit under the eyepiece.
    if (this.sub.width > this.vw - 8) this.sub.setScale((this.vw - 8) / this.sub.width);
    else this.sub.setScale(1);
  }
}
