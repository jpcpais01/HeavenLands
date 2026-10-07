// What each update brings, newest first. Every build carries this list and
// the build also publishes it as notes.json (scripts/pwa.ts), so a game
// still running an older build can fetch it, see a newer `v` than its own,
// and show what's coming before the player updates (updates.ts).
//
// Adding a note: put a new entry at the top with `v` one higher than the
// last, today's date, a short title and a line or two per change, written
// for players (what they'll see, not how it's built). The pixel font has
// capitals, digits and . , : - ! ? ' / + ( ) % = * only.

export interface PatchNote {
  /** Counts up by one per noted update; a game knows it's behind when notes.json has a higher one. */
  v: number;
  date: string;
  title: string;
  notes: string[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    v: 4,
    date: '2026-10-07',
    title: 'Take a seat',
    notes: [
      'Sitting looks right now: on a bench, chair or sofa your legs bend over the edge with your feet hanging, and sitting on the ground crosses your legs, whatever you wear.',
    ],
  },
  {
    v: 3,
    date: '2026-10-07',
    title: 'A cleaner profile',
    notes: ['Wanderers seen from the side no longer have the odd pixel by the face that looked like a nose or lips.'],
  },
  {
    v: 2,
    date: '2026-10-07',
    title: 'Sand and showers',
    notes: [
      'A new endless land, Sunsong Dunes: golden dunes, oases with palms and lotus pools, caravan camps with camels, red rock arches and old ruins.',
      'Soft showers now pass over the open places now and then, the same for friends together, with a rainbow after.',
    ],
  },
  {
    v: 1,
    date: '2026-10-07',
    title: 'First light',
    notes: [
      'A heavenly light over every place: brighter days, soft glowing edges, drifting sunbeams and silver nights.',
      'The rustling leaves are gone from the ambience, and the wind is gentler.',
      '74 new things to wear and 24 ready-made outfits in the wardrobe.',
      'Footsteps that sound like the ground underfoot.',
      '27 companions to choose from the title screen, five of them new.',
      '49 new decorations, and a build tray sorted into sections and shelves.',
      'Hugs, bows, claps and sky lanterns, and a photo mode.',
      'Pastimes: sit on benches, sleep in beds, jam on lute, piano or harp, stargaze for 12 constellations, keep bees and forage 14 finds, with 11 new dishes to cook.',
      "From now on you'll see what each update brings before you update.",
    ],
  },
];

/** The newest note this build carries. */
export const BUILD_NOTE = PATCH_NOTES[0].v;
