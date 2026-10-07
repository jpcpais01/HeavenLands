// Sunsong Dunes' colours: the ground's kinds (see ../types.ts KindStyle) and
// the materials its props are drawn in. The sand runs from rust in the
// troughs to pale honey on the crests by day and goes silver-blue under the
// moon, where now and then a grain catches the starlight (its glow). The
// oasis water is turquoise by day, and holds the stars by night.

import { hex, type Material, type RGB } from '../../../art/pixel';
import type { KindStyle } from '../types';

const ramp = (...c: string[]): RGB[] => c.map(hex);

/** The ground's kinds, by index into DUNE_KINDS. */
export const K = {
  Sand: 0,
  Pan: 1,
  Damp: 2,
  Grass: 3,
  Water: 4,
  Pad: 5,
  Lotus: 6,
  Rock: 7,
  Flag: 8,
} as const;

const STARLIGHT: RGB = hex('#cfe0ff');
/** The singing sand's glint under the moon. */
const GLINT: RGB = hex('#ffe6b0');

export const DUNE_KINDS: KindStyle[] = [
  // Dune sand: deep rust in the shade of a slip face, honey on the windward slopes, nearly cream on the crests.
  {
    day: ramp('#7a4a2a', '#8f5832', '#a4683a', '#b87a44', '#c98d50', '#d8a05e', '#e4b26e', '#edc382', '#f4d398', '#f9e2b4'),
    night: ramp('#16172a', '#1c1e33', '#23263d', '#2b2f48', '#343a53', '#3e455f', '#49516b', '#555e78', '#626b84', '#707a92'),
    mid: 5,
    relief: 6,
    glow: GLINT,
    dither: 0.45,
  },
  // The hard pans between the dunes: rose clay, cracked.
  {
    day: ramp('#6e3e32', '#82503e', '#96614a', '#a87258', '#b88466', '#c69676', '#d2a788', '#dcb79a'),
    night: ramp('#18151f', '#1e1b27', '#25222f', '#2d2a38', '#353342', '#3e3c4c', '#484757', '#525262'),
    mid: 4,
    relief: 3,
    dither: 0.4,
  },
  // Damp sand round the water.
  {
    day: ramp('#5e3e26', '#6e4a2e', '#7f5836', '#90673f', '#a0764a', '#ae8556', '#bb9462'),
    night: ramp('#121522', '#171a29', '#1d2131', '#232839', '#2a3042', '#32394b', '#3b4255'),
    mid: 3,
    relief: 3,
    dither: 0.4,
  },
  // The oasis grass, green and soft.
  {
    day: ramp('#24401a', '#2f5220', '#3b6426', '#4a782e', '#5a8c36', '#6ea040', '#86b44c', '#a0c65e'),
    night: ramp('#0c1418', '#11191d', '#161f23', '#1c262a', '#232e31', '#2a3639', '#323f41', '#3b484a'),
    mid: 4,
    relief: 3,
    dither: 0.4,
  },
  // Oasis water: deep teal in the middle, turquoise over the shallows, a pale lip at the edge.
  {
    day: ramp('#0c4250', '#105464', '#166876', '#1e7e88', '#289498', '#38aaa6', '#50beb2', '#70d0c0', '#98e2d2', '#c6f2e6'),
    night: ramp('#040e1c', '#061424', '#08192c', '#0b2034', '#0f283e', '#143248', '#1a3c52', '#22485e', '#2c566a', '#386478'),
    mid: 0,
    relief: 0,
    glow: STARLIGHT,
    dither: 0.55,
  },
  // Lily pads.
  {
    day: ramp('#1e4018', '#285220', '#346628', '#427a32', '#528e3c', '#66a248'),
    night: ramp('#081614', '#0c1c19', '#11231f', '#172b26', '#1e332d', '#263c35'),
    mid: 2,
    relief: 2,
  },
  // Lotus flowers on the pads, pale pink.
  {
    day: ramp('#a84a6a', '#c86488', '#e086a2', '#f0a8bc', '#fbcad6', '#fff0f2'),
    night: ramp('#2a2236', '#352c44', '#423852', '#504662', '#5e5672', '#6e6682'),
    mid: 3,
    relief: 1,
  },
  // Sandstone, in the ground: outcrops and pebbles.
  {
    day: ramp('#4e2618', '#663422', '#7e442e', '#96563a', '#ac6a4a', '#c0805c', '#d09670', '#deac86'),
    night: ramp('#100f1a', '#161520', '#1d1c28', '#242431', '#2c2d3a', '#353744', '#3f424f', '#4a4e5b'),
    mid: 4,
    relief: 5,
  },
  // Old paving in the ruins, half lost under the sand.
  {
    day: ramp('#5a4234', '#6e5242', '#836452', '#977662', '#aa8a74', '#bc9e88', '#ccb09a', '#dac2ae'),
    night: ramp('#15141e', '#1b1a25', '#22212d', '#2a2936', '#33323f', '#3c3c49', '#464754', '#51525f'),
    mid: 4,
    relief: 4,
    dither: 0.3,
  },
];

