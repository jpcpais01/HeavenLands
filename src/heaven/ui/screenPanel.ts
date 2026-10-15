// The screens: the television in the living room and the wanderer's tablet
// (see pastimes/index.ts). Both play real YouTube, so they're HTML over the
// canvas (as the account card is), dressed as the thing itself: the
// television a walnut cabinet round a cream-rimmed screen with its channel
// buttons under it, the tablet a rounded slate with a dawn-sky home screen.
//
// A video is put on from a channel, from one watched before (kept on the
// device and in the cloud save, with their pictures), or from a pasted
// YouTube link. YouTube's search can't be shown inside the game, so Find
// opens it in the browser to copy a link from. Friends watching a television
// nearby see what's put on (pastimes/index.ts sends it).
//
// The tablet has three apps besides: Videos, a Sketchbook (four pages of
// pixel drawings, kept like the videos, saved as pictures) and the Sky (the
// time of day, the next shower and Starwatch's next meteor shower).

import { showerAt } from '../weather';

/** A video or a playlist, and what to call it. */
export interface Clip {
  v?: string;
  list?: string;
  title: string;
}

export interface ScreenOpts {
  kind: 'tv' | 'pad';
  /** What a friend nearby has on, and how many seconds in: started with it. */
  shared?: { clip: Clip; at: number } | null;
  /** Put on by this player (for friends nearby). */
  onPlay?(clip: Clip): void;
  /** A video is on, or none is (the world's music falls quiet under one). */
  onPlaying?(on: boolean): void;
  /** The time of day in the world, for the tablet's Sky. */
  phase?(): string;
  onClose(): void;
}

export interface ScreenHandle {
  close(): void;
  /** A friend nearby put this on: the screen follows, if it's showing videos. */
  follow(clip: Clip, at: number): void;
}

/** Channels always on the dial. */
const CHANNELS: Clip[] = [
  { v: 'jfKfPfyJRdk', title: 'Lofi radio' },
  { v: '4xDzrJKXOOY', title: 'Synthwave radio' },
];
/** How many videos watched before are kept. */
const RECENT = 8;
const STORE = 'pixel-battle.screen';
const SKETCHES = 'pixel-battle.sketches';
/** The sketchbook: pages, and each page's size in pixels. */
const PAGES = 4;
const SKETCH_W = 64;
const SKETCH_H = 40;
/** A saved sketch is this many times its size. */
const SAVE_SCALE = 8;
const PALETTE = ['#2a1f33', '#fff6e4', '#8a8094', '#ff7aa2', '#ffb7c6', '#f0884a', '#ffd66b', '#9ad870', '#4a9a5a', '#6ac8ff', '#4a6ac8', '#b48ae8', '#a86a3a', '#f2d2b0'];
/** Starwatch's meteor shower (starwatch/Starwatch.ts): every 3 minutes by the wall clock, 45 s long. */
const METEOR_EVERY = 3 * 60 * 1000;
const METEOR_LEN = 45 * 1000;
/** How far ahead the Sky looks for the next shower, and in what steps, ms. */
const SKY_AHEAD = 6 * 3600 * 1000;
const SKY_STEP = 30 * 1000;

