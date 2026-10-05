'use client';
import { useState, type ReactNode } from 'react';
import { authAction } from '@/lib/session';
export default function GoogleLoginButton({ configured, children }: { configured: boolean; children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function login() {
    setPending(true); setError('');
    try { await authAction('signin/google'); }
    catch { setPending(false); setError('Không thể bắt đầu đăng nhập. Vui lòng thử lại.'); }
  }
  return <><button className="google-login btn btn-outline w-full" disabled={!configured || pending} onClick={login}>{pending ? <><span className="loading loading-spinner loading-xs" />Đang kết nối Google…</> : children}</button>{error && <div className="alert alert-error mt-3" role="alert">{error}</div>}</>;
}