// ---------------------------------------------------------------- props' materials

const m = (r: string[], outline: string, lit?: string, extra: Partial<Material> = {}): Material => ({ ramp: ramp(...r), outline: hex(outline), ...(lit ? { outlineLit: hex(lit) } : {}), ...extra });

// Date palms: a trunk of overlapping leaf bases, grey-green fronds, clusters of amber dates.
export const PALM_TRUNK = m(['#3a2618', '#4c3220', '#5e3f28', '#715032', '#85613e', '#98724a', '#aa8458'], '#1c1009', '#3a2618');
export const PALM_SCALE = m(['#2a1a10', '#3a2416', '#4c301e', '#5e3e28'], '#140b06', undefined, { noOutline: true });
export const FROND = m(['#1e3a24', '#28482c', '#345834', '#42683c', '#527a46', '#648c52', '#7a9e60', '#92b072'], '#0e1c10', '#1e3a24');
export const FROND_DRY = m(['#5a4224', '#705430', '#88683c', '#a07c4a', '#b8925a'], '#2a1e0e', undefined, { noOutline: true });
export const DATES = m(['#6a2a10', '#8c3a14', '#b0521c', '#d06e26', '#e88c36', '#f8ac52'], '#36140a', '#5a220c');
// Papyrus and reeds by the water, desert shrubs and dry grass on the sand.
export const REED = m(['#26401c', '#324f22', '#3f602a', '#4d7232', '#5e843c', '#729646', '#88a852'], '#121e0c', undefined, { noOutline: true });
export const PAPYRUS = m(['#4a6a2a', '#5c7e32', '#70923c', '#86a648', '#9cb856', '#b4ca6a'], '#22320e', undefined, { noOutline: true });
export const SHRUB = m(['#3a4232', '#48523c', '#586446', '#6a7652', '#7e8a60', '#94a072', '#aab486'], '#1c2016', '#3a4232');
export const TWIG = m(['#2c1e14', '#3c2a1c', '#4e3826', '#604630'], '#140d08', undefined, { noOutline: true });
export const DRYGRASS = m(['#6a4c22', '#82602c', '#9a7638', '#b28c46', '#c8a258', '#dab86e', '#e8cc8a'], '#32240e', undefined, { noOutline: true });
export const FLOWER = m(['#a8402a', '#c8583a', '#e0744c', '#f09466', '#fab688'], '#4a180c', undefined, { noOutline: true });
// Sandstone: banded red rock, its pale strata, the shade under overhangs.
export const SANDSTONE = m(['#4a2216', '#62301e', '#7a4028', '#925234', '#a86642', '#bc7a52', '#cc9064', '#daa67a', '#e6bc94'], '#24100a', '#4a2216');
export const STRATA = m(['#7a4a34', '#946048', '#ac785c', '#c29070', '#d4a886', '#e2be9e', '#eed2b6'], '#3a2216', '#6a3e2a');
export const DESERT_VARNISH = m(['#2a140e', '#3a1e14', '#4a281c'], '#140806', undefined, { noOutline: true });
// Carved stone in the ruins: a paler limestone gone honey with age.
export const LIMESTONE = m(['#5a4636', '#705a48', '#86705a', '#9c866e', '#b09c84', '#c4b09a', '#d4c2ae', '#e2d4c2', '#eee4d6'], '#2a2018', '#5a4636');
// Sand drifted against things.
export const SAND = m(['#a4683a', '#b87a44', '#c98d50', '#d8a05e', '#e4b26e', '#edc382', '#f4d398'], '#6a4024', '#8a5630');
// The caravan tent: striped wool in madder, indigo and cream, its poles, ropes and pegs.
export const MADDER = m(['#5a1a14', '#74221a', '#8e2e22', '#a83c2c', '#c04e38', '#d2644a', '#e07e62'], '#2a0c08', '#5a1a14');
export const INDIGO = m(['#141a3a', '#1c244c', '#262f5e', '#323c72', '#404c86', '#52609a', '#6676ae'], '#0a0c1e', '#141a3a');
export const WOOL = m(['#7a6a52', '#928066', '#aa967a', '#c0ac90', '#d4c2a6', '#e4d4ba', '#f0e4ce'], '#3a3024', '#6a5c46');
export const POLE = m(['#2c1c12', '#3e2a1a', '#523824', '#664830', '#7a583c'], '#140c06', '#2c1c12');
export const ROPE = m(['#6a5a40', '#8a7854'], '#3a3020', undefined, { noOutline: true, noAO: true });
export const TENT_GLOW = m(['#a0461a', '#c06024', '#de8034', '#f0a04a', '#fcc46c', '#ffe09a'], '#4a1e08', undefined, { emissive: 0.7, noAO: true });
// Brass lanterns with coloured glass, a teapot, cups.
export const BRASS = m(['#4a3010', '#6a481a', '#8c6426', '#b08436', '#d0a44c', '#e8c468', '#fce49a'], '#241606', undefined, { shine: true });
export const GLASS_AMBER = m(['#b0501a', '#d06e26', '#ec9036', '#fbb04c', '#ffd078', '#fff0b8'], '#4a1e08', undefined, { emissive: 0.95, noAO: true });
export const GLASS_ROSE = m(['#8a2a4a', '#a83a5e', '#c45276', '#dc6e90', '#ee94ae', '#fac0d0'], '#3a1020', undefined, { emissive: 0.85, noAO: true });
export const FLAME = m(['#ffd27a', '#fff0c0', '#ffffff'], '#3a1e08', undefined, { emissive: 1, noAO: true, noOutline: true });
// Rugs.
export const RUG_RED = m(['#4a1410', '#621c16', '#7c261c', '#963226', '#ae4232', '#c45640'], '#240806', undefined, { noOutline: true });
export const RUG_GOLD = m(['#6a4a16', '#8a6420', '#aa802c', '#c89c3c', '#e0b852'], '#32220a', undefined, { noOutline: true });
export const RUG_BLUE = m(['#14204a', '#1c2c5e', '#283a74', '#364a88', '#485e9c'], '#0a0e22', undefined, { noOutline: true });
export const RUG_CREAM = m(['#8a7a62', '#a8967a', '#c4b296', '#dccab0', '#ece0ca'], '#3a3226', undefined, { noOutline: true });
export const CUSHION = m(['#5a2a4a', '#74365e', '#8e4474', '#a8548a', '#c06ca0', '#d48ab6'], '#2a1022', '#5a2a4a');
// Clay jars.
export const CLAY = m(['#4a2216', '#62301e', '#7c4028', '#965234', '#ae6642', '#c27c54', '#d29468'], '#22100a', '#4a2216');
export const GLAZE = m(['#12404a', '#1a5460', '#226876', '#2e7e8a', '#40949e', '#5aaab0'], '#081e22', undefined, { shine: true });
// Camels: warm fawn coat, darker on the hump's shag and the knees, a woven saddle cloth.
export const CAMEL = m(['#4e3220', '#664228', '#7e5432', '#96683e', '#ac7c4c', '#c0905c', '#d0a470', '#dcb684'], '#24160c', '#4e3220');
export const CAMEL_DARK = m(['#2e1c12', '#3e2618', '#503220', '#62402a'], '#140c06', undefined, { noOutline: true });
export const HOOF = m(['#2a1e16', '#3a2a20', '#4a382c'], '#120c08', undefined, { noOutline: true });
export const EYE = m(['#0a0808', '#1a1614', '#f0e0c0'], '#050404', undefined, { noOutline: true });
export const TASSEL = m(['#8a2a1a', '#b03e24', '#d45a32', '#ec7c46'], '#3a1008', undefined, { noOutline: true });
// Fennec foxes: pale cream fur, huge ears pink inside, a black-tipped tail.
export const FENNEC = m(['#7a5a3a', '#94704a', '#ae885c', '#c6a070', '#d8b888', '#e8cea4', '#f4e2c2'], '#3a2818', '#6a4c30');
export const EAR_PINK = m(['#a86a5a', '#c48474', '#dca090'], '#4a2a22', undefined, { noOutline: true });
export const NOSE = m(['#0c0a0a', '#1c1818', '#2c2626'], '#060505', undefined, { noOutline: true });
