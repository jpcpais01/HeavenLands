// The wanderer's body, face and clothes, and the poses of every animation.
// Everything is drawn in the body's own 24 x 32 box (the soles on row 31),
// offset into a bigger frame so wings, hats and balloons have room. Seen
// three ways: from the front ('down'), from behind ('up') and from the side
// facing left ('side'; facing right is the same frame mirrored).

import { cyl, sphere, FLAT, type Material, type PixelCanvas } from '../../art/pixel';
import { BOTTOMS, DRESSES, EYES, MOUTHS, TOPS, BROWS, BEARDS, SHOES } from '../look';
import { hsh, recolor, rows, type Geo, type Kit, type P, type Pose, type View } from './kit';
import { flat, mat } from './paint';

export const BX = 4;
export const BY = 9;

const id = (list: { id: string }[], i: number): string => list[i]?.id ?? list[0].id;

// ---------------------------------------------------------------- poses

export type AnimName = 'idle' | 'walk' | 'wave' | 'cheer' | 'dance' | 'sit' | 'heart';

export interface AnimDef {
  name: AnimName;
  frames: number;
  fps: number;
  loop: boolean;
  /** Emotes face the viewer; walking and standing are drawn every way. */
  views: View[];
}

export const ANIMS: AnimDef[] = [
  { name: 'idle', frames: 8, fps: 6, loop: true, views: ['down', 'up', 'side'] },
  { name: 'walk', frames: 6, fps: 10, loop: true, views: ['down', 'up', 'side'] },
  { name: 'wave', frames: 8, fps: 9, loop: false, views: ['down'] },
  { name: 'cheer', frames: 6, fps: 9, loop: false, views: ['down'] },
  { name: 'dance', frames: 8, fps: 8, loop: true, views: ['down'] },
  { name: 'sit', frames: 4, fps: 3, loop: true, views: ['down'] },
  { name: 'heart', frames: 6, fps: 6, loop: false, views: ['down'] },
];

const shY = (k: Kit, bob: number, hop = 0, sit = false) => 18 - k.tall + bob - hop + (sit ? 4 : 0);

function standing(k: Kit, view: View, bob = 0): Pose {
  const s = shY(k, bob);
  const side = view === 'side';
  return {
    view,
    bob,
    hop: 0,
    dx: 0,
    feet: side ? [{ x: 11.5, y: 31 }, { x: 13, y: 31 }] : [{ x: 10.2, y: 31 }, { x: 13.8, y: 31 }],
    hands: side ? [{ x: 12.6, y: s + 6.4 }, { x: 13.2, y: s + 6 }] : [{ x: 12 - k.sw - 0.85, y: s + 6.3 }, { x: 12 + k.sw + 0.85, y: s + 6.3 }],
    blink: false,
    sway: 0,
    sit: false,
    carry: true,
    hold: 1,
    flap: 0,
  };
}

export function pose(k: Kit, anim: AnimName, view: View, i: number): Pose {
  if (anim === 'idle') {
    const bob = [0, 0, 0, 1, 1, 1, 1, 0][i];
    const p = standing(k, view, bob);
    p.blink = i === 5;
    p.sway = [0, 0.15, 0.3, 0.3, 0.15, 0, -0.15, -0.1][i];
    p.flap = i / 8;
    return p;
  }
  if (anim === 'walk') {
    const bob = [0, -1, 0, 0, -1, 0][i];
    const p = standing(k, view, bob);
    const s = shY(k, bob);
    p.flap = i / 6;
    if (view === 'side') {
      const near = [-2.6, -1.2, 1.2, 2.6, 1.2, -1.2][i];
      const liftN = [0, 0, 0, 0, 1.6, 1.4][i];
      const liftF = [0, 1.6, 1.4, 0, 0, 0][i];
      p.feet = [
        { x: 12 + near, y: 31 - liftN },
        { x: 12.6 - near, y: 31 - liftF },
      ];
      p.hands = [
        { x: 12.6 - near * 0.8, y: s + 6.2 - Math.abs(near) * 0.15 },
        { x: 13.2 + near * 0.7, y: s + 5.9 },
      ];
      p.sway = near / 4;
    } else {
      const l = [1, 2, 1, 0, 0, 0][i];
      const r = [0, 0, 0, 1, 2, 1][i];
      p.feet = [
        { x: 10.2 + l * 0.15, y: 31 - l },
        { x: 13.8 - r * 0.15, y: 31 - r },
      ];
      const sw = [0.5, 1, 0.5, -0.5, -1, -0.5][i];
      p.hands = [
        { x: 12 - k.sw - 0.85 - Math.max(0, -sw) * 0.3, y: s + 6.3 + sw },
        { x: 12 + k.sw + 0.85 + Math.max(0, sw) * 0.3, y: s + 6.3 - sw },
      ];
      p.sway = sw * 0.4;
    }
    return p;
  }
  if (anim === 'wave') {
    const p = standing(k, 'down', [0, 0, 0, 1, 1, 0, 0, 0][i]);
    const s = shY(k, p.bob);
    p.hold = 0;
    const up = i === 0 || i === 7 ? { x: 12 + k.sw + 2.2, y: s + 1 } : { x: 12 + k.sw + 1.8 + (i % 2 ? 0 : 1.6), y: s - 3.6 };
    p.hands = [p.hands[0], up];
    p.face = i === 0 || i === 7 ? undefined : 'grin';
    p.sway = i % 2 ? 0.3 : -0.3;
    return p;
  }
  if (anim === 'cheer') {
    const hop = [0, 2, 4, 3, 1, 0][i];
    const bob = [1, 0, 0, 0, 0, 1][i];
    const p = standing(k, 'down', bob);
    p.hop = hop;
    const s = shY(k, bob, hop);
    const up = i > 0 && i < 5;
    p.feet = [
      { x: 10.2, y: 31 - hop },
      { x: 13.8, y: 31 - hop },
    ];
    p.hands = up
      ? [
          { x: 12 - k.sw - 1.8, y: s - 3.8 },
          { x: 12 + k.sw + 1.8, y: s - 3.8 },
        ]
      : [
          { x: 12 - k.sw + 0.2, y: s + 4 },
          { x: 12 + k.sw - 0.2, y: s + 4 },
        ];
    p.face = 'grin';
    p.sway = [0, -0.6, -0.9, -0.4, 0.4, 0.2][i];
    p.flap = i / 6;
    return p;
  }
  if (anim === 'dance') {
    const dx = [0, 1, 1, 0, 0, -1, -1, 0][i];
    const bob = [0, -1, 0, 1, 0, -1, 0, 1][i];
    const p = standing(k, 'down', bob);
    p.dx = dx;
    const s = shY(k, bob);
    const left = i >= 4;
    const l = [0, 1, 1, 0, 0, 0, 0, 0][i];
    const r = [0, 0, 0, 0, 0, 1, 1, 0][i];
    p.feet = [
      { x: 10.2 + dx * 0.5, y: 31 - l },
      { x: 13.8 + dx * 0.5, y: 31 - r },
    ];
    p.hands = left
      ? [
          { x: 12 + dx - k.sw - 1.6, y: s - 3.4 },
          { x: 12 + dx + k.sw + 0.6, y: s + 3.6 },
        ]
      : [
          { x: 12 + dx - k.sw - 0.6, y: s + 3.6 },
          { x: 12 + dx + k.sw + 1.6, y: s - 3.4 },
        ];
    p.hold = left ? 1 : 0;
    p.face = 'content';
    p.sway = dx * 0.7;
    p.flap = i / 8;
    return p;
  }
  if (anim === 'sit') {
    const bob = [0, 0, 1, 1][i];
    const p = standing(k, 'down', bob);
    p.sit = true;
    const s = shY(k, bob, 0, true);
    p.feet = [
      { x: 9.6, y: 31 },
      { x: 14.4, y: 31 },
    ];
    p.hands = [
      { x: 12 - k.sw + 0.4, y: s + 5.6 },
      { x: 12 + k.sw - 0.4, y: s + 5.6 },
    ];
    p.blink = i === 3;
    return p;
  }
  // heart: hands meeting at the chest, eyes closed happily.
  const bob = [0, 0, 1, 1, 0, 0][i];
  const p = standing(k, 'down', bob);
  const s = shY(k, bob);
  p.hands = [
    { x: 10.9, y: s + 3.4 },
    { x: 13.1, y: s + 3.4 },
  ];
  p.carry = false;
  p.face = 'content';
  return p;
}

// ---------------------------------------------------------------- what's worn

type Sleeve = 'none' | 'short' | 'long' | 'wide' | 'puff' | 'puffy';

const TOP_SLEEVE: Record<string, Sleeve> = {
  tee: 'short',
  stripes: 'short',
  longsleeve: 'long',
  hoodie: 'long',
  sweater: 'long',
  cardigan: 'long',
  overshirt: 'long',
  tank: 'none',
  blouse: 'puff',
  sailor: 'short',
  turtleneck: 'long',
  kimono: 'wide',
  tunic: 'long',
  puffer: 'puffy',
  vest: 'long',
  flannel: 'long',
  hawaiian: 'short',
  jersey: 'short',
  letterman: 'long',
  leather: 'long',
  denim: 'long',
  polo: 'short',
  blazer: 'long',
  tracksuit: 'long',
  raglan: 'long',
  poncho: 'long',
  armor: 'long',
  gi: 'long',
};

/** How far each top hangs below the hips (the rest: half a pixel). */
const TOP_HANG: Record<string, number> = { tunic: 3, hoodie: 1.5, sweater: 1.5, puffer: 1.5, cardigan: 2, kimono: 2, flannel: 1, jersey: 1, letterman: 1, leather: 0.8, blazer: 1.5, tracksuit: 0.8, armor: 0.8, gi: 2 };

/** Whole suits: the dress's cloth down both legs, no skirt. */
const SUITS = new Set(['coveralls', 'spacesuit', 'ninja', 'knight']);
/** How round each suit's legs are. */
const SUIT_LEG: Record<string, number> = { coveralls: 1.65, spacesuit: 1.95, ninja: 1.5, knight: 1.7 };

const DRESS_SLEEVE: Record<string, Sleeve | 'top'> = {
  sundress: 'none',
  gown: 'puff',
  pinafore: 'top',
  robe: 'wide',
  yukata: 'wide',
  smock: 'short',
  apron: 'puff',
  knitdress: 'long',
  starrobe: 'wide',
  coveralls: 'long',
  spacesuit: 'puffy',
  ninja: 'long',
  knight: 'long',
  captain: 'long',
  wizard: 'wide',
  qipao: 'short',
  ballgown: 'puff',
};

/** How far down a dress's skirt reaches: its hem row (above the soles). */
const DRESS_HEM: Record<string, number> = { sundress: 27.5, gown: 30.4, pinafore: 27.5, robe: 30, yukata: 29.6, smock: 27, apron: 28, knitdress: 27.4, starrobe: 30.2, captain: 29.4, wizard: 30.4, qipao: 28.8, ballgown: 30.7 };
const DRESS_FLARE: Record<string, number> = { sundress: 2.2, gown: 3.2, pinafore: 1.8, robe: 1.6, yukata: 0.6, smock: 2.4, apron: 2, knitdress: 0.8, starrobe: 2.4, captain: 2, wizard: 2.6, qipao: 0.4, ballgown: 4.4 };

export interface Wear {
  top: string;
  bottom: string;
  dress: string;
  sleeve: Sleeve;
  sleeveMat: Material;
  torso: Material;
  /** How far the top hangs below the hips. */
  hang: number;
  /** A whole suit (the dress's cloth down the legs). */
  suit: boolean;
}