const CSS = `
#hl-screen { position: fixed; inset: 0; z-index: 6; display: flex; align-items: center; justify-content: center; padding: 8px; background: radial-gradient(circle at 50% 45%, rgba(40, 26, 44, 0.35), rgba(16, 10, 22, 0.78)); animation: hl-scr-fade 0.2s ease-out; }
#hl-screen * { box-sizing: border-box; }
#hl-screen button { padding: 5px 9px; border: 0; border-radius: 0; cursor: pointer; font: inherit; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap; }
#hl-screen button:active { transform: translateY(1px); filter: brightness(0.94); }
#hl-screen input { min-width: 0; flex: 1; font: 14px/1.3 ui-monospace, Menlo, monospace; padding: 5px 7px; border: 0; border-radius: 0; outline: none; -webkit-user-select: text; user-select: text; }
#hl-screen .x { position: absolute; top: -10px; right: -10px; width: 26px; height: 26px; padding: 0; font-size: 14px; line-height: 26px; color: #fffaf0; background: linear-gradient(#ffb7c6, #ec809a); box-shadow: inset 2px 2px 0 #fff0b4, inset -2px -2px 0 #bf8c3c, 0 0 0 2px #8a3f5c; z-index: 2; }
#hl-screen iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
#hl-screen .glass { position: relative; aspect-ratio: 16 / 9; width: 100%; overflow: hidden; background: #0c1410; }
#hl-screen .idle { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #fffaf0; text-align: center; font-size: 12px; letter-spacing: 1px; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5); background: linear-gradient(90deg, #f2e8d4 0 14.28%, #ffd66b 0 28.56%, #8ad8d0 0 42.84%, #9ad870 0 57.12%, #ec809a 0 71.4%, #e45a5a 0 85.68%, #6a7ac8 0); }
#hl-screen .idle::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(rgba(0, 0, 0, 0.12) 0 1px, transparent 1px 3px); animation: hl-scr-roll 6s linear infinite; }
#hl-screen .idle span { position: relative; padding: 4px 8px; background: rgba(42, 31, 51, 0.82); box-shadow: 0 0 0 2px rgba(255, 246, 228, 0.5); }
#hl-screen .row { display: flex; gap: 6px; align-items: center; }
#hl-screen .chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px; }
#hl-screen .chips::-webkit-scrollbar { display: none; }
#hl-screen .chip { display: flex; flex-direction: column; align-items: stretch; gap: 2px; padding: 3px; width: 88px; flex: none; text-transform: none; letter-spacing: 0; font-size: 10px; }
#hl-screen .chip img, #hl-screen .chip .tune { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; image-rendering: auto; display: block; }
#hl-screen .chip b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: normal; }
#hl-screen .note { font-size: 10px; letter-spacing: 1px; opacity: 0.8; text-align: center; min-height: 13px; }

/* The television: a walnut cabinet, cream bezel, brass trim. */
#hl-screen .tv { position: relative; display: flex; flex-direction: column; gap: 7px; width: min(96vw, calc((100vh - 200px) * 16 / 9 + 36px)); padding: 12px 12px 9px; color: #fbe8c8; background: linear-gradient(#7e4a2a, #5e341e 40%, #4a2816); box-shadow: inset 2px 2px 0 #9a6038, inset -2px -2px 0 #2c160c, 0 0 0 2px #1e0e06, 0 8px 26px rgba(0, 0, 0, 0.5); animation: hl-scr-rise 0.22s ease-out; }
#hl-screen .tv .bezel { padding: 6px; border-radius: 10px; background: linear-gradient(#f6ecd6, #dccaa6); box-shadow: inset 2px 2px 0 #fffaf0, inset -2px -2px 0 #b49c74, 0 0 0 2px #2c160c; }
#hl-screen .tv .glass { border-radius: 6px; box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.6); }
#hl-screen .tv button { color: #3a2010; background: linear-gradient(#f6dc84, #c89634); box-shadow: inset 2px 2px 0 #fff4c4, inset -2px -2px 0 #84581a, 0 0 0 2px #2c160c; }
#hl-screen .tv button.on { background: linear-gradient(#fff4c4, #eac454); box-shadow: inset 2px 2px 0 #ffffff, inset -2px -2px 0 #a87624, 0 0 0 2px #ffe6a0; }
#hl-screen .tv .chip { color: #fbe8c8; background: #3a1e10; box-shadow: inset 0 0 0 1px #9a6038, 0 0 0 2px #1e0e06; }
#hl-screen .tv .chip.on { box-shadow: inset 0 0 0 1px #ffe6a0, 0 0 0 2px #f6dc84; }
#hl-screen .tv input { color: #3a2010; background: linear-gradient(#efdfc0, #f7ebd4); box-shadow: inset 2px 2px 0 #d7bf90, 0 0 0 2px #2c160c; }
#hl-screen .tv .grille { height: 6px; background: repeating-linear-gradient(90deg, #3a2414 0 2px, #6a5430 2px 3px); box-shadow: 0 0 0 1px #2c160c; }

/* The tablet: a rounded slate, a dawn-sky home screen. */
#hl-screen .pad { position: relative; display: flex; width: min(96vw, calc((100vh - 20px) * 4 / 3)); aspect-ratio: 4 / 3; padding: 14px; border-radius: 22px; background: linear-gradient(135deg, #4a3e58, #2a2236); box-shadow: inset 2px 2px 0 #6e6082, inset -2px -2px 0 #1a1422, 0 0 0 2px #120c18, 0 8px 26px rgba(0, 0, 0, 0.5); animation: hl-scr-rise 0.22s ease-out; }
#hl-screen .pad::after { content: ''; position: absolute; top: 50%; left: 6px; width: 3px; height: 3px; margin-top: -1px; border-radius: 50%; background: #120c18; box-shadow: 0 0 0 1px #6e6082; }
#hl-screen .pad .screen { position: relative; flex: 1; display: flex; flex-direction: column; overflow: hidden; border-radius: 8px; color: #4a2850; background: linear-gradient(#ffd8c0, #f6c4d4 45%, #c8b8f0); box-shadow: 0 0 0 2px #120c18; }
#hl-screen .pad .status { display: flex; justify-content: space-between; padding: 3px 10px; font-size: 10px; letter-spacing: 1px; color: #fffaf0; text-shadow: 0 1px 0 rgba(74, 40, 80, 0.5); }
#hl-screen .pad .battery { display: inline-block; width: 16px; height: 8px; margin-left: 4px; vertical-align: -1px; background: linear-gradient(90deg, #9ad870 0 80%, transparent 0); box-shadow: 0 0 0 1px #fffaf0; }
#hl-screen .pad .home { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10%; }
#hl-screen .pad .clock { font-size: 34px; letter-spacing: 3px; color: #fffaf0; text-shadow: 0 2px 0 rgba(122, 66, 96, 0.45); }
#hl-screen .pad .apps { display: flex; gap: 22px; }
#hl-screen .pad .app { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 0; color: #fffaf0; background: none; text-shadow: 0 1px 0 rgba(74, 40, 80, 0.6); }
#hl-screen .pad .app i { display: block; width: 52px; height: 52px; border-radius: 13px; image-rendering: pixelated; background-size: 100% 100%; box-shadow: 0 0 0 2px rgba(255, 250, 240, 0.85), 0 4px 0 rgba(74, 40, 80, 0.25); }
#hl-screen .pad .body { flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 0; padding: 6px 10px 8px; background: #fffaf0; }
#hl-screen .pad .top { display: flex; align-items: center; gap: 8px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #7a4260; }
#hl-screen .pad button { color: #7d6496; background: linear-gradient(#faf6fe, #e6dbf5); box-shadow: inset 2px 2px 0 #ffffff, inset -2px -2px 0 #c7b4e4, 0 0 0 2px #9c84c2; }
#hl-screen .pad button.go, #hl-screen .pad button.on { color: #fffaf0; background: linear-gradient(#ffb7c6, #ec809a); box-shadow: inset 2px 2px 0 #fff0b4, inset -2px -2px 0 #bf8c3c, 0 0 0 2px #8a3f5c; }
#hl-screen .pad .stage { flex: 1; min-height: 0; display: flex; justify-content: center; }
#hl-screen .pad .glass { height: 100%; width: auto; max-width: 100%; border-radius: 4px; }
#hl-screen .pad .chip { color: #6b4560; background: #f4ecfa; box-shadow: 0 0 0 2px #cdbbe8; }
#hl-screen .pad .chip.on { box-shadow: 0 0 0 2px #ec809a; }
#hl-screen .pad input { color: #6b4560; background: #f3ecfa; box-shadow: inset 2px 2px 0 #d9c9ef, 0 0 0 2px #cdbbe8; }
#hl-screen .pad .sketch { flex: 1; min-height: 0; display: flex; gap: 8px; }
#hl-screen .pad canvas { flex: 1; min-width: 0; min-height: 0; object-fit: contain; image-rendering: pixelated; touch-action: none; background: #ffffff; box-shadow: 0 0 0 2px #cdbbe8; cursor: crosshair; }
#hl-screen .pad .swatches { display: grid; grid-template-columns: repeat(2, 20px); gap: 4px; align-content: start; }
#hl-screen .pad .swatches button { width: 20px; height: 20px; padding: 0; box-shadow: 0 0 0 2px #cdbbe8; }
#hl-screen .pad .swatches button.on { box-shadow: 0 0 0 2px #ec809a, 0 0 0 4px #fffaf0; }
#hl-screen .pad .sky { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 10px; padding: 0 6%; }
#hl-screen .pad .sky div { display: flex; justify-content: space-between; gap: 10px; padding: 8px 10px; font-size: 13px; background: #f8f0fc; box-shadow: 0 0 0 2px #e6dbf5; }
#hl-screen .pad .sky b { color: #c4506e; font-weight: normal; }
@media (max-height: 420px) { #hl-screen .tv { gap: 5px; padding: 8px 10px 6px; width: min(96vw, calc((100vh - 150px) * 16 / 9 + 32px)); } #hl-screen .tv .grille { display: none; } #hl-screen .chip { width: 70px; } #hl-screen .pad .clock { font-size: 24px; } #hl-screen .pad .app i { width: 40px; height: 40px; } }
@keyframes hl-scr-fade { from { opacity: 0; } }
@keyframes hl-scr-rise { from { transform: translateY(8px) scale(0.98); opacity: 0; } }
@keyframes hl-scr-roll { to { background-position: 0 30px; } }
`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ID = /^[\w-]{11}$/;

