// The cloud save. Heaven Lands keeps everything in localStorage under
// 'heaven-lands.' (storage.ts moves the engine's keys there), so the save is
// simply all of those keys, less the few that belong to this device (its
// settings, caches, the account itself). That way whatever the game comes to
// keep later is carried along without anyone listing it here.
//
// The whole snapshot is gzipped into one string in the player's Firestore
// document (cloud.ts). Any write to a saved key marks the device as changed
// and queues an upload a moment later (or at once when the app is hidden);
// each upload only writes over the document it last read, so two devices
// can't silently trample each other. The newer save wins: at launch, a newer
// cloud save is laid into storage before the game reads any of it (entry.ts);
// a device with newer changes of its own sends them up instead.

import { CloudError, SaveConflict, account, loadCloud, logIn, logOut, spellName, writeCloud, type CloudSave } from '../game/cloud';
import { onStored } from './storage';

const PREFIX = 'heaven-lands.';
/** This device's own keys (after the prefix, matched as a start), never sent up or replaced. */
const DEVICE_ONLY = ['account', 'sync', 'settings', 'bootSteps', 'loadMs.', 'sfxClips', 'crash', 'heartbeat', 'echo', 'minimap', 'statsHud', 'season', 'welcomed'];
const STATE_KEY = PREFIX + 'sync';
/** A change waits this long for more before going up (ms)... */
const SAVE_DELAY = 3000;
/** ...and uploads are at least this far apart, as walking keeps the explorer's map growing (ms). */
const MIN_GAP = 15_000;
/** After a failed upload, try again this much later (ms). */
const RETRY_MS = 30_000;
/** How long the loading screen waits for the cloud save at launch before starting without it (ms). */
const BOOT_WAIT = 6000;
/** Firestore keeps a document to 1 MiB; a packed save must stay under this. */
const MAX_PACKED = 1_000_000;

const saved = (k: string | null): k is string => !!k && k.startsWith(PREFIX) && !DEVICE_ONLY.some((d) => k.startsWith(PREFIX + d));

/** 'choose': signed in, and the account and this device each keep a different wanderer (see choice()); 'newer': another device has saved since. */
export type SyncStatus = 'off' | 'loading' | 'saving' | 'saved' | 'error' | 'newer' | 'choose';

/** What this device knows of its account's save. */
interface State {
  /** The account this device last saved to or loaded from. */
  uid: string;
  /** The cloud save's time this device's save last matched. */
  base: number;
  /** When this device's save last changed without going up since (0: nothing waiting). */
  dirty: number;
}

/** The choice when an account and this device each have a wanderer of their own. */
export interface Choice {
  cloudName: string;
  cloudT: number;
  localName: string;
}

let state: State = readState();
let status: SyncStatus = account() ? 'loading' : 'off';
let lastSaved = 0;
/** The document's updateTime as last read or written; undefined until checked this visit, null when there is none. */
let known: string | null | undefined;
/** The cloud save waiting on the player's choice at login (uploads are held until they pick). */
let pending: CloudSave | null = null;
let pendingChoice: Choice | null = null;
/** Set while a cloud save is being laid into storage, so its writes aren't counted as changes. */
let applying = false;
let changes = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let busy = false;
let again = false;
let lastWrite = 0;
let lastSent = '';
const listeners = new Set<() => void>();

function readState(): State {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY) ?? '') as Partial<State>;
    return { uid: String(s.uid ?? ''), base: Number(s.base) || 0, dirty: Number(s.dirty) || 0 };
  } catch {
    return { uid: '', base: 0, dirty: 0 };
  }
}

function keepState(): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage full: the next launch simply checks the cloud again.
  }
}

function setStatus(s: SyncStatus): void {
  status = s;
  if (s === 'saved') lastSaved = Date.now();
  for (const fn of listeners) fn();
}