export function wearOf(k: Kit): Wear {
  const top = id(TOPS, k.a.top);
  const bottom = id(BOTTOMS, k.a.bottom);
  const dress = id(DRESSES, k.a.dress);
  if (dress !== 'none') {
    const ds = DRESS_SLEEVE[dress];
    // Plate armour is the dress's colour made metal, shining.
    const torso = dress === 'knight' ? mat(k.dressC, { shine: true }) : k.dress;
    return { top, bottom, dress, sleeve: ds === 'top' ? TOP_SLEEVE[top] : ds, sleeveMat: ds === 'top' ? (top === 'vest' ? k.trim : k.top) : torso, torso, hang: 0, suit: SUITS.has(dress) };
  }
  // Leather and steel shine; a varsity jacket's and a baseball tee's sleeves are the trim's colour.
  const torso = top === 'leather' || top === 'armor' ? mat(k.topC, { shine: true }) : k.top;
  const sleeveMat = top === 'vest' || top === 'letterman' || top === 'raglan' ? k.trim : top === 'armor' ? mat(k.topC, { depth: 1.3 }) : torso;
  return { top, bottom, dress, sleeve: TOP_SLEEVE[top] ?? 'short', sleeveMat, torso, hang: TOP_HANG[top] ?? 0.5, suit: false };
}

// ---------------------------------------------------------------- legs and shoes

/** Where along the leg the bottoms (or a suit) reach, 0 hip .. 1 ankle, how puffy (radius), and in what. */
function legCover(k: Kit, w: Wear): { to: number; r: number; m: Material } | null {
  if (w.suit) return { to: 1, r: SUIT_LEG[w.dress] ?? 1.6, m: w.torso };
  // An open coat shows the trousers under it; any other dress hides them.
  if (w.dress !== 'none' && w.dress !== 'captain') return null;
  const m = k.bottom;
  switch (w.bottom) {
    case 'trousers':
    case 'cargo':
    case 'overalls':
    case 'ripped':
      return { to: 1, r: 1.6, m };
    case 'joggers':
      return { to: 0.97, r: 1.65, m };
    case 'rolled':
      return { to: 0.82, r: 1.6, m };
    case 'leggings':
      return { to: 1, r: 1.45, m };
    case 'shorts':
      return { to: 0.42, r: 1.75, m };
    case 'boardshorts':
      return { to: 0.52, r: 1.9, m };
    case 'bloomers':
      return { to: 0.92, r: 2, m };
    default:
      return null;
  }
}

/** A band straight across a leg at `t` of the way from hip to ankle, over what's drawn there in `on`. */
function legBand(c: PixelCanvas, a: P, b: P, t: number, r: number, on: Material, m: Material, bias = 0): void {
  const x = a.x + (b.x - a.x) * t;
  const y = Math.round(a.y + (b.y - a.y) * t);
  for (let px = Math.floor(x - r - 0.5); px <= Math.ceil(x + r); px++) if (c.materialAt(px, y) === on) c.px(px, y, m, cyl((px + 0.5 - x) / (r + 0.5), 0.2), { bias });
}

function legs(c: PixelCanvas, k: Kit, g: Geo, w: Wear): void {
  const side = g.view === 'side';
  const cover = legCover(k, w);
  const order = side ? [1, 0] : [0, 1];
  for (const i of order) {
    const f = g.feet[i];
    const hipX = side ? g.cx + 0.3 + (i ? 0.6 : -0.2) : g.cx + (i ? 1.65 : -1.65);
    const hipY = g.hip;
    const ax = f.x;
    const ay = f.y - 1.6;
    const far = side && i === 1 ? -1 : 0;
    // Which way is out, front on (seen from behind the legs swap, but a stripe down the outside is still outside).
    const out = side ? 0 : i ? 1 : -1;
    c.part();
    c.capsule(hipX, hipY, ax, ay, 1.4, 1.25, k.skin, { bias: far });
    if (cover) {
      const M = cover.m;
      const ex = hipX + (ax - hipX) * cover.to;
      const ey = hipY + (ay - hipY) * cover.to;
      const hipP = { x: hipX, y: hipY };
      const ankP = { x: ax, y: ay };
      c.capsule(hipX, hipY - 0.5, ex, ey, cover.r, w.bottom === 'bloomers' && !w.suit ? cover.r - 0.4 : cover.r - 0.1, M, { bias: far });
      const what = w.suit ? w.dress : w.bottom;
      if (what === 'rolled' || what === 'shorts' || what === 'coveralls') {
        // A turned-up cuff, lighter where the cloth folds over.
        for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) <= cover.r) c.px(Math.round(ex + dx - 0.5), Math.round(ey), M, FLAT, { bias: 1 + far });
      }
      if (what === 'bloomers') for (let dx = -1; dx <= 1; dx++) c.px(Math.round(ex + dx - 0.5), Math.round(ey + 0.5), M, FLAT, { bias: -2 + far });
      if (what === 'cargo' || what === 'coveralls') {
        const px = Math.round(hipX + (ax - hipX) * 0.45 + (side ? 0 : i ? 0.6 : -1.4));
        const py = Math.round(hipY + (ay - hipY) * 0.45);
        for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) c.px(px + x, py + y, M, FLAT, { bias: (y === 0 ? 0 : -1) + far });
      }
      if (what === 'joggers' || what === 'boardshorts') {
        // A stripe down the outside of the leg in the trim's colour, and joggers' gathered cuffs.
        const off = side ? 0.2 : out * (cover.r - 0.55);
        if (!side || i === 0) c.line(hipX + off - 0.5, hipY - 0.2, ex + off - 0.5, ey - 0.6, k.trim, () => cyl(out * 0.6), { bias: far });
        if (what === 'joggers') legBand(c, hipP, ankP, 0.95, cover.r - 0.3, M, M, -1 + far);
        else legBand(c, hipP, ankP, cover.to - 0.03, cover.r, M, M, -1 + far);
      }
      if (what === 'ripped') {
        // Torn knees with white threads across, and a faded thigh.
        const kx = Math.round(hipX + (ax - hipX) * 0.56 - 0.5);
        const ky = Math.round(hipY + (ay - hipY) * 0.56);
        if (!side || i === 0) {
          c.px(kx, ky, k.skin, FLAT, { bias: far });
          c.px(kx, ky + 1, k.linen, FLAT, { bias: far });
          if (!side) c.px(kx + (i ? -1 : 1), ky, k.linen, FLAT, { bias: far });
        }
        if (i === 1 && !side) c.px(Math.round(hipX + (ax - hipX) * 0.28 - 0.5), Math.round(hipY + (ay - hipY) * 0.28), k.skin, FLAT);
        const tx = Math.round(hipX + (ax - hipX) * 0.2 - 0.5);
        for (let y = Math.round(hipY + 0.5); y < ky - 1; y++) if (c.materialAt(tx, y) === M) c.shade(tx, y, 1);
      }
      if (what === 'spacesuit') {
        legBand(c, hipP, ankP, 0.5, cover.r, M, M, -1 + far);
        legBand(c, hipP, ankP, 0.93, cover.r, M, k.trim, far);
      }
      if (what === 'knight') {
        // Knee cops catching the light, and the greaves' edge.
        const kx = hipX + (ax - hipX) * 0.52;
        const ky = hipY + (ay - hipY) * 0.52;
        c.part();
        c.ellipse(kx + (side ? -0.6 : 0), ky, 1.5, 1.1, M, { bias: 1 + far });
        legBand(c, hipP, ankP, 0.75, cover.r, M, M, -1 + far);
      }
      if (what === 'ninja') for (const t of [0.7, 0.8, 0.9]) legBand(c, hipP, ankP, t, cover.r, M, M, -1 + far);
    }
    shoe(c, k, f, side, far);
  }
}

function shoe(c: PixelCanvas, k: Kit, f: P, side: boolean, far: number): void {
  const kind = id(SHOES, k.a.shoes);
  const x = side ? f.x - 0.7 : f.x;
  const y = f.y - 0.75;
  const rx = side ? 2.2 : 1.75;
  c.part();
  if (kind === 'bare') {
    c.ellipse(x, y, rx - 0.3, 1.1, k.skin, { bias: far });
    return;
  }
  if (kind === 'sandals') {
    c.ellipse(x, y, rx - 0.2, 1.1, k.skin, { bias: far });
    c.ellipse(x, f.y - 0.1, rx, 0.6, k.leather, { bias: far - 1 });
    for (let dx = -1; dx <= 1; dx++) c.px(Math.round(x + dx - 0.5), Math.round(y - 0.5), k.shoes, FLAT, { bias: far });
    return;
  }
  const m = k.shoes;
  if (kind === 'boots' || kind === 'rainboots' || kind === 'hightops' || kind === 'cowboy') {
    const top = kind === 'rainboots' || kind === 'cowboy' ? 3.6 : kind === 'hightops' ? 3 : 2.6;
    c.capsule(f.x, f.y - top, f.x, f.y - 1, kind === 'cowboy' ? 1.65 : 1.55, 1.6, m, { bias: far });
    if (kind === 'boots' || kind === 'hightops') for (let dx = -1; dx <= 1; dx++) c.px(Math.round(f.x + dx - 0.5), Math.round(f.y - top), kind === 'hightops' ? k.linen : m, FLAT, { bias: 1 + far });
    if (kind === 'cowboy') {
      // The scalloped top (a notch in front), and a stitched flourish down the shaft.
      c.px(Math.round(f.x - 0.5) + (side ? -1 : 0), Math.round(f.y - top), m, FLAT, { bias: -2 + far });
      c.px(Math.round(f.x - 0.5), Math.round(f.y - top + 1.4), k.linen, FLAT, { bias: -1 + far });
    }
  }
  const r2 = kind === 'clogs' ? rx + 0.3 : kind === 'slippers' ? rx + 0.25 : kind === 'cowboy' && side ? rx + 0.5 : rx;
  const cx = kind === 'cowboy' && side ? x - 0.4 : x;
  c.ellipse(cx, y, r2, kind === 'clogs' ? 1.35 : kind === 'loafers' ? 1 : 1.2, m, { bias: far + (kind === 'slippers' ? 1 : 0) });
  // Soles, laces and straps.
  if (kind === 'sneakers' || kind === 'hightops') for (let dx = -2; dx <= 1; dx++) c.px(Math.round(x + dx), Math.round(f.y - 0.2), k.linen, FLAT, { bias: far });
  else if (kind !== 'slippers') for (let dx = -2; dx <= 1; dx++) if (c.materialAt(Math.round(x + dx), Math.round(f.y - 0.2)) === m) c.px(Math.round(x + dx), Math.round(f.y - 0.2), k.sole, FLAT, { bias: far });
  if (kind === 'maryjanes') for (let dx = -1; dx <= 0; dx++) c.px(Math.round(x + dx), Math.round(y - 1), m, FLAT, { bias: -1 + far });
  if (kind === 'hightops' && !side) c.px(Math.round(f.x - 0.5), Math.round(f.y - 2), k.linen, FLAT, { bias: far });
  if (kind === 'cowboy' && side) c.px(Math.round(f.x + 0.6), Math.round(f.y - 0.2), k.sole, FLAT, { bias: -1 + far });
  if (kind === 'loafers') {
    // The strap across the top, a penny in it.
    const sy = Math.round(y - 0.6);
    for (let dx = -1; dx <= 0; dx++) c.px(Math.round(cx + dx + (side ? -0.5 : 0)), sy, m, FLAT, { bias: -1 + far });
    if (!side) c.px(Math.round(cx - 0.5), sy, k.gold, FLAT, { bias: far });
  }
}

