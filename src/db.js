let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const req = indexedDB.open('ohaeng-v1', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('ratings', { keyPath: 'id' });
    req.onsuccess = e => { _db = e.target.result; res(_db); };
    req.onerror   = e => rej(e.target.error);
  });
}

function tx(store, mode, fn) {
  return openDB().then(db => new Promise((res, rej) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  }));
}

export async function saveRating(id, mode, rating) {
  try { await tx('ratings', 'readwrite', s => s.put({ id, mode, rating, savedAt: Date.now() })); }
  catch { /* IDB unavailable (private browsing) */ }
}

export async function loadRatingsForMode(mode) {
  try {
    const all = await tx('ratings', 'readonly', s => s.getAll());
    const map = new Map();
    all.filter(r => r.mode === mode).forEach(r => map.set(r.id, r.rating));
    return map;
  } catch { return new Map(); }
}

export async function deleteRatingsForMode(mode) {
  try {
    const all = await tx('ratings', 'readonly', s => s.getAll());
    const ids = all.filter(r => r.mode === mode).map(r => r.id);
    await Promise.all(ids.map(id =>
      openDB().then(db => new Promise((res, rej) => {
        const req = db.transaction('ratings', 'readwrite').objectStore('ratings').delete(id);
        req.onsuccess = () => res();
        req.onerror   = e => rej(e.target.error);
      }))
    ));
  } catch { /* ignore */ }
}

export async function clearAllRatings() {
  try { await tx('ratings', 'readwrite', s => s.clear()); }
  catch { /* ignore */ }
}