/** A video or playlist from a YouTube link (watch, youtu.be, shorts, live, embed, a playlist) or a bare video id. */
export function parseClip(text: string): Clip | null {
  const s = text.trim();
  if (ID.test(s)) return { v: s, title: 'Video' };
  let url: URL;
  try {
    url = new URL(/^https?:/i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  const list = url.searchParams.get('list') ?? undefined;
  let v: string | undefined;
  if (host === 'youtu.be') v = url.pathname.slice(1, 12);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    v = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/)?.[1];
  } else return null;
  if (v && !ID.test(v)) v = undefined;
  if (!v && !list) return null;
  return { v, list: v ? undefined : list, title: v ? 'Video' : 'Playlist' };
}

const keyOf = (c: Clip) => c.v ?? `list:${c.list}`;

function embedUrl(c: Clip, at = 0): string {
  const q = `autoplay=1&playsinline=1&rel=0&modestbranding=1${at > 1 ? `&start=${Math.floor(at)}` : ''}`;
  return c.v ? `https://www.youtube-nocookie.com/embed/${c.v}?${q}` : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(c.list ?? '')}&${q}`;
}

const thumbOf = (c: Clip): string | null => (c.v ? `https://i.ytimg.com/vi/${c.v}/mqdefault.jpg` : null);

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // Storage full or private: it just isn't kept.
  }
}