// ---------------------------------------------------------------- torso

function torsoEdges(k: Kit, g: Geo, extra = 0, flare = 0, bottomAt?: number): (y: number) => [number, number] | null {
  const top = g.sh;
  const bot = bottomAt ?? g.hip + 1;
  const side = g.view === 'side';
  return (y) => {
    if (y < top || y > bot) return null;
    const u = (y - top) / Math.max(1, g.hip + 1 - top);
    let half = u < 0.18 ? k.sw - 1.1 * (1 - u / 0.18) : u < 0.62 ? k.sw + (k.ww - k.sw) * ((u - 0.18) / 0.44) : k.ww + (k.hw - k.ww) * Math.min(1, (u - 0.62) / 0.38);
    if (y > g.hip + 1) half = k.hw + flare * ((y - g.hip - 1) / Math.max(1, bot - g.hip - 1));
    half += extra;
    if (side) {
      const d = (half / k.sw) * k.dep;
      return [g.cx - d + 0.2, g.cx + d + 0.6];
    }
    return [g.cx - half, g.cx + half];
  };
}

function torso(c: PixelCanvas, k: Kit, g: Geo, w: Wear): void {
  const puff = w.top === 'puffer' && w.dress === 'none' ? 0.6 : w.dress === 'spacesuit' ? 0.5 : 0;
  const bottom = g.hip + 1 + w.hang;
  c.part();
  rows(c, g.sh, bottom, torsoEdges(k, g, puff, w.hang > 1.5 ? 0.6 : 0.2, bottom), w.torso, (_x, _y, t, u) => cyl(t, 0.25 - u * 0.3));
  if (w.dress === 'none') topDetails(c, k, g, w, bottom);
  else dressBodice(c, k, g, w);
}

const ox = BX;
const oy = BY;

/** Tops that close at the throat, or bring their own neckline. */
const CLOSED_NECK = new Set(['turtleneck', 'hoodie', 'sailor', 'jersey', 'leather', 'blazer', 'tracksuit', 'armor', 'gi', 'letterman']);

/** Dresses and suits with no neckline of skin to show. */
const CLOSED_DRESS = new Set(['knitdress', 'sundress', 'spacesuit', 'knight', 'qipao', 'ballgown', 'wizard', 'captain', 'ninja']);

/** A faint cloud scroll for a qipao's silk. */
const cloud = (x: number, y: number): boolean => (x * 3 + y * 2) % 9 === 0 || ((x * 3 + y * 2) % 9 === 1 && y % 3 === 0);

/** A check: 1 on a stripe, 2 where two cross. */
const plaid = (x: number, y: number): number => ((x & 3) === 1 ? 1 : 0) + ((y & 3) === 2 ? 1 : 0);

/** A Hawaiian print on a slanted lattice: 1 a flower, 2 a leaf. */
const tropic = (x: number, y: number): number => {
  const v = (((x * 2 + y * 3) % 7) + 7) % 7;
  return v === 0 ? 1 : v === 4 && y % 2 === 0 ? 2 : 0;
};

const SEVEN = ['xxx', '..x', '.x.', '.x.', '.x.'];

/** A tiny figure (a number, a letter) in `m`, only over cloth already drawn in `on`. */
function glyph(c: PixelCanvas, pat: string[], x0: number, y0: number, m: Material, on: Material): void {
  pat.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) if (row[dx] === 'x' && c.materialAt(x0 + dx, y0 + dy) === on) c.px(x0 + dx, y0 + dy, m, FLAT);
  });
}

