// Everything the player can build their Home from (see homeLayout.ts for how
// a home is laid out, art/homeFloors.ts, homeWalls.ts and homeProps.ts for how
// each part looks, and world/Home.ts for how they stand in the world).
//
// A home has four layers on its grid: floors painted over the lawn, walls
// (with doors and windows) joining up with their neighbours, roofs over them,
// and things placed on it: plants, furniture, lights, and decorations hung on
// walls. The build palette lists these in order, tab by tab. Critters the
// player has caught can be let out here too (see world/HomeCritters.ts): each
// is kept as a thing at the spot it was let go, and roams round it.

import { CRITTERS } from '../game/critters';

/** The palette's tabs, in order; each is a layer or a kind of thing to place. */
export type BuildTab = 'floor' | 'wall' | 'roof' | 'tent' | 'garden' | 'furniture' | 'light' | 'decor' | 'critters' | 'seeds';

/**
 * How the tray is organised for the player: a few sections, each with its
 * shelves. A shelf is what the parts row shows; each one belongs to one tab
 * (the layer the eraser takes from while it's open). The house's structure
 * (floors, walls, roofs, tents) shares one section, so the top row stays short.
 */
export type Section = 'build' | 'garden' | 'furniture' | 'light' | 'decor' | 'critters' | 'seeds';

export const SECTIONS: { id: Section; name: string }[] = [
  { id: 'build', name: 'Build' },
  { id: 'garden', name: 'Garden' },
  { id: 'furniture', name: 'Furniture' },
  { id: 'light', name: 'Lights' },
  { id: 'decor', name: 'Wall decor' },
  { id: 'critters', name: 'Critters' },
  { id: 'seeds', name: 'Seeds' },
];

export interface Shelf {
  id: string;
  name: string;
  section: Section;
  tab: BuildTab;
}

export const SHELVES: Shelf[] = [
  { id: 'ground', name: 'Ground', section: 'build', tab: 'floor' },
  { id: 'floors', name: 'Floors', section: 'build', tab: 'floor' },
  { id: 'walls', name: 'Walls', section: 'build', tab: 'wall' },
  { id: 'fences', name: 'Fences', section: 'build', tab: 'wall' },
  { id: 'roofs', name: 'Roofs', section: 'build', tab: 'roof' },
  { id: 'tents', name: 'Tents', section: 'build', tab: 'tent' },
  { id: 'trees', name: 'Trees', section: 'garden', tab: 'garden' },
  { id: 'flowers', name: 'Flowers', section: 'garden', tab: 'garden' },
  { id: 'water', name: 'Water', section: 'garden', tab: 'garden' },
  { id: 'yard', name: 'Yard', section: 'garden', tab: 'garden' },
  { id: 'ornaments', name: 'Ornaments', section: 'garden', tab: 'garden' },
  { id: 'living', name: 'Living', section: 'furniture', tab: 'furniture' },
  { id: 'bedroom', name: 'Bedroom', section: 'furniture', tab: 'furniture' },
  { id: 'kitchen', name: 'Kitchen', section: 'furniture', tab: 'furniture' },
  { id: 'study', name: 'Study', section: 'furniture', tab: 'furniture' },
  { id: 'rugs', name: 'Rugs', section: 'furniture', tab: 'furniture' },
  { id: 'lamps', name: 'Lamps', section: 'light', tab: 'light' },
  { id: 'outdoor', name: 'Outdoor', section: 'light', tab: 'light' },
  { id: 'wards', name: 'Wards', section: 'light', tab: 'light' },
  { id: 'frames', name: 'Frames', section: 'decor', tab: 'decor' },
  { id: 'hangings', name: 'Hangings', section: 'decor', tab: 'decor' },
  { id: 'critters', name: 'Critters', section: 'critters', tab: 'critters' },
  { id: 'seeds', name: 'Seeds', section: 'seeds', tab: 'seeds' },
];

export const TABS: { id: BuildTab; name: string }[] = [
  { id: 'floor', name: 'Floors' },
  { id: 'wall', name: 'Walls' },
  { id: 'roof', name: 'Roofs' },
  { id: 'tent', name: 'Tents' },
  { id: 'garden', name: 'Garden' },
  { id: 'furniture', name: 'Furniture' },
  { id: 'light', name: 'Lights' },
  { id: 'decor', name: 'Wall decor' },
  { id: 'critters', name: 'Critters' },
  { id: 'seeds', name: 'Seeds' },
];

