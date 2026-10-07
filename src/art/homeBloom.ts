// The Home's the garden's later plants: hydrangea, bamboo, topiary, a potted lemon tree, foxgloves, daisies, poppies, toadstools, a herb bed, a flower urn, a lotus and a rose trellis (see world/homeParts.ts), drawn the same way as
// homeProps.ts: the game's high three-quarter view, lit from the upper left,
// with a glow layer that alone animates.

import type { PropArt } from './homeProps';

export const BLOOM_ART: Record<string, PropArt> = {};

/** The turning ones' side (facing east; west is it mirrored) and back views. */
export const BLOOM_TURNS: Record<string, { side: PropArt; back: PropArt }> = {};