function topDetails(c: PixelCanvas, k: Kit, g: Geo, w: Wear, bottom: number): void {
  const cx = Math.round(g.cx);
  const v = g.view;
  const T = w.torso;
  const sh = Math.round(g.sh);
  const front = v === 'down';
  const side = v === 'side';
  const box: [number, number, number, number] = [cx - 7, sh - 1, cx + 7, Math.ceil(bottom) + 1];
  switch (w.top) {
    case 'stripes':
      recolor(c, ox, oy, ...box, T, k.trim, (_x, y) => (y - sh) % 2 === 1);
      break;
    case 'sweater': {
      // A fair-isle band across the chest, and a ribbed hem.
      const band = sh + 2;
      recolor(c, ox, oy, ...box, T, k.trim, (x, y) => y === band || (y === band + 1 && (x + y) % 2 === 0));
      for (let x = cx - 6; x <= cx + 6; x++) if (c.materialAt(x, Math.ceil(bottom)) === T) c.shade(x, Math.ceil(bottom), -1);
      break;
    }
    case 'hoodie':
      if (front) {
        // The pocket, and the strings hanging from the hood.
        for (let x = cx - 2; x <= cx + 1; x++) for (let y = Math.ceil(bottom) - 2; y <= Math.ceil(bottom) - 1; y++) c.shade(x, y, y === Math.ceil(bottom) - 2 ? -1 : 0);
        c.px(cx - 2, sh + 1, k.linen, FLAT);
        c.px(cx - 2, sh + 2, k.linen, FLAT);
        c.px(cx + 1, sh + 1, k.linen, FLAT);
        c.px(cx + 1, sh + 2, k.linen, FLAT);
      }
      break;
    case 'cardigan':
      if (front) {
        recolor(c, ox, oy, ...box, T, k.trim, (x, y) => (x === cx - 1 || x === cx) && y >= sh);
        for (let y = sh + 2; y <= bottom; y += 2) c.px(cx + 1, y, k.gold, FLAT);
      }
      break;
    case 'overshirt':
      if (front) {
        recolor(c, ox, oy, ...box, T, k.trim, (x, y) => y >= sh && x >= cx - 1 && x <= cx && y < bottom);
        c.px(cx - 2, sh, T, FLAT, { bias: 1 });
        c.px(cx + 1, sh, T, FLAT, { bias: 1 });
      }
      break;
    case 'vest':
      if (front) {
        recolor(c, ox, oy, ...box, T, k.trim, (x, y) => y >= sh && y < sh + 4 - Math.abs(x + 0.5 - g.cx) && Math.abs(x + 0.5 - g.cx) < 2);
        for (let y = sh + 3; y <= bottom - 1; y += 2) c.px(cx, y, k.gold, FLAT);
      } else if (side) recolor(c, ox, oy, ...box, T, k.trim, (x, y) => y < sh + 2 && x < g.cx);
      break;
    case 'tank': {
      // Bare shoulders: only the straps stay, a little in from the shoulder's edge.
      const strap = (x: number) => {
        const d = Math.abs(x + 0.5 - g.cx);
        return d > 1.6 && d < 3;
      };
      recolor(c, ox, oy, ...box, T, k.skin, (x, y) => y <= sh + 1 && (side ? x < g.cx - 0.2 || x > g.cx + 1.2 : !strap(x)));
      break;
    }
    case 'blouse':
      if (front) {
        c.px(cx - 2, sh, k.linen, FLAT);
        c.px(cx - 1, sh + 1, k.linen, FLAT);
        c.px(cx, sh + 1, k.linen, FLAT);
        c.px(cx + 1, sh, k.linen, FLAT);
      }
      break;
    case 'sailor':
      // The broad collar over the shoulders, and its knot.
      recolor(c, ox, oy, ...box, T, k.trim, (x, y) => (front || side ? y <= sh + 1 && Math.abs(x + 0.5 - g.cx) > 1 : y <= sh + 3));
      if (front) {
        c.px(cx - 1, sh + 2, k.trim, FLAT, { bias: 1 });
        c.px(cx, sh + 2, k.trim, FLAT, { bias: 1 });
        c.px(cx - 1, sh + 3, k.trim, FLAT, { bias: -1 });
        c.px(cx, sh + 3, k.trim, FLAT, { bias: -1 });
      }
      break;
    case 'turtleneck':
      for (let x = cx - 2; x <= cx + 1; x++) c.px(x, sh - 1, T, cyl((x + 0.5 - g.cx) / 2.2), { bias: 0 });
      break;
    case 'kimono':
      if (front) {
        // Crossed lapels in the trim colour, the right over the left.
        recolor(c, ox, oy, ...box, T, k.trim, (x, y) => y >= sh && y <= sh + 5 && Math.abs(x + 0.5 - (g.cx - 2 + (y - sh) * 0.45)) < 0.8);
        recolor(c, ox, oy, ...box, T, k.trim, (x, y) => y >= sh && y <= sh + 3 && Math.abs(x + 0.5 - (g.cx + 2 - (y - sh) * 0.5)) < 0.8);
      }
      break;
    case 'tunic': {
      const by = Math.round(g.hip);
      for (let x = cx - 6; x <= cx + 6; x++) if (c.materialAt(x, by) === T) c.px(x, by, k.leather, { x: 0, y: 0.2, z: 1 });
      if (front || side) c.px(side ? cx - 2 : cx, by, k.gold, FLAT);
      break;
    }
    case 'puffer':
      for (let y = sh + 2; y < bottom; y += 2) for (let x = cx - 7; x <= cx + 7; x++) if (c.materialAt(x, y) === T) c.shade(x, y, -1);
      if (front) for (let y = sh; y < bottom; y++) if (c.materialAt(cx, y) === T) c.px(cx, y, T, FLAT, { bias: -1 });
      break;
    case 'flannel':
      // A two-colour check, darker where the stripes cross, and a button placket.
      recolor(c, ox, oy, ...box, T, k.trim, (x, y) => plaid(x, y) > 0);
      for (let y = box[1]; y <= box[3]; y++) for (let x = box[0]; x <= box[2]; x++) if (plaid(x, y) === 2 && c.materialAt(x, y) === k.trim) c.shade(x, y, -1);
      if (front) {
        for (let y = sh + 2; y < bottom; y += 2) c.px(cx, y, k.linen, FLAT, { bias: -1 });
        c.px(cx - 2, sh, T, FLAT, { bias: 1 });
        c.px(cx + 1, sh, T, FLAT, { bias: 1 });
      }
      break;
    case 'hawaiian':
      // Hibiscus and leaves scattered over it, an open camp collar.
      recolor(c, ox, oy, ...box, T, k.trim, (x, y) => tropic(x, y) === 1);
      recolor(c, ox, oy, ...box, T, k.leaf, (x, y) => tropic(x, y) === 2);
      if (front) {
        c.px(cx - 1, sh + 1, k.skin, FLAT, { bias: -1 });
        c.px(cx, sh + 1, k.skin, FLAT, { bias: -1 });
        c.px(cx - 2, sh, T, FLAT, { bias: 1 });
        c.px(cx + 1, sh, T, FLAT, { bias: 1 });
        c.px(cx - 2, sh + 1, T, FLAT, { bias: 1 });
        c.px(cx + 1, sh + 1, T, FLAT, { bias: 1 });
      }
      break;
    case 'jersey': {
      // Side panels and a V in the trim's colour; a 7 on the chest, a big one on the back.
      const e = torsoEdges(k, g, 0, 0.2, bottom);
      if (!side)
        recolor(c, ox, oy, ...box, T, k.trim, (x, y) => {
          const r = e(y);
          return !!r && y > sh + 2 && (x + 0.5 < r[0] + 0.9 || x + 0.5 > r[1] - 0.9);
        });
      if (front) {
        for (const [x, y] of [
          [cx - 2, sh],
          [cx + 1, sh],
          [cx - 1, sh + 1],
          [cx, sh + 1],
        ])
          c.px(x, y, k.trim, FLAT);
        glyph(c, SEVEN.slice(0, 4), cx - 1, sh + 2, k.trim, T);
        c.px(cx - 3, sh + 2, k.gold, FLAT, { bias: 1 });
      } else if (v === 'up') glyph(c, SEVEN, cx - 2, sh + 2, k.trim, T);
      break;
    }
    case 'letterman':
      // Ribbed collar and hem, snaps down the front, a letter on the chest.
      for (let x = cx - 7; x <= cx + 7; x++) if (c.materialAt(x, Math.ceil(bottom)) === T) c.px(x, Math.ceil(bottom), k.trim, FLAT, { bias: x % 2 ? -1 : 0 });
      if (front) {
        c.px(cx - 2, sh, k.trim, FLAT, { bias: 1 });
        c.px(cx + 1, sh, k.trim, FLAT, { bias: 1 });
        for (let y = sh + 2; y < bottom; y += 2) c.px(cx - 1, y, k.linen, FLAT);
        glyph(c, ['x.x', 'xxx', 'x.x'], cx + 1, sh + 2, k.trim, T);
      } else if (v === 'up') for (let x = cx - 3; x <= cx + 2; x++) c.px(x, sh, k.trim, FLAT, { bias: x % 2 ? -1 : 0 });
      break;
    case 'leather':
      if (front) {
        // Wide lapels, the tee underneath, an off-centre zip, a belted hem.
        c.px(cx - 1, sh, k.trim, FLAT);
        c.px(cx, sh, k.trim, FLAT);
        for (const [x, y] of [
          [cx - 3, sh],
          [cx + 2, sh],
          [cx - 2, sh + 1],
          [cx + 1, sh + 1],
          [cx - 2, sh + 2],
        ])
          c.px(x, y, T, FLAT, { bias: 1 });
        const yb = Math.ceil(bottom);
        for (let y = sh + 1; y < yb; y++) c.px(Math.round(cx + 1 - ((y - sh - 1) * 2.5) / Math.max(1, yb - sh - 1)), y, k.silver, FLAT);
        c.px(cx + 3, sh + 4, k.silver, FLAT, { bias: -1 });
        c.px(cx - 4, sh + 4, k.silver, FLAT, { bias: -1 });
        for (let x = cx - 7; x <= cx + 7; x++) if (c.materialAt(x, yb) === T) c.shade(x, yb, -1);
        c.px(cx - 4, yb, k.silver, FLAT);
      } else if (side) for (let y = sh + 1; y < bottom; y++) c.px(cx - 2, y, k.silver, FLAT, { bias: -1 });
      break;
    case 'denim':
      if (front) {
        // Open over a white tee: flap pockets, seams, a shirt collar.
        recolor(c, ox, oy, ...box, T, k.linen, (x, y) => y >= sh && y < bottom - 0.5 && Math.abs(x + 0.5 - g.cx) < 1);
        for (const px of [cx - 4, cx - 3, cx + 2, cx + 3]) c.px(px, sh + 2, T, FLAT, { bias: -1 });
        c.px(cx - 4, sh + 2, k.gold, FLAT);
        c.px(cx + 3, sh + 2, k.gold, FLAT);
        for (let y = sh + 3; y < bottom; y++)
          for (const x of [cx - 4, cx + 3]) if (c.materialAt(x, y) === T) c.shade(x, y, -1);
        c.px(cx - 2, sh, T, FLAT, { bias: 1 });
        c.px(cx + 1, sh, T, FLAT, { bias: 1 });
      }
      for (let x = cx - 7; x <= cx + 7; x++) if (c.materialAt(x, Math.ceil(bottom)) === T) c.shade(x, Math.ceil(bottom), -1);
      break;
    case 'polo':
      if (front) {
        for (const x of [cx - 3, cx - 2, cx + 1, cx + 2]) c.px(x, sh, k.trim, FLAT, { bias: Math.abs(x + 0.5 - g.cx) > 2 ? -1 : 1 });
        c.px(cx - 1, sh + 1, T, FLAT, { bias: -1 });
        c.px(cx - 1, sh + 2, k.linen, FLAT, { bias: -1 });
        c.px(cx + 2, sh + 2, k.trim, FLAT);
      } else for (let x = cx - 2; x <= cx + 1; x++) c.px(x, sh, k.trim, FLAT);
      break;
    case 'blazer':
      if (front) {
        // A white shirt in the V of the lapels, a tie in the trim's colour, a pocket square.
        recolor(c, ox, oy, ...box, T, k.linen, (x, y) => y >= sh && y <= sh + 4 && Math.abs(x + 0.5 - g.cx) < (sh + 4.6 - y) * 0.55);
        for (let y = sh + 1; y <= sh + 4; y++) {
          const half = (sh + 4.6 - y) * 0.55;
          c.px(Math.round(g.cx - half - 0.5), y, T, FLAT, { bias: 1 });
          c.px(Math.round(g.cx + half - 0.5), y, T, FLAT, { bias: 1 });
        }
        c.px(cx - 1, sh, k.trim, FLAT, { bias: 1 });
        c.px(cx, sh, k.trim, FLAT);
        for (let y = sh + 1; y <= sh + 4; y++) c.px(cx - (y > sh + 2 ? 0 : 1), y, k.trim, FLAT, { bias: y === sh + 4 ? -1 : 0 });
        c.px(cx - 1, sh + 3, k.trim, FLAT, { bias: -1 });
        c.px(cx, sh + 6, T, FLAT, { bias: -2 });
        c.px(cx + 3, sh + 2, k.linen, FLAT, { bias: 1 });
      } else if (v === 'up') for (let x = cx - 2; x <= cx + 1; x++) c.px(x, sh, k.linen, FLAT);
      break;
    case 'tracksuit':
      for (let x = cx - 2; x <= cx + 1; x++) c.px(x, sh - 1, T, cyl((x + 0.5 - g.cx) / 2.2), { bias: 0 });
      if (front) {
        c.px(cx - 2, sh - 1, k.trim, FLAT);
        c.px(cx + 1, sh - 1, k.trim, FLAT);
        for (let y = sh - 1; y < bottom; y++) c.px(cx, y, k.silver, FLAT, { bias: y === sh + 2 ? 1 : -1 });
      }
      for (let x = cx - 7; x <= cx + 7; x++) if (c.materialAt(x, Math.ceil(bottom)) === T) c.px(x, Math.ceil(bottom), k.trim, FLAT, { bias: -1 });
      break;
    case 'raglan':
      if (front) {
        c.px(cx - 2, sh, k.trim, FLAT);
        c.px(cx + 1, sh, k.trim, FLAT);
      } else if (v === 'up') for (let x = cx - 2; x <= cx + 1; x++) c.px(x, sh, k.trim, FLAT);
      break;
    case 'armor': {
      // A breastplate with a raised ridge, a gorget at the throat, a belt with a gold buckle.
      for (let x = cx - 2; x <= cx + 1; x++) c.px(x, sh - 1, T, cyl((x + 0.5 - g.cx) / 2.2), { bias: 1 });
      if (!side) for (let y = sh + 1; y < g.hip - 1; y++) c.px(cx - 1, y, T, FLAT, { bias: 1 });
      const plate = Math.round(sh + 5);
      for (let x = cx - 7; x <= cx + 7; x++) if (c.materialAt(x, plate) === T) c.shade(x, plate, -1);
      const by = Math.round(g.hip);
      for (let x = cx - 7; x <= cx + 7; x++) if (c.materialAt(x, by) === T) c.px(x, by, k.leather, { x: 0, y: 0.2, z: 1 });
      if (front) {
        c.px(cx - 1, by, k.gold, FLAT, { bias: 1 });
        c.px(cx - 3, sh + 1, k.gold, FLAT);
        c.px(cx + 2, sh + 1, k.gold, FLAT);
      }
      break;
    }
    case 'gi': {
      // Thick lapels crossing left over right, and the belt knotted in front.
      if (front) {
        recolor(c, ox, oy, ...box, T, k.skin, (x, y) => y >= sh && y <= sh + 2 && Math.abs(x + 0.5 - g.cx) < (sh + 2.6 - y) * 0.75);
        for (let y = sh; y <= sh + 5; y++) c.px(Math.round(g.cx - 2.4 + (y - sh) * 0.55), y, T, FLAT, { bias: 1 });
        for (let y = sh; y <= sh + 2; y++) c.px(Math.round(g.cx + 1.6 - (y - sh) * 0.5), y, T, FLAT, { bias: 1 });
      }
      const by = Math.round(g.hip);
      for (let x = cx - 7; x <= cx + 7; x++) if (c.materialAt(x, by) === T) c.px(x, by, k.trim, cyl((x + 0.5 - g.cx) / 5));
      if (front) {
        c.px(cx - 1, by, k.trim, FLAT, { bias: 1 });
        c.px(cx - 1, by + 1, k.trim, FLAT, { bias: -1 });
        c.px(cx - 2, by + 2, k.trim, FLAT, { bias: -1 });
        c.px(cx, by + 1, k.trim, FLAT, { bias: -1 });
        c.px(cx + 1, by + 2, k.trim, FLAT, { bias: -1 });
      } else if (side) c.px(cx - 2, by + 1, k.trim, FLAT, { bias: -1 });
      break;
    }
    case 'tee':
    case 'longsleeve':
    default:
      break;
  }
  // A neckline: a little skin at the throat, front on (not under a turtleneck, a hood, a zip or a shirt and tie).
  if (front && !CLOSED_NECK.has(w.top)) {
    c.px(cx - 1, sh, k.skin, FLAT, { bias: -1 });
    c.px(cx, sh, k.skin, FLAT, { bias: -1 });
  }
}

