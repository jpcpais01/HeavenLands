// Player accounts and cloud saves on Firebase, through its REST endpoints
// rather than the SDK (which would add a few hundred KB to a game that has to
// load fast on phones). Players only ever see a username and a password:
// Firebase Auth wants an email, so each name maps to a hidden address on a
// made-up domain, which also keeps names unique. Each player's save is one
// Firestore document, `players/{uid}`, that only they can read or write.
//
// Heaven Lands shares the Firebase project with Myths and Legends (and so its
// security rules) but has accounts of its own: its names live on their own
// domain, so a Heaven account is never a Myths one and their saves, each a
// whole document, can't overwrite each other. What goes in the save is
// src/heaven/sync.ts's business: here it is one packed string and its time.

import { FIREBASE_CONFIG } from '../firebaseConfig';
import type { StatKey } from './gear';

const SESSION_KEY = 'pixel-battle.account';
const EMAIL_DOMAIN = 'players.heaven-lands.game';

export const USERNAME_RULE = /^[a-zA-Z0-9_]{3,16}$/;
export const MIN_PASSWORD = 6;

export interface Account {
  uid: string;
  username: string;
}

/** The engine's collection as it keeps it on the device (see collection.ts); Heaven Lands' cloud save carries it inside its snapshot. */
export interface SaveData {
  /** How many of each item they've picked up, by item id. */
  items: Record<string, number>;
  /** Their six always-equipped items (item ids), empty slots as null. */
  equipped: (string | null)[];
  /** Dust from disenchanted items, spent on upgrades at the Rune Temple. */
  dust: number;
  /** The stat each level past the first went into, per upgraded item id. */
  upgrades: Record<string, StatKey[]>;
  /** Gems to spend on wishes in the shop. */
  gems: number;
  /** Skins won from wishes, as "class:skin" ids. */
  skins: string[];
  /** The last day (YYYY-MM-DD, local) the daily gems were given. */
  daily: string;
  /** Wishes since the last legendary skin, for the guarantee. */
  pity: number;
  /** One-off gifts already given to this account (see GRANTS in collection.ts), so each is given once. */
  grants: string[];
  /** The furthest wave reached in the Endless Rift, by class id. */
  rift: Record<string, number>;
  /** The best Sky Glide time on each course, in ms, by course id. */
  glide: Record<string, number>;
  /** Companions won from the companion wishes, by id. */
  pets: string[];
  /** The companion that follows the player, or '' for none. */
  pet: string;
  /** Companion wishes since the last legendary companion, for its own guarantee. */
  petPity: number;
  /** Each season's currency (Hallow's Eve's candy...), by season id (see game/season.ts). */
  candy: Record<string, number>;
  /** Critters caught with the net, how many of each, by id. */
  critters: Record<string, number>;
  /** Fish landed with the rod, how many of each, by id. */
  fish: Record<string, number>;
  /** Boss materials for the Forge, by the set they forge (see game/forge.ts). */
  mats: Record<string, number>;
  /** The player's Home as they built it (see world/homeLayout.ts), '' for the starter, and when it was last changed (ms). */
  home: string;
  homeT: number;
  /** What the player built in and cleared from the Everwood (see world/forestEdits.ts), and when (ms). */
  wood: string;
  woodT: number;
  /** The explorer's map of the Everwood (see game/trek.ts), and when it last grew (ms). */
  trek: string;
  trekT: number;
  /** Bosses the player has met, by monster key: each one's entrance plays only the first time. */
  met: string[];
  /** The kitchen's stores: seeds, produce, fish to cook, dishes and how often each was made, by key (see game/cooking.ts). */
  pantry: Record<string, number>;
  /** What's planted (see game/farm.ts), and when it last changed (ms). */
  farm: string;
  farmT: number;
  /** The dish taken along in the hotbar, or ''. */
  lunch: string;
}

interface Session extends Account {
  refreshToken: string;
  idToken: string;
  /** ms timestamp the id token stops working. */
  expires: number;
}

export const cloudReady = (): boolean => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

let session: Session | null = loadSession();
const listeners = new Set<(a: Account | null) => void>();

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function setSession(s: Session | null): void {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Not remembered; the player stays logged in for this visit.
  }
  const a = account();
  for (const fn of listeners) fn(a);
}

/** The logged-in player, or null when playing as a guest. */
export function account(): Account | null {
  return session ? { uid: session.uid, username: session.username } : null;
}

/** Call `fn` on every login and logout; returns the unsubscribe. */
export function onAccount(fn: (a: Account | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** A readable message for a failed request. */
export class CloudError extends Error {}

const AUTH_MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: 'That name is taken.',
  EMAIL_NOT_FOUND: 'Wrong name or password.',
  INVALID_PASSWORD: 'Wrong name or password.',
  INVALID_LOGIN_CREDENTIALS: 'Wrong name or password.',
  USER_DISABLED: 'This account is disabled.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many tries. Wait a bit and try again.',
  OPERATION_NOT_ALLOWED: 'Accounts are switched off on the server.',
};

async function post(url: string, body: object): Promise<Record<string, string>> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new CloudError('No connection. Check your internet.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // e.g. "WEAK_PASSWORD : Password should be at least 6 characters"
    const code = String(data?.error?.message ?? '').split(' ')[0];
    if (code === 'WEAK_PASSWORD') throw new CloudError(`Password needs at least ${MIN_PASSWORD} characters.`);
    throw new CloudError(AUTH_MESSAGES[code] ?? 'Something went wrong. Try again.');
  }
  return data;
}

