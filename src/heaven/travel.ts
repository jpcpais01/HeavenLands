// Going places: from the menus into a place's world (behind its loading
// screen when it's painted), and with friends: rooms, and friends' worlds
// (see net/worlds.ts; the friends panel, ui/friendsPanel.ts, offers them).

import type Phaser from 'phaser';
import { arenaById } from '../world/arenas';
import { enterArena, needsLoading } from '../scenes/ArenaLoadScene';
import type { WorldScene } from '../scenes/WorldScene';
import { session, type Joined } from '../net/session';
import { liveRoom, myId, ownWorld, worlds, type WorldRef } from '../net/worlds';
import { PLACES, placeById } from './places';
import { profile } from './profile';
import { lookFields } from './look';

/** The character id the world is started with: the wanderer stands in for every hero (see cozy.character). */
export const WANDERER = 'wanderer';

let leaving = false;

/** Fade out of `scene` and into the place. */
export function travel(scene: Phaser.Scene, id: string, fade = true): void {
  if (leaving) return;
  const arena = arenaById(placeById(id).arena).id;
  const go = () => {
    leaving = false;
    for (const k of ['home', 'atlas', 'creator']) if (k !== scene.scene.key && scene.scene.isActive(k)) scene.scene.stop(k);
    if (needsLoading(scene, arenaById(arena))) scene.scene.start('arenaload', { character: WANDERER, arena });
    else enterArena(scene, WANDERER, arena);
  };
  if (!fade) return go();
  leaving = true;
  scene.cameras.main.fadeOut(450, 12, 14, 26);
  scene.cameras.main.once('camerafadeoutcomplete', go);
}

/** How long a quick look in the cloud may hold up going somewhere (ms). */
const PEEK_MS = 2500;

/** The scene is the world itself (the friends panel opened while playing). */
const inWorld = (scene: Phaser.Scene): scene is WorldScene => scene.scene.key === 'world';

/** What a room is told about this player. */
const me = () => ({ name: profile.name, ...lookFields(profile.look) });

/** Into a place's world, from a menu or from the world itself. */
function goTo(scene: Phaser.Scene, arena: string): void {
  if (inWorld(scene)) scene.moveTo(arena);
  else travel(scene, arena);
}

/** Out of whatever room this player is in, before opening another. */
function leaveRoom(scene: Phaser.Scene): void {
  if (inWorld(scene)) scene.leaveRoom();
  else session.close();
}

/** Open a room (a new one in `arena`, or a friend's by its code) and go where it plays. Throws with a message to show. */
export async function playTogether(scene: Phaser.Scene, req: { t: 'create'; arena: string } | { t: 'join'; code: string }): Promise<Joined> {
  if (!session.configured) throw new Error('Playing together needs the game server, which is resting right now.');
  leaveRoom(scene);
  const room = await session.open(req.t === 'create' ? { t: 'create', mode: 'coop', arena: req.arena } : req, me());
  if (!PLACES.some((p) => p.arena === room.arena)) {
    // The rooms are shared with Myths and Legends: its codes lead nowhere here.
    session.close();
    throw new Error("That code isn't a Heaven Lands room.");
  }
  goTo(scene, room.arena);
  return room;
}

/**
 * Go to a place. A world this player has shared may be being played by
 * friends while they're away: if so, they join them there rather than
 * opening their own copy beside it.
 */
export function goPlace(scene: Phaser.Scene, id: string): void {
  const arena = placeById(id).arena;
  const ref = ownWorld(arena);
  if (!ref.id || !worlds.isShared(arena) || worlds.locked || !session.configured) return travel(scene, id);
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    travel(scene, id);
  };
  const timer = setTimeout(go, PEEK_MS);
  void worlds
    .load(ref.id)
    .catch(() => null)
    .then(async (doc) => {
      const code = liveRoom(doc);
      if (gone || !code) return;
      clearTimeout(timer);
      gone = true;
      try {
        await playTogether(scene, { t: 'join', code });
      } catch {
        // The room was gone after all: in alone, and the world opens a room of its own.
        travel(scene, id);
      }
    });
}

/**
 * Open a friend's world from the list: join whoever is playing it, or, if
 * no one is, open it from what the cloud keeps and host it (friends who open
 * it after join this player). Throws with a message to show.
 */
export async function openWorld(scene: Phaser.Scene, ref: WorldRef): Promise<void> {
  if (!myId()) throw new Error('Sign in to visit friends\' worlds.');
  const doc = await worlds.load(ref.id);
  if (!doc) {
    if (worlds.locked) throw new Error("Friends' worlds can only be visited while they're playing, for now.");
    if (worlds.offline) throw new Error("Couldn't reach the clouds. Try again in a moment.");
    worlds.forget(ref.id);
    throw new Error(`${ref.name} isn't sharing that world any more.`);
  }
  if (doc.closed) {
    worlds.forget(ref.id);
    throw new Error(`${ref.name} isn't sharing that world any more.`);
  }
  const code = liveRoom(doc);
  if (code) {
    try {
      await playTogether(scene, { t: 'join', code });
      return;
    } catch {
      // The room has just closed: open the world here instead.
    }
  }
  leaveRoom(scene);
  worlds.entering = { ref: { ...ref, name: doc.name || ref.name, place: doc.place || ref.place }, doc };
  goTo(scene, doc.place || ref.place);
}