function dressBodice(c: PixelCanvas, k: Kit, g: Geo, w: Wear): void {
  const cx = Math.round(g.cx);
  const sh = Math.round(g.sh);
  const front = g.view === 'down';
  const D = w.torso;
  const box: [number, number, number, number] = [cx - 7, sh - 1, cx + 7, Math.round(g.hip) + 2];
  switch (w.dress) {
    case 'sundress':
      recolor(c, ox, oy, ...box, D, k.skin, (x, y) => y <= sh + 1 && !(Math.abs(x + 0.5 - g.cx) > 1.6 && Math.abs(x + 0.5 - g.cx) < 2.8));
      break;
    case 'pinafore':
      // The blouse under it shows at the shoulders.
      recolor(c, ox, oy, ...box, D, w.sleeveMat, (x, y) => y <= sh + 2 && Math.abs(x + 0.5 - g.cx) > 2.4);
      break;
    case 'apron':
      if (front) recolor(c, ox, oy, ...box, D, k.linen, (x, y) => y >= sh + 2 && Math.abs(x + 0.5 - g.cx) < 2.2);
      break;
    case 'yukata':
    case 'robe':
      if (front) recolor(c, ox, oy, ...box, D, k.trim, (x, y) => y >= sh && y <= sh + 4 && Math.abs(x + 0.5 - (g.cx - 1.6 + (y - sh) * 0.4)) < 0.8);
      break;
    case 'knitdress':
      for (let x = cx - 2; x <= cx + 1; x++) c.px(x, sh - 1, D, cyl((x + 0.5 - g.cx) / 2.2));
      break;
    case 'coveralls':
      if (front) {
        // A zip, a pocket with a name patch, a shirt collar.
        for (let y = sh + 1; y < g.hip; y++) c.px(cx - 1, y, D, FLAT, { bias: -1 });
        c.px(cx + 1, sh + 2, D, FLAT, { bias: -1 });
        c.px(cx + 2, sh + 2, D, FLAT, { bias: -1 });
        c.px(cx + 1, sh + 3, D, FLAT, { bias: -2 });
        c.px(cx + 2, sh + 3, D, FLAT, { bias: -2 });
        c.px(cx - 3, sh + 2, k.linen, FLAT);
        c.px(cx - 4, sh + 2, k.linen, FLAT);
        c.px(cx - 2, sh, D, FLAT, { bias: 1 });
        c.px(cx + 1, sh, D, FLAT, { bias: 1 });
      }
      break;
    case 'spacesuit': {
      // A ring at the neck for the helmet, and a little control panel with lights.
      for (let x = cx - 3; x <= cx + 2; x++) c.px(x, sh - 1, k.trim, cyl((x + 0.5 - g.cx) / 3.2), { bias: 1 });
      if (front) {
        const panel = flat('#4c5466');
        for (let y = sh + 2; y <= sh + 4; y++) for (let x = cx - 2; x <= cx + 1; x++) c.px(x, y, panel, FLAT, { bias: y === sh + 2 ? 1 : 0 });
        c.px(cx - 2, sh + 3, flat('#ff6a5a', 0.9), FLAT);
        c.px(cx - 1, sh + 3, flat('#7cf08a', 0.9), FLAT);
        c.px(cx, sh + 3, flat('#6ac8ff', 0.9), FLAT);
        c.px(cx + 1, sh + 3, flat('#ffd860', 0.9), FLAT);
        c.px(cx - 4, sh + 2, k.trim, FLAT);
        c.px(cx + 3, sh + 2, k.trim, FLAT);
      } else if (g.view === 'up') {
        // The life-support pack's vents.
        for (let y = sh + 2; y <= sh + 5; y += 2) for (let x = cx - 2; x <= cx + 1; x++) c.px(x, y, D, FLAT, { bias: -1 });
      }
      break;
    }
    case 'ninja':
      if (front) {
        for (let y = sh; y <= sh + 5; y++) c.px(Math.round(g.cx - 2.4 + (y - sh) * 0.55), y, D, FLAT, { bias: 1 });
        for (let y = sh; y <= sh + 2; y++) c.px(Math.round(g.cx + 1.6 - (y - sh) * 0.5), y, D, FLAT, { bias: 1 });
      }
      break;
    case 'knight':
      // A tabard in the trim's colour over the plate, a gold cross on it.
      if (g.view !== 'side') {
        recolor(c, ox, oy, ...box, D, k.trim, (x, y) => y >= sh + 2 && Math.abs(x + 0.5 - g.cx) < 2.1);
        if (front || g.view === 'up') {
          for (let y = sh + 2; y <= sh + 6; y++) c.px(cx - 1, y, k.gold, FLAT, { bias: y === sh + 2 ? 1 : 0 });
          c.px(cx - 2, sh + 3, k.gold, FLAT);
          c.px(cx, sh + 3, k.gold, FLAT, { bias: -1 });
        }
      } else recolor(c, ox, oy, ...box, D, k.trim, (x, y) => y >= sh + 1 && x < g.cx - 0.6);
      for (let x = cx - 2; x <= cx + 1; x++) c.px(x, sh - 1, D, cyl((x + 0.5 - g.cx) / 2.2), { bias: 1 });
      break;
    case 'captain':
      if (front) {
        // A white shirt with a ruffle at the throat, lapels edged in the trim, two rows of gold buttons.
        recolor(c, ox, oy, ...box, D, k.linen, (x, y) => y >= sh && y <= sh + 3 && Math.abs(x + 0.5 - g.cx) < 1.6);
        for (let y = sh + 1; y <= sh + 3; y++) c.px(cx - 1 + (y % 2), y, k.linen, FLAT, { bias: -1 });
        for (let y = sh; y <= sh + 3; y++) {
          c.px(cx - 3 + (y > sh + 1 ? 1 : 0), y, k.trim, FLAT, { bias: 1 });
          c.px(cx + 2 - (y > sh + 1 ? 1 : 0), y, k.trim, FLAT);
        }
        for (const y of [sh + 4, sh + 6]) {
          c.px(cx - 3, y, k.gold, FLAT, { bias: 1 });
          c.px(cx + 2, y, k.gold, FLAT, { bias: 1 });
        }
      }
      break;
    case 'wizard':
      if (front) {
        recolor(c, ox, oy, ...box, D, k.trim, (x, y) => y >= sh && y <= sh + 4 && Math.abs(Math.abs(x + 0.5 - g.cx) - (sh + 4.6 - y) * 0.45) < 0.7);
        c.px(cx - 1, sh + 2, k.gold, FLAT, { bias: 1 });
      }
      for (let x = cx - 3; x <= cx + 2; x++) c.px(x, sh - 1, D, cyl((x + 0.5 - g.cx) / 3), { bias: Math.abs(x + 0.5 - g.cx) > 2 ? 1 : 0 });
      break;
    case 'qipao':
      // A mandarin collar, the closure curving to the right shoulder with knot buttons, a soft cloud print.
      for (let x = cx - 2; x <= cx + 1; x++) c.px(x, sh - 1, k.trim, cyl((x + 0.5 - g.cx) / 2.2));
      if (front) {
        for (const [x, y] of [
          [cx - 1, sh],
          [cx, sh],
          [cx + 1, sh + 1],
          [cx + 2, sh + 1],
          [cx + 3, sh + 2],
        ])
          c.px(x, y, k.trim, FLAT, { bias: 1 });
        c.px(cx + 1, sh + 2, k.gold, FLAT);
        c.px(cx + 3, sh + 3, k.gold, FLAT);
      }
      for (let y = sh + 1; y <= Math.round(g.hip) + 1; y++) for (let x = cx - 6; x <= cx + 6; x++) if (c.materialAt(x, y) === D && cloud(x, y)) c.shade(x, y, 1);
      break;
    case 'ballgown':
      // Off the shoulder: bare above a sweetheart line, the puff sleeves sitting low.
      recolor(c, ox, oy, ...box, D, k.skin, (x, y) => {
        const d = Math.abs(x + 0.5 - g.cx);
        return y < sh + 1 || (y === sh + 1 && (d < 0.6 || d > 2.6)) || (y === sh + 2 && d < 0.6 && front);
      });
      for (let x = cx - 3; x <= cx + 2; x++) if (c.materialAt(x, sh + 2) === D) c.shade(x, sh + 2, 1);
      break;
    case 'smock':
      if (front) {
        c.px(cx - 2, sh, k.linen, FLAT);
        c.px(cx - 1, sh + 1, k.linen, FLAT);
        c.px(cx, sh + 1, k.linen, FLAT);
        c.px(cx + 1, sh, k.linen, FLAT);
      }
      break;
    default:
      break;
  }
  if (front && !CLOSED_DRESS.has(w.dress)) {
    c.px(cx - 1, sh, k.skin, FLAT, { bias: -1 });
    c.px(cx, sh, k.skin, FLAT, { bias: -1 });
  }
}

/** A skirt (or a dress's skirt) from the waist down to `hem`, flaring by `flare`; `gap` opens it down the front (a coat's tails). */
function skirt(c: PixelCanvas, k: Kit, g: Geo, m: Material, hem: number, flare: number, kind: 'plain' | 'pleat' | 'tier' | 'stars' = 'plain', gap = 0): void {
  const top = g.hip - 1.5;
  const side = g.view === 'side';
  const sway = g.pose.sway * 0.9;
  const edges = (y: number): [number, number] => {
    const u = (y - top) / Math.max(1, hem - top);
    const half = k.hw + 0.3 + flare * Math.pow(u, 0.8);
    const s = sway * u;
    if (side) {
      const d = (half / k.sw) * k.dep;
      // An open coat side on: only its tail behind the legs.
      return gap ? [g.cx - d * 0.2 + s, g.cx + d + 0.8 + flare * 0.5 * u + s] : [g.cx - d - flare * 0.4 * u + s, g.cx + d + 0.8 + flare * 0.5 * u + s];
    }
    return [g.cx - half + s, g.cx + half + s];
  };
  const open = gap > 0 && g.view === 'down';
  const parts: ((y: number) => [number, number])[] = open
    ? [
        (y) => {
          const [l, r] = edges(y);
          return [l, Math.min(r, g.cx + sway * ((y - top) / (hem - top)) - gap * (0.4 + (y - top) / (hem - top)))];
        },
        (y) => {
          const [l, r] = edges(y);
          return [Math.max(l, g.cx + sway * ((y - top) / (hem - top)) + gap * (0.4 + (y - top) / (hem - top))), r];
        },
      ]
    : [edges];
  for (const e of parts) {
    c.part();
    rows(
      c,
      top,
      hem,
      e,
      m,
      (_x, _y, t, u) => cyl(t, 0.35 - u * 0.5),
      (x, y, _t, u) => {
        if (y >= Math.floor(hem)) return -1;
        if (kind === 'pleat') return (x + Math.round(u * 2)) % 2 === 0 ? -1 : 0;
        if (kind === 'tier') return Math.abs(y - (top + (hem - top) * 0.55)) < 0.5 ? -1 : 0;
        return 0;
      },
    );
  }
  if (kind === 'stars') starDust(c, g, top, hem);
}

function starDust(c: PixelCanvas, g: Geo, top: number, bottom: number): void {
  for (let y = Math.ceil(top); y < bottom; y++) {
    for (let x = Math.round(g.cx) - 8; x <= Math.round(g.cx) + 8; x++) {
      if (!c.filled(x, y) || hsh(x, y, 7) > 0.09) continue;
      c.spark(x, y, [255, 240, 190], 0.9);
    }
  }
}

/** Every pixel of `m` in rows y0..y1 near the figure, for trims and bands along a hem. */
function each(c: PixelCanvas, g: Geo, y0: number, y1: number, m: Material, f: (x: number, y: number) => void): void {
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.round(g.cx) - 11; x <= Math.round(g.cx) + 11; x++) if (c.materialAt(x, y) === m) f(x, y);
}

