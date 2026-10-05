'use client';
export type SessionUser = { ownerId: string; name: string; email: string; role: 'admin' | 'member' };
export async function loadUser(): Promise<SessionUser | null> {
  const response = await fetch('/api/me', { cache: 'no-store' });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Không thể kết nối hệ thống. Vui lòng thử lại.');
  return (await response.json()).user;
}
export async function authAction(action: 'signin/google' | 'signout', redirectTo = '/') {
  const csrf = await fetch('/api/auth/csrf', { cache: 'no-store' });
  if (!csrf.ok) throw new Error('Không thể kết nối dịch vụ đăng nhập.');
  const { csrfToken } = await csrf.json();
  const response = await fetch(`/api/auth/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
    body: new URLSearchParams({ csrfToken, callbackUrl: new URL(redirectTo, window.location.origin).href }),
  });
  if (!response.ok) throw new Error('Không thể xử lý đăng nhập. Vui lòng thử lại.');
  const { url } = await response.json(); window.location.assign(url);
}
export const signOut = ({ redirectTo = '/login' }: { redirectTo?: string } = {}) => authAction('signout', redirectTo);
