// Heaven Lands, the cozy game built on this one's engine (src/heaven/), runs
// the same world, Home and Everwood with no fighting in them. It switches
// this on before anything starts, and hands in the few things that differ:
// its own hero (a wanderer dressed in the character creator) and its own
// arenas. Myths and Legends never sets it, so none of this touches it.

import type { CharacterDef, Hero } from './characters';
import type Phaser from 'phaser';
import type { WorldScene } from '../scenes/WorldScene';
import type { ArenaDef } from '../world/arenas';
import type { BuildLand } from '../world/buildLand';
import type { Footing } from '../audio';

export interface CozyHooks {
  /** Heaven Lands is running: no monsters, no health or energy, chests give seeds and keepsakes. */
  on: boolean;
  /** The character played (this player's, or another player's from the look they sent). */
  character: ((kit?: string, look?: string) => CharacterDef) | null;
  /** This player's hero, spawned into the world. */
  spawn: ((world: WorldScene, x: number, y: number) => Hero) | null;
  /** What this player tells a room about themselves: their name, and their looks packed into hero and look. */
  me: (() => { name: string; hero: string; look: string }) | null;
  /** A chest opened somewhere (the Everwood's): what Heaven Lands gives instead of loot. */
  treasure: ((world: WorldScene, x: number, y: number) => void) | null;
  /** Heaven Lands' own buttons on the play HUD (emotes) in place of the fighting ones. */
  hud: ((scene: Phaser.Scene) => CozyHud) | null;
  /** The arena with this id, for places Heaven Lands adds that Myths' list doesn't have. */
  arena: ((id: string) => ArenaDef | undefined) | null;
  /** What Heaven Lands calls an arena ('Cloudrest' for the Floating Island). */
  placeName: ((arena: string) => string) | null;
  /** The living parts of an arena Heaven Lands adds (its endless lands): built by the world on the way in, or null. */
  land: ((world: WorldScene, arena: string, ground: (img: Phaser.GameObjects.Image) => Phaser.GameObjects.Image, view: Phaser.Geom.Rectangle) => CozyLand | null) | null;
  /** The map of an arena Heaven Lands adds (its endless lands), painted in tiles round where it's looked at, or null. */
  map: ((arena: string) => CozyMap | null) | null;
  /**
   * The light each frame, after the world's own: the weights of morning, day,
   * sunset and night (only day and night where a place has no day cycle), and
   * the time in ms. Heaven Lands grades its colours and veils the screen in light here.
   */
  light: ((weights: readonly number[], time: number) => void) | null;
  /** Heaven Lands' pastimes in the place being played (seats, beds, music, stars, bees, finds), built by the world once it's up. */
  pastimes: ((world: WorldScene, at: CozySpot) => CozyPastimes | null) | null;
  /** Heaven Lands' weather over the place being played (passing showers), or null where there's none. */
  weather: ((world: WorldScene, arena: string) => CozyWeather | null) | null;
  /** The friends button in a place: Heaven Lands' panel for inviting friends, joining them and the worlds shared with this player. */
  friends: ((world: WorldScene) => void) | null;
}

export interface CozyWeather {
  /** Each frame: the daylight, the view, and whether the hero is under a roof. */
  update(dt: number, daylight: number, view: Phaser.Geom.Rectangle, indoors: boolean): void;
  destroy(): void;
}

/** What the pastimes are given of the place: its arena, and the grid things are built on there (the Home's, the Everwood's), whose owner this player is or isn't. */
export interface CozySpot {
  arena: string;
  land: BuildLand | null;
  owner: boolean;
}

export interface CozyPastimes {
  /** Each frame, after the hero has moved. */
  update(dt: number, daylight: number): void;
  /** E or the touch button: true if a pastime took it. */
  act(): boolean;
  destroy(): void;
}

/**
 * The pastimes as the HUD sees them, written by the world each frame: the
 * touch button's icon for what E would do here ('' for nothing), and whether
 * an overlay (the jam's notes, the telescope) has the keys and the screen.
 */
export const pastimeHud = {
  near: '',
  busy: false,
  /** A jam is on: the lute button is lit. */
  jamming: false,
  /** The lute button (or its key) was pressed: the world starts or ends a jam. */
  jam: false,
};

/** An endless land's map for the minimap (scenes/MapScene.ts): tiles of `size` map pixels, one map pixel per MAP_CELL px of ground. */
export interface CozyMap {
  readonly size: number;
  /** Raised when a tile is painted, so whatever shows them draws again. */
  version: number;
  /** Tile (tx, ty), or null while it waits to be painted (asking for it queues it). */
  tile(tx: number, ty: number): HTMLCanvasElement | null;
  /** Paint waiting tiles for about `budget` ms. */
  work(budget: number): void;
}

export interface CozyLand {
  /** What the ground underfoot is, for a footstep's sound. */
  footing?(x: number, y: number): Footing;
  /** What the ground at (x, y) is for building on: -1 nothing goes, 0 dry, 1 shallows, 2 deep water (see world/PlaceBuild.ts BuildGround). */
  buildCell?(x: number, y: number): number;
  update(time: number, dt: number, daylight: number, hero: { x: number; y: number }, view: Phaser.Geom.Rectangle): void;
  destroy(): void;
}

export interface CozyHud {
  /** A press: true if the cozy buttons took it. */
  pointerDown(p: Phaser.Input.Pointer): boolean;
  update(dt: number, hidden: boolean): void;
}

export const cozy: CozyHooks = { on: false, character: null, spawn: null, me: null, treasure: null, hud: null, arena: null, placeName: null, land: null, map: null, light: null, pastimes: null, weather: null, friends: null };
