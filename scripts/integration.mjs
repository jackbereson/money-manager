import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { encode } from 'next-auth/jwt';

// Isolated test database and signed synthetic sessions; no test login endpoint in the app.
const uri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27019';
const database = process.env.MONGODB_TEST_DB || 'save_billion_test';
if (!database.endsWith('_test')) throw new Error('Test database must end with _test.');
const port = process.env.TEST_PORT || '3111';
const base = `http://127.0.0.1:${port}`;
const secret = randomBytes(32).toString('base64url');
const suffix = randomUUID();
const ownerIds = ['alice', 'bob', 'admin'].map(name => `google:integration-${name}-${suffix}`);
const client = await new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect();
const db = client.db(database);
const cookies = await Promise.all(ownerIds.map(async ownerId => `authjs.session-token=${await encode({ secret, salt: 'authjs.session-token', token: { ownerId, sub: ownerId, name: ownerId }, maxAge: 3600 })}`));
let server;
let checks = 0;
async function api(path, who, method = 'GET', body, origin = base) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(who === undefined ? {} : { cookie: cookies[who] }), ...(method === 'GET' ? {} : { origin, 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json(), headers: response.headers };
}
function check(condition, message) { assert.ok(condition, message); checks++; console.log(`PASS ${message}`); }
try {
  await db.collection('users').insertMany(ownerIds.map((ownerId, i) => ({ ownerId, name: ['Alice Test', 'Bob Test', 'Admin Test'][i], email: `integration-${i}@example.invalid`, image: '', role: i === 2 ? 'admin' : 'member', status: 'active', createdAt: new Date(), lastLoginAt: new Date() })));
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port], { env: { ...process.env, NODE_ENV: 'production', MONGODB_URI: uri, MONGODB_DB: database, AUTH_SECRET: secret, AUTH_URL: base, AUTH_GOOGLE_ID: 'integration-only', AUTH_GOOGLE_SECRET: 'integration-only' }, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  let serverErrors = '';
  server.stderr.on('data', data => { serverErrors = (serverErrors + data.toString()).slice(-2500); });
  let ready = false;
  for (let i = 0; i < 100; i++) { try { const response = await fetch(`${base}/api/auth/session`); if (response.ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 200)); }
  assert.ok(ready, `Test server unavailable: ${serverErrors}`);
  const input = { title: 'Integration expense', amount: 50000, type: 'expense', category: 'Ăn uống', date: '2026-10-05', wallet: 'Tiền mặt', note: '' };
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) check((await api('/api/transactions', undefined, method, method === 'POST' || method === 'PATCH' ? input : undefined)).status === 401, `Anonymous ${method} denied`);
  const a = await api('/api/transactions', 0, 'POST', { ...input, ownerId: ownerIds[1], role: 'admin' });
  check(a.status === 201, 'Authenticated transaction created');
  check((await db.collection('transactions').findOne({ title: input.title, ownerId: ownerIds[0] })) !== null, 'Owner from session; forged owner ignored');
  const aId = a.data.id;
  const b = await api('/api/transactions', 1, 'POST', { ...input, title: 'Bob private income', type: 'income', amount: 100000 });
  check(b.status === 201, 'Second user can create own data');
  const listing = await api('/api/transactions', 0);
  check(listing.data.transactions.some(row => row.id === aId) && !listing.data.transactions.some(row => row.id === b.data.id), 'Member listing isolates owners');
  check(listing.headers.get('cache-control').includes('no-store'), 'Private responses are not cached');
  check((await api('/api/transactions', 1, 'PATCH', { ...input, id: aId })).status === 404, 'Other member cannot edit transaction');
  check((await api(`/api/transactions?id=${aId}`, 1, 'DELETE')).status === 404, 'Other member cannot delete transaction');
  check((await api('/api/transactions', 0, 'PATCH', { ...input, id: aId, amount: 70000 })).data.amount === 70000, 'Owner can update transaction');
  check((await api('/api/transactions', 0, 'POST', { ...input, amount: -1 })).status === 400, 'Negative amount rejected');
  check((await api('/api/transactions', 0, 'POST', { ...input, date: '2026-02-30' })).status === 400, 'Invalid calendar date rejected');
  check((await api('/api/transactions', 0, 'POST', input, 'https://evil.example')).status === 403, 'Cross-origin mutation rejected');
  for (const path of ['/api/admin/users', '/api/admin/transactions', '/api/admin/plans']) check((await api(path, 0)).status === 403, `Member denied ${path}`);
  check((await api('/api/admin/users', 0, 'PATCH', { id: ownerIds[0], role: 'admin', status: 'active' })).status === 403, 'Member cannot escalate role');
  const all = await api('/api/admin/transactions', 2);
  check(all.data.transactions.some(row => row.id === aId) && all.data.transactions.some(row => row.id === b.data.id), 'Admin sees all users transactions');
  check((await api('/api/admin/users', 2)).data.users.some(user => user.id === ownerIds[1]), 'Admin lists users');
  check((await api('/api/admin/transactions', 2, 'PATCH', { ...input, id: b.data.id, amount: 90000 })).status === 200, 'Admin updates another user transaction');
  check((await api('/api/admin/users', 2, 'PATCH', { id: ownerIds[2], role: 'member', status: 'blocked' })).status === 400, 'Admin cannot lock or demote own session');
  const budget = await api('/api/plans', 0, 'POST', { kind: 'budget', name: 'Food budget', target: 2000000, month: '2026-10', category: 'Ăn uống', ownerId: ownerIds[1] });
  const goal = await api('/api/plans', 1, 'POST', { kind: 'goal', name: 'Private savings goal', target: 3000000, saved: 500000 });
  check(budget.status === 201 && goal.status === 201, 'Budget and savings goal persist');
  check((await api('/api/plans', 1)).data.plans.every(plan => plan.id !== budget.data.id), 'Planning data isolated by owner');
  check((await api('/api/plans', 1, 'PATCH', { kind: 'budget', name: 'Forged budget', target: 1, month: '2026-10', category: 'Ăn uống', id: budget.data.id })).status === 404, 'Other user cannot edit budget');
  check((await api(`/api/plans?id=${budget.data.id}`, 1, 'DELETE')).status === 404, 'Other user cannot delete budget');
  check((await api('/api/admin/plans', 2)).data.plans.some(plan => plan.id === budget.data.id), 'Admin manages all planning data');
  check((await api('/api/plans', 0, 'POST', { kind: 'budget', name: 'Bad month', target: 1, month: '2026-13', category: 'Ăn uống' })).status === 400, 'Invalid budget month rejected');
  check((await api('/api/admin/users', 2, 'PATCH', { id: ownerIds[1], role: 'member', status: 'blocked' })).status === 200, 'Admin can block user');
  check((await api('/api/transactions', 1)).status === 401, 'Blocked user loses access with existing session');
  await api('/api/admin/users', 2, 'PATCH', { id: ownerIds[1], role: 'admin', status: 'active' });
  check((await api('/api/admin/users', 1)).status === 200, 'Role upgrade applies to existing session');
  await api('/api/admin/users', 2, 'PATCH', { id: ownerIds[1], role: 'member', status: 'active' });
  check((await api('/api/admin/users', 1)).status === 403, 'Role downgrade applies to existing session');
  check((await api(`/api/admin/transactions?id=${aId}`, 2, 'DELETE')).status === 200, 'Admin can delete another user transaction');
  check((await api(`/api/plans?id=${budget.data.id}`, 0, 'DELETE')).status === 200, 'Owner can delete budget');
  const anonymousPage = await fetch(`${base}/admin`, { redirect: 'manual' });
  check(anonymousPage.status === 307 && anonymousPage.headers.get('location') === '/login', 'Admin page guards anonymous visits');
  const memberPage = await fetch(`${base}/admin`, { headers: { cookie: cookies[0] }, redirect: 'manual' });
  check(memberPage.status === 307 && memberPage.headers.get('location') === '/', 'Admin page guards member visits');
  console.log(`\n${checks} integration checks passed.`);
} finally {
  if (server) { server.kill(); await new Promise(resolve => { server.once('exit', resolve); setTimeout(resolve, 3000); }); }
  await Promise.all(['users', 'transactions', 'plans'].map(collection => db.collection(collection).deleteMany({ ownerId: { $in: ownerIds } })));
  await client.close();
}
