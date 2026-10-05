import assert from 'node:assert/strict';

const base = process.env.DEPLOYMENT_URL || 'https://money-manager.jackbereson.workers.dev';
async function verify() {
  for (const [path, status] of [['/', 307], ['/login', 200], ['/manifest.webmanifest', 200], ['/icon-192.png', 200], ['/api/transactions', 401], ['/api/admin/users', 401], ['/api/plans', 401]]) {
    const response = await fetch(`${base}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, status, `${path}: expected ${status}, received ${response.status}`);
    if (status === 307) assert.equal(response.headers.get('location'), '/login');
    if (status === 401) {
      assert.match(response.headers.get('cache-control') || '', /no-store/);
      assert.ok((await response.json()).error);
    } else if (path === '/login') {
      assert.ok((await response.text()).includes('Tiếp tục với Google'), 'Login page did not render');
    } else await response.arrayBuffer();
    console.log(`PASS ${path} (${status})`);
  }
}
for (let attempt = 1; attempt <= 5; attempt++) {
  try { await verify(); console.log(`Deployment verified: ${base}`); break; }
  catch (error) {
    if (attempt === 5) throw error;
    console.warn(`Deployment propagation check ${attempt} failed: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
