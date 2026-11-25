/* ────────────────────────────────────────────────────────────
   src/data/db.ts — IndexedDB 영속성 계층 (L4)
   스키마 버전 1 · 스토어 추가만 하고 삭제/개명하지 않는다.
   UI는 이 파일의 API 외에 저장소에 직접 접근하지 않는다.
   ──────────────────────────────────────────────────────────── */

export const STORE_LIST = [
  "kv",
  "countries",
  "institutions",
  "accountTypes",
  "accounts",
  "cashLocations",
  "transactions",
  "categories",
  "tags",
  "exchangeRates",
  "invSnapshots",
  "propAccounts",
  "propPayouts",
  "cryptoWallets",
  "cryptoAssets",
  "cryptoPrices",
  "cryptoTx",
  "casinos",
  "casinoSessions",
  "casinoBuyIns",
  "casinoCashOuts",
  "nwHistory",
] as const;

export type StoreName = (typeof STORE_LIST)[number];

export const SCHEMA_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB를 사용할 수 없는 환경입니다."));
      return;
    }
    const req = indexedDB.open("jalsalabose", SCHEMA_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORE_LIST.forEach((s) => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("DB 열기 실패"));
  });
  return dbPromise;
}

async function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let result: T;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    let req: IDBRequest;
    try {
      req = fn(tx.objectStore(store));
    } catch (error) {
      try { tx.abort(); } catch { /* transaction may already be inactive */ }
      fail(error);
      return;
    }
    req.onsuccess = () => { result = req.result as T; };
    req.onerror = () => fail(req.error ?? new Error(`${store} 작업 실패`));
    tx.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve(result!);
    };
    tx.onerror = () => fail(tx.error ?? new Error(`${store} 트랜잭션 실패`));
    tx.onabort = () => fail(tx.error ?? new Error(`${store} 트랜잭션이 취소되었습니다.`));
  });
}

export async function allRows<T>(store: StoreName): Promise<T[]> {
  return run<T[]>(store, "readonly", (s) => s.getAll());
}

export async function putRow<T extends { id: string }>(store: StoreName, row: T): Promise<void> {
  await run(store, "readwrite", (s) => s.put(row));
}

export async function putRows<T extends { id: string }>(
  store: StoreName,
  rows: T[],
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    rows.forEach((r) => os.put(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("일괄 저장 실패"));
    tx.onabort = () => reject(tx.error ?? new Error("일괄 저장이 취소되었습니다."));
  });
}

/** Write rows across multiple object stores in one atomic transaction. */
export async function putBatch(
  items: [StoreName, { id: string } ][],
): Promise<void> {
  if (items.length === 0) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const stores = [...new Set(items.map(([store]) => store))];
    const tx = db.transaction(stores, "readwrite");
    items.forEach(([store, row]) => tx.objectStore(store).put(row));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("일괄 저장 트랜잭션 실패"));
    tx.onabort = () => reject(tx.error ?? new Error("일괄 저장 트랜잭션이 취소되었습니다."));
  });
}

/** Replace every store atomically; a failed restore leaves the old database intact. */
export async function replaceAll(
  rowsByStore: Record<StoreName, { id: string }[]>,
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([...STORE_LIST], "readwrite");
    STORE_LIST.forEach((store) => {
      const objectStore = tx.objectStore(store);
      objectStore.clear();
      (rowsByStore[store] ?? []).forEach((row) => objectStore.put(row));
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("전체 데이터 교체 실패"));
    tx.onabort = () => reject(tx.error ?? new Error("전체 데이터 교체가 취소되었습니다."));
  });
}

export async function delRow(store: StoreName, id: string): Promise<void> {
  await run(store, "readwrite", (s) => s.delete(id));
}

export async function clearStore(store: StoreName): Promise<void> {
  await run(store, "readwrite", (s) => s.clear());
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_LIST as unknown as string[], "readwrite");
    STORE_LIST.forEach((s) => tx.objectStore(s).clear());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("전체 삭제 실패"));
    tx.onabort = () => reject(tx.error ?? new Error("전체 삭제가 취소되었습니다."));
  });
}

export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fallthrough */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