/** Below the waist of a whole suit: belts, sashes, a knight's tabard. */
function suitBelow(c: PixelCanvas, k: Kit, g: Geo, w: Wear): void {
  const cx = Math.round(g.cx);
  const by = Math.round(g.hip) - 1;
  const front = g.view === 'down';
  const side = g.view === 'side';
  const M = w.torso;
  c.part();
  switch (w.dress) {
    case 'coveralls':
      each(c, g, by, by, M, (x, y) => c.px(x, y, M, { x: 0, y: 0.3, z: 1 }, { bias: -1 }));
      break;
    case 'spacesuit':
      each(c, g, by, by, M, (x, y) => c.px(x, y, k.trim, cyl((x + 0.5 - g.cx) / 5)));
      if (front) c.px(cx - 1, by, k.silver, FLAT, { bias: 1 });
      break;
    case 'ninja':
      // A sash in the trim's colour, its ends hanging from the knot at the side.
      each(c, g, by, by + 1, M, (x, y) => c.px(x, y, k.trim, cyl((x + 0.5 - g.cx) / 5), { bias: y > by ? -1 : 0 }));
      if (!side) {
        const kx = g.cx + (front ? 2.4 : -2.4);
        c.capsule(kx, by + 1, kx + 0.8 + g.pose.sway * 0.5, by + 4.4, 0.7, 0.5, k.trim, { bias: -1 });
        c.capsule(kx - 0.6, by + 1, kx - 0.4 + g.pose.sway * 0.5, by + 3.6, 0.6, 0.5, k.trim);
      } else c.capsule(g.cx + 2, by + 1, g.cx + 3 + g.pose.sway, by + 4, 0.6, 0.5, k.trim, { bias: -1 });
      break;
    case 'knight': {
      // A leather belt with a gold buckle, the tabard falling below it.
      const sit = g.pose.sit;
      if (!side) {
        rows(c, by + 1, by + (sit ? 3 : 4.4) - g.pose.hop * 0.5, (y) => {
          const u = (y - by - 1) / 3.4;
          return [g.cx - 2.1 + u * 0.2 + g.pose.sway * u, g.cx + 2.1 - u * 0.2 + g.pose.sway * u];
        }, k.trim, (_x, _y, t) => cyl(t, 0.1), (_x, y) => (y >= Math.floor(by + (sit ? 3 : 4.4) - g.pose.hop * 0.5) ? -1 : 0));
      } else rows(c, by + 1, by + 4.6, (y) => [g.cx - k.dep - 0.2 + (y - by) * 0.1, g.cx - 0.2], k.trim, (_x, _y, t) => cyl(t, 0.1));
      c.part();
      each(c, g, by, by, M, (x, y) => c.px(x, y, k.leather, { x: 0, y: 0.2, z: 1 }));
      each(c, g, by, by, k.trim, (x, y) => c.px(x, y, k.leather, { x: 0, y: 0.2, z: 1 }));
      if (front) c.px(cx - 1, by, k.gold, FLAT, { bias: 1 });
      break;
    }
    default:
      break;
  }
}

function bottoms(c: PixelCanvas, k: Kit, g: Geo, w: Wear): void {
  if (w.suit) {
    suitBelow(c, k, g, w);
    return;
  }
  if (w.dress !== 'none') {
    const hem = DRESS_HEM[w.dress];
    const kind = w.dress === 'starrobe' ? 'stars' : w.dress === 'gown' || w.dress === 'ballgown' ? 'tier' : 'plain';
    const end = g.pose.sit ? Math.min(31, g.hip + 4) : hem - g.pose.hop;
    skirt(c, k, g, k.dress, end, DRESS_FLARE[w.dress], kind, w.dress === 'captain' ? 1.1 : 0);
    const cx = Math.round(g.cx);
    const D = w.torso;
    if (w.dress === 'yukata' || w.dress === 'robe') {
      // The sash.
      const y = Math.round(g.hip) - 1;
      for (let x = cx - 6; x <= cx + 6; x++) for (let dy = 0; dy < (w.dress === 'yukata' ? 2 : 1); dy++) if (c.materialAt(x, y + dy) === D) c.px(x, y + dy, k.trim, cyl((x + 0.5 - g.cx) / 5), { bias: dy });
    }
    if (w.dress === 'apron' && g.view === 'down') recolor(c, ox, oy, cx - 3, Math.round(g.hip) - 1, cx + 3, 31, D, k.linen, (x) => Math.abs(x + 0.5 - g.cx) < 2.4);
    if (w.dress === 'pinafore') {
      const y = Math.round(g.hip) - 1;
      for (let x = cx - 6; x <= cx + 6; x++) if (c.materialAt(x, y) === D) c.shade(x, y, -1);
    }
    if (w.dress === 'captain') {
      // A broad belt with a gold buckle, and the coat's edges and hem trimmed in the trim's colour.
      const y = Math.round(g.hip) - 1;
      each(c, g, y, y, D, (x, yy) => c.px(x, yy, k.leather, { x: 0, y: 0.2, z: 1 }));
      if (g.view === 'down') {
        c.px(cx - 1, y, k.gold, FLAT, { bias: 1 });
        c.px(cx, y, k.gold, FLAT);
        for (let yy = y + 1; yy <= Math.floor(end); yy++) {
          for (let x = cx; x >= cx - 5; x--)
            if (c.materialAt(x, yy) === D) {
              c.px(x, yy, k.trim, FLAT);
              break;
            }
          for (let x = cx; x <= cx + 5; x++)
            if (c.materialAt(x, yy) === D) {
              c.px(x, yy, k.trim, FLAT, { bias: -1 });
              break;
            }
        }
      }
      each(c, g, Math.floor(end), Math.floor(end), D, (x, yy) => c.px(x, yy, k.trim, FLAT, { bias: -1 }));
    }
    if (w.dress === 'wizard') {
      // A band of runes round the hem, and a cord belt with a tassel.
      const hy = Math.floor(end);
      each(c, g, hy - 1, hy, D, (x, yy) => c.px(x, yy, k.trim, cyl((x + 0.5 - g.cx) / 8), { bias: yy === hy ? -1 : 0 }));
      each(c, g, hy - 1, hy - 1, k.trim, (x, yy) => {
        if ((x & 1) === 0) c.px(x, yy, k.gold, FLAT);
      });
      const y = Math.round(g.hip) - 1;
      each(c, g, y, y, D, (x, yy) => c.px(x, yy, k.gold, cyl((x + 0.5 - g.cx) / 5)));
      if (g.view !== 'up') {
        const tx = g.view === 'side' ? cx - 2 : cx + 1;
        c.px(tx, y + 1, k.gold, FLAT, { bias: -1 });
        c.px(tx, y + 2, k.gold, FLAT, { bias: -1 });
        c.px(tx, y + 3, k.gold, FLAT, { bias: 1 });
      }
    }
    if (w.dress === 'qipao') {
      // Silk with a cloud print, a slit up one side.
      each(c, g, g.hip, end, D, (x, yy) => {
        if (cloud(x, yy)) c.shade(x, yy, 1);
      });
      if (g.view === 'down' && !g.pose.sit) each(c, g, g.hip + 3, end, D, (x, yy) => {
        if (x + 0.5 < g.cx - k.hw + 1.2 + g.pose.sway * 0.5) c.px(x, yy, k.skin, cyl(-0.6), { bias: -1 });
      });
      each(c, g, Math.floor(end), Math.floor(end), D, (x, yy) => c.px(x, yy, k.trim, FLAT, { bias: -1 }));
    }
    if (w.dress === 'ballgown') {
      // A ribbon at the waist, tied in a bow at the back; a ruffled hem.
      const y = Math.round(g.hip) - 2;
      each(c, g, y, y, D, (x, yy) => c.px(x, yy, k.trim, cyl((x + 0.5 - g.cx) / 5)));
      if (g.view === 'up') {
        c.part();
        c.ellipse(g.cx - 1.8, y, 1.6, 1.2, k.trim, { bias: 1 });
        c.ellipse(g.cx + 1.8, y, 1.6, 1.2, k.trim);
        c.px(cx - 1, y + 2, k.trim, FLAT, { bias: -1 });
        c.px(cx, y + 3, k.trim, FLAT, { bias: -1 });
      }
      const hy = Math.floor(end);
      each(c, g, hy - 1, hy, D, (x, yy) => c.px(x, yy, D, cyl((x + 0.5 - g.cx) / 9, -0.3), { bias: (x + yy) % 2 ? -1 : 1 }));
      each(c, g, g.hip, hy - 2, D, (x, yy) => {
        if (hsh(x, yy, 31) < 0.05) c.spark(x, yy, [255, 250, 235], 0.5);
      });
    }
    return;
  }
  const hem = (to: number) => (g.pose.sit ? g.hip + 3 : to - g.pose.hop);
  switch (w.bottom) {
    case 'skirt':
      skirt(c, k, g, k.bottom, hem(27.2), 1.6);
      break;
    case 'longskirt':
      skirt(c, k, g, k.bottom, hem(30), 2.4, 'tier');
      break;
    case 'pleated':
      skirt(c, k, g, k.bottom, hem(27.4), 1.8, 'pleat');
      break;
    case 'kilt': {
      // Tartan in the trim's colour, pleated at the back, a sporran in front.
      const end = hem(27.6);
      skirt(c, k, g, k.bottom, end, 1.3, g.view === 'up' ? 'pleat' : 'plain');
      const B = k.bottom;
      // Thin lines of the trim one way, darker bands the other.
      each(c, g, g.hip - 1.5, end, B, (x, y) => {
        if ((x + 41) % 4 === 0) swapPx(c, x, y, k.trim, y % 3 === 0 ? -1 : 0);
        else if (y % 3 === 0) c.shade(x, y, -1);
      });
      if (g.view === 'down') {
        const cx = Math.round(g.cx);
        const y = Math.round(g.hip);
        c.part();
        rows(c, y, y + 2.6, () => [g.cx - 1.5, g.cx + 1.5], k.leather, (_x, _y, t, u) => cyl(t, 0.3 - u * 0.5));
        c.px(cx - 1, y, k.gold, FLAT, { bias: 1 });
        c.px(cx, y, k.gold, FLAT);
        c.px(cx - 1, y + 2, k.linen, FLAT);
      }
      break;
    }
    case 'hakama': {
      // Wide pleated trousers to the ankle, tied high, split between the legs.
      const end = hem(30.4);
      skirt(c, k, g, k.bottom, end, 2.2, 'pleat');
      if (g.view !== 'side' && !g.pose.sit) each(c, g, g.hip + 2.5, end, k.bottom, (x, y) => {
        if (Math.abs(x + 0.5 - g.cx - g.pose.sway * 0.9 * ((y - g.hip) / (end - g.hip))) < 0.7) c.shade(x, y, -2);
      });
      const y = Math.round(g.hip) - 1;
      each(c, g, y, y, k.bottom, (x, yy) => c.px(x, yy, k.bottom, FLAT, { bias: 1 }));
      break;
    }
    case 'overalls': {
      // The bib and its straps over the top.
      const cx = Math.round(g.cx);
      const sh = Math.round(g.sh);
      c.part();
      if (g.view === 'down' || g.view === 'up') {
        rows(c, sh + 2, g.hip + 1, (y) => [g.cx - (y < sh + 3 ? 2.2 : k.ww - 0.2), g.cx + (y < sh + 3 ? 2.2 : k.ww - 0.2)], k.bottom, (_x, _y, t) => cyl(t, 0.1));
        for (let y = sh; y < sh + 2; y++) {
          c.px(cx - 3, y, k.bottom, FLAT, { bias: -1 });
          c.px(cx + 2, y, k.bottom, FLAT, { bias: -1 });
        }
        if (g.view === 'down') {
          c.px(cx - 2, sh + 2, k.gold, FLAT);
          c.px(cx + 1, sh + 2, k.gold, FLAT);
        }
      } else {
        rows(c, sh + 2, g.hip + 1, () => [g.cx - k.dep + 0.2, g.cx + k.dep * 0.4], k.bottom, (_x, _y, t) => cyl(t));
        for (let y = sh; y < sh + 2; y++) c.px(cx, y, k.bottom, FLAT, { bias: -1 });
      }
      break;
    }
    default: {
      // Trousers and the like: a waistband just showing under the top.
      break;
    }
  }
}

// ---------------------------------------------------------------- arms

/** The part (layer) a pixel was drawn in: tells a sleeve's own pixels from the torso's under them. */
const layerAt = (c: PixelCanvas, x: number, y: number): number => {
  const X = x + BX;
  const Y = y + BY;
  return X < 0 || Y < 0 || X >= c.w || Y >= c.h ? -1 : c.layer[Y * c.w + X];
};

