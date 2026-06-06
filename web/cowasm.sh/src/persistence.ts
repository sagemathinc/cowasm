const DATABASE = "cowasm-sh";
const STORE = "snapshots";
const HOME_KEY = "home";

export interface Snapshot {
  data: string;
  savedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  f: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = f(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function loadHomeSnapshot(): Promise<Snapshot | undefined> {
  return await withStore<Snapshot | undefined>("readonly", (store) =>
    store.get(HOME_KEY)
  );
}

export async function saveHomeSnapshot(data: string): Promise<Snapshot> {
  const snapshot = { data, savedAt: new Date().toISOString() };
  await withStore<IDBValidKey>("readwrite", (store) =>
    store.put(snapshot, HOME_KEY)
  );
  return snapshot;
}

export async function clearHomeSnapshot(): Promise<void> {
  await withStore<undefined>("readwrite", (store) => store.delete(HOME_KEY));
}
