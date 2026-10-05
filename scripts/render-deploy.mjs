import assert from 'node:assert/strict';
const hook = process.env.RENDER_DEPLOY_HOOK;
assert.ok(hook, 'Missing RENDER_DEPLOY_HOOK GitHub secret.');
assert.match(process.env.DEPLOYMENT_SHA || '', /^[a-f0-9]{40}$/);
const url = new URL(hook);
assert.equal(url.origin, 'https://api.render.com');
assert.ok(url.pathname.startsWith('/deploy/'));
url.searchParams.set('ref', process.env.DEPLOYMENT_SHA);
const trigger = await fetch(url, { method: 'POST' });
assert.ok(trigger.ok, `Render deploy trigger returned ${trigger.status}`);
console.log('Render deployment requested for the verified commit.');
const base = process.env.BACKEND_URL;
for (let attempt = 0; attempt < 40; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 15000));
  try {
    const health = await fetch(base + '/health');
    const deployed = health.ok ? await health.json() : {};
    const ready = await fetch(base + '/ready');
    const pages = await Promise.all(['/', '/login', '/admin', '/_next/static/test.js', '/.env', '/core/package.json'].map(path => fetch(base + path)));
    if (health.ok && deployed.revision === process.env.DEPLOYMENT_SHA && ready.ok && pages.every(response => response.status === 404)) {
      console.log('Render verified: healthy API, MongoDB ready, no frontend or source files.');
      process.exit(0);
    }
  } catch { /* Deployment is replacing the instance. */ }
}
throw new Error('Render did not become an API-only healthy service within ten minutes.');
