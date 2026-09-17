import { openDB, type IDBPDatabase } from "idb";
import type { Handbook } from "./types";

const DB_NAME = "carnation";
const STORE_NAME = "handbooks";
const HANDBOOK_KEY = "current";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function loadHandbook(): Promise<Handbook | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, HANDBOOK_KEY);
}

export async function saveHandbook(handbook: Handbook): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, handbook, HANDBOOK_KEY);
}
