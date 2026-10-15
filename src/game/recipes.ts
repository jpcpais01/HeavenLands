// The recipes the kitchen knows (see cooking.ts for cooking and eating them,
// and art/farm.ts for each dish's picture): what goes in, what it does.

import type { BuffDef } from './buffs';

/** What goes in: so many of a crop, of a fish (a kind, any, a rare one, or one that glows), or of a find (finds.ts: forage and honey). */
export type Ingredient = { crop: string; n: number } | { fish: string | 'any' | 'rare' | 'glow'; n: number } | { find: string; n: number };

export interface RecipeDef {
  id: string;
  name: string;
  /** What it does, short, for the cookbook and the hotbar's card. */
  does: string;
  /** A line about it. */
  line: string;
  needs: Ingredient[];
  /** Health restored at once, as a share of the most. */
  heal?: number;
  /** Special energy given (the moon broth). */
  energy?: number;
  /** A buff it gives (its icon is the dish). */
  buff?: Omit<BuffDef, 'icon' | 'id'>;
  tint: number;
  /** Made at the juice press rather than the stove or the pot. */
  at?: 'juicer';
}

const SEC = 1000;

export const RECIPES: RecipeDef[] = [
  { id: 'soup', name: 'Carrot Soup', does: 'Heals 40%', line: 'Sweet, golden and steaming.', needs: [{ crop: 'carrot', n: 3 }], heal: 0.4, tint: 0xff9a3a },
  { id: 'potato', name: 'Baked Potato', does: 'Heals 35%, tougher 60s', line: 'Crackling skin, butter melting in.', needs: [{ crop: 'potato', n: 2 }], heal: 0.35, buff: { name: 'Hearty', tint: 0xe8c080, duration: 60 * SEC, mods: { guard: 0.85 } }, tint: 0xd8b070 },
  { id: 'bread', name: 'Fresh Bread', does: 'Heals 55%', line: 'Still warm from the oven.', needs: [{ crop: 'wheat', n: 3 }], heal: 0.55, tint: 0xe0a860 },
  { id: 'salad', name: 'Garden Salad', does: 'Mends 4/s and swifter 30s', line: 'Crisp from the bed this morning.', needs: [{ crop: 'tomato', n: 1 }, { crop: 'cabbage', n: 1 }, { crop: 'carrot', n: 1 }], buff: { name: 'Fresh', tint: 0x9ad870, duration: 30 * SEC, mods: { regen: 4, speed: 1.1 } }, tint: 0x9ad870 },
  { id: 'grilled', name: 'Grilled Fish', does: 'Heals 45%', line: 'Charred skin and a squeeze of lemon.', needs: [{ fish: 'any', n: 1 }], heal: 0.45, tint: 0xffc070 },
  { id: 'stew', name: "Fisher's Stew", does: 'Heals 30%, much tougher 90s', line: 'Thick enough to stand a spoon in.', needs: [{ fish: 'any', n: 2 }, { crop: 'potato', n: 1 }, { crop: 'carrot', n: 1 }], heal: 0.3, buff: { name: 'Stout', tint: 0xc89a6a, duration: 90 * SEC, mods: { guard: 0.75 } }, tint: 0xc8805a },
  { id: 'chowder', name: 'Corn Chowder', does: 'Heals 25%, mends 3/s 90s', line: 'Creamy, sweet and smoky.', needs: [{ crop: 'corn', n: 2 }, { crop: 'potato', n: 1 }, { fish: 'any', n: 1 }], heal: 0.25, buff: { name: 'Cosy', tint: 0xffe08a, duration: 90 * SEC, mods: { regen: 3 } }, tint: 0xffd84a },
  { id: 'tart', name: 'Strawberry Tart', does: 'Much swifter 90s', line: 'Berries shining on golden pastry.', needs: [{ crop: 'strawberry', n: 3 }, { crop: 'wheat', n: 2 }], heal: 0.15, buff: { name: 'Sugar Rush', tint: 0xff7a9a, duration: 90 * SEC, mods: { speed: 1.25 } }, tint: 0xff5a7a },
  { id: 'pie', name: 'Pumpkin Pie', does: 'Hits harder 120s', line: 'Spiced, and gone in a moment.', needs: [{ crop: 'pumpkin', n: 1 }, { crop: 'wheat', n: 2 }, { crop: 'strawberry', n: 1 }], heal: 0.2, buff: { name: 'Well Fed', tint: 0xf08a30, duration: 120 * SEC, mods: { damage: 1.2 } }, tint: 0xf07a20 },
  { id: 'curry', name: 'Ember Curry', does: 'Hits much harder 90s', line: 'It glows in the bowl. Mind your tongue.', needs: [{ crop: 'emberpepper', n: 2 }, { crop: 'tomato', n: 1 }, { fish: 'rare', n: 1 }], buff: { name: 'Fire Belly', tint: 0xff6a2a, duration: 90 * SEC, mods: { damage: 1.35 } }, tint: 0xff5a2a },
  { id: 'broth', name: 'Moonlight Broth', does: 'Fills the Special half, mends', line: 'Pale and still as a pond at midnight.', needs: [{ crop: 'moonbloom', n: 1 }, { crop: 'cabbage', n: 1 }, { fish: 'glow', n: 1 }], energy: 50, buff: { name: 'Moonlit Calm', tint: 0xa8d8ff, duration: 60 * SEC, mods: { regen: 3 } }, tint: 0xa8d8ff },
  { id: 'feast', name: 'Goldmaw Feast', does: 'Heals all, everything better 3 min', line: 'A feast fit for the old king of the pond.', needs: [{ fish: 'goldmaw', n: 1 }, { crop: 'pumpkin', n: 1 }, { crop: 'corn', n: 2 }, { crop: 'moonbloom', n: 1 }], heal: 1, buff: { name: 'Feast of Kings', tint: 0xffd060, duration: 180 * SEC, mods: { speed: 1.15, damage: 1.2, guard: 0.85, regen: 2 } }, tint: 0xffd060 },

  // Heaven Lands' kitchen: what's found wandering, and the beehives' honey, with the garden's produce.
  { id: 'honeycake', name: 'Honey Cake', does: 'Swifter 2 min', line: 'Soft, golden, sticky at the edges.', needs: [{ find: 'honey', n: 2 }, { crop: 'wheat', n: 2 }], buff: { name: 'Sweet Tooth', tint: 0xffc23a, duration: 120 * SEC, mods: { speed: 1.15 } }, tint: 0xffc23a },
  { id: 'minttea', name: 'Mint Tea', does: 'Swifter 90s', line: 'Fresh leaves, a spoon of honey.', needs: [{ find: 'mint', n: 2 }, { find: 'honey', n: 1 }], buff: { name: 'Refreshed', tint: 0x7ad88a, duration: 90 * SEC, mods: { speed: 1.12 } }, tint: 0x7ad88a },
  { id: 'mushsoup', name: 'Chanterelle Soup', does: 'Swifter 2 min', line: 'Earthy, buttery, and smells of the woods.', needs: [{ find: 'chanterelle', n: 3 }, { crop: 'potato', n: 1 }], buff: { name: 'Woodland Warmth', tint: 0xf4a632, duration: 120 * SEC, mods: { speed: 1.12 } }, tint: 0xf4a632 },
  { id: 'clamchowder', name: 'Clam Chowder', does: 'Swifter 3 min', line: 'Creamy, with the sea in every spoon.', needs: [{ find: 'clam', n: 3 }, { crop: 'potato', n: 1 }, { find: 'salt', n: 1 }], buff: { name: 'Sea Breeze', tint: 0xe8d8c0, duration: 180 * SEC, mods: { speed: 1.15 } }, tint: 0xf0e0c0 },
  { id: 'kelprolls', name: 'Kelp Rolls', does: 'Much swifter 90s', line: 'Rice and fish, wrapped in the tide.', needs: [{ find: 'kelp', n: 2 }, { fish: 'any', n: 1 }, { find: 'salt', n: 1 }], buff: { name: 'Tideborne', tint: 0x5aa86a, duration: 90 * SEC, mods: { speed: 1.22 } }, tint: 0x5aa86a },
  { id: 'snowtart', name: 'Snowberry Tart', does: 'Swifter 3 min', line: 'Tart berries, frosted like the vale.', needs: [{ find: 'snowberry', n: 3 }, { crop: 'wheat', n: 1 }, { find: 'honey', n: 1 }], buff: { name: 'Frost Sparkle', tint: 0xd8ecff, duration: 180 * SEC, mods: { speed: 1.15 } }, tint: 0xe8f4ff },
  { id: 'pineloaf', name: 'Pine Nut Loaf', does: 'Swifter 4 min', line: 'Dense and nutty, for a long walk.', needs: [{ find: 'pinecone', n: 2 }, { crop: 'wheat', n: 2 }], buff: { name: 'Trail Ready', tint: 0xb07a48, duration: 240 * SEC, mods: { speed: 1.1 } }, tint: 0xc08a50 },
  { id: 'glowtea', name: 'Glowpetal Tea', does: 'Much swifter 2 min', line: 'It shines in the cup like the meadow at night.', needs: [{ find: 'glowpetal', n: 2 }, { find: 'lumenberry', n: 1 }, { find: 'honey', n: 1 }], buff: { name: 'Moonlit Step', tint: 0x9ae8ff, duration: 120 * SEC, mods: { speed: 1.25 } }, tint: 0x9ae8ff },
  { id: 'pancakes', name: 'Cloudberry Pancakes', does: 'Swifter 3 min', line: 'A tall stack, light as the isle they came from.', needs: [{ find: 'cloudberry', n: 3 }, { crop: 'wheat', n: 2 }, { find: 'honey', n: 1 }], buff: { name: 'Light as Air', tint: 0xffa860, duration: 180 * SEC, mods: { speed: 1.18 } }, tint: 0xffa860 },
  { id: 'stirfry', name: 'Deep Garden Stir-fry', does: 'Much swifter 2 min', line: 'Crisp lotus and glowcaps, tossed hot.', needs: [{ find: 'glowcap', n: 2 }, { find: 'lotus', n: 2 }], buff: { name: 'Glimmer', tint: 0x6affc8, duration: 120 * SEC, mods: { speed: 1.22 } }, tint: 0x6affc8 },
  { id: 'stardrops', name: 'Star Sugar Drops', does: 'Much swifter 3 min', line: 'Little sweets that fell from the sky.', needs: [{ find: 'starsugar', n: 2 }, { find: 'honey', n: 1 }], buff: { name: 'Starstruck', tint: 0xfff2a8, duration: 180 * SEC, mods: { speed: 1.25 } }, tint: 0xfff2a8 },

  // The juice press's juices: produce and finds pressed cold, a sip for the road.
  { id: 'carrotjuice', at: 'juicer', name: 'Carrot Juice', does: 'Swifter 2 min', line: 'Sweet, bright orange and very good for you.', needs: [{ crop: 'carrot', n: 3 }], buff: { name: 'Sunny Sip', tint: 0xff9a3a, duration: 120 * SEC, mods: { speed: 1.1 } }, tint: 0xff9a3a },
  { id: 'tomatojuice', at: 'juicer', name: 'Tomato Juice', does: 'Swifter 2 min', line: 'Red and savoury, a pinch of pink salt on top.', needs: [{ crop: 'tomato', n: 3 }, { find: 'salt', n: 1 }], buff: { name: 'Garden Zing', tint: 0xf04a3a, duration: 120 * SEC, mods: { speed: 1.12 } }, tint: 0xf05a46 },
  { id: 'greenjuice', at: 'juicer', name: 'Green Juice', does: 'Swifter 3 min', line: 'Cabbage, carrot and wild mint. Tastes like a garden.', needs: [{ crop: 'cabbage', n: 1 }, { crop: 'carrot', n: 1 }, { find: 'mint', n: 1 }], buff: { name: 'Green Glow', tint: 0x8ad86a, duration: 180 * SEC, mods: { speed: 1.12 } }, tint: 0x8ad86a },
  { id: 'smoothie', at: 'juicer', name: 'Strawberry Smoothie', does: 'Much swifter 90s', line: 'Thick and pink, with a spoon of honey.', needs: [{ crop: 'strawberry', n: 3 }, { find: 'honey', n: 1 }], buff: { name: 'Berry Bounce', tint: 0xff6a8a, duration: 90 * SEC, mods: { speed: 1.22 } }, tint: 0xff7a96 },
  { id: 'sunrise', at: 'juicer', name: 'Sunrise Juice', does: 'Swifter 3 min', line: 'Carrot and strawberry poured in two layers, like the morning sky.', needs: [{ crop: 'carrot', n: 2 }, { crop: 'strawberry', n: 2 }], buff: { name: 'Daybreak', tint: 0xffa860, duration: 180 * SEC, mods: { speed: 1.15 } }, tint: 0xffa060 },
  { id: 'cider', at: 'juicer', name: 'Pumpkin Cider', does: 'Swifter 4 min', line: 'Pressed pumpkin and honey, spiced and cosy.', needs: [{ crop: 'pumpkin', n: 1 }, { find: 'honey', n: 1 }], buff: { name: 'Harvest Warmth', tint: 0xf08a30, duration: 240 * SEC, mods: { speed: 1.12 } }, tint: 0xe88a3a },
  { id: 'snowcooler', at: 'juicer', name: 'Snowberry Cooler', does: 'Swifter 3 min', line: 'Icy berries and mint, frost on the glass.', needs: [{ find: 'snowberry', n: 3 }, { find: 'mint', n: 1 }], buff: { name: 'Cool Breeze', tint: 0xd8ecff, duration: 180 * SEC, mods: { speed: 1.15 } }, tint: 0xcfe6ff },
  { id: 'nectar', at: 'juicer', name: 'Cloudberry Nectar', does: 'Much swifter 2 min', line: 'Golden, sweet and light as a cloud.', needs: [{ find: 'cloudberry', n: 3 }, { find: 'honey', n: 1 }], buff: { name: 'Cloud Skip', tint: 0xffb86a, duration: 120 * SEC, mods: { speed: 1.2 } }, tint: 0xffb05a },
  { id: 'glowpunch', at: 'juicer', name: 'Glow Punch', does: 'Much swifter 3 min', line: 'It glows in the glass. Best sipped under the stars.', needs: [{ find: 'lumenberry', n: 2 }, { find: 'glowpetal', n: 1 }], buff: { name: 'Lumen Rush', tint: 0x9aa8ff, duration: 180 * SEC, mods: { speed: 1.25 } }, tint: 0x9aa8ff },
  { id: 'starfizz', at: 'juicer', name: 'Stardust Fizz', does: 'Much swifter 4 min', line: 'Star sugar fizzing in snowberry juice. It sparkles.', needs: [{ find: 'starsugar', n: 1 }, { find: 'snowberry', n: 2 }], buff: { name: 'Fizzy Stars', tint: 0xfff2a8, duration: 240 * SEC, mods: { speed: 1.25 } }, tint: 0xfff0b0 },
];

export const recipeById = (id: string): RecipeDef | undefined => RECIPES.find((r) => r.id === id);