const emailFor = (username: string) => `${username.toLowerCase()}@${EMAIL_DOMAIN}`;

/** Create an account (`create`) or log into one. */
export async function logIn(username: string, password: string, create: boolean): Promise<void> {
  if (!cloudReady()) throw new CloudError('Accounts are not set up yet.');
  if (!USERNAME_RULE.test(username)) throw new CloudError('Names are 3 to 16 letters, numbers or _.');
  if (password.length < MIN_PASSWORD) throw new CloudError(`Password needs at least ${MIN_PASSWORD} characters.`);
  const op = create ? 'signUp' : 'signInWithPassword';
  const data = await post(`https://identitytoolkit.googleapis.com/v1/accounts:${op}?key=${FIREBASE_CONFIG.apiKey}`, {
    email: emailFor(username),
    password,
    returnSecureToken: true,
  });
  setSession({
    uid: data.localId,
    username,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expires: Date.now() + Number(data.expiresIn) * 1000,
  });
}

/** Keep the name as the account spells it (from its save), whatever case it was typed in at login. */
export function spellName(username: string): void {
  if (session && username && username.toLowerCase() === session.username.toLowerCase() && username !== session.username) setSession({ ...session, username });
}

export function logOut(): void {
  setSession(null);
}

/** A fresh id token for the logged-in player, refreshing it when it's about to run out. */
async function token(): Promise<string> {
  const s = session;
  if (!s) throw new CloudError('Not logged in.');
  if (Date.now() < s.expires - 60_000) return s.idToken;
  let res: Response;
  try {
    res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(s.refreshToken)}`,
    });
  } catch {
    throw new CloudError('No connection.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The account was deleted or its password changed elsewhere.
    if (res.status === 400) setSession(null);
    throw new CloudError('Please log in again.');
  }
  s.idToken = data.id_token;
  s.refreshToken = data.refresh_token;
  s.expires = Date.now() + Number(data.expires_in) * 1000;
  if (session === s) setSession(s);
  return s.idToken;
}

const docUrl = (uid: string) =>
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/players/${uid}`;

/** The save as the cloud holds it. */
export interface CloudSave {
  /** The packed snapshot ('' in a document without one). */
  data: string;
  /** When it was taken (ms, on the device that took it). */
  t: number;
  /** The account's name as it was spelt at sign-up. */
  username: string;
  /** Firestore's own stamp of the document's last write, for writing only over what was read. */
  updateTime: string;
}

/** A write refused because the save changed in the cloud since it was last read (another device saved). */
export class SaveConflict extends CloudError {}

const str = (v: unknown): string => (v && typeof v === 'object' && 'stringValue' in v ? String((v as { stringValue: string }).stringValue) : '');
const int = (v: unknown): number => (v && typeof v === 'object' && 'integerValue' in v ? Number((v as { integerValue: string }).integerValue) || 0 : 0);

/** Load the logged-in player's save; null if there's no document yet. */
export async function loadCloud(): Promise<CloudSave | null> {
  const s = session;
  if (!s) return null;
  let res: Response;
  try {
    res = await fetch(docUrl(s.uid), { headers: { Authorization: `Bearer ${await token()}` }, cache: 'no-store' });
  } catch (e) {
    throw e instanceof CloudError ? e : new CloudError('No connection.');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new CloudError('Could not load your save.');
  const doc = (await res.json()) as { fields?: Record<string, unknown>; updateTime?: string };
  const f = doc.fields ?? {};
  return { data: str(f.heaven), t: int(f.heavenT), username: str(f.username), updateTime: doc.updateTime ?? '' };
}

/**
 * Write the logged-in player's save, only over the document as last read:
 * `after` is its updateTime, or null when there was none. Resolves with the
 * new updateTime; a SaveConflict when the cloud has moved on since.
 */
export async function writeCloud(data: string, t: number, after: string | null, keepalive = false): Promise<string> {
  const s = session;
  if (!s) throw new CloudError('Not logged in.');
  const fields = {
    username: { stringValue: s.username },
    heaven: { stringValue: data },
    heavenT: { integerValue: String(Math.floor(t)) },
    updated: { timestampValue: new Date().toISOString() },
  };
  const when = after ? `currentDocument.updateTime=${encodeURIComponent(after)}` : 'currentDocument.exists=false';
  const body = JSON.stringify({ fields });
  let res: Response;
  try {
    // keepalive lets a write started as the page is hidden finish, but only for small bodies.
    res = await fetch(`${docUrl(s.uid)}?${when}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
      body,
      keepalive: keepalive && body.length < 60_000,
    });
  } catch (e) {
    throw e instanceof CloudError ? e : new CloudError('No connection.');
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { status?: string } };
    const why = err.error?.status ?? '';
    if (why === 'FAILED_PRECONDITION' || why === 'ALREADY_EXISTS' || why === 'NOT_FOUND') throw new SaveConflict('Saved elsewhere since.');
    throw new CloudError('Could not save.');
  }
  const doc = (await res.json().catch(() => ({}))) as { updateTime?: string };
  return doc.updateTime ?? '';
}
