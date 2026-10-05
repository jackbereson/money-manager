import { MongoClient } from 'mongodb';
import type { TransactionInput } from './transactions';

const globalMongo = globalThis as typeof globalThis & { mongoPromise?: Promise<MongoClient> };
export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MongoDB chưa được cấu hình');
  if (!globalMongo.mongoPromise) {
    globalMongo.mongoPromise = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect().catch(error => {
      globalMongo.mongoPromise = undefined;
      throw error;
    });
  }
  return (await globalMongo.mongoPromise).db(process.env.MONGODB_DB || 'save_billion');
}
export type AppUser = { ownerId: string; name: string; email: string; image: string; role: 'admin' | 'member'; status: 'active' | 'blocked'; createdAt: Date; lastLoginAt: Date };
export type StoredTransaction = TransactionInput & { ownerId: string; createdAt: Date; updatedAt?: Date };
let transactionIndex: Promise<string> | undefined;
let userIndex: Promise<string> | undefined;
export async function getTransactions() {
  const collection = (await getDb()).collection<StoredTransaction>('transactions');
  transactionIndex ??= collection.createIndex({ ownerId: 1, date: -1 }).catch(error => { transactionIndex = undefined; throw error; });
  await transactionIndex;
  return collection;
}
export async function getUsers() {
  const collection = (await getDb()).collection<AppUser>('users');
  userIndex ??= collection.createIndex({ ownerId: 1 }, { unique: true }).catch(error => { userIndex = undefined; throw error; });
  await userIndex;
  return collection;
}