const recents = (): Clip[] => load<{ recent?: Clip[] }>(STORE, {}).recent?.filter((c) => c && (c.v || c.list)) ?? [];

function remember(c: Clip): void {
  const list = [c, ...recents().filter((r) => keyOf(r) !== keyOf(c))].slice(0, RECENT);
  save(STORE, { recent: list });
}

/** The video's real title, asked of YouTube; kept with it once known. */
async function titleOf(c: Clip): Promise<string | null> {
  const url = c.v ? `https://www.youtube.com/watch?v=${c.v}` : `https://www.youtube.com/playlist?list=${c.list}`;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: string };
    return typeof j.title === 'string' ? j.title.slice(0, 80) : null;
  } catch {
    return null;
  }
}

/** A little picture drawn from rows of letters, as a data URL (the tablet's app icons). */
function pix(rows: string[], pal: Record<string, string>): string {
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const g = c.getContext('2d')!;
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (!pal[ch]) return;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }),
  );
  return c.toDataURL();
}

const APP_ICONS = {
  videos: pix(
    ['rrrrrrrrrrrr', 'rRRRRRRRRRRr', 'rRRRwRRRRRRr', 'rRRRwwRRRRRr', 'rRRRwwwRRRRr', 'rRRRwwwwRRRr', 'rRRRwwwRRRRr', 'rRRRwwRRRRRr', 'rRRRwRRRRRRr', 'rRRRRRRRRRRr', 'rRRRRRRRRRRr', 'rrrrrrrrrrrr'],
    { r: '#c4506e', R: '#ec809a', w: '#fffaf0' },
  ),
  sketch: pix(
    ['yyyyyyyyyyyy', 'yYYYYYYYYYYy', 'yYYYYYYYYoYy', 'yYYYYYYYooYy', 'yYYYYYYobYYy', 'yYYYYYobYYYy', 'yYYYYobYYYYy', 'yYYYkbYYYYYy', 'yYYkkYYpYYYy', 'yYYYYYpYpYYy', 'yYYYYYYYYYYy', 'yyyyyyyyyyyy'],
    { y: '#c89634', Y: '#ffe6a0', o: '#f0884a', b: '#ffd66b', k: '#4a2850', p: '#9c84c2' },
  ),
  sky: pix(
    ['bbbbbbbbbbbb', 'bBBBBBBBByBb', 'bBBBBBBByyyb', 'bBBBBBBBByBb', 'bBBwwwBBBBBb', 'bBwwwwwwBBBb', 'bwwwwwwwwBBb', 'bBBBBBBBBBBb', 'bBBBdBBdBBBb', 'bBBdBBdBBBBb', 'bBBBBBBBBBBb', 'bbbbbbbbbbbb'],
    { b: '#4a6ac8', B: '#8ab4f0', w: '#fffaf0', y: '#ffd66b', d: '#e6dbf5' },
  ),
};

