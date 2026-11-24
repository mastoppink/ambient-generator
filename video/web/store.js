/*
 * Small IndexedDB key-value store, so the chosen image, its 4K upscale and studio settings
 * survive a page reload. Everything stays in this browser; nothing is uploaded.
 * Every call fails soft (private windows or blocked storage just mean "nothing saved").
 */
const DB = "ambient-studio", STORE = "kv";
let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }).catch(() => null);
  }
  return dbPromise;
}
async function run(mode, fn) {
  const d = await db(); if (!d) return undefined;
  return new Promise((res) => {
    try {
      const tx = d.transaction(STORE, mode), req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => res(req?.result); tx.onerror = () => res(undefined); tx.onabort = () => res(undefined);
    } catch { res(undefined); }
  });
}
export const save = (key, value) => run("readwrite", (s) => s.put(value, key));
export const load = (key) => run("readonly", (s) => s.get(key));
export const remove = (keys) => run("readwrite", (s) => { for (const k of keys) s.delete(k); return null; });
