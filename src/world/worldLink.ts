import { WorldsLocked, writeWorldDoc, type WorldDoc } from '../game/cloud';
import { session, type Msg } from '../net/session';
import { ROOM_BEAT, myId, ownWorld, worlds, type WorldRef } from '../net/worlds';
import type { WorldScene } from '../scenes/WorldScene';

// A place being built in, as a world (see net/worlds.ts): whose it is, and
// whether friends may build there; keeping it in the cloud while it's
// shared, so friends can open it while its owner is away; telling the cloud
// which room is playing it, so whoever opens it next joins that room; and,
// once it's shared, keeping a room open in it whenever someone plays it.
// One for the Home (world/Home.ts) or the place's open-grid builds
// (PlaceBuild.ts), which tell it each change and hand it what they keep.

/** A change goes to the cloud this long after the last one... */
const SAVE_DELAY = 4000;
/** ...and the cloud is written at most this often (ms). */
const MIN_GAP = 12_000;

/** What the link needs from the place's builds. */
export interface LinkHost {
  /** What's built, the farm on it, and the critters for the jar shelves, as they stand. */
  state(): { data: string; farm: string; caught: string };
  /** When this player's own copy last changed (ms). */
  localT(): number;
  /** A newer copy of this player's own world came from the cloud (friends built in it while they were away): take it. */
  adopt(data: string, farm: string, caught: string): void;
}

export class WorldLink {
  ref: WorldRef;
  /** Friends may build here (its owner's switch). */
  open: boolean;
  /** The world is known: always for its keeper; for a guest once the host has said whose it is. */
  known: boolean;
  /** What the cloud kept of a friend's world opened while they're away: the builds start from it. */
  readonly initial: WorldDoc | null;
  private mineFlag: boolean;
  private shared: boolean;
  private dirty = false;
  private writeT = 0;
  private lastWrite = -Infinity;
  private beatT = 0;
  private wasHost: boolean;
  /** Hosting a room here alone (no one to hand it to on leaving). */
  private hostingAlone = false;
  private tried = false;
  private off: () => void;
  private dead = false;

  constructor(
    private world: WorldScene,
    readonly arena: string,
    private host: LinkHost,
  ) {
    const entering = worlds.entering?.ref.place === arena ? worlds.entering : null;
    worlds.entering = null;
    this.wasHost = !session.active || session.isHost;
    if (this.wasHost && entering) {
      // A friend's world, opened while they're away: what the cloud keeps of it is the world.
      this.ref = entering.ref;
      this.open = entering.doc.open;
      this.initial = entering.doc;
      this.mineFlag = false;
      this.shared = true;
      this.known = true;
    } else if (this.wasHost) {
      this.ref = ownWorld(arena);
      this.open = worlds.friendsBuild;
      this.initial = null;
      this.mineFlag = true;
      this.shared = !!this.ref.id && worlds.isShared(arena);
      this.known = true;
      if (this.shared) void this.catchUp();
    } else {
      this.ref = { id: '', place: arena, owner: '', name: '' };
      this.open = false;
      this.initial = null;
      this.mineFlag = false;
      this.shared = false;
      this.known = false;
    }
    this.off = session.on((m) => this.receive(m));
  }

  /** It's this player's own world. */
  get mine(): boolean {
    return this.mineFlag;
  }

  /** This game keeps the world: alone, or the room's host. */
  get keeper(): boolean {
    return !session.active || session.isHost;
  }

  /** This player may build here. */
  get canBuild(): boolean {
    return this.known && (this.mineFlag || this.open);
  }

  /** It's kept in the cloud for friends. */
  get isShared(): boolean {
    return this.shared;
  }

  /** The owner's own world was changed by friends while they were away: take the cloud's copy if it's newer. */
  private async catchUp(): Promise<void> {
    const doc = await worlds.load(this.ref.id);
    if (this.dead || !doc) return;
    if (doc.closed) {
      // Stopped sharing on another device.
      this.shared = false;
      worlds.setShared(this.arena, false);
      return;
    }
    this.open = doc.open;
    if (doc.dataT > this.host.localT() + 1000 && doc.data) this.host.adopt(doc.data, doc.farm, doc.caught);
  }

  /** Something changed here (built by anyone, or come in from the room): to the cloud a little later. */
  changed(): void {
    if (!this.shared || !this.keeper) return;
    this.dirty = true;
    this.writeT = SAVE_DELAY;
  }

