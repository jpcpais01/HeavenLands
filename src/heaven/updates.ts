// Updates before they're taken: the running game now and then fetches the
// deployed notes.json (never from a cache) and, when it lists a note newer
// than this build's, shows a card of what's coming with an Update now
// button (scenes/NotesScene.ts). After an update the same card shows once
// as "What's new", for players who updated by simply reopening the game.
// The card waits for a quiet moment: the title screen, the Atlas or the
// pause menu, never in the middle of play.

import Phaser from 'phaser';
import { BUILD_NOTE, PATCH_NOTES, type PatchNote } from './patchNotes';
import { profile } from './profile';

/** How often to look for an update while playing (ms), and how long after starting. */
const CHECK_EVERY = 10 * 60_000;
const FIRST_CHECK = 6000;
/** Scenes the card may open over. */
const QUIET_SCENES = ['home', 'atlas', 'pause'];
/** How long Update now waits for the new service worker before reloading anyway (ms). */
const UPDATE_WAIT = 4000;
const SEEN_KEY = 'heaven-lands.notesSeen';

export type NotesMode = 'coming' | 'new';
export interface NotesCard {
  mode: NotesMode;
  notes: PatchNote[];
}

let pending: NotesCard | null = null;
/** The newest note the player chose to put off this session, so Later means later. */
let putOff = 0;

const seen = (): number => {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
};

export function markSeen(v: number): void {
  try {
    localStorage.setItem(SEEN_KEY, String(Math.max(v, seen())));
  } catch {
    // Private mode: the card may show once more, no harm.
  }
}

async function check(): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const res = await fetch(`./notes.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const all = (await res.json()) as PatchNote[];
    const newer = all.filter((n) => n.v > BUILD_NOTE && Array.isArray(n.notes)).sort((a, b) => b.v - a.v);
    if (newer.length && newer[0].v > putOff) pending = { mode: 'coming', notes: newer };
  } catch {
    // Offline or a half-deployed site: look again later.
  }
}

/** Put the card off until a still newer update turns up. */
export function putOffUpdate(card: NotesCard): void {
  putOff = Math.max(putOff, card.notes[0].v);
  if (card.mode === 'new') markSeen(card.notes[0].v);
}

/** Take the update: fetch the new service worker, then reload into the new build. */
export async function updateNow(card: NotesCard): Promise<void> {
  markSeen(card.notes[0].v); // Seen here, so it isn't shown again as What's new.
  const reload = () => location.reload();
  const sw = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration().catch(() => undefined) : undefined;
  if (!sw) return reload();
  // The new worker takes over at once (skipWaiting); reload when it has, or soon regardless:
  // pages load network-first, so the reload brings the new build either way.
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  setTimeout(reload, UPDATE_WAIT);
  sw.update().catch(reload);
}

export function watchUpdates(game: Phaser.Game): void {
  const params = new URLSearchParams(location.search);
  // ?notes shows this build's notes as the update card, to see how a note reads.
  if (params.has('notes')) pending = { mode: 'coming', notes: PATCH_NOTES.slice(0, 2) };
  else if (profile.made && seen() < BUILD_NOTE) pending = { mode: 'new', notes: PATCH_NOTES.filter((n) => n.v > seen()) };
  else markSeen(BUILD_NOTE); // A new player starts with everything as it is.

  if (import.meta.env.PROD) {
    setTimeout(() => void check(), FIRST_CHECK);
    setInterval(() => void check(), CHECK_EVERY);
    // A phone app left in the background for hours: look as it comes back.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void check();
    });
  }

  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    if (!pending || game.scene.isActive('notes')) return;
    if (!QUIET_SCENES.some((k) => game.scene.isActive(k))) return;
    if (window.bootLoader) return; // Still loading.
    const card = pending;
    pending = null;
    game.scene.run('notes', card);
  });
}
