import { currentUser } from '@/lib/access';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/admin-dashboard';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');
  return <AdminDashboard currentId={user.ownerId} name={user.name} />;
}
