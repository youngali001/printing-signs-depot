/* ============================================================================
 * storage.js — Offline-first local storage using IndexedDB.
 *
 * Everything a job needs (form data, photos as Blobs, signature images, the
 * generated PDF) is stored on the device first, so the app works with no
 * internet. Phase 2 (Google Drive sync) will drain the "upload queue" flag.
 * ========================================================================== */

const DB_NAME = 'handyman-field-app';
const DB_VERSION = 1;

const Store = {
  JOBS: 'jobs',        // { id, createdAt, updatedAt, status, data, syncState }
  SETTINGS: 'settings' // { key, value }  (company config, Google config)
};

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(Store.JOBS)) {
        const jobs = db.createObjectStore(Store.JOBS, { keyPath: 'id' });
        jobs.createIndex('updatedAt', 'updatedAt');
        jobs.createIndex('syncState', 'syncState');
      }
      if (!db.objectStoreNames.contains(Store.SETTINGS)) {
        db.createObjectStore(Store.SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(storeName, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    let result;
    Promise.resolve(fn(store)).then(r => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

const DB = {
  /* ---- Jobs ---- */
  async saveJob(job) {
    job.updatedAt = Date.now();
    if (!job.createdAt) job.createdAt = job.updatedAt;
    await tx(Store.JOBS, 'readwrite', s => s.put(job));
    return job;
  },
  async getJob(id) {
    return tx(Store.JOBS, 'readonly', s => new Promise((res, rej) => {
      const r = s.get(id); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
  },
  async allJobs() {
    return tx(Store.JOBS, 'readonly', s => new Promise((res, rej) => {
      const r = s.getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error);
    })).then(list => list.sort((a, b) => b.updatedAt - a.updatedAt));
  },
  async deleteJob(id) {
    return tx(Store.JOBS, 'readwrite', s => s.delete(id));
  },

  /* ---- Settings ---- */
  async getSetting(key, fallback) {
    const row = await tx(Store.SETTINGS, 'readonly', s => new Promise((res, rej) => {
      const r = s.get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    return row ? row.value : fallback;
  },
  async setSetting(key, value) {
    return tx(Store.SETTINGS, 'readwrite', s => s.put({ key, value }));
  },
};

if (typeof window !== 'undefined') window.DB = DB;
