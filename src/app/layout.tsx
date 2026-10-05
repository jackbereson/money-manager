import type { Metadata, Viewport } from 'next';
import './globals.css';
import './experience.css';
import './reference-style.css';
export const metadata: Metadata = { title: 'Sổ Thu Chi · Money Quest', description: 'Quản lý thu chi cá nhân, theo dõi giao dịch và nhìn rõ dòng tiền của bạn.', appleWebApp: { capable: true, title: 'Sổ Thu Chi', statusBarStyle: 'default' }, icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#23b9db' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" data-theme="sothuchi"><body>{children}</body></html>;
}
