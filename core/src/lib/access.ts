import { AsyncLocalStorage } from 'node:async_hooks';
import { handleAuth } from '../auth.js';
import { getUsers, getSessions } from './mongodb.js';

export const requestContext = new AsyncLocalStorage<Request>();
export const privateJson = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export function invalidOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return origin !== new URL(process.env.AUTH_URL!).origin;
}
export async function currentUser() {
  const request = requestContext.getStore();
  if (!request || !process.env.AUTH_SECRET) return null;
  const sessionResponse = await handleAuth(new Request(new URL('/api/auth/session', process.env.AUTH_URL), {
    headers: { cookie: request.headers.get('cookie') || '' },
  }));
  const session = await sessionResponse.json();
  if (typeof session?.user?.id !== 'string' || typeof session.sid !== 'string') return null;
  const activeSession = await (await getSessions()).findOne({ sid: session.sid, ownerId: session.user.id, expiresAt: { $gt: new Date() } });
  if (!activeSession) return null;
  const user = await (await getUsers()).findOne({ ownerId: session.user.id });
  return user?.status === 'active' ? user : null;
}
