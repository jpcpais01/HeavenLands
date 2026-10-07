// The Home's the house's later furniture: a kitchen counter and sink, a dish hutch, a tea cart, a vanity, a rocking horse, a bunk bed, an easel, book stacks, a gramophone, a monstera and a folding screen (see world/homeParts.ts), drawn the same way as
// homeProps.ts: the game's high three-quarter view, lit from the upper left,
// with a glow layer that alone animates.

import type { PropArt } from './homeProps';

export const HOUSE_ART: Record<string, PropArt> = {};

/** The turning ones' side (facing east; west is it mirrored) and back views. */
export const HOUSE_TURNS: Record<string, { side: PropArt; back: PropArt }> = {};
