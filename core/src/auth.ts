import { Auth, type AuthConfig } from '@auth/core';
import Google from '@auth/core/providers/google';
import { getUsers, getSessions } from './lib/mongodb.js';
import { randomUUID } from 'node:crypto';

export const authConfigured = () => Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const authConfig = (): AuthConfig => ({
  secret: process.env.AUTH_SECRET, trustHost: true, basePath: '/api/auth',
  logger: { error(error) { console.error(`Authentication error: ${error.name}`); } },
  providers: [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET, checks: ['pkce', 'state'], authorization: { params: { prompt: 'select_account', scope: 'openid email profile' } } })],
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== 'google' || profile?.email_verified !== true || !user.email) return false;
      const ownerId = `google:${account.providerAccountId}`;
      const email = user.email.toLowerCase();
      const adminEmails = (process.env.AUTH_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      const configuredAdmin = adminEmails.includes(email);
      try {
        const users = await getUsers();
        await users.updateOne({ ownerId }, {
          $set: { name: user.name || 'Bạn', email, image: user.image || '', lastLoginAt: new Date(), ...(configuredAdmin ? { role: 'admin' as const } : {}) },
          $setOnInsert: { ownerId, ...(!configuredAdmin ? { role: 'member' as const } : {}), status: 'active', createdAt: new Date() },
        }, { upsert: true });
        return (await users.findOne({ ownerId }))?.status === 'active';
      } catch { return false; }
    },
    async jwt({ token, account }) {
      if (account?.provider === 'google') {
        token.ownerId = `google:${account.providerAccountId}`;
        token.sid = randomUUID();
        await (await getSessions()).insertOne({ sid: token.sid as string, ownerId: token.ownerId as string, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.ownerId === 'string') session.user.id = token.ownerId;
      if (typeof token.sid === 'string') session.sid = token.sid;
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message && typeof message.token?.sid === 'string') {
        await (await getSessions()).deleteOne({ sid: message.token.sid });
      }
    },
  },
});

export const handleAuth = (request: Request) => Auth(request, authConfig());