/** Repaint a drawn pixel in another material, keeping its shape and light. */
function swapPx(c: PixelCanvas, x: number, y: number, m: Material, db = 0): void {
  const i = (y + BY) * c.w + x + BX;
  c.px(x, y, m, { x: c.nx[i], y: c.ny[i], z: c.nz[i] }, { bias: c.bias[i] + db });
}

/** Patterns, cuffs and stripes on the sleeve just drawn, worked out along the arm (t: 0 shoulder .. 1 hand). */
function sleeveDeco(c: PixelCanvas, k: Kit, g: Geo, w: Wear, i: 0 | 1): void {
  const s = g.shoulders[i];
  const h = g.hands[i];
  const sm = w.sleeveMat;
  const lay = layerAt(c, Math.floor(s.x + (h.x - s.x) * 0.25), Math.floor(s.y + (h.y - s.y) * 0.25));
  const kind = w.dress !== 'none' ? w.dress : w.top;
  const side = g.view === 'side';
  const vx = h.x - s.x;
  const vy = h.y - s.y;
  const len = Math.hypot(vx, vy) || 1;
  const outSign = side ? 1 : Math.sign(s.x - g.cx) || 1;
  const x0 = Math.floor(Math.min(s.x, h.x) - 4);
  const x1 = Math.ceil(Math.max(s.x, h.x) + 4);
  const y0 = Math.floor(Math.min(s.y, h.y) - 3);
  const y1 = Math.ceil(Math.max(s.y, h.y) + 5);
  const mine = (x: number, y: number) => layerAt(c, x, y) === lay && c.materialAt(x, y) === sm;
  let lowest = -Infinity;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (mine(x, y)) lowest = Math.max(lowest, y);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!mine(x, y)) continue;
      const px = x + 0.5 - s.x;
      const py = y + 0.5 - s.y;
      const t = (px * vx + py * vy) / (len * len);
      // Across the arm: + is the outside (away from the body, or the back side on).
      const across = ((px * vy - py * vx) / len) * (vy >= 0 ? -1 : 1) * outSign;
      switch (kind) {
        case 'flannel':
          if (plaid(x, y)) swapPx(c, x, y, k.trim, plaid(x, y) === 2 ? -1 : 0);
          break;
        case 'hawaiian':
          if (tropic(x, y)) swapPx(c, x, y, tropic(x, y) === 1 ? k.trim : k.leaf);
          break;
        case 'jersey':
        case 'polo':
        case 'qipao':
          if (t > 0.3) swapPx(c, x, y, k.trim);
          break;
        case 'letterman':
          if (t > 0.74) swapPx(c, x, y, w.torso, y % 2 ? -1 : 0);
          break;
        case 'tracksuit':
          if (across > 0.15 && across < 1.25 && t > 0.05) swapPx(c, x, y, k.trim);
          break;
        case 'armor':
          if ((x + y) % 2 === 0) c.shade(x, y, -1);
          break;
        case 'knight':
          if (t > 0.44 && t < 0.58) c.shade(x, y, 1);
          else if (t > 0.78) c.shade(x, y, -1);
          break;
        case 'spacesuit':
          if ((t > 0.14 && t < 0.27) || t > 0.82) swapPx(c, x, y, k.trim);
          break;
        case 'ninja':
          if (t > 0.64 && y % 2 === 0) c.shade(x, y, -1);
          break;
        case 'captain':
          if (t > 0.7) swapPx(c, x, y, k.trim);
          break;
        case 'wizard':
          if (y >= lowest - 1) swapPx(c, x, y, k.trim, y === lowest ? -1 : 0);
          break;
        case 'blazer':
          if (t > 0.84) swapPx(c, x, y, k.linen);
          break;
        case 'denim':
          if (t > 0.76) c.shade(x, y, -1);
          break;
        default:
          break;
      }
    }
  if (kind === 'captain' && !side) c.px(Math.round(s.x + vx * 0.78 - 0.5 + outSign * 0.6), Math.round(s.y + vy * 0.78), k.gold, FLAT);
}

/** A round plate over the shoulder, its rim in `rim`. */
function pauldron(c: PixelCanvas, g: Geo, i: 0 | 1, metal: Material, rim: Material, bias: number): void {
  const s = g.shoulders[i];
  const out = g.view === 'side' ? 0.2 : Math.sign(s.x - g.cx) * 0.7;
  c.part();
  c.ellipse(s.x + out, s.y + 0.1, 2.2, 1.7, rim, { bias: bias - 1 });
  c.part();
  c.ellipse(s.x + out, s.y - 0.5, 2.1, 1.5, metal, { bias: bias + (g.view === 'up' ? 0 : 1) });
}

function arm(c: PixelCanvas, k: Kit, g: Geo, w: Wear, i: 0 | 1, far = false): void {
  const s = g.shoulders[i];
  const h = g.hands[i];
  const bias = far ? -1 : 0;
  const sm = w.sleeveMat;
  c.part();
  c.capsule(s.x, s.y, h.x, h.y, 1.3, 1.15, k.skin, { bias });
  const along = (t: number): P => ({ x: s.x + (h.x - s.x) * t, y: s.y + (h.y - s.y) * t });
  switch (w.sleeve) {
    case 'short': {
      const e = along(0.42);
      c.capsule(s.x, s.y - 0.3, e.x, e.y, 1.6, 1.55, sm, { bias });
      break;
    }
    case 'puff': {
      c.ellipse(s.x, s.y + 0.4, 1.9, 1.8, sm, { bias });
      break;
    }
    case 'long': {
      const e = along(0.86);
      c.capsule(s.x, s.y - 0.3, e.x, e.y, 1.55, 1.4, sm, { bias });
      c.px(Math.round(e.x - 0.5), Math.round(e.y), sm, FLAT, { bias: bias - 1 });
      break;
    }
    case 'puffy': {
      const e = along(0.88);
      c.capsule(s.x, s.y - 0.3, e.x, e.y, 2, 1.7, sm, { bias });
      const m = along(0.45);
      c.shade(Math.round(m.x - 0.5), Math.round(m.y), -1);
      break;
    }
    case 'wide': {
      const e = along(0.8);
      c.capsule(s.x, s.y - 0.3, e.x, e.y, 1.6, 1.6, sm, { bias });
      // The bell of the sleeve hangs below the arm, swinging with it.
      const hang = 2.2;
      const sx = g.view === 'side' ? 0.6 : i ? 0.4 : -0.4;
      rows(c, e.y - 1.5, e.y + hang, (y) => {
        const u = (y - (e.y - 1.5)) / (hang + 1.5);
        const half = 1.5 + u * 0.9;
        const x = e.x + sx * u * 2;
        return [x - half, x + half];
      }, sm, (_x, _y, t) => cyl(t, 0.1), (_x, y) => (y >= Math.floor(e.y + hang) ? -1 + bias : bias));
      break;
    }
    case 'none':
    default:
      break;
  }
  if (w.sleeve !== 'none' && w.sleeve !== 'puff') sleeveDeco(c, k, g, w, i);
  if (w.dress === 'knight' || (w.dress === 'none' && w.top === 'armor')) pauldron(c, g, i, w.torso, w.dress === 'knight' ? k.trim : k.gold, bias);
  c.part();
  c.ellipse(h.x, h.y, 1.2, 1.15, k.skin, { bias });
}

/** A poncho over everything from the shoulders down: woven bands in the trim's colour, a fringed hem, the hands showing below. */
function cloak(c: PixelCanvas, k: Kit, g: Geo, w: Wear): void {
  if (w.dress !== 'none' || w.top !== 'poncho') return;
  const T = w.torso;
  const side = g.view === 'side';
  const top = g.sh;
  const end = g.hip + (g.pose.sit ? 1 : 2.4);
  const sway = g.pose.sway * 0.6;
  c.part();
  rows(
    c,
    top,
    end,
    (y) => {
      const u = (y - top) / Math.max(1, end - top);
      const s = sway * u;
      if (side) {
        const d = k.dep + 0.4 + u * 2.2;
        return [g.cx - d + 0.2 + s, g.cx + d + 0.6 + s];
      }
      const half = k.sw - 1 + Math.min(1, u * 3) * 1.2 + u * 2.4;
      return [g.cx - half + s, g.cx + half + s];
    },
    T,
    (_x, _y, t, u) => cyl(t, 0.35 - u * 0.5),
  );
  const yb = Math.round(top + (end - top) * 0.5);
  const cx = Math.round(g.cx);
  each(c, g, yb, yb + 2, T, (x, y) => {
    if (y !== yb + 1) c.px(x, y, k.trim, FLAT);
    else if ((x - cx + 30) % 3 === 0) c.px(x, y, k.linen, FLAT);
  });
  each(c, g, top + 1, top + 1, T, (x, y) => {
    if ((x + 30) % 2 === 0) c.px(x, y, k.trim, FLAT, { bias: -1 });
  });
  // The fringe: a tassel every other pixel under the hem.
  const fy = Math.floor(end) + 1;
  for (let x = cx - 9; x <= cx + 9; x++) if (c.materialAt(x, fy - 1) === T && (x + 30) % 2 === 0) c.px(x, fy, k.trim, FLAT, { bias: -1 });
  if (g.view === 'down') {
    c.px(cx - 1, Math.round(top), k.skin, FLAT, { bias: -1 });
    c.px(cx, Math.round(top), k.skin, FLAT, { bias: -1 });
  }
  c.part();
  for (const i of side ? [0] : [0, 1]) c.ellipse(g.hands[i].x, g.hands[i].y, 1.2, 1.15, k.skin);
}

// ---------------------------------------------------------------- head and face

function head(c: PixelCanvas, k: Kit, g: Geo): void {
  const side = g.view === 'side';
  const rx = side ? 5.05 : 5.5;
  c.part();
  // Ears first, so the head sits over them.
  if (side) c.ellipse(g.hx + 1.4, g.hy + 1.1, 1.1, 1.35, k.skin);
  else {
    c.ellipse(g.hx - 5.3, g.hy + 0.9, 1, 1.3, k.skin, { bias: -1 });
    c.ellipse(g.hx + 5.3, g.hy + 0.9, 1, 1.3, k.skin, { bias: -1 });
  }
  c.ellipse(g.hx, g.hy, rx, 5.2, k.skin, { flatten: 1.1 });
  if (side) {
    // The nose, and the chin's curve toward the front.
    c.px(Math.round(g.hx - rx - 0.4), Math.round(g.hy + 1.4), k.skin, sphere(-0.9, 0, 1));
  }
  if (g.view !== 'up') face(c, k, g);
}

type Pattern = string[];

/** The eyes' top row: a row above the head's middle, so the face sits clear of the chin. */
export const eyeRow = (g: Geo): number => Math.round(g.hy) - 1;

const EYE_PATTERNS: Record<string, Pattern> = {
  round: ['kw', 'kk'],
  bright: ['kw', 'id'],
  gentle: ['kk', 'id'],
  content: ['.k.', 'k.k'],
  wide: ['kk', 'wi'],
  cat: ['.k', 'ki'],
  dot: ['k', 'k'],
  starry: ['iw', 'wd'],
};

const MOUTH_PATTERNS: Record<string, Pattern> = {
  smile: ['m.m', '.m.'],
  grin: ['mmm', '.r.'],
  calm: ['mm'],
  open: ['m', 'r'],
  cat: ['m.m.m', '.m.m.'],
  smirk: ['..m', 'mm.'],
  blep: ['mm', '.r'],
};

