// The Home's the yard's later pieces: a sundial, an angel statue, a garden windmill, wind chimes, a pergola, a water pump, a bird feeder, a picnic table, a hammock, a bistro set, a log pile and a flower cart (see world/homeParts.ts), drawn the same way as
// homeProps.ts: the game's high three-quarter view, lit from the upper left,
// with a glow layer that alone animates.

import type { PropArt } from './homeProps';

export const GARDEN_ART: Record<string, PropArt> = {};

/** The turning ones' side (facing east; west is it mirrored) and back views. */
export const GARDEN_TURNS: Record<string, { side: PropArt; back: PropArt }> = {};
