import { auth } from '@/auth';
import { getUsers } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function currentUser() {
  if (!process.env.AUTH_SECRET) return null;
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await (await getUsers()).findOne({ ownerId: session.user.id });
  return user?.status === 'active' ? user : null;
}
export const privateJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export function invalidOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : new URL(request.url).origin;
  return origin !== null && origin !== expected;
}
