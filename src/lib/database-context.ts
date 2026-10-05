import { AsyncLocalStorage } from 'node:async_hooks';
import type { MongoClient } from 'mongodb';

export type DatabaseScope = { client?: Promise<MongoClient> };
// The Worker entry and Next server are separate bundles. Use one shared store.
const databaseGlobal = globalThis as typeof globalThis & { moneyDatabaseContext?: AsyncLocalStorage<DatabaseScope> };
export const databaseContext = databaseGlobal.moneyDatabaseContext ??= new AsyncLocalStorage<DatabaseScope>();
