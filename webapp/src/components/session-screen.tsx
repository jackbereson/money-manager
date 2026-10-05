'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Login from './login';
import { loadUser, type SessionUser } from '@/lib/session';
const Dashboard = dynamic(() => import('./dashboard'), { ssr: false });
const AdminDashboard = dynamic(() => import('./admin-dashboard'), { ssr: false });
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
  if (error) return <main className="dashboard-loading"><div className="alert alert-error" role="alert">{error}</div><button className="btn" onClick={() => window.location.reload()}>Thử lại</button></main>;
  if (!state) return <main className="dashboard-loading" role="status"><span className="loading loading-spinner" />Đang mở sổ thu chi…</main>;
  if (screen === 'login') return <Login configured={state.configured} databaseConfigured={state.databaseConfigured} hasError={Boolean(new URLSearchParams(window.location.search).get('error'))} />;
  if (!state.user) return null;
  return screen === 'admin' ? <AdminDashboard currentId={state.user.ownerId} name={state.user.name} /> : <Dashboard user={state.user} />;
}
