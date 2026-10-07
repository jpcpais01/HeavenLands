// Heaven Lands' only script: its own storage first, then the cloud save (a
// newer one from another device is laid into storage before anything reads
// it), then the game once the page has loaded (see src/entry.ts for why
// after the load event).

import { afterLoad } from '../loaded';
// First of all, as importing it moves the keys before sync.ts (and cloud.ts under it) read any.
import { ownStorage } from './storage';
import { startSync } from './sync';

ownStorage();
const synced = startSync().catch(() => {});
afterLoad(() => void synced.then(() => import('./main')));
