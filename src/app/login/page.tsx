import { authConfigured } from '@/auth';
import { currentUser } from '@/lib/access';
import { redirect } from 'next/navigation';
import Login from '@/components/login';
export const dynamic = 'force-dynamic';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (authConfigured() && (await currentUser())) redirect('/');
  const params = await searchParams;
  return <Login configured={authConfigured()} hasError={Boolean(params.error)} />;
}
