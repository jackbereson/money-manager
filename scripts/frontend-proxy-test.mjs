import assert from 'node:assert/strict';
import frontend from '../cloudflare/frontend.js';

const fetchOriginal = globalThis.fetch;
let forwarded;
globalThis.fetch = async request => {
  forwarded = request;
  return new Response(null, { status: 302, headers: {
    Location: 'https://accounts.google.com/',
    'Set-Cookie': '__Secure-authjs.state=test; Secure; HttpOnly; SameSite=Lax',
    'Cache-Control': 'private, no-store',
  } });
};
try {
  const response = await frontend.fetch(new Request('https://money-manager.jackbereson.workers.dev/api/auth/callback/google?code=test', {
    headers: { Cookie: 'session=test', Origin: 'https://money-manager.jackbereson.workers.dev', 'X-Forwarded-Host': 'attacker.example' },
  }), {});
  assert.equal(forwarded.url, 'https://money-manager-ehqs.onrender.com/api/auth/callback/google?code=test');
  assert.equal(forwarded.headers.get('cookie'), 'session=test');
  assert.equal(forwarded.headers.get('origin'), 'https://money-manager.jackbereson.workers.dev');
  assert.equal(forwarded.headers.get('x-forwarded-host'), null);
  assert.equal(forwarded.redirect, 'manual');
  assert.equal(response.status, 302);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const env = { ASSETS: { fetch: () => new Response('static asset') } };
  assert.equal(await (await frontend.fetch(new Request('https://frontend.example/login'), env)).text(), 'static asset');
  for (const path of ['/.env', '/key', '/backend/src/main.ts', '/.git/config']) {
    assert.equal((await frontend.fetch(new Request('https://frontend.example' + path), env)).status, 404);
  }
  console.log('Frontend proxy checks passed: backend routing, cookies, redirects, static assets and private files.');
} finally { globalThis.fetch = fetchOriginal; }
