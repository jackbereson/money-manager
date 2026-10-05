const BACKEND = 'https://money-manager-ehqs.onrender.com';

const frontend = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const target = new URL(url.pathname + url.search, BACKEND);
      const headers = new Headers(request.headers);
      headers.delete('host');
      headers.delete('x-forwarded-host');
      headers.delete('x-forwarded-proto');
      return fetch(new Request(target, { method: request.method, headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual' }));
    }
    // Only compiled frontend assets are deployed. No Next.js server or credentials.
    if (/^\/(?:\.env|\.git|key(?:\/|$)|(?:backend|core|webapp)\/|cloudflare\/)/i.test(url.pathname)) {
      return new Response('Not found', { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
export default frontend;
