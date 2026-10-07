// Photo mode: a camera button beside the pause button (or F on a keyboard)
// clears the screen of every button, map and counter and puts a viewfinder
// over the world, which carries on: friends can still wave, the wanderer can
// still emote (4 to =) or walk (WASD). The shutter (or Space) takes the shot,
// with a click, a flash and the picture dropping into the corner like a
// print, and saves it as a PNG (shared, where a phone offers that). Esc, F or
// the cross leaves. Launched by the world in Heaven Lands only.

import Phaser from 'phaser';
import { sound } from '../../audio';
import { DPR as D } from '../../game/display';
import { build } from '../../game/build';
import { fishHud } from '../../game/fish';
import { controls } from '../../game/controls';
import { pixelText } from '../../ui/widgets';

/** The scenes over the world that the camera hides. */
const HIDDEN = ['ui', 'map', 'pause', 'sound', 'fps'];
/** The print in the corner: its width as a share of the short side, how long it stays (ms). */
const PRINT = 0.32;
const PRINT_MS = 2600;
const FLASH_MS = 380;
const CREAM = 0xfff8ec;

export class PhotoScene extends Phaser.Scene {
  private on = false;
  private busy = false;
  private pressed = false;
  private button!: Phaser.GameObjects.Graphics;
  private hit!: Phaser.GameObjects.Zone;
  private finder!: Phaser.GameObjects.Graphics;
  private catcher!: Phaser.GameObjects.Zone;
  private hint!: Phaser.GameObjects.BitmapText;
  private flash!: Phaser.GameObjects.Rectangle;
  private print: Phaser.GameObjects.Container | null = null;
  private shots = 0;
  private drawn = '';

  constructor() {
    super('photo');
  }