// ---------------------------------------------------------------- Floors

/**
 * Floors, painted a cell at a time. Soft ones (grass, beds, paths, water,
 * cobbles stone by stone) melt into their neighbours with ragged, rounded
 * edges; laid ones (boards, tiles, flags) keep to their cells. Their index in
 * this list, from 1, is what the layout stores (0 is bare lawn).
 */
export interface FloorDef {
  id: string;
  name: string;
  /** Blends into its neighbours rather than keeping to its cells. */
  soft?: boolean;
  /** Feet can't cross it (the pond). */
  water?: boolean;
}

export const FLOORS: FloorDef[] = [
  { id: 'lawn', name: 'Lawn', soft: true },
  { id: 'meadow', name: 'Wildflowers', soft: true },
  { id: 'soil', name: 'Garden bed', soft: true },
  { id: 'path', name: 'Dirt path', soft: true },
  { id: 'gravel', name: 'Gravel', soft: true },
  { id: 'sand', name: 'Sand', soft: true },
  { id: 'pond', name: 'Pond', soft: true, water: true },
  { id: 'cobble', name: 'Cobbles', soft: true },
  { id: 'flags', name: 'Flagstones' },
  { id: 'bricks', name: 'Brick paving' },
  { id: 'oak', name: 'Oak boards' },
  { id: 'walnut', name: 'Walnut boards' },
  { id: 'marble', name: 'Marble' },
  { id: 'terracotta', name: 'Terracotta' },
  { id: 'ashlar', name: 'Stone floor' },
];

export const floorIndex = (id: string): number => FLOORS.findIndex((f) => f.id === id) + 1;

// ---------------------------------------------------------------- Walls

/**
 * Wall materials. A wall cell joins the walls beside it into one run; a house
 * wall can also be a door (walked through) or a window, and a garden wall a
 * gate. `height` is how tall its face stands, `thick` how wide its footprint.
 */
export interface WallDef {
  id: string;
  name: string;
  height: number;
  thick: number;
  /** A house wall: it has doors and windows (garden walls have a gate). */
  house: boolean;
}

export const WALLS: WallDef[] = [
  { id: 'stone', name: 'Fieldstone', height: 28, thick: 6, house: true },
  { id: 'timber', name: 'Timber frame', height: 28, thick: 6, house: true },
  { id: 'logs', name: 'Log cabin', height: 28, thick: 6, house: true },
  { id: 'brick', name: 'Red brick', height: 28, thick: 6, house: true },
  { id: 'hedge', name: 'Hedge', height: 15, thick: 8, house: false },
  { id: 'fence', name: 'Picket fence', height: 11, thick: 2, house: false },
  { id: 'lowwall', name: 'Garden wall', height: 10, thick: 8, house: false },
];

/** What a wall cell is: a plain wall, a doorway (or gate), or a window. */
export type WallKind = 'wall' | 'door' | 'window';
const KINDS: WallKind[] = ['wall', 'door', 'window'];

/** A wall cell as the layout stores it: its material (from 1) and kind packed in one number (0 is none). */
export const packWall = (mat: number, kind: WallKind): number => (mat + 1) * 4 + KINDS.indexOf(kind);
export const wallMat = (v: number): number => (v >> 2) - 1;
export const wallKind = (v: number): WallKind => KINDS[v & 3] ?? 'wall';

/** The wall palette: every material's wall, then its door (or gate) and window. */
export const WALL_ITEMS: { id: string; name: string; value: number }[] = WALLS.flatMap((w, i) => [
  { id: `${w.id}`, name: w.name, value: packWall(i, 'wall') },
  { id: `${w.id}_door`, name: w.house ? `${w.name} door` : `${w.name} gate`, value: packWall(i, 'door') },
  ...(w.house ? [{ id: `${w.id}_window`, name: `${w.name} window`, value: packWall(i, 'window') }] : []),
]);

// ---------------------------------------------------------------- Roofs

/** Roofs, painted over a house; each joined patch becomes one roof, hipped to fit whatever shape it covers. */
export const ROOFS: { id: string; name: string }[] = [
  { id: 'slate', name: 'Slate' },
  { id: 'clay', name: 'Clay tiles' },
  { id: 'thatch', name: 'Thatch' },
  { id: 'shingle', name: 'Shingles' },
];

// ---------------------------------------------------------------- Tents

