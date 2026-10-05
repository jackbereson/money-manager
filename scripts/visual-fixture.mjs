import { MongoClient } from 'mongodb';
import { encode } from '@auth/core/jwt';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { demoTransactions, transactionSchema } from '../src/lib/transactions.ts';

const client = await new MongoClient('mongodb://127.0.0.1:27019').connect();
const db = client.db('save_billion_test');
const ownerId = `google:visual-${randomUUID()}`;
const secret = randomBytes(32).toString('base64url');
const base = 'http://127.0.0.1:3112';
const transactions = demoTransactions().map(row => ({ ...transactionSchema.parse(row), ownerId, createdAt: new Date() }));
await db.collection('users').insertOne({ ownerId, name: 'Minh Anh · Test UI', email: 'ui-test@example.invalid', image: '', role: 'admin', status: 'active', createdAt: new Date(), lastLoginAt: new Date() });
await db.collection('transactions').insertMany(transactions);
await db.collection('plans').insertMany([{ kind: 'budget', name: 'Ăn uống tháng này', target: 2000000, category: 'Ăn uống', month: transactions[0].date.slice(0, 7), ownerId, createdAt: new Date() }, { kind: 'goal', name: 'Một chuyến đi Đà Lạt', target: 5000000, saved: 1800000, ownerId, createdAt: new Date() }]);
await db.collection('sessions').insertOne({ sid: ownerId, ownerId, expiresAt: new Date(Date.now() + 3600000) });
const token = await encode({ secret, salt: 'authjs.session-token', token: { ownerId, sid: ownerId, sub: ownerId, name: 'Minh Anh · Test UI' }, maxAge: 3600 });
fs.mkdirSync('.scratch', { recursive: true });
fs.writeFileSync('.scratch/ui-session.json', JSON.stringify({ base, token }));
const server = spawn(process.execPath, ['backend/dist/main.js'], { env: { ...process.env, NODE_ENV: 'production', PORT: '3112', MONGODB_URI: 'mongodb://127.0.0.1:27019', MONGODB_DB: 'save_billion_test', AUTH_SECRET: secret, AUTH_URL: base, AUTH_GOOGLE_ID: 'visual-only', AUTH_GOOGLE_SECRET: 'visual-only' }, stdio: 'inherit', windowsHide: true });
console.log('Visual fixture ready at port 3112. Write .scratch/stop-visual to stop and remove test data.');
const timer = setInterval(async () => {
  if (!fs.existsSync('.scratch/stop-visual')) return;
  clearInterval(timer); server.kill();
  await Promise.all(['users', 'transactions', 'plans', 'sessions'].map(collection => db.collection(collection).deleteMany({ ownerId })));
  await client.close();
  fs.rmSync('.scratch/stop-visual', { force: true }); fs.rmSync('.scratch/ui-session.json', { force: true });
}, 1000);
