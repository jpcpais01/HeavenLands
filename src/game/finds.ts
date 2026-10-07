// Finds: the good things lying about each place for whoever wanders by,
// picked up with E (see heaven/pastimes/forage.ts), and the honey the
// beehives make (heaven/pastimes/hives.ts). They go in the pantry as
// `find.<id>` and are cooked with the farm's produce and the pond's fish
// (see recipes.ts). Each place has its own: chanterelles in the Everwood,
// clams on Glowtide Shore, pink salt on Saltglass Flats, snowberries in
// Hushfall...

export interface FindDef {
  id: string;
  /** For one and for several ("Clam", "Clams"). */
  one: string;
  many: string;
  /** The arenas it lies about in, and how common it is there (relative). */
  places: Record<string, number>;
  /** Its colour, for the pop, the sparkle and the cookbook. */
  tint: number;
  /** It glows, softly, and more by night. */
  glow?: boolean;
  /** Only out after dusk (or only by day). */
  when?: 'night' | 'day';
}

export const FINDS: FindDef[] = [
  { id: 'honey', one: 'Honey', many: 'Honey', places: {}, tint: 0xffc23a },
  { id: 'chanterelle', one: 'Chanterelle', many: 'Chanterelles', places: { forest: 3 }, tint: 0xf4a632 },
  { id: 'mint', one: 'Wild mint', many: 'Wild mint', places: { forest: 2, garden: 3 }, tint: 0x7ad88a },
  { id: 'clam', one: 'Clam', many: 'Clams', places: { shore: 3 }, tint: 0xe8c8b4 },
  { id: 'kelp', one: 'Sea kelp', many: 'Sea kelp', places: { shore: 2 }, tint: 0x5aa86a },
  { id: 'salt', one: 'Pink salt', many: 'Pink salt', places: { saltflats: 1 }, tint: 0xffb8c8 },
  { id: 'snowberry', one: 'Snowberry', many: 'Snowberries', places: { hushfall: 3 }, tint: 0xe8f4ff },
  { id: 'pinecone', one: 'Pine nuts', many: 'Pine nuts', places: { hushfall: 2, forest: 1 }, tint: 0xb07a48 },
  { id: 'glowpetal', one: 'Glowpetal', many: 'Glowpetals', places: { lumen: 3 }, tint: 0x9ae8ff, glow: true },
  { id: 'lumenberry', one: 'Lumenberry', many: 'Lumenberries', places: { lumen: 2 }, tint: 0x7a8cff, glow: true, when: 'night' },
  { id: 'cloudberry', one: 'Cloudberry', many: 'Cloudberries', places: { island: 1 }, tint: 0xffa860 },
  { id: 'lotus', one: 'Lotus root', many: 'Lotus roots', places: { garden: 2 }, tint: 0xf0b8c8 },
  { id: 'glowcap', one: 'Glowcap', many: 'Glowcaps', places: { deep: 1 }, tint: 0x6affc8, glow: true },
  { id: 'starsugar', one: 'Star sugar', many: 'Star sugar', places: { cosmos: 1 }, tint: 0xfff2a8, glow: true },
];

export const findById = (id: string): FindDef | undefined => FINDS.find((f) => f.id === id);

/** A find's pantry key. */
export const findKey = (id: string): string => `find.${id}`;

/** What can be found in `arena` now, with how common each is. */
export function findsIn(arena: string, night: boolean): { def: FindDef; weight: number }[] {
  return FINDS.filter((f) => f.places[arena] && (!f.when || (f.when === 'night') === night)).map((def) => ({ def, weight: def.places[arena] }));
}
