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
    v: 8,
    date: '2026-10-11',
    title: 'Little things, put right',
    notes: [
      'Cloud saves are safer: a slow or missed check when the game opens can no longer send an older save over a newer one from another device, and an account is never written over before you choose which wanderer to keep.',
      'No more potions on the hotbar: its slots are for your dishes, and every dish can be eaten now, even plain soups and bread.',
      'Lotus roots and glowcaps can be found again (lotus by the dunes\' oases and in the Everwood, glowcaps in the Everwood and Lumen Meadow), so the Deep Garden Stir-fry can be cooked. Mint grows in the dunes too.',
      'Cloudrest and Hearthhome show their own names when you arrive.',
      'Pastimes: travelling from the map while seated no longer pulls you back to the seat; E always gets you up, even by the stove; nothing stirs you in bed; waking keeps the morning; and Esc closes the lute or the telescope without opening the pause menu.',
      'The update card waits for a quiet moment instead of showing mid-play, and its keys no longer reach the screen beneath.',
      'Endless lands: no walking through big things near the edge of an area, swaying trees\' glows and shadows sway with them, and mirrored props stand where they are drawn. Their big maps fill faster.',
      'I and G no longer open an empty bag, and the title\'s Atlas key is A (M mutes).',
    ],
  },
  {
    v: 7,
    date: '2026-10-11',
    title: 'Friends and building, mended',
    notes: [
      'When the friend who opened a shared world leaves, whoever takes over now keeps it saved, so nothing built after is lost.',
      'A big garden no longer cuts off the host when a friend joins.',
      'Joining a room from inside a place no longer mixes the old place\'s builds or farm with the new one.',
      'A full shared world says so, instead of opening a second copy beside it.',
      'Friends\' lute tunes are heard after inviting them, and a dropped connection can be reopened properly.',
      'Building: a stroke cut short (Esc, Done) is kept and can be undone; doors no longer vanish after a friend\'s changes; let-out critters can be erased again.',
      'Lotus can float on any water, crops can\'t be walled or tented over, taking up a pond takes its lily pads, and floors redraw round new walls everywhere.',
    ],
  },
  {
    v: 6,
    date: '2026-10-07',
    title: 'Build anywhere, together',
    notes: [
      'You can build everywhere now: Hearthhome, the Everwood, Cloudrest, Starwatch and every endless land. Whatever you build in a place is kept, always.',
      'Friends: one Friends button in every place. Invite friends right where you stand, join a friend with their code, and turn on Friends can build to let them build, plant and tidy like you.',
      'Shared worlds: once you invite friends to a place it stays theirs to visit. It shows under Friends\' worlds, and they can open it any time, even while you\'re away. What they build is kept for you too.',
      'Opening a shared world while friends are playing in it takes you straight to them.',
    ],
  },
  {
    v: 5,
    date: '2026-10-07',
    title: 'Starry nights',
    notes: [
      'Starwatch is reborn: a calm little isle in the night sky with a star terrace, lanterns, a telescope, blankets on the grass and a pond full of stars. Shooting stars fall all the time, and every few minutes a meteor shower lights the sky, the same for friends together.',
      'Glimmerdeep and the Sunken Garden are gone from the Atlas.',
      'The Everwood\'s minimap is now the same as everywhere else, and its big map opens much faster and remembers what it has drawn.',
    ],
  },
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
