// Paints the Everwood's explorer's map off the main thread (see trekMap.ts).
//
// A chunk the world hasn't walked lately has none of its fields made, and
// growing them is tens of milliseconds a chunk: a remembered map opened
// whole asks for hundreds of them at once. So a worker grows the same forest
// from the same seed and paints each chunk's map tile it is asked for.

import { trekTile } from '../art/mapArt';
import { EVERWOOD_SEED, ForestGen } from './forestGen';

export interface TrekAsk {
  cx: number;
  cy: number;
}

/** The trees the player has cleared (by foot key), sent before any chunk they change is asked for. */
export interface TrekCleared {
  cleared: number[];
}

export interface TrekDone {
  cx: number;
  cy: number;
  px: Uint8ClampedArray;
}

interface WorkerScope {
  onmessage: ((e: MessageEvent<TrekAsk | TrekCleared>) => void) | null;
  postMessage(message: TrekDone, transfer: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;
const gen = new ForestGen(EVERWOOD_SEED);

scope.onmessage = (e) => {
  if ('cleared' in e.data) {
    gen.cleared = new Set(e.data.cleared);
    return;
  }
  const { cx, cy } = e.data;
  const px = trekTile(gen, cx, cy, (x, y) => gen.isCleared(x, y));
  scope.postMessage({ cx, cy, px }, [px.buffer]);
};