/** Open a screen over the game. */
export function openScreen(o: ScreenOpts): ScreenHandle {
  if (!document.getElementById('hl-screen-css')) {
    const style = document.createElement('style');
    style.id = 'hl-screen-css';
    style.textContent = CSS;
    document.head.append(style);
  }
  document.getElementById('hl-screen')?.remove();
  const root = document.createElement('div');
  root.id = 'hl-screen';
  root.className = 'chrome';
  document.body.append(root);
  let closed = false;
  const timers: number[] = [];
  /** The tablet's app's own timer (the Sky's), stopped when it's left. */
  let appTimer = 0;
  /** What's on now, and the tablet's app showing ('' for its home screen). */
  let playing: Clip | null = null;
  const setPlaying = (c: Clip | null) => {
    if (!!c !== !!playing) o.onPlaying?.(!!c);
    playing = c;
  };
  let app = '';
  /** Draws the videos app again (where it is), or nothing while it isn't showing. */
  let showVideos: ((clip: Clip | null, at?: number) => void) | null = null;

  // Typing mustn't reach the game's own keys.
  for (const t of ['keydown', 'keyup', 'keypress']) root.addEventListener(t, (e) => e.stopPropagation());
  root.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key !== 'Escape') return;
    if (o.kind === 'pad' && app) openApp('');
    else close();
  });
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close();
  });

  const close = () => {
    if (closed) return;
    closed = true;
    for (const t of timers) clearInterval(t);
    clearInterval(appTimer);
    setPlaying(null);
    root.remove();
    o.onClose();
  };

  /**
   * The videos: the screen (playing, or a test card), the channels and the
   * ones watched before as pictures, and a link to paste.
   */
  const videos = (host: HTMLElement, stage: HTMLElement, first: Clip | null, firstAt = 0) => {
    stage.innerHTML = '<div class="glass"></div>';
    host.innerHTML = `
      <div class="chips"></div>
      <div class="row"><input placeholder="Paste a YouTube link" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="go" data-play>Play</button><button data-find>Find</button></div>
      <div class="note"></div>`;
    const glass = stage.querySelector('.glass') as HTMLElement;
    const chips = host.querySelector('.chips') as HTMLElement;
    const input = host.querySelector('input') as HTMLInputElement;
    const note = host.querySelector('.note') as HTMLElement;
    const say = (t: string) => (note.textContent = t);
    const drawChips = () => {
      const seen = new Set(CHANNELS.map(keyOf));
      const list = [...CHANNELS, ...recents().filter((c) => !seen.has(keyOf(c)))];
      chips.innerHTML = list
        .map((c, i) => {
          const t = thumbOf(c);
          const on = playing && keyOf(playing) === keyOf(c) ? ' on' : '';
          return `<button class="chip${on}" data-i="${i}">${t ? `<img src="${t}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="tune" style="background: repeating-linear-gradient(45deg, #ec809a 0 4px, #9c84c2 4px 8px)"></span>'}<b>${esc(c.title)}</b></button>`;
        })
        .join('');
      chips.querySelectorAll<HTMLButtonElement>('[data-i]').forEach((b) => b.addEventListener('click', () => play(list[Number(b.dataset.i)], 0, true)));
    };
    const show = (c: Clip | null, at = 0) => {
      if (!c) {
        glass.innerHTML = `<div class="idle"><span>${o.kind === 'tv' ? 'PICK A CHANNEL OR PASTE A LINK' : 'PICK A VIDEO OR PASTE A LINK'}</span></div>`;
        return;
      }
      glass.innerHTML = `<iframe src="${embedUrl(c, at)}" title="${esc(c.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    };
    /** Put a clip on: shown, kept among those watched, its title asked for, and told to friends when it's this player's choice. */
    const play = (c: Clip, at = 0, mine = false) => {
      setPlaying(c);
      show(c, at);
      remember(c);
      drawChips();
      say(c.title === 'Video' || c.title === 'Playlist' ? '' : c.title.toUpperCase());
      if (mine) o.onPlay?.(c);
      if (c.title === 'Video' || c.title === 'Playlist') {
        void titleOf(c).then((t) => {
          if (!t || closed) return;
          c.title = t;
          remember(c);
          if (playing === c) say(t.toUpperCase());
          drawChips();
        });
      }
    };
    showVideos = (c, at = 0) => (c ? play(c, at) : show(null));
    const fromInput = () => {
      const c = parseClip(input.value);
      if (!c) {
        say(input.value.trim() ? 'THAT ISN’T A YOUTUBE LINK' : 'PASTE A YOUTUBE LINK FIRST');
        return;
      }
      input.value = '';
      input.blur();
      play(c, 0, true);
    };
    host.querySelector('[data-play]')!.addEventListener('click', async () => {
      // An empty field: try the clipboard first (it may ask, or say no).
      if (!input.value.trim()) {
        try {
          input.value = (await navigator.clipboard?.readText?.()) ?? '';
        } catch {
          // Not allowed: the field it is.
        }
      }
      fromInput();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') fromInput();
    });
    host.querySelector('[data-find]')!.addEventListener('click', () => {
      const q = input.value.trim() && !parseClip(input.value) ? input.value.trim() : '';
      window.open(q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : 'https://www.youtube.com/', '_blank', 'noopener');
      say('COPY A VIDEO’S LINK, THEN COME BACK AND PRESS PLAY');
    });
    drawChips();
    if (first) play(first, firstAt);
    else {
      show(null);
      say(o.kind === 'tv' ? 'TYPE WHAT TO LOOK FOR AND PRESS FIND' : '');
    }
  };

  // ---------------------------------------------------------------- The television

  if (o.kind === 'tv') {
    // The screen sits in the bezel; the channels and the link go below it, on the cabinet.
    root.innerHTML = `<div class="tv"><button class="x" aria-label="Close">✕</button><div class="bezel"></div><div class="dial" style="display: contents"></div><div class="grille"></div></div>`;
    root.querySelector('.x')!.addEventListener('click', close);
    videos(root.querySelector('.dial') as HTMLElement, root.querySelector('.bezel') as HTMLElement, o.shared?.clip ?? null, o.shared?.at ?? 0);
    return { close, follow: (c, at) => showVideos?.(c, at) };
  }

  // ---------------------------------------------------------------- The tablet

  root.innerHTML = `<div class="pad"><button class="x" aria-label="Close">✕</button><div class="screen"><div class="status"><span data-time></span><span>100%<i class="battery"></i></span></div><div class="page"></div></div></div>`;
  root.querySelector('.x')!.addEventListener('click', close);
  const screen = root.querySelector('.screen') as HTMLElement;
  const page = root.querySelector('.page') as HTMLElement;
  page.style.cssText = 'flex: 1; display: flex; flex-direction: column; min-height: 0;';
  const clock = () => new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const tick = () => {
    const t = screen.querySelector('[data-time]');
    if (t) t.textContent = clock();
    const big = screen.querySelector('.clock');
    if (big) big.textContent = clock();
  };
  timers.push(window.setInterval(tick, 10_000));

  const openApp = (id: string) => {
    app = id;
    showVideos = null;
    // A video stops when its app is left.
    if (id !== 'videos') setPlaying(null);
    clearInterval(appTimer);
    if (!id) {
      page.innerHTML = `<div class="home"><div class="clock"></div><div class="apps">${(['videos', 'sketch', 'sky'] as const)
        .map((a) => `<button class="app" data-app="${a}"><i style="background-image: url(${APP_ICONS[a]})"></i>${a === 'videos' ? 'Videos' : a === 'sketch' ? 'Sketchbook' : 'Sky'}</button>`)
        .join('')}</div></div>`;
      page.querySelectorAll<HTMLButtonElement>('[data-app]').forEach((b) => b.addEventListener('click', () => openApp(b.dataset.app!)));
      tick();
      return;
    }
    page.innerHTML = `<div class="body"><div class="top"><button data-home>‹ Home</button><span>${id === 'videos' ? 'Videos' : id === 'sketch' ? 'Sketchbook' : 'The sky'}</span></div><div class="app-body" style="flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 0"></div></div>`;
    page.querySelector('[data-home]')!.addEventListener('click', () => openApp(''));
    const body = page.querySelector('.app-body') as HTMLElement;
    if (id === 'videos') {
      const stage = document.createElement('div');
      stage.className = 'stage';
      const dial = document.createElement('div');
      dial.style.display = 'contents';
      body.append(stage, dial);
      videos(dial, stage, o.shared?.clip ?? null, o.shared?.at ?? 0);
    }
    else if (id === 'sketch') sketchbook(body);
    else sky(body);
  };

  /** The sketchbook: a page of pixels to draw on, the paints, the pages, Clear and Save. */
  const sketchbook = (host: HTMLElement) => {
    const pages = load<(string | null)[]>(SKETCHES, []);
    let pageN = 0;
    let paint = PALETTE[0];
    host.innerHTML = `
      <div class="sketch"><canvas width="${SKETCH_W}" height="${SKETCH_H}"></canvas><div class="swatches">${PALETTE.map((p, i) => `<button data-p="${i}" style="background: ${p}" aria-label="Paint"></button>`).join('')}<button data-p="-1" style="background: repeating-linear-gradient(45deg, #fff 0 3px, #e6dbf5 3px 6px)" aria-label="Rubber"></button></div></div>
      <div class="row">${Array.from({ length: PAGES }, (_, i) => `<button data-page="${i}">${i + 1}</button>`).join('')}<span style="flex: 1"></span><button data-clear>Clear</button><button class="go" data-save>Save</button></div>`;
    const canvas = host.querySelector('canvas') as HTMLCanvasElement;
    const g = canvas.getContext('2d')!;
    const swatches = [...host.querySelectorAll<HTMLButtonElement>('[data-p]')];
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[data-page]')];
    const pick = (i: number) => {
      paint = i < 0 ? '' : PALETTE[i];
      swatches.forEach((b) => b.classList.toggle('on', Number(b.dataset.p) === i));
    };
    const keep = () => {
      pages[pageN] = canvas.toDataURL();
      save(SKETCHES, pages);
    };
    const openPage = (n: number) => {
      pageN = n;
      tabs.forEach((b) => b.classList.toggle('on', Number(b.dataset.page) === n));
      g.clearRect(0, 0, SKETCH_W, SKETCH_H);
      const src = pages[n];
      if (!src) return;
      const img = new Image();
      img.onload = () => pageN === n && g.drawImage(img, 0, 0);
      img.src = src;
    };
    /** The pixel under a pointer: the canvas keeps its shape inside its box, so measure the picture, not the box. */
    const at = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      const s = Math.min(r.width / SKETCH_W, r.height / SKETCH_H);
      const ox = r.left + (r.width - SKETCH_W * s) / 2;
      const oy = r.top + (r.height - SKETCH_H * s) / 2;
      return [Math.floor((e.clientX - ox) / s), Math.floor((e.clientY - oy) / s)];
    };
    let last: [number, number] | null = null;
    const dot = ([x, y]: [number, number]) => {
      if (paint) {
        g.fillStyle = paint;
        g.fillRect(x, y, 1, 1);
      } else g.clearRect(x - 1, y - 1, 3, 3);
    };
    const stroke = (to: [number, number]) => {
      const from = last ?? to;
      const n = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), 1);
      for (let k = 0; k <= n; k++) dot([Math.round(from[0] + ((to[0] - from[0]) * k) / n), Math.round(from[1] + ((to[1] - from[1]) * k) / n)]);
      last = to;
    };
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      last = null;
      stroke(at(e));
    });
    canvas.addEventListener('pointermove', (e) => {
      if (last) stroke(at(e));
    });
    const lift = () => {
      if (!last) return;
      last = null;
      keep();
    };
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    swatches.forEach((b) => b.addEventListener('click', () => pick(Number(b.dataset.p))));
    tabs.forEach((b) => b.addEventListener('click', () => openPage(Number(b.dataset.page))));
    host.querySelector('[data-clear]')!.addEventListener('click', () => {
      g.clearRect(0, 0, SKETCH_W, SKETCH_H);
      keep();
    });
    host.querySelector('[data-save]')!.addEventListener('click', () => {
      // A bigger copy on white, every pixel kept crisp.
      const big = document.createElement('canvas');
      big.width = SKETCH_W * SAVE_SCALE;
      big.height = SKETCH_H * SAVE_SCALE;
      const bg = big.getContext('2d')!;
      bg.fillStyle = '#ffffff';
      bg.fillRect(0, 0, big.width, big.height);
      bg.imageSmoothingEnabled = false;
      bg.drawImage(canvas, 0, 0, big.width, big.height);
      const a = document.createElement('a');
      a.href = big.toDataURL('image/png');
      a.download = `heaven-lands-sketch-${pageN + 1}.png`;
      a.click();
    });
    pick(0);
    openPage(0);
  };

  /** The sky: the time of day, the next shower, Starwatch's next meteor shower. */
  const sky = (host: HTMLElement) => {
    const draw = () => {
      const now = Date.now();
      const phase = o.phase?.() ?? '';
      let rain = 'Clear for hours';
      if (showerAt(now) > 0) rain = 'Raining now';
      else
        for (let t = now; t < now + SKY_AHEAD; t += SKY_STEP) {
          if (showerAt(t) <= 0) continue;
          rain = `In ${until(t - now)}`;
          break;
        }
      const into = now % METEOR_EVERY;
      const meteors = into < METEOR_LEN ? 'Falling now!' : `In ${until(METEOR_EVERY - into)}`;
      host.innerHTML = `<div class="sky">
        <div><span>Here it’s</span><b>${esc(phase || '…')}</b></div>
        <div><span>Next shower</span><b>${rain}</b></div>
        <div><span>Meteors over Starwatch</span><b>${meteors}</b></div>
      </div>`;
    };
    draw();
    appTimer = window.setInterval(draw, 1000);
  };

  openApp(o.shared ? 'videos' : '');
  tick();
  return {
    close,
    follow: (c, at) => {
      if (app === 'videos') showVideos?.(c, at);
    },
  };
}

/** "3 min", "1:20", "2 h 5 min": how long until something, said shortly. */
function until(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
}