/**
 * Tents: wall and roof in one, laid cell by cell like a roof but on open
 * ground, no walls needed. Each joined patch becomes one tent that shapes
 * itself to the cells (see art/tentArt.ts): its ridge runs the long way, its
 * cloth slopes from the ridge right down to the ground, pegged out at the
 * hem, and its door is a flap tied back at the front. It is walked into like
 * a house: the cloth fades away round the hero inside. Their index here, from
 * 1, is what a layout stores.
 */
export const TENTS: { id: string; name: string }[] = [
  { id: 'canvas', name: 'Canvas tent' },
  { id: 'festival', name: 'Festival tent' },
  { id: 'ranger', name: 'Ranger tent' },
];

// ---------------------------------------------------------------- Things

/** How a placed thing stops feet: not at all, round its trunk or post, or over its whole footprint. */
export type Block = 'none' | 'post' | 'full';

export interface PartDef {
  id: string;
  name: string;
  tab: 'wall' | 'garden' | 'furniture' | 'light' | 'decor' | 'critters';
  /** The tray's shelf it sits on (see SHELVES). */
  shelf: string;
  /** Footprint in cells. */
  w: number;
  h: number;
  block: Block;
  /** Lies flat on the floor (rugs, lily pads): under everything, and it can sit under other things. */
  flat?: boolean;
  /** Only on water (lily pads), or allowed on it too (reeds). */
  water?: 'only' | 'too';
  /** Hung on the face of a wall. */
  wall?: boolean;
  /** Can be mirrored. */
  flip?: boolean;
  /** Turns to face each way: front, right, back, left (Thing.turn 0..3); its side views swap its footprint round. */
  turns?: boolean;
  /** Drawn side on (facing right) before it could turn, so old saves without a turn keep it that way. */
  sideways?: boolean;
  /** A light it gives off: colour, reach, strength, how much of it the day washes out, and its height above the base. */
  light?: { color: number; radius: number; intensity: number; day: number; y: number; flicker?: boolean };
  /** A chimney rises from the roof above it, smoking. */
  chimney?: boolean;
  /** Shows this many of the owner's caught critters in their jars along its top (see game/critters.ts). */
  jars?: number;
  /** A fishing rod: used within FISH_REACH cells of water, it starts the fishing (see world/Fishing.ts). */
  fishing?: boolean;
  /** A critter let out here (its id in game/critters.ts): not drawn as a thing, but living round this spot. */
  critter?: string;
  /** A door hung in a house's doorway: it swings open as a hero comes to it (art/homeDoor.ts); mirrored, its hinge is on the other side. */
  door?: boolean;
  /** A ward: no creature rises within this many cells of it (in the Everwood; see ForestEdits.warded). */
  ward?: number;
  /** A place to cook (see game/cooking.ts): the kitchen stove indoors, or a pot over a fire in the garden. */
  cook?: 'stove' | 'fire';
  /** A bridge's cell: laid in strokes like a wall, joined with its neighbours into one bridge that shapes itself (see bridge.ts). */
  bridge?: boolean;
}

/** How many cells from a fishing rod the water may be. */
export const FISH_REACH = 3;