function paint(c: PixelCanvas, k: Kit, pat: Pattern, x0: number, y0: number, mirror = false): void {
  pat.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const ch = mirror ? row[row.length - 1 - dx] : row[dx];
      const m = ch === 'k' ? k.lash : ch === 'i' ? k.iris : ch === 'd' ? k.irisDeep : ch === 'w' ? k.white : ch === 'm' ? k.mouth : ch === 'r' ? k.tongue : null;
      if (m) c.px(x0 + dx, y0 + dy, m, FLAT);
    }
  });
}

function face(c: PixelCanvas, k: Kit, g: Geo): void {
  const p = g.pose;
  const side = g.view === 'side';
  const hx = Math.round(g.hx);
  const ey = eyeRow(g);
  const style = p.face === 'content' ? 'content' : id(EYES, k.a.eyes);
  let pat = EYE_PATTERNS[style];
  if (p.blink && style !== 'content') pat = ['', pat[0].replace(/[^.]/g, 'k')];
  const mStyle = p.face === 'grin' ? 'grin' : p.face === 'open' ? 'open' : id(MOUTHS, k.a.mouth);
  const mouth = MOUTH_PATTERNS[mStyle];
  const cheeks = k.a.cheeks;
  if (side) {
    const ex = hx - 3;
    const one = pat.map((r) => (r.length === 3 ? r.slice(0, 2) : r));
    paint(c, k, one, ex - (one[0]?.length === 1 ? -1 : 0), ey);
    const mx = hx - 4;
    const my = ey + 3;
    c.px(mx, my, k.mouth, FLAT);
    if (mStyle === 'grin' || mStyle === 'blep' || mStyle === 'open') c.px(mx, my + 1, k.tongue, FLAT);
    if (cheeks === 1 || cheeks === 3) c.px(hx - 1, ey + 2, k.blush, FLAT);
    if (cheeks >= 2) {
      c.shade(hx - 2, ey + 3, -1);
      c.shade(hx, ey + 2, -1);
    }
    brows(c, k, g, [ex], true);
    beard(c, k, g);
    return;
  }
  // Eyes: two wide at 9-10 and 14-15 (for a head centred on 12); wider and narrower ones keep the same middle.
  const w = pat[0]?.length || pat[1]?.length || 2;
  const lx = w === 3 ? hx - 4 : w === 1 ? hx - 2 : hx - 3;
  const rx = w === 3 ? hx + 2 : w === 1 ? hx + 2 : hx + 2;
  paint(c, k, pat, lx, ey);
  paint(c, k, pat, rx, ey, style === 'cat');
  const mw = mouth[0].length;
  paint(c, k, mouth, hx - Math.floor(mw / 2), ey + 3);
  if (cheeks === 1 || cheeks === 3 || p.face === 'content') {
    c.px(hx - 4, ey + 2, k.blush, FLAT);
    c.px(hx + 3, ey + 2, k.blush, FLAT);
    if (p.face === 'content') {
      c.px(hx - 5, ey + 2, k.blush, FLAT);
      c.px(hx + 4, ey + 2, k.blush, FLAT);
    }
  }
  if (cheeks >= 2) {
    for (const [dx, dy] of [
      [-4, 3],
      [-3, 2],
      [3, 3],
      [2, 2],
    ])
      if (c.materialAt(hx + dx, ey + dy) === k.skin) c.shade(hx + dx, ey + dy, -1);
  }
  brows(c, k, g, [lx + (w === 3 ? 1 : w === 1 ? -1 : 0), rx + (w === 1 ? 0 : 0)], false);
  beard(c, k, g);
}

function brows(c: PixelCanvas, k: Kit, g: Geo, at: number[], side: boolean): void {
  const kind = id(BROWS, k.a.brows);
  if (kind === 'none') return;
  const y = eyeRow(g) - 2;
  at.forEach((x, i) => {
    const inner = side ? 0 : i === 0 ? 1 : 0;
    const outer = 1 - inner;
    const put = (dx: number, dy: number) => c.px(x + dx, y + dy, k.brow, FLAT);
    if (kind === 'soft') {
      put(0, 0);
      put(1, 0);
    } else if (kind === 'bold') {
      put(0, 0);
      put(1, 0);
      put(side ? -1 : i === 0 ? -1 : 2, 0);
    } else if (kind === 'arched') {
      put(outer, 0);
      put(inner, 0);
      put(outer === 0 ? -1 : 2, 1);
    } else if (kind === 'worried') {
      put(inner, -1);
      put(outer, 0);
    }
  });
}

function beard(c: PixelCanvas, k: Kit, g: Geo): void {
  const kind = id(BEARDS, k.a.beard);
  if (kind === 'none') return;
  const hx = Math.round(g.hx);
  const ey = eyeRow(g);
  const side = g.view === 'side';
  const H = k.hair;
  if (kind === 'stubble') {
    for (let y = ey + 2; y <= ey + 5; y++)
      for (let x = hx - 5; x <= hx + 5; x++) {
        if (c.materialAt(x, y) !== k.skin) continue;
        const dx = (x + 0.5 - g.hx) / 5.5;
        const dy = (y + 0.5 - g.hy) / 5.2;
        if (dx * dx + dy * dy > 0.55 && (x + y) % 2 === 0) c.px(x, y, H, FLAT, { bias: -1 });
      }
    return;
  }
  if (kind === 'moustache') {
    const y = ey + 2;
    if (side) {
      c.px(hx - 4, y + 0.5, H, FLAT);
      c.px(hx - 3, y + 0.5, H, FLAT);
    } else for (const dx of [-2, -1, 1, 2]) c.px(hx + dx, y + (Math.abs(dx) === 2 ? 1 : 0), H, FLAT, { bias: Math.abs(dx) === 2 ? -1 : 0 });
    c.px(hx, y, H, FLAT, { bias: 1 });
    return;
  }
  if (kind === 'goatee') {
    const y = ey + 4;
    if (side) {
      c.px(hx - 4, y, H, FLAT);
      c.px(hx - 3, y + 1, H, FLAT);
    } else {
      for (const dx of [-1, 0, 1]) c.px(hx + dx, y, H, sphere(dx / 2, 0.3));
      c.px(hx, y + 1, H, FLAT, { bias: -1 });
    }
    return;
  }
  if (kind === 'handlebar') {
    // A thick moustache whose waxed ends curl up.
    const y = ey + 2;
    if (side) {
      c.px(hx - 4, y + 0.5, H, FLAT);
      c.px(hx - 3, y + 0.5, H, FLAT, { bias: -1 });
      c.px(hx - 5, y - 0.5, H, FLAT, { bias: 1 });
      return;
    }
    for (const dx of [-2, -1, 0, 1]) c.px(hx + dx, y, H, sphere(dx / 3, 0.2), { bias: dx === -1 || dx === 0 ? 1 : 0 });
    c.px(hx - 3, y, H, FLAT, { bias: -1 });
    c.px(hx + 2, y, H, FLAT, { bias: -1 });
    c.px(hx - 4, y - 1, H, FLAT);
    c.px(hx + 3, y - 1, H, FLAT);
    return;
  }
  // The rest follow the jaw: which of its pixels each keeps.
  const keep = (dx: number, r: number, y: number): boolean => {
    if (kind === 'sideburns') return Math.abs(dx) > 0.66 && y <= ey + 4;
    if (kind === 'chinstrap') return r > 0.68 && y >= ey + 2;
    return true;
  };
  // A full beard (and the jaw-hugging ones): from ear to ear, round the mouth.
  for (let y = ey + 1; y <= ey + 6; y++)
    for (let x = hx - 6; x <= hx + 6; x++) {
      const dx = (x + 0.5 - g.hx) / 5.7;
      const dy = (y + 0.5 - g.hy) / 5.6;
      const r = dx * dx + dy * dy;
      if (r > 1) continue;
      if (side ? x > hx + 1 : false) continue;
      const mouthHole = !side && y === ey + 3 && Math.abs(x - hx) <= 1;
      if (mouthHole) continue;
      if (y <= ey + 2 && Math.abs(dx) < 0.62 && !side) continue;
      if (!keep(side ? (x + 0.5 - g.hx) / 3 : dx, r, y)) continue;
      c.px(x, y, H, sphere(dx, dy * 0.6 + 0.3, 1), { bias: hsh(x, y) < 0.25 ? -1 : 0 });
    }
  if (kind === 'viking') {
    // Below the chin, a long beard braided into a tail with a ring round it.
    const bx = side ? g.hx - 3.2 : g.hx;
    const sway = g.pose.sway * 0.6;
    c.part();
    c.capsule(bx, ey + 5.5, bx + sway, ey + 9.5, 1.9, 1, H, { bias: 0 });
    for (let y = ey + 6; y <= ey + 9; y++) if ((y & 1) === 0) c.shade(Math.round(bx + sway * ((y - ey - 5) / 4) - 0.5), y, -1);
    c.part();
    c.ellipse(bx + sway * 0.8, ey + 8.6, 1.1, 0.6, k.gold);
    c.px(Math.round(bx + sway - 0.5), ey + 10, H, FLAT, { bias: -1 });
  }
}

// ---------------------------------------------------------------- the whole figure

export interface Layers {
  /** Things worn on the back and carried, drawn by gear.ts, at their moment in the order. */
  behind(c: PixelCanvas, k: Kit, g: Geo): void;
  backHair(c: PixelCanvas, k: Kit, g: Geo): void;
  neck(c: PixelCanvas, k: Kit, g: Geo): void;
  hairFront(c: PixelCanvas, k: Kit, g: Geo): void;
  hat(c: PixelCanvas, k: Kit, g: Geo): void;
  face(c: PixelCanvas, k: Kit, g: Geo): void;
  held(c: PixelCanvas, k: Kit, g: Geo): void;
  over(c: PixelCanvas, k: Kit, g: Geo): void;
}

export function drawFigure(c: PixelCanvas, k: Kit, g: Geo, L: Layers): void {
  const w = wearOf(k);
  c.offset(BX, BY);
  if (g.view === 'down') {
    L.behind(c, k, g);
    L.backHair(c, k, g);
    legs(c, k, g, w);
    torso(c, k, g, w);
    bottoms(c, k, g, w);
    arm(c, k, g, w, 0);
    arm(c, k, g, w, 1);
    cloak(c, k, g, w);
    L.neck(c, k, g);
    head(c, k, g);
    L.hairFront(c, k, g);
    L.hat(c, k, g);
    L.face(c, k, g);
    L.held(c, k, g);
    L.over(c, k, g);
  } else if (g.view === 'up') {
    L.held(c, k, g);
    legs(c, k, g, w);
    torso(c, k, g, w);
    bottoms(c, k, g, w);
    arm(c, k, g, w, 0);
    arm(c, k, g, w, 1);
    cloak(c, k, g, w);
    L.neck(c, k, g);
    head(c, k, g);
    L.backHair(c, k, g);
    L.hairFront(c, k, g);
    L.hat(c, k, g);
    L.behind(c, k, g);
    L.over(c, k, g);
  } else {
    L.behind(c, k, g);
    arm(c, k, g, w, 1, true);
    L.backHair(c, k, g);
    legs(c, k, g, w);
    torso(c, k, g, w);
    bottoms(c, k, g, w);
    L.neck(c, k, g);
    head(c, k, g);
    L.hairFront(c, k, g);
    L.hat(c, k, g);
    L.face(c, k, g);
    arm(c, k, g, w, 0);
    cloak(c, k, g, w);
    L.held(c, k, g);
    L.over(c, k, g);
  }
  c.offset(0, 0);
}
