// Dev tool: render Heaven Lands' wardrobe to a zoomed, roughly lit PNG, a row
// per look and a column per pose. With no list, every ready-made outfit; with
// `<field>=<id>,<id>...` (e.g. `hat=cowboy,viking`), one row per choice worn
// by the default wanderer, plus any `key=id` pairs after it for the rest.
// Usage: npx tsx scripts/outfits.ts [out.png] [scale] [field=ids] [key=id...]
import { writeFileSync } from 'node:fs';
import { DEFAULT_LOOK, FIELDS, PRESETS, presetWear, type Appearance, type Named } from '../src/heaven/look';
import { wandererFrame, WFH, WFW } from '../src/heaven/art/sheet';
import type { View } from '../src/heaven/art/kit';
import { encodePNG } from './png';

const out = process.argv[2] ?? 'outfits.png';
const S = Number(process.argv[3] ?? 4);
const args = process.argv.slice(4);

const set = (a: Appearance, key: string, val: string): Appearance => {
  const f = FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`no field ${key}`);
  const i = (f.list as Named[]).findIndex((o) => o.id === val);
  if (i < 0) throw new Error(`no ${key} ${val}`);
  return { ...a, [key]: i };
};

let base: Appearance = { ...DEFAULT_LOOK, held: 0, neck: 0 };
for (const kv of args.slice(1)) base = set(base, ...(kv.split('=') as [string, string]));
const looks: Appearance[] = args[0]
  ? args[0].split('=')[1].split(',').map((v) => set(base, args[0].split('=')[0], v))
  : PRESETS.map((p) => ({ ...base, ...presetWear(p) }));

const POSES: [Parameters<typeof wandererFrame>[1], View, number][] = [
  ['idle', 'down', 0], ['idle', 'side', 0], ['idle', 'up', 0], ['walk', 'down', 1], ['walk', 'side', 3], ['wave', 'down', 2], ['cheer', 'down', 2], ['sit', 'down', 0],
];
const L = (() => { const v = [-0.45, -0.55, 0.7]; const n = Math.hypot(...v); return v.map((k) => k / n); })();
const pad = 2;
const W = (POSES.length * (WFW + pad) + pad) * S;
const H = (looks.length * (WFH + pad) + pad) * S;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([96, 112, 92, 255], i * 4);
looks.forEach((a, ri) => POSES.forEach(([anim, view, f], ci) => {
  const r = wandererFrame(a, anim, view, f).render();
  const ox = pad + ci * (WFW + pad);
  const oy = pad + ri * (WFH + pad);
  for (let y = 0; y < WFH; y++) for (let x = 0; x < WFW; x++) {
    const i = (y * WFW + x) * 4;
    const on = r.diffuse[i + 3] > 0;
    const glow = r.emissive[i + 3] > 0;
    if (!on && !glow) continue;
    let c = [0, 0, 0];
    if (on) {
      const n = [r.normal[i] / 127.5 - 1, -(r.normal[i + 1] / 127.5 - 1), r.normal[i + 2] / 127.5 - 1];
      const lit = 0.55 + 0.6 * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      c = [r.diffuse[i] * lit, r.diffuse[i + 1] * lit, r.diffuse[i + 2] * lit];
    }
    if (glow) c = c.map((v, k) => v + r.emissive[i + k] * 0.7);
    c = c.map((v) => Math.min(255, v));
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) img.set([c[0], c[1], c[2], 255], (((oy + y) * S + sy) * W + (ox + x) * S + sx) * 4);
  }
}));
writeFileSync(out, encodePNG(W, H, img));
console.log(`${out}: ${W}x${H}`);