export const PARTS: PartDef[] = [
  // Walls: a door for a house's doorway, after the walls themselves on their tab.
  { id: 'door', name: 'Oak door', tab: 'wall', shelf: 'walls', w: 1, h: 1, block: 'none', flip: true, door: true },

  // Garden
  { id: 'oak', name: 'Oak tree', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post' },
  { id: 'birch', name: 'Birch tree', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post' },
  { id: 'pine', name: 'Pine tree', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post' },
  { id: 'blossom', name: 'Cherry tree', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post' },
  { id: 'bush', name: 'Bush', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post', flip: true },
  { id: 'roses', name: 'Rose bush', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post', flip: true },
  { id: 'fern', name: 'Fern', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'none', flip: true },
  { id: 'tulips', name: 'Tulips', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'none', flip: true },
  { id: 'lavender', name: 'Lavender', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'none', flip: true },
  { id: 'sunflowers', name: 'Sunflowers', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'none', flip: true },
  { id: 'cabbages', name: 'Cabbages', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'none', flip: true },
  { id: 'pumpkin', name: 'Pumpkin', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'post', flip: true },
  { id: 'planter', name: 'Flower box', tab: 'garden', shelf: 'flowers', w: 2, h: 1, block: 'full' },
  { id: 'rock', name: 'Mossy rock', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'post', flip: true },
  { id: 'stump', name: 'Stump', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'post', flip: true },
  { id: 'stepping', name: 'Stepping stones', tab: 'garden', shelf: 'water', w: 1, h: 1, block: 'none', flat: true, flip: true },
  { id: 'lilypad', name: 'Lily pads', tab: 'garden', shelf: 'water', w: 1, h: 1, block: 'none', flat: true, water: 'only', flip: true },
  { id: 'reeds', name: 'Reeds', tab: 'garden', shelf: 'water', w: 1, h: 1, block: 'none', water: 'too', flip: true },
  // Laid a cell at a time across water (or anywhere), ramping up off one bank and down onto the other.
  { id: 'bridge', name: 'Wooden bridge', tab: 'garden', shelf: 'water', w: 1, h: 1, block: 'none', water: 'too', bridge: true },
  { id: 'bench', name: 'Garden bench', tab: 'garden', shelf: 'yard', w: 2, h: 1, block: 'full', turns: true },
  { id: 'well', name: 'Well', tab: 'garden', shelf: 'water', w: 2, h: 2, block: 'full' },
  { id: 'birdbath', name: 'Birdbath', tab: 'garden', shelf: 'water', w: 1, h: 1, block: 'post' },
  { id: 'scarecrow', name: 'Scarecrow', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'post', flip: true },
  { id: 'haybale', name: 'Hay bale', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'full', flip: true },
  { id: 'mailbox', name: 'Mailbox', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'post', flip: true },
  { id: 'fishrod', name: 'Fishing rod', tab: 'garden', shelf: 'water', w: 1, h: 1, block: 'post', flip: true, fishing: true },
  { id: 'signpost', name: 'Signpost', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'post', flip: true },
  { id: 'cookpot', name: 'Cooking pot', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'full', cook: 'fire', light: { color: 0xff8a3a, radius: 120, intensity: 1.9, day: 0.35, y: 5, flicker: true } },
  { id: 'gnome', name: 'Garden gnome', tab: 'garden', shelf: 'ornaments', w: 1, h: 1, block: 'post', flip: true },
  { id: 'frogstatue', name: 'Frog statue', tab: 'garden', shelf: 'ornaments', w: 1, h: 1, block: 'post', flip: true },
  { id: 'cacti', name: 'Potted cacti', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'post', flip: true },
  { id: 'wateringcan', name: 'Watering can', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'none', flip: true },
  { id: 'beehive', name: 'Beehive', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'post', flip: true },
  { id: 'birdhouse', name: 'Birdhouse', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'post', flip: true },
  { id: 'deckchair', name: 'Deck chair', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'post', turns: true },
  { id: 'wheelbarrow', name: 'Wheelbarrow', tab: 'garden', shelf: 'yard', w: 2, h: 1, block: 'full', flip: true },
  { id: 'doghouse', name: 'Doghouse', tab: 'garden', shelf: 'yard', w: 2, h: 1, block: 'full', turns: true },
  { id: 'arbor', name: 'Rose arch', tab: 'garden', shelf: 'ornaments', w: 2, h: 1, block: 'none' },
  { id: 'swing', name: 'Garden swing', tab: 'garden', shelf: 'yard', w: 2, h: 1, block: 'full' },
  { id: 'fountain', name: 'Fountain', tab: 'garden', shelf: 'water', w: 2, h: 2, block: 'full' },

  // Furniture
  { id: 'bed', name: 'Bed', tab: 'furniture', shelf: 'bedroom', w: 1, h: 2, block: 'full', turns: true },
  { id: 'bigbed', name: 'Double bed', tab: 'furniture', shelf: 'bedroom', w: 2, h: 2, block: 'full', turns: true },
  { id: 'bookshelf', name: 'Bookshelf', tab: 'furniture', shelf: 'study', w: 2, h: 1, block: 'full' },
  { id: 'wardrobe', name: 'Wardrobe', tab: 'furniture', shelf: 'bedroom', w: 2, h: 1, block: 'full' },
  { id: 'dresser', name: 'Dresser', tab: 'furniture', shelf: 'bedroom', w: 1, h: 1, block: 'full', flip: true },
  { id: 'table', name: 'Table', tab: 'furniture', shelf: 'living', w: 2, h: 1, block: 'full' },
  { id: 'roundtable', name: 'Round table', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'full' },
  { id: 'chair', name: 'Chair', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'post', turns: true, sideways: true },
  { id: 'stool', name: 'Stool', tab: 'furniture', shelf: 'kitchen', w: 1, h: 1, block: 'post' },
  { id: 'sofa', name: 'Sofa', tab: 'furniture', shelf: 'living', w: 2, h: 1, block: 'full', turns: true },
  { id: 'desk', name: 'Writing desk', tab: 'furniture', shelf: 'study', w: 2, h: 1, block: 'full', flip: true },
  { id: 'chest', name: 'Chest', tab: 'furniture', shelf: 'bedroom', w: 1, h: 1, block: 'full', flip: true },
  { id: 'barrel', name: 'Barrel', tab: 'furniture', shelf: 'kitchen', w: 1, h: 1, block: 'full' },
  { id: 'crate', name: 'Crates', tab: 'furniture', shelf: 'kitchen', w: 1, h: 1, block: 'full', flip: true },
  { id: 'fireplace', name: 'Fireplace', tab: 'furniture', shelf: 'living', w: 2, h: 1, block: 'full', chimney: true, light: { color: 0xff9a48, radius: 130, intensity: 1.9, day: 0.35, y: 10, flicker: true } },
  { id: 'stove', name: 'Kitchen stove', tab: 'furniture', shelf: 'kitchen', w: 2, h: 1, block: 'full', chimney: true, cook: 'stove', light: { color: 0xff9a48, radius: 100, intensity: 1.5, day: 0.35, y: 7, flicker: true } },
  { id: 'cauldron', name: 'Cauldron', tab: 'furniture', shelf: 'kitchen', w: 1, h: 1, block: 'full', light: { color: 0x7aff8a, radius: 70, intensity: 1.2, day: 0.4, y: 10, flicker: true } },
  { id: 'clock', name: 'Tall clock', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'full' },
  { id: 'armorstand', name: 'Armour stand', tab: 'furniture', shelf: 'study', w: 1, h: 1, block: 'post', flip: true },
  { id: 'weaponrack', name: 'Weapon rack', tab: 'furniture', shelf: 'study', w: 2, h: 1, block: 'full' },
  { id: 'jarshelf', name: 'Critter shelf', tab: 'furniture', shelf: 'study', w: 3, h: 1, block: 'full', jars: 3 },
  { id: 'plant', name: 'Potted plant', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'post', flip: true },
  { id: 'armchair', name: 'Armchair', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'full', turns: true },
  { id: 'rocker', name: 'Rocking chair', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'post', turns: true },
  { id: 'pouf', name: 'Floor cushion', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'post' },
  { id: 'catbed', name: 'Cat bed', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'post', flip: true },
  { id: 'nightstand', name: 'Nightstand', tab: 'furniture', shelf: 'bedroom', w: 1, h: 1, block: 'full', flip: true, light: { color: 0xffc888, radius: 60, intensity: 1, day: 0.2, y: 16 } },
  { id: 'bathtub', name: 'Bathtub', tab: 'furniture', shelf: 'bedroom', w: 2, h: 1, block: 'full', turns: true },
  { id: 'piano', name: 'Piano', tab: 'furniture', shelf: 'living', w: 2, h: 1, block: 'full' },
  { id: 'harp', name: 'Harp', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'post', flip: true },
  { id: 'spinwheel', name: 'Spinning wheel', tab: 'furniture', shelf: 'study', w: 1, h: 1, block: 'post', flip: true },
  { id: 'globe', name: 'Globe', tab: 'furniture', shelf: 'study', w: 1, h: 1, block: 'post', flip: true },
  { id: 'telescope', name: 'Telescope', tab: 'furniture', shelf: 'study', w: 1, h: 1, block: 'post', flip: true },
  { id: 'fishbowl', name: 'Fishbowl', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'post' },
  { id: 'coatrack', name: 'Coat rack', tab: 'furniture', shelf: 'bedroom', w: 1, h: 1, block: 'post', flip: true },
  { id: 'rug', name: 'Red rug', tab: 'furniture', shelf: 'rugs', w: 3, h: 2, block: 'none', flat: true },
  { id: 'roundrug', name: 'Round rug', tab: 'furniture', shelf: 'rugs', w: 2, h: 2, block: 'none', flat: true },
  { id: 'runner', name: 'Long rug', tab: 'furniture', shelf: 'rugs', w: 1, h: 3, block: 'none', flat: true },

  // Lights
  { id: 'lamppost', name: 'Lamppost', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'post', light: { color: 0xffc47a, radius: 120, intensity: 1.7, day: 0.15, y: 34 } },
  { id: 'lantern', name: 'Stone lantern', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'post', light: { color: 0xffb060, radius: 90, intensity: 1.5, day: 0.2, y: 14, flicker: true } },
  { id: 'torch', name: 'Torch', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'post', light: { color: 0xff9444, radius: 110, intensity: 1.8, day: 0.3, y: 24, flicker: true } },
  { id: 'campfire', name: 'Campfire', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'full', light: { color: 0xff8a3a, radius: 140, intensity: 2.1, day: 0.35, y: 6, flicker: true } },
  { id: 'brazier', name: 'Brazier', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'post', light: { color: 0xff9444, radius: 140, intensity: 2, day: 0.3, y: 16, flicker: true } },
  { id: 'crystal', name: 'Rune crystal', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'post', light: { color: 0x9a6cff, radius: 100, intensity: 1.6, day: 0.45, y: 10 } },
  { id: 'candelabra', name: 'Candelabra', tab: 'light', shelf: 'lamps', w: 1, h: 1, block: 'post', light: { color: 0xffc070, radius: 90, intensity: 1.5, day: 0.25, y: 22, flicker: true } },
  { id: 'mushlamp', name: 'Mushroom lamp', tab: 'light', shelf: 'lamps', w: 1, h: 1, block: 'post', light: { color: 0xffa898, radius: 64, intensity: 1.1, day: 0.25, y: 10 } },
  { id: 'fairylights', name: 'Firefly jar', tab: 'light', shelf: 'lamps', w: 1, h: 1, block: 'post', light: { color: 0xc8ff7a, radius: 70, intensity: 1.2, day: 0.2, y: 8 } },
  { id: 'floorlamp', name: 'Floor lamp', tab: 'light', shelf: 'lamps', w: 1, h: 1, block: 'post', light: { color: 0xffd090, radius: 100, intensity: 1.5, day: 0.2, y: 30 } },
  { id: 'paperlanterns', name: 'Paper lanterns', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'post', light: { color: 0xff9a7a, radius: 100, intensity: 1.5, day: 0.25, y: 28 } },
  { id: 'candles', name: 'Candles', tab: 'light', shelf: 'lamps', w: 1, h: 1, block: 'none', light: { color: 0xffb468, radius: 70, intensity: 1.3, day: 0.25, y: 6, flicker: true } },
  { id: 'hooklantern', name: 'Hook lantern', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'post', flip: true, light: { color: 0xffb060, radius: 100, intensity: 1.6, day: 0.2, y: 28, flicker: true } },
  // Wards: moonlit lanterns no creature will rise near, from a wayfarer's crook to a beacon that keeps a whole glade.
  { id: 'wardlamp', name: 'Ward lantern', tab: 'light', shelf: 'wards', w: 1, h: 1, block: 'post', ward: 6, light: { color: 0x9ee4ff, radius: 90, intensity: 1.4, day: 0.25, y: 24 } },
  { id: 'wardstone', name: 'Warden stone', tab: 'light', shelf: 'wards', w: 1, h: 1, block: 'post', ward: 10, light: { color: 0x7af0e0, radius: 110, intensity: 1.6, day: 0.3, y: 18 } },
  { id: 'wardbeacon', name: 'Sanctuary beacon', tab: 'light', shelf: 'wards', w: 2, h: 2, block: 'full', ward: 20, light: { color: 0xb4e8ff, radius: 170, intensity: 2.1, day: 0.35, y: 38 } },

  // Wall decor
  { id: 'painting', name: 'Painting', tab: 'decor', shelf: 'frames', w: 1, h: 1, block: 'none', wall: true, flip: true },
  { id: 'portrait', name: 'Portrait', tab: 'decor', shelf: 'frames', w: 1, h: 1, block: 'none', wall: true },
  { id: 'banner', name: 'Banner', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true },
  { id: 'shield', name: 'Crest shield', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true },
  { id: 'antlers', name: 'Antlers', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true },
  { id: 'wallshelf', name: 'Wall shelf', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true, flip: true },
  { id: 'sconce', name: 'Wall sconce', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true, light: { color: 0xffb060, radius: 90, intensity: 1.5, day: 0.25, y: 0, flicker: true } },
  { id: 'wreath', name: 'Wreath', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true },
  { id: 'mirror', name: 'Mirror', tab: 'decor', shelf: 'frames', w: 1, h: 1, block: 'none', wall: true },
  { id: 'cuckoo', name: 'Cuckoo clock', tab: 'decor', shelf: 'frames', w: 1, h: 1, block: 'none', wall: true },
  { id: 'oldmap', name: 'Old map', tab: 'decor', shelf: 'frames', w: 1, h: 1, block: 'none', wall: true, flip: true },
  { id: 'hangplant', name: 'Hanging plant', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true, flip: true },
  { id: 'garland', name: 'Star garland', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true, light: { color: 0xffe6a0, radius: 60, intensity: 1, day: 0.2, y: 0 } },
  { id: 'tapestry', name: 'Tapestry', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true, flip: true },

  // ---- The garden's later plants (art/homeBloom.ts).
  { id: 'hydrangea', name: 'Hydrangea', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post', flip: true },
  { id: 'bamboo', name: 'Bamboo', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post', flip: true },
  { id: 'topiary', name: 'Topiary', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post' },
  { id: 'lemontree', name: 'Lemon tree', tab: 'garden', shelf: 'trees', w: 1, h: 1, block: 'post', flip: true },
  { id: 'foxgloves', name: 'Foxgloves', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'none', flip: true },
  { id: 'daisies', name: 'Daisies', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'none', flip: true },
  { id: 'poppies', name: 'Poppies', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'none', flip: true },
  { id: 'toadstools', name: 'Toadstools', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'none', flip: true },
  { id: 'herbbed', name: 'Herb bed', tab: 'garden', shelf: 'flowers', w: 2, h: 1, block: 'full' },
  { id: 'urn', name: 'Flower urn', tab: 'garden', shelf: 'flowers', w: 1, h: 1, block: 'post' },
  { id: 'lotus', name: 'Lotus', tab: 'garden', shelf: 'water', w: 1, h: 1, block: 'none', water: 'only', flip: true },
  { id: 'trellis', name: 'Rose trellis', tab: 'garden', shelf: 'ornaments', w: 1, h: 1, block: 'post', flip: true },

  // ---- The yard's later pieces (art/homeGarden.ts).
  { id: 'sundial', name: 'Sundial', tab: 'garden', shelf: 'ornaments', w: 1, h: 1, block: 'post' },
  { id: 'angel', name: 'Angel statue', tab: 'garden', shelf: 'ornaments', w: 1, h: 1, block: 'post', flip: true },
  { id: 'windmill', name: 'Garden windmill', tab: 'garden', shelf: 'ornaments', w: 1, h: 1, block: 'post', flip: true },
  { id: 'chimes', name: 'Wind chimes', tab: 'garden', shelf: 'ornaments', w: 1, h: 1, block: 'post', flip: true },
  { id: 'pergola', name: 'Pergola', tab: 'garden', shelf: 'ornaments', w: 2, h: 2, block: 'none' },
  { id: 'pump', name: 'Water pump', tab: 'garden', shelf: 'water', w: 1, h: 1, block: 'post', flip: true },
  { id: 'birdfeeder', name: 'Bird feeder', tab: 'garden', shelf: 'yard', w: 1, h: 1, block: 'post', flip: true },
  { id: 'picnic', name: 'Picnic table', tab: 'garden', shelf: 'yard', w: 2, h: 1, block: 'full' },
  { id: 'hammock', name: 'Hammock', tab: 'garden', shelf: 'yard', w: 2, h: 1, block: 'full' },
  { id: 'bistro', name: 'Bistro set', tab: 'garden', shelf: 'yard', w: 2, h: 1, block: 'full' },
  { id: 'logpile', name: 'Log pile', tab: 'garden', shelf: 'yard', w: 2, h: 1, block: 'full', flip: true },
  { id: 'flowercart', name: 'Flower cart', tab: 'garden', shelf: 'yard', w: 2, h: 1, block: 'full', flip: true },

  // ---- The house's later furniture (art/homeHouse.ts).
  { id: 'counter', name: 'Kitchen counter', tab: 'furniture', shelf: 'kitchen', w: 2, h: 1, block: 'full', flip: true },
  { id: 'sink', name: 'Kitchen sink', tab: 'furniture', shelf: 'kitchen', w: 1, h: 1, block: 'full' },
  { id: 'hutch', name: 'Dish hutch', tab: 'furniture', shelf: 'kitchen', w: 2, h: 1, block: 'full' },
  { id: 'teacart', name: 'Tea cart', tab: 'furniture', shelf: 'kitchen', w: 1, h: 1, block: 'post', flip: true },
  { id: 'vanity', name: 'Vanity', tab: 'furniture', shelf: 'bedroom', w: 2, h: 1, block: 'full', flip: true },
  { id: 'rockinghorse', name: 'Rocking horse', tab: 'furniture', shelf: 'bedroom', w: 1, h: 1, block: 'post', flip: true },
  { id: 'bunkbed', name: 'Bunk bed', tab: 'furniture', shelf: 'bedroom', w: 1, h: 2, block: 'full' },
  { id: 'easel', name: 'Easel', tab: 'furniture', shelf: 'study', w: 1, h: 1, block: 'post', flip: true },
  { id: 'bookstacks', name: 'Book stacks', tab: 'furniture', shelf: 'study', w: 1, h: 1, block: 'post', flip: true },
  { id: 'gramophone', name: 'Gramophone', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'post', flip: true },
  { id: 'monstera', name: 'Monstera', tab: 'furniture', shelf: 'living', w: 1, h: 1, block: 'post', flip: true },
  { id: 'screen', name: 'Folding screen', tab: 'furniture', shelf: 'living', w: 2, h: 1, block: 'full' },

  // ---- Later lights and wall decor (art/homeTrim.ts).
  { id: 'moonlamp', name: 'Moon lamp', tab: 'light', shelf: 'lamps', w: 1, h: 1, block: 'post', light: { color: 0xcfe2ff, radius: 90, intensity: 1.4, day: 0.3, y: 20 } },
  { id: 'tiffany', name: 'Tiffany lamp', tab: 'light', shelf: 'lamps', w: 1, h: 1, block: 'post', light: { color: 0xffb870, radius: 80, intensity: 1.4, day: 0.2, y: 23 } },
  { id: 'stringlights', name: 'String lights', tab: 'light', shelf: 'outdoor', w: 2, h: 1, block: 'post', light: { color: 0xffd890, radius: 110, intensity: 1.4, day: 0.2, y: 20 } },
  { id: 'pathlight', name: 'Path light', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'none', light: { color: 0xffe2a0, radius: 56, intensity: 1.1, day: 0.15, y: 8 } },
  { id: 'starlantern', name: 'Star lantern', tab: 'light', shelf: 'outdoor', w: 1, h: 1, block: 'post', flip: true, light: { color: 0xfff0b0, radius: 100, intensity: 1.5, day: 0.25, y: 24 } },
  { id: 'bunting', name: 'Bunting', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true, flip: true },
  { id: 'plates', name: 'Plate rack', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true },
  { id: 'herbs', name: 'Dried herbs', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true, flip: true },
  { id: 'pans', name: 'Copper pans', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true, flip: true },
  { id: 'windowbox', name: 'Window box', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true, flip: true },
  { id: 'dreamcatcher', name: 'Dreamcatcher', tab: 'decor', shelf: 'hangings', w: 1, h: 1, block: 'none', wall: true },
  { id: 'sunmirror', name: 'Sunburst mirror', tab: 'decor', shelf: 'frames', w: 1, h: 1, block: 'none', wall: true },
  { id: 'hoop', name: 'Embroidery hoop', tab: 'decor', shelf: 'frames', w: 1, h: 1, block: 'none', wall: true, flip: true },
];

/** Critters living in a Home: most at once, so a phone keeps its frame rate. */
export const MAX_CRITTERS = 16;

/** The part a critter is let out as. */
export const critterPart = (id: string): string => `critter_${id}`;

// One part a critter, on the Critters tab. Flyers can be let out over the pond, and so can the frog.
PARTS.push(
  ...CRITTERS.map((c): PartDef => ({
    id: critterPart(c.id),
    name: c.name,
    tab: 'critters',
    shelf: 'critters',
    w: 1,
    h: 1,
    block: 'none',
    critter: c.id,
    water: c.gait === 'fly' || c.gait === 'hop' || c.id === 'axolotl' ? 'too' : undefined,
  })),
);

const byId = new Map(PARTS.map((p) => [p.id, p]));
export const partById = (id: string): PartDef | undefined => byId.get(id);

/** A part's footprint in cells when turned `turn` quarter turns: a side view lies the other way. */
export const extent = (p: PartDef, turn = 0): { w: number; h: number } => (p.turns && turn % 2 ? { w: p.h, h: p.w } : { w: p.w, h: p.h });
