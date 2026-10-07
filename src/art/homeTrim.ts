// The Home's later lights and wall decor: a moon lamp, a Tiffany lamp, string lights, a path light, a star lantern, bunting, a plate rack, dried herbs, copper pans, a window box, a dreamcatcher, a sunburst mirror and an embroidery hoop (see world/homeParts.ts), drawn the same way as
// homeProps.ts: the game's high three-quarter view, lit from the upper left,
// with a glow layer that alone animates.

import type { PropArt } from './homeProps';

export const TRIM_ART: Record<string, PropArt> = {};

/** The turning ones' side (facing east; west is it mirrored) and back views. */
export const TRIM_TURNS: Record<string, { side: PropArt; back: PropArt }> = {};
