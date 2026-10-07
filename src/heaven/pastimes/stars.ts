// The constellations seen through the telescope (scenes/StarScene.ts): each
// a handful of stars in a 100 x 70 patch of sky and the lines that join them
// into a picture. Joining them all names it, and it's kept in the star chart
// (the pantry's `star.<id>`, so it's saved with everything else).

import { collection } from '../../game/collection';

export interface Constellation {
  id: string;
  name: string;
  line: string;
  stars: [number, number][];
  links: [number, number][];
}

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'teapot',
    name: 'The Teapot',
    line: 'Someone always leaves the kettle on up there.',
    stars: [[30, 32], [56, 30], [62, 52], [26, 54], [80, 22], [12, 42], [44, 18]],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [0, 5], [5, 3], [0, 6], [6, 1]],
  },
  {
    id: 'fox',
    name: 'The Sleeping Fox',
    line: 'Curled up nose to tail, it never wakes before dawn.',
    stars: [[18, 52], [34, 40], [54, 36], [70, 42], [76, 58], [58, 64], [38, 62], [80, 30]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [3, 7]],
  },
  {
    id: 'lantern',
    name: 'The Lantern',
    line: 'Hung on the dark for travellers who lose their way.',
    stars: [[50, 6], [50, 18], [36, 28], [64, 28], [64, 54], [36, 54], [50, 64]],
    links: [[0, 1], [1, 2], [1, 3], [2, 5], [3, 4], [4, 6], [5, 6]],
  },
  {
    id: 'boat',
    name: 'The Little Boat',
    line: 'It sails west all night, and is home by morning.',
    stars: [[18, 48], [82, 48], [70, 62], [30, 62], [50, 48], [50, 10], [74, 40]],
    links: [[0, 4], [4, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 4]],
  },
  {
    id: 'owl',
    name: 'The Owl',
    line: 'Two bright eyes, and it has seen everything.',
    stars: [[34, 12], [66, 12], [40, 28], [60, 28], [50, 40], [36, 62], [64, 62]],
    links: [[0, 2], [1, 3], [2, 4], [3, 4], [2, 5], [3, 6], [5, 6]],
  },
  {
    id: 'kite',
    name: 'The Kite',
    line: 'Let go one windy day, and it never came down.',
    stars: [[50, 4], [70, 24], [50, 44], [30, 24], [42, 56], [54, 66]],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [2, 4], [4, 5]],
  },
  {
    id: 'snail',
    name: 'The Snail',
    line: 'The slowest stars in the sky. They get there.',
    stars: [[42, 38], [50, 30], [60, 36], [56, 48], [40, 50], [30, 40], [72, 56], [18, 58], [82, 40]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [7, 6], [6, 8], [4, 7]],
  },
  {
    id: 'swans',
    name: 'The Two Swans',
    line: 'They meet in the middle, every night, and make a heart.',
    stars: [[50, 64], [28, 42], [24, 20], [40, 12], [50, 28], [60, 12], [76, 20], [72, 42]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]],
  },
  {
    id: 'harp',
    name: 'The Harp',
    line: 'On still nights the wind plays it, very quietly.',
    stars: [[26, 64], [26, 16], [44, 6], [68, 18], [76, 42], [50, 40]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [2, 5], [5, 0]],
  },
  {
    id: 'acorn',
    name: 'The Acorn',
    line: 'Plant it, and a forest of stars will grow.',
    stars: [[28, 30], [72, 30], [50, 16], [34, 44], [66, 44], [50, 66], [56, 4]],
    links: [[0, 2], [2, 1], [1, 0], [0, 3], [1, 4], [3, 5], [4, 5], [2, 6]],
  },
  {
    id: 'whale',
    name: 'The Whale',
    line: 'It swims the sea above the clouds, singing.',
    stars: [[12, 42], [32, 28], [58, 28], [78, 40], [68, 54], [36, 56], [90, 28], [92, 50], [30, 12]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [3, 6], [3, 7], [1, 8]],
  },
  {
    id: 'key',
    name: 'The Wishing Key',
    line: 'It opens nothing at all. Wish on it anyway.',
    stars: [[14, 36], [26, 24], [38, 36], [26, 48], [66, 36], [86, 36], [86, 48], [66, 46]],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [5, 6], [4, 7]],
  },
];

export const starKey = (id: string): string => `star.${id}`;
export const starFound = (id: string): boolean => collection.stock(starKey(id)) > 0;
export const starsFound = (): number => CONSTELLATIONS.filter((c) => starFound(c.id)).length;
export function findStar(id: string): void {
  if (!starFound(id)) collection.addStock(starKey(id), 1);
}
