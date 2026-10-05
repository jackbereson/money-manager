'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Login from './login';
import StatusScreen from './status-screen';
import { loadUser, type SessionUser } from '@/lib/session';
const Dashboard = dynamic(() => import('./dashboard'), { ssr: false, loading: () => <StatusScreen variant="loading" /> });
const AdminDashboard = dynamic(() => import('./admin-dashboard'), { ssr: false, loading: () => <StatusScreen variant="loading" /> });
export default function SessionScreen({ screen }: { screen: 'personal' | 'admin' | 'login' }) {
  const [state, setState] = useState<{ user: SessionUser | null; configured: boolean; databaseConfigured: boolean } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([loadUser(), screen === 'login' ? fetch('/api/config', { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error('Không thể kết nối hệ thống.'); return response.json();
    }) : Promise.resolve({ configured: true, databaseConfigured: true })]).then(([user, config]) => {
      if (!active) return;
      if (!user && screen !== 'login') { window.location.replace('/login'); return; }
      if (user && (screen === 'login' || (screen === 'admin' && user.role !== 'admin'))) { window.location.replace('/'); return; }
      setState({ user, ...config });
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [screen]);
  if (error) return <StatusScreen variant="error" onRetry={() => window.location.reload()} />;
  if (!state) return <StatusScreen variant="loading" />;
  if (screen === 'login') return <Login configured={state.configured} databaseConfigured={state.databaseConfigured} hasError={Boolean(new URLSearchParams(window.location.search).get('error'))} />;
  if (!state.user) return null;
  return screen === 'admin' ? <AdminDashboard currentId={state.user.ownerId} name={state.user.name} /> : <Dashboard user={state.user} />;
}
