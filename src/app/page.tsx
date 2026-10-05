import Dashboard from '@/components/dashboard';
import { authConfigured } from '@/auth';
import { currentUser } from '@/lib/access';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = authConfigured() ? await currentUser() : null;
  if (!user) redirect('/login');
  return <Dashboard user={{ name: user.name, email: user.email, role: user.role }} />;
}