export const sync = {
  get status(): SyncStatus {
    return status;
  },
  /** When the save last went up (or came down) this visit, ms; 0 if not yet. */
  get savedAt(): number {
    return lastSaved;
  },
  /** The choice waiting on the player (status 'choose'), or null. */
  get choice(): Choice | null {
    return pendingChoice;
  },
  /** Call `fn` whenever the status changes; returns the unsubscribe. */
  watch(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// ---------------------------------------------------------------- The snapshot

/** Every saved key and its value. */
function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!saved(k)) continue;
    const v = localStorage.getItem(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** A snapshot as one string: 'z' + gzip in base64 where the browser can, 'j' + plain JSON where it can't. */
async function pack(snap: Record<string, string>): Promise<string> {
  const json = JSON.stringify(snap);
  if (typeof CompressionStream === 'undefined') return 'j' + json;
  const zipped = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return 'z' + toBase64(new Uint8Array(await new Response(zipped).arrayBuffer()));
}

async function unpack(data: string): Promise<Record<string, string>> {
  let json = data.slice(1);
  if (data[0] === 'z') {
    if (typeof DecompressionStream === 'undefined') throw new CloudError('This browser is too old to open your cloud save.');
    const plain = new Blob([fromBase64(json)]).stream().pipeThrough(new DecompressionStream('gzip'));
    json = await new Response(plain).text();
  }
  const raw = JSON.parse(json) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (saved(k) && typeof v === 'string') out[k] = v;
  return out;
}

/** The wanderer's name in a snapshot ('' if they haven't made one). */
function nameIn(snap: Record<string, string>): string {
  try {
    const me = JSON.parse(snap[PREFIX + 'me'] ?? '') as { name?: string; made?: boolean };
    return me.made ? me.name || 'Wanderer' : '';
  } catch {
    return '';
  }
}

/** Lay a cloud save into storage in place of this device's. */
async function apply(remote: CloudSave, uid: string): Promise<void> {
  const snap = await unpack(remote.data);
  applying = true;
  try {
    const mine: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (saved(k)) mine.push(k);
    }
    for (const k of mine) if (!(k in snap)) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(snap)) localStorage.setItem(k, v);
  } finally {
    applying = false;
  }
  state = { uid, base: remote.t, dirty: 0 };
  keepState();
  known = remote.updateTime;
  lastSent = remote.data;
  setStatus('saved');
}

// ---------------------------------------------------------------- Uploads

function changed(key: string): void {
  if (applying || !saved(key)) return;
  changes++;
  state.dirty = Date.now();
  keepState();
  schedule();
}

function schedule(delay = SAVE_DELAY): void {
  if (!account() || pending || status === 'newer') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void push(), Math.max(delay, lastWrite + MIN_GAP - Date.now()));
  if (status !== 'error') setStatus('saving');
}

/** Send the save up now (`hidden`: the page is going away, so no waiting). */
async function push(hidden = false): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  const a = account();
  if (!a || pending || status === 'newer') return;
  if (busy) {
    again = true;
    return;
  }
  busy = true;
  setStatus('saving');
  try {
    // Not checked against the cloud yet this visit (it couldn't be reached at launch): see whether another device has saved since.
    if (known === undefined) {
      const remote = await loadCloud();
      known = remote?.updateTime ?? null;
      if (remote?.data && state.uid === a.uid && remote.t > state.base && remote.t >= state.dirty) {
        setStatus('newer');
        return;
      }
    }
    const seen = changes;
    const t = Date.now();
    const packed = await pack(snapshot());
    if (packed.length > MAX_PACKED) throw new CloudError('Your save is too big for the cloud.');
    if (packed !== lastSent) {
      known = await writeCloud(packed, t, known, hidden);
      lastSent = packed;
      state.base = t;
    }
    lastWrite = Date.now();
    state.uid = a.uid;
    if (changes === seen) state.dirty = 0;
    keepState();
    setStatus('saved');
  } catch (e) {
    if (e instanceof SaveConflict) {
      // Someone saved in between: look again (the check above decides whose is newer).
      known = undefined;
      again = true;
    } else {
      setStatus('error');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void push(), RETRY_MS);
    }
  } finally {
    busy = false;
    if (again && account()) {
      again = false;
      void push();
    }
  }
}

// ---------------------------------------------------------------- Launch, sign in, sign out

/**
 * Before the game starts: watch storage for changes and, when signed in,
 * bring a newer cloud save down. Never takes longer than BOOT_WAIT; a late
 * answer is left for the first upload's check.
 */