  create(): void {
    this.on = false;
    this.busy = false;
    this.button = this.add.graphics();
    this.hit = this.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive({ useHandCursor: true });
    this.hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => (this.pressed = true));
    this.hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => (this.pressed = false));
    this.hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.setOn(true);
    });
    this.finder = this.add.graphics().setVisible(false);
    // In photo mode a tap anywhere is the camera's: the shutter, the cross, or nothing.
    this.catcher = this.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive();
    this.catcher.input!.enabled = false;
    this.catcher.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => this.tap(p));
    this.hint = pixelText(this, 0, 0, '').setOrigin(0.5, 0).setVisible(false);
    this.flash = this.add.rectangle(0, 0, 1, 1, 0xffffff, 1).setOrigin(0).setAlpha(0).setVisible(false);
    const kb = this.input.keyboard;
    kb?.on('keydown-F', () => this.setOn(!this.on));
    kb?.on('keydown-ESC', () => this.setOn(false));
    kb?.on('keydown-SPACE', () => this.snap());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.on) this.showOthers(true);
      this.on = false;
      this.print = null;
    });
  }

  /** The side of the corner buttons (the pause button's). */
  private get s(): number {
    return Math.round(Math.max(34 * D, Math.min(this.scale.width, this.scale.height) * 0.075));
  }

  private get shutter(): { x: number; y: number; r: number } {
    const { width, height } = this.scale;
    const r = Math.round(Math.max(24 * D, Math.min(width, height) * 0.065));
    return { x: Math.round(width / 2), y: Math.round(height - r - 18 * D), r };
  }

  private get cross(): { x: number; y: number; r: number } {
    const r = Math.round(this.s * 0.5);
    return { x: Math.round(26 * D + r), y: Math.round(26 * D + r), r };
  }

  update(): void {
    // The camera button stands in the bag's place, left of the pause button; away while building or fishing.
    const { width, height } = this.scale;
    const show = !this.on && !build.on && !fishHud.active;
    const s = this.s;
    const pad = 12 * D;
    const x = width - s * 3 - pad - 20 * D;
    const state = `${show} ${this.on} ${x} ${s} ${this.pressed} ${width} ${height} ${controls.mouse}`;
    if (state === this.drawn) return;
    this.drawn = state;
    this.hit.setPosition(x - 6 * D, pad - 6 * D).setSize(s + 12 * D, s + 12 * D);
    this.hit.input!.hitArea.setTo(0, 0, s + 12 * D, s + 12 * D);
    this.hit.input!.enabled = show;
    const g = this.button.clear().setVisible(show);
    if (show) this.drawCameraButton(g, x, pad, s);
    if (this.on) this.drawFinder();
  }

  /** The button: the pause button's dark rounded square with a little camera drawn on it. */
  private drawCameraButton(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    g.fillStyle(0x0a0c1c, this.pressed ? 0.6 : 0.42);
    g.fillRoundedRect(x, y, s, s, s * 0.22);
    g.lineStyle(2 * D, 0xb8c4ff, 0.45);
    g.strokeRoundedRect(x, y, s, s, s * 0.22);
    const u = s / 24;
    const cx = x + s / 2;
    const cy = y + s / 2 + u;
    g.fillStyle(0xdfe6ff, 0.92);
    g.fillRoundedRect(cx - 8 * u, cy - 5 * u, 16 * u, 11 * u, 2 * u);
    g.fillRoundedRect(cx - 3.5 * u, cy - 7.5 * u, 7 * u, 3.5 * u, u);
    g.fillStyle(0x0a0c1c, 0.85);
    g.fillCircle(cx, cy + 0.5 * u, 3.8 * u);
    g.fillStyle(0xdfe6ff, 0.92);
    g.fillCircle(cx, cy + 0.5 * u, 2.2 * u);
    g.fillStyle(0xffd66b, 0.95);
    g.fillRect(cx + 4.5 * u, cy - 3.5 * u, 2 * u, 1.5 * u);
  }

  /** The viewfinder: corner brackets, a shutter at the foot, a cross to leave. */
  private drawFinder(): void {
    const { width, height } = this.scale;
    const g = this.finder.clear();
    const m = Math.round(14 * D);
    const len = Math.round(Math.min(width, height) * 0.08);
    const t = Math.max(2, Math.round(2.5 * D));
    g.fillStyle(CREAM, 0.85);
    for (const [cx, sx] of [[m, 1], [width - m, -1]] as const) {
      for (const [cy, sy] of [[m, 1], [height - m, -1]] as const) {
        g.fillRect(sx > 0 ? cx : cx - len, sy > 0 ? cy : cy - t, len, t);
        g.fillRect(sx > 0 ? cx : cx - t, sy > 0 ? cy : cy - len, t, len);
      }
    }
    const sh = this.shutter;
    g.fillStyle(0x0a0c1c, 0.25).fillCircle(sh.x, sh.y + 2 * D, sh.r + 2 * D);
    g.lineStyle(3 * D, CREAM, 0.95).strokeCircle(sh.x, sh.y, sh.r);
    g.fillStyle(CREAM, 0.9).fillCircle(sh.x, sh.y, sh.r - 6 * D);
    g.fillStyle(0xffd8e2, 0.9).fillCircle(sh.x, sh.y, sh.r - 10 * D);
    const c = this.cross;
    g.fillStyle(0x0a0c1c, 0.4).fillCircle(c.x, c.y, c.r);
    g.lineStyle(2 * D, CREAM, 0.7).strokeCircle(c.x, c.y, c.r);
    const k = c.r * 0.38;
    g.lineStyle(2.5 * D, CREAM, 0.95);
    g.lineBetween(c.x - k, c.y - k, c.x + k, c.y + k).lineBetween(c.x - k, c.y + k, c.x + k, c.y - k);
    this.hint.setText(controls.mouse ? 'SPACE TAKES THE PICTURE   ESC LEAVES' : '');
    this.hint.setScale(Math.max(1, Math.round(Math.min(width, height) / 270))).setPosition(Math.round(width / 2), m + 4 * D);
    this.catcher.setSize(width, height);
    this.catcher.input!.hitArea.setTo(0, 0, width, height);
    this.flash.setSize(width, height);
  }

  private setOn(on: boolean): void {
    if (on === this.on || this.busy) return;
    if (on && (build.on || fishHud.active)) return;
    this.on = on;
    this.showOthers(!on);
    this.finder.setVisible(on);
    this.hint.setVisible(on);
    this.catcher.input!.enabled = on;
    this.drawn = '';
    sound.pickup();
  }

  /** Every overlay over the world, shown again or hidden; the pause menu also stops listening while hidden. */
  private showOthers(show: boolean): void {
    for (const k of HIDDEN) {
      if (!this.scene.isActive(k) && !this.scene.isPaused(k)) continue;
      this.scene.setVisible(show, k);
    }
    if (show && this.scene.isPaused('pause')) this.scene.resume('pause');
    else if (!show && this.scene.isActive('pause')) this.scene.pause('pause');
  }

  private tap(p: Phaser.Input.Pointer): void {
    if (!this.on) return;
    const c = this.cross;
    if (Math.hypot(p.x - c.x, p.y - c.y) <= c.r * 1.3) return this.setOn(false);
    const sh = this.shutter;
    if (Math.hypot(p.x - sh.x, p.y - sh.y) <= sh.r * 1.3) this.snap();
  }

  /** Take the picture: hide the viewfinder for one frame, grab the canvas, then flash and save. */
  private snap(): void {
    if (!this.on || this.busy) return;
    this.busy = true;
    this.finder.setVisible(false);
    this.hint.setVisible(false);
    this.print?.destroy();
    this.print = null;
    this.game.renderer.snapshot((img) => {
      this.finder.setVisible(this.on);
      this.hint.setVisible(this.on);
      this.busy = false;
      sound.shutter();
      this.flash.setVisible(true).setAlpha(0.85);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: FLASH_MS, ease: 'Quad.easeOut', onComplete: () => this.flash.setVisible(false) });
      if (img instanceof HTMLImageElement) {
        this.showPrint(img);
        save(img.src);
      }
    });
  }

  /** The picture drops into the bottom-left corner as a little cream-bordered print, tilts, and slips away. */
  private showPrint(img: HTMLImageElement): void {
    const key = `hl_photo_${this.shots++}`;
    const done = () => {
      if (!this.sys.isActive() || !img.width) return;
      this.textures.addImage(key, img);
      const { width, height } = this.scale;
      const w = Math.round(Math.min(width, height) * PRINT);
      const scale = w / img.width;
      const h = Math.round(img.height * scale);
      const b = Math.round(5 * D);
      const frame = this.add.rectangle(0, 0, w + b * 2, h + b * 3, CREAM).setStrokeStyle(1 * D, 0xd8c8b0);
      const pic = this.add.image(0, -b / 2, key).setScale(scale);
      const print = (this.print = this.add.container(Math.round(18 * D + w / 2), Math.round(height + h), [frame, pic]));
      this.tweens.add({ targets: print, y: Math.round(height - h / 2 - 22 * D), angle: -4, duration: 420, ease: 'Back.easeOut' });
      this.tweens.add({
        targets: print,
        alpha: 0,
        y: `+=${Math.round(12 * D)}`,
        delay: PRINT_MS,
        duration: 500,
        onComplete: () => {
          print.destroy();
          if (this.print === print) this.print = null;
          this.textures.remove(key);
        },
      });
    };
    if (img.complete) done();
    else img.onload = done;
  }
}

/** The picture saved: shared on a phone that can share files, else downloaded. */
function save(url: string): void {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const name = `heaven-lands-${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}.png`;
  const download = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  if (controls.mouse || !navigator.canShare) return download();
  fetch(url)
    .then((r) => r.blob())
    .then((blob) => {
      const file = new File([blob], name, { type: 'image/png' });
      if (!navigator.canShare({ files: [file] })) return download();
      return navigator.share({ files: [file], title: 'Heaven Lands' }).catch((e: unknown) => {
        // Turned down by the player: nothing more. Refused by the browser: saved instead.
        if ((e as { name?: string })?.name !== 'AbortError') download();
      });
    })
    .catch(download);
}
