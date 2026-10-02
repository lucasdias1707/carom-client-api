import type { Backend, MainRecord } from '@/lib/persistence';
import type { ResponseRecord } from '@/types';

/**
 * The browser's IndexedDB, behind the small interface the persister wants.
 *
 * Two stores. `meta` holds the workspace under one key and a backup of whatever
 * a migration replaced under another; `responses` holds one record per
 * response, keyed by its id.
 */

const DATABASE = 'carom';
const VERSION = 1;
const MAIN_KEY = 'state';
const BACKUP_KEY = 'legacy-backup';

/** Settles when the request does. */
function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Settles when the transaction has committed — not when its requests were queued. */
function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('idb-aborted'));
  });
}

/**
 * Open the database, or fail.
 *
 * The errors are identifiers, not sentences: the only reader is `bootStorage`,
 * which falls back to `localStorage` and shows nobody anything.
 *
 * Failing includes taking too long. Some browsers leave `open` pending forever
 * when site data is blocked, and the app cannot wait on that to start.
 */
export async function openIndexedDb(timeoutMs = 5000): Promise<Backend> {
  if (typeof indexedDB === 'undefined') throw new Error('idb-unavailable');

  const open = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('meta');
      request.result.createObjectStore('responses', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('idb-blocked'));
  });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('idb-timeout')), timeoutMs),
  );
  const db = await Promise.race([open, timeout]);

  return {
    async readMain() {
      return (await done(db.transaction('meta').objectStore('meta').get(MAIN_KEY))) as MainRecord | undefined;
    },

    async writeMain(record) {
      const transaction = db.transaction('meta', 'readwrite');
      transaction.objectStore('meta').put(record, MAIN_KEY);
      await committed(transaction);
    },

    async readResponses() {
      return (await done(db.transaction('responses').objectStore('responses').getAll())) as ResponseRecord[];
    },

    async writeResponses(put, remove) {
      const transaction = db.transaction('responses', 'readwrite');
      const store = transaction.objectStore('responses');
      for (const record of put) store.put(record);
      for (const id of remove) store.delete(id);
      await committed(transaction);
    },

    async writeBackup(raw) {
      const transaction = db.transaction('meta', 'readwrite');
      transaction.objectStore('meta').put(raw, BACKUP_KEY);
      await committed(transaction);
    },

    async wipe() {
      const transaction = db.transaction(['meta', 'responses'], 'readwrite');
      transaction.objectStore('meta').delete(MAIN_KEY);
      transaction.objectStore('responses').clear();
      await committed(transaction);
    },
  };
}