export async function startSync(): Promise<void> {
  onStored(changed);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.dirty && account()) void push(true);
  });
  const a = account();
  if (!a) return;
  let late = false;
  const check = (async () => {
    const remote = await loadCloud();
    if (late) return;
    known = remote?.updateTime ?? null;
    if (remote?.username) spellName(remote.username);
    const mine = state.uid === a.uid;
    // Signed in on this device without it ever having matched the account (the app closed before a choice): ask on the title screen.
    if (remote?.data && !mine && nameIn(snapshot())) await ask(remote);
    else if (remote?.data && (!mine || (remote.t > state.base && remote.t >= state.dirty))) await apply(remote, a.uid);
    else {
      // The cloud has nothing newer: send up whatever this device has that it doesn't.
      state.uid = a.uid;
      if (!remote?.data || state.dirty) state.dirty ||= Date.now();
      keepState();
      setStatus(state.dirty ? 'saving' : 'saved');
      if (state.dirty) schedule();
    }
  })().catch(() => {
    if (late) return;
    known = undefined;
    setStatus('error');
    if (state.dirty) schedule(RETRY_MS);
  });
  await Promise.race([check, new Promise<void>((done) => setTimeout(done, BOOT_WAIT))]);
  late = true;
}

/**
 * Sign in (or make an account). Resolves with a Choice when the account
 * already keeps a different wanderer from this device's: the player picks
 * with keepCloud or keepDevice (or backs out with signOut).
 */
export async function signIn(username: string, password: string, create: boolean): Promise<Choice | null> {
  await logIn(username, password, create);
  const a = account()!;
  setStatus('loading');
  let remote: CloudSave | null = null;
  try {
    remote = create ? null : await loadCloud();
  } catch (e) {
    // Signed in but the save couldn't be read: don't risk writing over it.
    logOut();
    setStatus('off');
    throw e;
  }
  known = remote?.updateTime ?? null;
  if (remote?.username) spellName(remote.username);
  const mine = state.uid === a.uid;
  if (!remote?.data || (mine && remote.t <= state.base)) {
    // Nothing up there yet, or this device is as new or newer: this device's save goes up.
    state = { uid: a.uid, base: remote?.t ?? 0, dirty: Date.now() };
    keepState();
    void push();
    return null;
  }
  if ((mine && !state.dirty) || !nameIn(snapshot())) {
    // Unchanged here since it last matched, or no wanderer made here yet: the account's save simply comes down.
    pending = remote;
    return keepCloud().then(() => null);
  }
  return ask(remote);
}

/** Hold a cloud save until the player picks between it and this device's. */
async function ask(remote: CloudSave): Promise<Choice> {
  const cloud = await unpack(remote.data);
  pending = remote;
  pendingChoice = { cloudName: nameIn(cloud) || 'Wanderer', cloudT: remote.t, localName: nameIn(snapshot()) || 'Wanderer' };
  setStatus('choose');
  return pendingChoice;
}

/** Take the account's save in place of this device's, then start the game afresh on it. */
export async function keepCloud(): Promise<void> {
  const remote = pending;
  const a = account();
  if (!remote || !a) return;
  pending = null;
  pendingChoice = null;
  await apply(remote, a.uid);
  location.reload();
}

/** Keep this device's save, sending it up over the account's. */
export function keepDevice(): void {
  const remote = pending;
  const a = account();
  if (!remote || !a) return;
  pending = null;
  pendingChoice = null;
  state = { uid: a.uid, base: remote.t, dirty: Date.now() };
  keepState();
  void push();
}

/** A newer save from another device is waiting (status 'newer'): load it now. */
export async function loadNewer(): Promise<void> {
  const a = account();
  if (!a) return;
  const remote = await loadCloud();
  if (remote?.data) await apply(remote, a.uid);
  location.reload();
}

/** Send anything waiting up, then sign out. This device keeps its wanderer. */
export async function signOut(): Promise<void> {
  if (!pending && status !== 'newer' && state.dirty && account()) await push().catch(() => {});
  pending = null;
  pendingChoice = null;
  known = undefined;
  lastSent = '';
  if (timer) clearTimeout(timer);
  timer = null;
  logOut();
  setStatus('off');
}
