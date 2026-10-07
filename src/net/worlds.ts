// Worlds: every place a player builds in is their own world there (their
// Home, their Everwood, their Glowtide Shore...), kept in their save. Once
// they open one to friends it's shared: kept in the cloud too (see
// WorldDoc in game/cloud.ts), and every friend who comes in has it in their
// list, so they can come back whenever they like, even while its owner is
// away. Whoever is playing a shared world keeps a room open in it and says
// which in the cloud, so a friend opening it joins them rather than
// starting a copy of their own (see travel in src/heaven/travel.ts and
// world/worldLink.ts).

import { CloudError, WorldsLocked, account, cloudReady, loadWorldDoc, type WorldDoc } from '../game/cloud';
import { cozy } from '../game/cozy';

export interface WorldRef {
  /** `<owner's uid>_<arena>`; '' for a world that can't be shared (played without an account). */
  id: string;
  /** Its arena id. */
  place: string;
  owner: string;
  /** The owner's name, as their friends see it. */
  name: string;
}

/** A room not heard from for this long is gone (its host says so about every ROOM_BEAT). */
export const LIVE_MS = 150_000;
export const ROOM_BEAT = 50_000;
/** Friends' worlds kept in the list. */
const MAX_FRIENDS = 16;

const LIST_KEY = 'pixel-battle.worlds';
const SHARED_KEY = 'pixel-battle.shared';
const OPEN_KEY = 'pixel-battle.friendsBuild';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // Storage full: kept for this visit only.
  }
}

/** This player's account id ('' playing without one). */
export const myId = (): string => (cloudReady() ? (account()?.uid ?? '') : '');

/** This player's name, as friends see it. */
export const myName = (): string => cozy.me?.().name ?? account()?.username ?? 'Wanderer';

/** This player's own world in `arena`. */
export function ownWorld(arena: string): WorldRef {
  const uid = myId();
  return { id: uid ? `${uid}_${arena}` : '', place: arena, owner: uid, name: myName() };
}

export const isRef = (v: unknown): v is WorldRef => !!v && typeof v === 'object' && typeof (v as WorldRef).id === 'string' && typeof (v as WorldRef).place === 'string' && typeof (v as WorldRef).owner === 'string' && typeof (v as WorldRef).name === 'string';

export const worlds = {
  /** The cloud wouldn't let shared worlds be read (its rule isn't in yet): they wait till the next visit. */
  locked: false,
  /** The last load failed for want of a connection (not because there was no such world). */
  offline: false,
  /** A friend's world about to be opened (travel sets it, the world takes it), with what the cloud keeps of it. */
  entering: null as { ref: WorldRef; doc: WorldDoc } | null,

  /** Friends' worlds this player has been to, the latest first. */
  friends(): WorldRef[] {
    const list = read<unknown[]>(LIST_KEY, []);
    return Array.isArray(list) ? list.filter(isRef).filter((r) => r.id && r.owner !== myId()) : [];
  },

  /** A friend's world, to the top of the list. */
  remember(ref: WorldRef): void {
    if (!ref.id || !ref.owner || ref.owner === myId()) return;
    const list = this.friends().filter((r) => r.id !== ref.id);
    list.unshift({ id: ref.id, place: ref.place, owner: ref.owner, name: ref.name });
    write(LIST_KEY, list.slice(0, MAX_FRIENDS));
  },

  forget(id: string): void {
    write(LIST_KEY, this.friends().filter((r) => r.id !== id));
  },

  /** Has this player shared their world in `arena`? */
  isShared(arena: string): boolean {
    const list = read<unknown>(SHARED_KEY, []);
    return Array.isArray(list) && list.includes(arena);
  },

  setShared(arena: string, on: boolean): void {
    const list = read<unknown>(SHARED_KEY, []);
    const now = Array.isArray(list) ? list.filter((a): a is string => typeof a === 'string' && a !== arena) : [];
    if (on) now.push(arena);
    write(SHARED_KEY, now);
  },

  /** Friends may build in this player's worlds (the friends panel's switch). */
  get friendsBuild(): boolean {
    return read<boolean>(OPEN_KEY, false) === true;
  },

  set friendsBuild(b: boolean) {
    write(OPEN_KEY, b);
  },

  /** A shared world as the cloud keeps it; null if there's none, can't be, or the cloud can't be reached. */
  async load(id: string): Promise<WorldDoc | null> {
    this.offline = false;
    if (!id || this.locked || !myId()) return null;
    try {
      return await loadWorldDoc(id);
    } catch (e) {
      if (e instanceof WorldsLocked) this.locked = true;
      else this.offline = true;
      if (e instanceof CloudError) return null;
      throw e;
    }
  },
};

/** Is a room said to be playing this world still there? */
export const liveRoom = (doc: WorldDoc | null): string => (doc && doc.room && Date.now() - doc.roomT < LIVE_MS ? doc.room : '');
