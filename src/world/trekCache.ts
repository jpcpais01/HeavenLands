// The explorer's map tiles kept on this device between visits (IndexedDB),
// so the Everwood's map opens whole at once instead of painting every chunk
// walked again. Only a cache: anything missing or stale is painted afresh,
// and a browser without IndexedDB simply goes without.

/** Raised when the map's art changes: tiles kept under an older one are dropped. */
const ART = 1;
const DB = 'heaven-lands-trek';
const STORE = 'tiles';
/** Past this many tiles kept, the store is emptied and starts again (about 4 KB each). */
const MAX_KEPT = 6000;
/** Tiles painted are written together, this long after the first of them (ms). */
const WRITE_MS = 2500;

export interface KeptTile {
  /** The cleared trees' signature the tile was painted with (see TrekMap.sig). */
  sig: number;
  px: Uint8ClampedArray;
}

let db: IDBDatabase | null = null;
let opening: Promise<Map<number, KeptTile>> | null = null;
const queue = new Map<number, KeptTile>();
let timer = 0;

function open(): Promise<IDBDatabase | null> {
  return new Promise((done) => {
    try {
      const req = indexedDB.open(DB, ART);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (d.objectStoreNames.contains(STORE)) d.deleteObjectStore(STORE);
        d.createObjectStore(STORE);
      };
      req.onsuccess = () => done(req.result);
      req.onerror = () => done(null);
      req.onblocked = () => done(null);
    } catch {
      done(null);
    }
  });
}

/** Every tile kept, by chunk key; asked once a game, an empty map where there's no store. */
export function loadKept(): Promise<Map<number, KeptTile>> {
  opening ??= (async () => {
    const out = new Map<number, KeptTile>();
    db = await open();
    if (!db) return out;
    await new Promise<void>((done) => {
      try {
        const st = db!.transaction(STORE, 'readonly').objectStore(STORE);
        const keys = st.getAllKeys();
        const vals = st.getAll();
        vals.onsuccess = () => {
          const ks = keys.result as number[];
          const vs = vals.result as KeptTile[];
          if (ks.length > MAX_KEPT) {
            db!.transaction(STORE, 'readwrite').objectStore(STORE).clear();
          } else {
            for (let i = 0; i < ks.length; i++) if (vs[i]?.px) out.set(ks[i], vs[i]);
          }
          done();
        };
        vals.onerror = () => done();
      } catch {
        done();
      }
    });
    return out;
  })();
  return opening;
}

/** Keep a freshly painted tile (written a little later, with the others painted meanwhile). */
export function keepTile(key: number, tile: KeptTile): void {
  if (!db) return;
  queue.set(key, tile);
  if (timer) return;
  timer = window.setTimeout(() => {
    timer = 0;
    if (!db || !queue.size) return;
    try {
      const st = db.transaction(STORE, 'readwrite').objectStore(STORE);
      for (const [k, t] of queue) st.put(t, k);
    } catch {
      // Not kept this time: it's painted again next visit.
    }
    queue.clear();
  }, WRITE_MS);
}
