// The companion picker, over the title screen: a parchment card of little
// tiles, one per companion (and one for going alone), each creature breathing
// in its tile. Tapping one chooses it at once; Done (or Esc, or a tap outside)
// closes the card.

import Phaser from 'phaser';
import { sound } from '../../audio';
import { PET_H, PET_OX, PET_OY, PET_W } from '../../art/pets';
import { C, PARCHMENT, ROSE_CARD, TILE_CARD, TILE_PICKED, drawCard, iconTexture, inkText, inkWidth, panelTexture, softText } from '../art/creatorArt';
import { buildCreatorFonts } from '../art/creatorFont';
import { COMPANIONS, companion, litPets } from '../companions';

const TILE = 30;
const GAP = 3;
const PAD = 10;
const HEAD = 22;
const DONE_W = 64;
const DONE_H = 16;
const MAX_COLS = 7;
/** Depth of the card over the title screen. */
const DEPTH = 40;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const inside = (b: Box, x: number, y: number) => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;

export class CompanionPicker {
  private scene: Phaser.Scene;
  private shade: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Image;
  private g: Phaser.GameObjects.Graphics;
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private none: Phaser.GameObjects.Image;
  private texts: Phaser.GameObjects.BitmapText[] = [];
  private tiles: Box[] = [];
  private card: Box = { x: 0, y: 0, w: 0, h: 0 };
  private done: Box = { x: 0, y: 0, w: 0, h: 0 };
  private onKey: (e: KeyboardEvent) => void;

  constructor(
    scene: Phaser.Scene,
    private onPick: () => void,
    private onClose: () => void,
  ) {
    this.scene = scene;
    buildCreatorFonts(scene);
    const pets = litPets(scene);
    this.shade = scene.add.rectangle(0, 0, 8, 8, 0x3a2236, 0.4).setOrigin(0).setDepth(DEPTH).setInteractive();
    this.panel = scene.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(DEPTH + 1);
    this.g = scene.add.graphics().setDepth(DEPTH + 2);
    this.none = scene.add.image(0, 0, iconTexture(scene), 'cross').setDepth(DEPTH + 3).setTint(0xe8d4dc);
    for (const p of COMPANIONS) this.sprites.push(scene.add.sprite(0, 0, pets, `${p.id}_0`).setOrigin(PET_OX / PET_W, PET_OY / PET_H).setDepth(DEPTH + 3).play({ key: `hlpet_${p.id}`, startFrame: this.sprites.length % 4 }));
    this.shade.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => this.tap(p));
    this.onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') this.close();
    };
    scene.input.keyboard?.on('keydown', this.onKey);
  }

  /** Lay the card out in a `vw` x `vh` view (art px). */
  layout(vw: number, vh: number): void {
    this.shade.setSize(vw, vh);
    const n = COMPANIONS.length + 1;
    const cols = Math.max(3, Math.min(MAX_COLS, Math.floor((vw - 16 - 2 * PAD + GAP) / (TILE + GAP))));
    const rows = Math.ceil(n / cols);
    const w = cols * (TILE + GAP) - GAP + 2 * PAD;
    const h = HEAD + rows * (TILE + GAP) - GAP + 8 + DONE_H + PAD;
    const x = Math.round((vw - w) / 2);
    const y = Math.max(4, Math.round((vh - h) / 2));
    this.card = { x, y, w, h };
    this.panel.setTexture(panelTexture(this.scene, 'pets', w, h, PARCHMENT)).setPosition(x, y);
    this.tiles = Array.from({ length: n }, (_, i) => ({ x: x + PAD + (i % cols) * (TILE + GAP), y: y + HEAD + Math.floor(i / cols) * (TILE + GAP), w: TILE, h: TILE }));
    this.done = { x: Math.round(x + (w - DONE_W) / 2), y: y + h - PAD - DONE_H + 2, w: DONE_W, h: DONE_H };
    this.tiles.forEach((t, i) => {
      if (i === 0) this.none.setPosition(t.x + TILE / 2, t.y + TILE / 2);
      else {
        const p = COMPANIONS[i - 1];
        const lift = p.gait === 'fly' ? 3 : 0;
        this.sprites[i - 1].setPosition(t.x + TILE / 2, t.y + TILE - 4 - lift);
      }
    });
    this.draw();
  }

  private draw(): void {
    const g = this.g.clear();
    const picked = companion.id;
    this.tiles.forEach((t, i) => drawCard(g, t.x, t.y, t.w, t.h, (i === 0 ? !picked : COMPANIONS[i - 1].id === picked) ? TILE_PICKED : TILE_CARD));
    drawCard(g, this.done.x, this.done.y, this.done.w, this.done.h, ROSE_CARD);
    for (const t of this.texts) t.destroy();
    const { x, y, w } = this.card;
    const name = COMPANIONS.find((p) => p.id === picked)?.name ?? 'Going alone';
    this.texts = [
      inkText(this.scene, x + PAD, y + 8, 'Companion', C.plum),
      inkText(this.scene, x + w - PAD - inkWidth(name), y + 8, name, C.inkSoft),
      softText(this.scene, this.done.x + Math.round((DONE_W - inkWidth('Done')) / 2), this.done.y + 4, 'Done'),
    ];
    for (const t of this.texts) t.setDepth(DEPTH + 4);
  }

  private tap(p: Phaser.Input.Pointer): void {
    const at = this.scene.cameras.main.getWorldPoint(p.x, p.y);
    if (inside(this.done, at.x, at.y) || !inside(this.card, at.x, at.y)) return this.close();
    const i = this.tiles.findIndex((t) => inside(t, at.x, at.y));
    if (i < 0) return;
    const id = i === 0 ? '' : COMPANIONS[i - 1].id;
    if (id === companion.id) return;
    companion.id = id;
    sound.pickup();
    this.draw();
    this.onPick();
  }

  private close(): void {
    this.destroy();
    this.onClose();
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    for (const o of [this.shade, this.panel, this.g, this.none, ...this.sprites, ...this.texts]) o.destroy();
    this.sprites = [];
    this.texts = [];
  }
}
