import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { getUsers } from '@/lib/mongodb';

export const authConfigured = Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google({ authorization: { params: { prompt: 'select_account', scope: 'openid email profile' } } })],
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== 'google' || profile?.email_verified !== true || !user.email) return false;
      const ownerId = `google:${account.providerAccountId}`;
      const email = user.email.toLowerCase();
      const adminEmails = (process.env.AUTH_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      try {
        const users = await getUsers();
        await users.updateOne({ ownerId }, { $set: { name: user.name || 'Bạn', email, image: user.image || '', lastLoginAt: new Date() }, $setOnInsert: { ownerId, role: adminEmails.includes(email) ? 'admin' : 'member', status: 'active', createdAt: new Date() } }, { upsert: true });
        return (await users.findOne({ ownerId }))?.status === 'active';
      } catch { return false; }
    },
    jwt({ token, account }) {
      if (account?.provider === 'google') token.ownerId = `google:${account.providerAccountId}`;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.ownerId === 'string') session.user.id = token.ownerId;
      return session;
    },
  },
});
