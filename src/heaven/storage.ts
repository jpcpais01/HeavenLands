// Heaven Lands runs the old game's code, which keeps everything in
// localStorage under 'pixel-battle.'. On the same site the two games would
// share those keys (Myths' Home turning up in Heaven Lands, and its settings
// and account), so every key under that prefix is moved to Heaven Lands' own,
// 'heaven-lands.', before any of that code runs.

const FROM = 'pixel-battle.';
const TO = 'heaven-lands.';

/** Told the key (as stored, under 'heaven-lands.') of every write and removal: how the cloud save (sync.ts) knows something changed. */
const watchers: ((key: string) => void)[] = [];
export function onStored(fn: (key: string) => void): void {
  watchers.push(fn);
}
const told = (k: string) => {
  for (const fn of watchers) fn(k);
};

let owned = false;

/** Move the keys over. Runs as soon as this module is imported (before any module imported after it reads storage at load, as cloud.ts does); calling it again does nothing. */
export function ownStorage(): void {
  if (owned) return;
  owned = true;
  try {
    const s = Storage.prototype;
    const get = s.getItem;
    const set = s.setItem;
    const remove = s.removeItem;
    const own = (k: string) => (typeof k === 'string' && k.startsWith(FROM) ? TO + k.slice(FROM.length) : k);
    s.getItem = function (k: string) {
      return get.call(this, own(k));
    };
    s.setItem = function (k: string, v: string) {
      set.call(this, own(k), v);
      if (this === window.localStorage) told(own(k));
    };
    s.removeItem = function (k: string) {
      remove.call(this, own(k));
      if (this === window.localStorage) told(own(k));
    };
  } catch {
    // No storage at all (a locked-down browser): nothing to keep apart.
  }
}

ownStorage();