  update(dt: number): void {
    const host = !session.active || session.isHost;
    if (host && !this.wasHost && session.active) {
      // The host left and the room passed to this player: the world is theirs to keep now.
      this.known = true;
      this.announce();
      if (this.shared) this.beatT = 0;
    }
    this.wasHost = host;
    this.hostingAlone = session.active && session.isHost && session.peers.size === 0;
    if (!myId() || worlds.locked) return;
    // Opened to friends: it's shared from now on.
    if (session.active && session.isHost && this.mineFlag && this.ref.id && !this.shared) this.share();
    // A shared world keeps a room open while it's played, so friends who open it come here.
    if (this.shared && !session.active && !this.tried && session.configured) {
      this.tried = true;
      void this.openRoom();
    }
    if (this.dirty && host && (this.writeT -= dt) <= 0 && performance.now() - this.lastWrite > MIN_GAP) this.flush();
    if (this.shared && session.active && session.isHost && (this.beatT -= dt) <= 0) {
      this.beatT = ROOM_BEAT;
      void this.write({ room: session.room?.code ?? '', roomT: Date.now() });
    }
  }

  /** Quietly open a room here (no one else needs to wait for it), and play on in it. */
  private async openRoom(): Promise<void> {
    try {
      const me = this.world.roomMe();
      const room = await session.open({ t: 'create', mode: 'coop', arena: this.arena }, me);
      if (this.dead) {
        session.close();
        return;
      }
      if (room) this.world.goOnline();
    } catch {
      // The server is asleep or out of reach: alone it is, for this visit.
    }
  }

  /** Keep the world in the cloud for friends: everything as it stands, and the room playing it. */
  private share(): void {
    this.shared = true;
    worlds.setShared(this.arena, true);
    const s = this.host.state();
    this.dirty = false;
    this.lastWrite = performance.now();
    this.beatT = ROOM_BEAT;
    void this.write({ owner: this.ref.owner, name: this.ref.name, place: this.arena, data: s.data, farm: s.farm, caught: s.caught, dataT: Date.now(), room: session.room?.code ?? '', roomT: Date.now(), open: this.open, closed: false });
  }

  /** No longer kept for friends: they can't open it any more (their lists say so). Its owner only. */
  unshare(): void {
    if (!this.mineFlag || !this.shared) return;
    this.shared = false;
    this.dirty = false;
    worlds.setShared(this.arena, false);
    void this.write({ closed: true, room: '' });
  }

  /** Let friends build here, or not (its owner, hosting). */
  setOpen(open: boolean): void {
    if (!this.mineFlag || !this.keeper) return;
    this.open = open;
    worlds.friendsBuild = open;
    this.announce();
    if (this.shared) void this.write({ open });
  }

  private flush(keepalive = false): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.lastWrite = performance.now();
    const s = this.host.state();
    void this.write({ data: s.data, farm: s.farm, caught: s.caught, dataT: Date.now() }, keepalive);
  }

  private async write(fields: Partial<WorldDoc>, keepalive = false): Promise<void> {
    if (!this.ref.id || worlds.locked) return;
    try {
      await writeWorldDoc(this.ref.id, fields, keepalive);
    } catch (e) {
      // Not this time (no connection): the next change tries again. Locked: shared worlds sleep till the rule is in.
      if (e instanceof WorldsLocked) worlds.locked = true;
    }
  }

  // ---------------------------------------------------------------- Online

  /** Whose world this is and whether friends may build, to the room (or one who just came). */
  announce(to?: number): void {
    if (!session.active || !session.isHost) return;
    session.send({ t: 'wi', id: this.ref.id, pl: this.arena, o: this.ref.owner, n: this.ref.name, b: this.open }, to);
  }

  private receive(m: Msg): void {
    if (m.t === 'wq' || m.t === 'hq') {
      if (session.isHost) this.announce(m.f);
      return;
    }
    if (m.t === 'closed') return;
    if (m.t !== 'wi' || session.isHost) return;
    this.ref = { id: String(m.id ?? ''), place: this.arena, owner: String(m.o ?? ''), name: String(m.n ?? '') };
    this.open = !!m.b;
    this.known = true;
    this.mineFlag = !!this.ref.owner && this.ref.owner === myId();
    worlds.remember(this.ref);
  }

  /**
   * The room here is being left (to play on alone, or to go to another):
   * the last changes go to the cloud now, while this game still keeps the
   * world, and the cloud stops pointing friends at the room if no one else is
   * in it. No room is opened here again this visit.
   */
  letGo(): void {
    this.tried = true;
    if (this.dead || !this.shared || !this.keeper) return;
    this.flush(true);
    if (this.hostingAlone || !session.active) void this.write({ room: '' }, true);
  }

  destroy(): void {
    this.off();
    if (this.dead) return;
    this.dead = true;
    if (this.shared && this.keeper) this.flush(true);
    // The last one out: no room plays it now.
    if (this.shared && this.hostingAlone) void this.write({ room: '' }, true);
  }
}
