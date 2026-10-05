import 'reflect-metadata';
import { All, Controller, Get, Module, Req, Res } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { fileURLToPath } from 'node:url';
import { handleAuth, authConfigured } from './auth.js';
import { currentUser, privateJson, requestContext } from './lib/access.js';
import { getDb } from './lib/mongodb.js';
import { transactionHandlers } from './lib/transaction-api.js';
import { planHandlers } from './lib/plan-api.js';
import * as users from './lib/user-api.js';

const routes: Record<string, Partial<Record<string, (request: Request) => Promise<Response>>>> = {
  '/api/transactions': transactionHandlers(), '/api/plans': planHandlers(),
  '/api/admin/transactions': { ...transactionHandlers(true), POST: undefined },
  '/api/admin/plans': { ...planHandlers(true), POST: undefined }, '/api/admin/users': users,
};
@Controller()
class ApiController {
  @Get(['/', '/login', '/admin'])
  page(@Req() request: ExpressRequest, @Res() response: ExpressResponse) {
    const file = request.path === '/' ? 'index.html' : `${request.path.slice(1)}.html`;
    response.sendFile(fileURLToPath(new URL(`../../out/${file}`, import.meta.url)));
  }
  @All(['api/*path', 'health', 'ready'])
  async handle(@Req() incoming: ExpressRequest & { rawBody?: Buffer }, @Res() outgoing: ExpressResponse) {
    const url = new URL(incoming.originalUrl, process.env.AUTH_URL);
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) if (typeof value === 'string') headers.set(key, value);
    const body = incoming.rawBody;
    const request = new Request(url, { method: incoming.method, headers,
      ...(!['GET', 'HEAD'].includes(incoming.method) && body?.length ? { body: new Uint8Array(body) } : {}) });
    const response = await requestContext.run(request, async () => {
      try {
        if (url.pathname === '/health') return privateJson({ ok: true });
        if (url.pathname === '/ready') { await (await getDb()).command({ ping: 1 }); return privateJson({ ok: true }); }
        if (url.pathname.startsWith('/api/auth/')) return authConfigured() ? handleAuth(request) : privateJson({ error: 'Đăng nhập chưa được cấu hình.' }, 503);
        if (url.pathname === '/api/config' && incoming.method === 'GET') return privateJson({ configured: authConfigured(), databaseConfigured: Boolean(process.env.MONGODB_URI) });
        if (url.pathname === '/api/me' && incoming.method === 'GET') {
          const user = await currentUser();
          return user ? privateJson({ user: { ownerId: user.ownerId, name: user.name, email: user.email, role: user.role } }) : privateJson({ error: 'Vui lòng đăng nhập.' }, 401);
        }
        const handlers = routes[url.pathname];
        if (!handlers) return privateJson({ error: 'Không tìm thấy.' }, 404);
        const handler = handlers[incoming.method];
        return handler ? handler(request) : privateJson({ error: 'Phương thức không được hỗ trợ.' }, 405);
      } catch { return privateJson({ error: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.' }, 503); }
    });
    outgoing.status(response.status);
    response.headers.forEach((value, name) => { if (name !== 'set-cookie') outgoing.setHeader(name, value); });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) outgoing.setHeader('Set-Cookie', cookies);
    outgoing.send(Buffer.from(await response.arrayBuffer()));
  }
}
@Module({ imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }])], controllers: [ApiController], providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }] })
class AppModule {}
const origin = process.env.AUTH_URL || process.env.RENDER_EXTERNAL_URL;
if (!origin || !/^https?:\/\//.test(origin) || new URL(origin).pathname !== '/') throw new Error('AUTH_URL must be the application origin.');
process.env.AUTH_URL = origin;
if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) throw new Error('AUTH_SECRET must have at least 32 characters.');
const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true, logger: ['error', 'warn', 'log'] });
app.disable('x-powered-by');
// Render supplies exactly one trusted reverse proxy in front of the service.
app.set('trust proxy', 1);
app.useBodyParser('json', { limit: '256kb' });
app.use((req: ExpressRequest, res: ExpressResponse, next: () => void) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); res.setHeader('Cache-Control', 'private, no-store');
  if (origin.startsWith('https:')) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
// Only the static export is public. Never serve the repository or dotenv files.
app.useStaticAssets(fileURLToPath(new URL('../../out/', import.meta.url)), { dotfiles: 'deny', extensions: ['html'], index: 'index.html', redirect: false });
app.enableShutdownHooks();
await app.listen(Number(process.env.PORT || 3200), '0.0.0.0');
