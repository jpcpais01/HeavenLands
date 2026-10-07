// Dev tool: paint Starwatch (src/heaven/starwatch/) roughly as it looks by
// its night light: the sky, the isle, everything that stands on it and the
// lanterns' pools, to a PNG, and its loading picture beside.
// Usage: npx tsx scripts/starwatch.ts [out.png] [scale] [x y w h]
import { writeFileSync } from 'node:fs';
import type { RenderedFrame } from '../src/art/pixel';
import { ISLE_H, ISLE_W, ISLE_X, ISLE_Y, PROP_ART, isleArt, paintStarwatchLoad, propFrame, skyCanvas } from '../src/heaven/starwatch/art';
import { PROPS, SW_H, SW_W } from '../src/heaven/starwatch/layout';
import { encodePNG } from './png';

const out = process.argv[2] ?? 'starwatch.png';
const S = Math.max(1, Number(process.argv[3] ?? 1));
const x0 = Number(process.argv[4] ?? 0);
const y0 = Number(process.argv[5] ?? 0);
const W = Number(process.argv[6] ?? SW_W);
const H = Number(process.argv[7] ?? SW_H);

const run = <T>(g: Generator<void, T, void>): T => {
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
};
const img = new Float32Array(W * H * 3);
const glow = new Float32Array(W * H * 3);
const sky = run(skyCanvas());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) img[(y * W + x) * 3 + c] = sky[((y + y0) * SW_W + x + x0) * 4 + c];

/** Moonlight: a cool key from the upper left and a blue sky fill. */
const L = [-0.5, 0.55, 0.68];
const Ll = Math.hypot(...L);
const lit = (v: number, c: number, nx: number, ny: number, nz: number) => {
  const d = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / Ll);
  return v * ([0.3, 0.34, 0.5][c] + d * [0.42, 0.46, 0.62][c]) + [2, 3, 8][c];
};
const isle = run(isleArt());
for (let j = 0; j < ISLE_H; j++) {
  for (let i = 0; i < ISLE_W; i++) {
    const s = (j * ISLE_W + i) * 4;
    if (!isle.diffuse[s + 3]) continue;
    const X = ISLE_X + i - x0;
    const Y = ISLE_Y + j - y0;
    if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
    const n = [isle.normal[s] / 127.5 - 1, isle.normal[s + 1] / 127.5 - 1, isle.normal[s + 2] / 127.5 - 1];
    const o = (Y * W + X) * 3;
    for (let c = 0; c < 3; c++) {
      img[o + c] = lit(isle.diffuse[s + c], c, n[0], n[1], n[2]);
      glow[o + c] += isle.emissive[s + c];
    }
  }
}

const frames = new Map<string, RenderedFrame>();
const draw = (kind: string, v: number): RenderedFrame => {
  const k = `${kind}${v}`;
  let f = frames.get(k);
  if (!f) {
    f = propFrame(kind, v).render();
    frames.set(k, f);
  }
  return f;
};
const props = [...PROPS()].sort((a, b) => a.y - b.y);
for (const p of props) {
  const a = PROP_ART[p.kind];
  const f = draw(p.kind, p.v);
  for (let j = 0; j < a.h; j++) {
    for (let i = 0; i < a.w; i++) {
      const s = (j * a.w + (p.flip ? a.w - 1 - i : i)) * 4;
      const al = f.diffuse[s + 3] / 255;
      const X = Math.round(p.x - a.w / 2 + i) - x0;
      const Y = Math.round(p.y - a.foot + j) - y0;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const o = (Y * W + X) * 3;
      const n = [f.normal[s] / 127.5 - 1, f.normal[s + 1] / 127.5 - 1, f.normal[s + 2] / 127.5 - 1];
      for (let c = 0; c < 3; c++) {
        if (al) img[o + c] = img[o + c] * (1 - al) + lit(f.diffuse[s + c], c, n[0], n[1], n[2]) * al;
        if (f.emissive[s + 3]) glow[o + c] += f.emissive[s + c];
      }
    }
  }
}
// The lanterns' pools of warm light.
for (const p of props) {
  if (p.kind !== 'lantern') continue;
  const r = 74;
  const ly = p.y - 18;
  for (let y = Math.floor(ly - r); y <= ly + r; y++) {
    for (let x = Math.floor(p.x - r); x <= p.x + r; x++) {
      const X = x - x0;
      const Y = y - y0;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const d = Math.hypot(x - p.x, (y - p.y) * 1.3) / r;
      if (d >= 1) continue;
      const k = (1 - d) * (1 - d) * 1.2;
      const o = (Y * W + X) * 3;
      const cr = [255, 184, 96];
      for (let c = 0; c < 3; c++) img[o + c] += img[o + c] * (cr[c] / 255) * k * 1.8;
    }
  }
}
const px = new Uint8ClampedArray(W * S * H * S * 4);
for (let y = 0; y < H * S; y++) {
  for (let x = 0; x < W * S; x++) {
    const i = (Math.floor(y / S) * W + Math.floor(x / S)) * 3;
    const o = (y * W * S + x) * 4;
    for (let c = 0; c < 3; c++) px[o + c] = img[i + c] + glow[i + c] * 0.8;
    px[o + 3] = 255;
  }
}
writeFileSync(out, encodePNG(W * S, H * S, px));

const load = paintStarwatchLoad();
const LS = 3;
const lp = new Uint8ClampedArray(load.base.w * LS * load.base.h * LS * 4);
for (let y = 0; y < load.base.h * LS; y++) {
  for (let x = 0; x < load.base.w * LS; x++) {
    const i = (Math.floor(y / LS) * load.base.w + Math.floor(x / LS)) * 4;
    const o = (y * load.base.w * LS + x) * 4;
    for (let c = 0; c < 3; c++) lp[o + c] = load.base.data[i + c] + load.glow.data[i + c] * 0.7;
    lp[o + 3] = 255;
  }
}
writeFileSync(out.replace(/\.png$/, '-load.png'), encodePNG(load.base.w * LS, load.base.h * LS, lp));
console.log('wrote', out);
